"""
Identity Verification Endpoint
Handles document verification, face extraction, liveness detection, and face matching
"""

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
    selfie_image: UploadFile = File(...),
    selfie_frames: Optional[List[UploadFile]] = File(None)
) -> IdentityVerifyResponse:
    """
    Verify user identity through document and selfie analysis
    
    Per API_CONTRACT.md:
    - Match score: 0-100 integer
    - Rejection reasons: face_not_found, liveness_failed, match_below_threshold, document_unreadable
    - Processing time < 500ms target
    
    Args:
        platform_user_id: Unique user identifier for audit logging
        document_image: Government-issued ID document (JPEG/PNG)
        selfie_image: Selfie for face matching (JPEG/PNG)
        selfie_frames: Optional frames for liveness detection (JPEG/PNG)
    
    Returns:
        IdentityVerifyResponse with verification results
    """
    start_time = time.time()
    logger.info(f"[{platform_user_id}] Starting identity verification...")
    
    try:
        # 1. LOAD AND VALIDATE IMAGES
        doc_bytes = await document_image.read()
        selfie_bytes = await selfie_image.read()
        
        document_array = decode_file_to_image(doc_bytes)
        selfie_array = decode_file_to_image(selfie_bytes)
        
        if document_array is None:
            logger.error(f"[{platform_user_id}] Failed to decode document image")
            elapsed = (time.time() - start_time) * 1000
            return IdentityVerifyResponse(
                verified=False,
                match_score=0,
                liveness_passed=False,
                document_type="unknown",
                face_extracted=False,
                rejection_reason="document_unreadable",
                processing_time_ms=elapsed
            )
        
        if selfie_array is None:
            logger.error(f"[{platform_user_id}] Failed to decode selfie image")
            elapsed = (time.time() - start_time) * 1000
            return IdentityVerifyResponse(
                verified=False,
                match_score=0,
                liveness_passed=False,
                document_type="unknown",
                face_extracted=False,
                rejection_reason="document_unreadable",
                processing_time_ms=elapsed
            )
        
        # Validate image quality
        doc_quality = validate_image_quality(document_array)
        selfie_quality = validate_image_quality(selfie_array)
        
        logger.info(f"[{platform_user_id}] Document quality: {doc_quality}")
        logger.info(f"[{platform_user_id}] Selfie quality: {selfie_quality}")
        
        # 2. EXTRACT FACE FROM DOCUMENT
        doc_face, doc_face_found, doc_confidence = extract_face_from_image(document_array)
        
        if not doc_face_found:
            logger.warning(f"[{platform_user_id}] No face found in document")
            elapsed = (time.time() - start_time) * 1000
            return IdentityVerifyResponse(
                verified=False,
                match_score=0,
                liveness_passed=False,
                document_type="unknown",
                face_extracted=False,
                rejection_reason="face_not_found",
                processing_time_ms=elapsed
            )
        
        # 3. EXTRACT FACE FROM SELFIE
        selfie_face, selfie_face_found, selfie_confidence = extract_face_from_image(selfie_array)
        
        if not selfie_face_found:
            logger.warning(f"[{platform_user_id}] No face found in selfie")
            elapsed = (time.time() - start_time) * 1000
            return IdentityVerifyResponse(
                verified=False,
                match_score=0,
                liveness_passed=False,
                document_type="unknown",
                face_extracted=False,
                rejection_reason="face_not_found",
                processing_time_ms=elapsed
            )
        
        # 4. LIVENESS DETECTION (if frames provided)
        liveness_passed = True
        if selfie_frames and len(selfie_frames) > 0:
            logger.info(f"[{platform_user_id}] Processing {len(selfie_frames)} liveness frames...")
            frames_arrays = []
            for frame_file in selfie_frames:
                frame_bytes = await frame_file.read()
                frame_array = decode_file_to_image(frame_bytes)
                if frame_array is not None:
                    frames_arrays.append(frame_array)
            
            if frames_arrays:
                liveness_result = check_liveness(frames_arrays)
                liveness_passed = liveness_result.get("liveness_passed", False)
                logger.info(f"[{platform_user_id}] Liveness result: {liveness_result}")
            else:
                logger.warning(f"[{platform_user_id}] No valid frames for liveness detection")
                liveness_passed = True  # Allow to continue if frames invalid
        
        if not liveness_passed:
            logger.warning(f"[{platform_user_id}] Liveness check failed")
            elapsed = (time.time() - start_time) * 1000
            return IdentityVerifyResponse(
                verified=False,
                match_score=0,
                liveness_passed=False,
                document_type="unknown",
                face_extracted=True,
                rejection_reason="liveness_failed",
                processing_time_ms=elapsed
            )
        
        # 5. FACE MATCHING
        match_result = match_faces(doc_face, selfie_face, threshold=0.6)
        match_score = match_result.get("match_score", 0)
        
        logger.info(f"[{platform_user_id}] Face match result: score={match_score}, {match_result}")
        
        # 6. DETERMINE VERIFICATION STATUS
        match_threshold = 85  # Per API_CONTRACT.md: threshold 85% = PASS
        verified = match_score >= match_threshold and liveness_passed
        
        rejection_reason = None
        if not verified:
            if match_score < match_threshold:
                rejection_reason = "match_below_threshold"
            elif not liveness_passed:
                rejection_reason = "liveness_failed"
        
        elapsed = (time.time() - start_time) * 1000
        
        logger.info(
            f"[{platform_user_id}] Identity verification complete: "
            f"verified={verified}, score={match_score}, time={elapsed:.1f}ms"
        )
        
        return IdentityVerifyResponse(
            verified=verified,
            match_score=match_score,
            liveness_passed=liveness_passed,
            document_type="drivers_license",  # TODO: Extract actual document type from image
            face_extracted=True,
            rejection_reason=rejection_reason,
            processing_time_ms=elapsed
        )
    
    except Exception as e:
        logger.error(f"[{platform_user_id}] Exception during identity verification: {e}", exc_info=True)
        elapsed = (time.time() - start_time) * 1000
        raise HTTPException(status_code=500, detail=str(e))
