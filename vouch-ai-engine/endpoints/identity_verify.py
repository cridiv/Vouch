
import logging
import time
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import cv2
import numpy as np

from utils.image_processing import decode_file_to_image, validate_image_quality
from utils.face_matching import extract_face_from_image, match_faces
from utils.liveness_detection import check_liveness
from utils.document_ocr import detect_document_type, extract_document_fields, validate_document_expiry

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/identity", tags=["identity"])


class IdentityVerifyResponse(BaseModel):
    """Response model for identity verification per API_CONTRACT.md"""
    verified: bool
    match_score: int  # 0-100 integer
    liveness_passed: bool
    document_type: str
    face_extracted: bool
    rejection_reason: Optional[str] = None
    processing_time_ms: float


@router.post("/verify", response_model=IdentityVerifyResponse)
async def verify_identity(
    platform_user_id: str = Form(...),
    document_image: UploadFile = File(...),
    selfie_images: List[UploadFile] = File(...)
) -> IdentityVerifyResponse:
    """
    Verify user identity through document and multiple selfie analysis (Gesture-based)
    """
    start_time = time.time()
    logger.info(f"[{platform_user_id}] Starting multi-frame identity verification with {len(selfie_images)} frames")
    
    try:
        # 1. LOAD AND VALIDATE DOCUMENT
        doc_bytes = await document_image.read()
        document_array = decode_file_to_image(doc_bytes)
        
        if document_array is None:
            elapsed = (time.time() - start_time) * 1000
            return IdentityVerifyResponse(
                verified=False, match_score=0, liveness_passed=False,
                document_type="unknown", face_extracted=False,
                rejection_reason="document_unreadable", processing_time_ms=elapsed
            )
        
        # 2. LOAD ALL SELFIE FRAMES
        selfie_arrays = []
        for file in selfie_images:
            content = await file.read()
            arr = decode_file_to_image(content)
            if arr is not None:
                selfie_arrays.append(arr)
        
        if not selfie_arrays:
            elapsed = (time.time() - start_time) * 1000
            return IdentityVerifyResponse(
                verified=False, match_score=0, liveness_passed=False,
                document_type="unknown", face_extracted=False,
                rejection_reason="face_not_found", processing_time_ms=elapsed
            )

        # 3. DETECT DOCUMENT TYPE & EXTRACT FIELDS (Using Reducto)
        document_type = detect_document_type(document_array)
        doc_fields = extract_document_fields(document_array, document_type)
        
        # Prefer Reducto's extracted face region if available
        doc_face = doc_fields.get("face_region")
        doc_face_found = doc_face is not None
        
        if not doc_face_found:
            logger.info(f"[{platform_user_id}] Reducto face extraction skipped/failed, falling back to CV2")
            doc_face, doc_face_found, _ = extract_face_from_image(document_array)
        else:
            logger.info(f"[{platform_user_id}] Using high-fidelity face region extracted by Reducto")
        
        if not doc_face_found:
            elapsed = (time.time() - start_time) * 1000
            return IdentityVerifyResponse(
                verified=False, match_score=0, liveness_passed=False,
                document_type=document_type, face_extracted=False,
                rejection_reason="face_not_found", processing_time_ms=elapsed
            )

        # 4. FACE MATCHING (Process a subset of frames to optimize speed)
        # We sample every 3rd frame to provide good coverage while keeping processing time low
        sampled_indices = range(0, len(selfie_arrays), 3)
        logger.info(f"[{platform_user_id}] Sampling {len(list(sampled_indices))} frames for biometric matching")
        
        best_match_score = 0
        any_face_found = False
        
        for i in sampled_indices:
            selfie_arr = selfie_arrays[i]
            # Extract face from selfie frame
            selfie_face, face_found, _ = extract_face_from_image(selfie_arr)
            if face_found:
                any_face_found = True
                match_result = match_faces(doc_face, selfie_face, threshold=0.75)
                score = match_result.get("match_score", 0)
                if score > best_match_score:
                    best_match_score = score
        
        if not any_face_found:
            elapsed = (time.time() - start_time) * 1000
            return IdentityVerifyResponse(
                verified=False, match_score=0, liveness_passed=False,
                document_type=document_type, face_extracted=False,
                rejection_reason="face_not_found", processing_time_ms=elapsed
            )

        # 5. LIVENESS DETECTION (Gesture Sequence Validation)
        # Using the multiple frames as sequence for liveness check
        liveness_result = check_liveness(selfie_arrays)
        liveness_passed = liveness_result.get("liveness_passed", False)

        # 6. DETERMINE FINAL STATUS
        # Threshold: 90% for strict production security (as requested)
        match_threshold = 90
        verified = best_match_score >= match_threshold and liveness_passed
        
        rejection_reason = None
        if not verified:
            if best_match_score < match_threshold:
                rejection_reason = "match_below_threshold"
            elif not liveness_passed:
                rejection_reason = "liveness_failed"
        
        elapsed = (time.time() - start_time) * 1000
        logger.info(f"[{platform_user_id}] Verification complete: verified={verified}, match_score={best_match_score}, liveness={liveness_passed}, doc_type={document_type}, time={elapsed:.2f}ms")
        
        return IdentityVerifyResponse(
            verified=verified,
            match_score=best_match_score,
            liveness_passed=liveness_passed,
            document_type=document_type,
            face_extracted=True,
            rejection_reason=rejection_reason,
            processing_time_ms=elapsed
        )
    
    except Exception as e:
        logger.error(f"[{platform_user_id}] Exception during identity verification: {e}", exc_info=True)
        elapsed = (time.time() - start_time) * 1000
        raise HTTPException(status_code=500, detail=str(e))
