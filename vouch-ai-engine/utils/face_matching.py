"""
Face matching utilities using DeepFace
"""

import logging
import time
import cv2
import numpy as np
from typing import Optional, Tuple

logger = logging.getLogger(__name__)

# Lazy load DeepFace to avoid startup delay
_deepface_loaded = False
DeepFace = None


def _load_deepface():
    """Lazy load DeepFace on first use"""
    global _deepface_loaded, DeepFace
    if not _deepface_loaded:
        try:
            from deepface import DeepFace as DF
            DeepFace = DF
            _deepface_loaded = True
            logger.info("✓ DeepFace loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load DeepFace: {e}")
            _deepface_loaded = True


def extract_face_from_image(image: np.ndarray) -> Tuple[Optional[np.ndarray], bool, float]:
    """
    Extract face region from image using OpenCV cascade
    
    Args:
        image: numpy array of image (BGR format)
    
    Returns:
        tuple: (face_array, face_found, confidence)
    """
    try:
        # Load cascade classifier
        cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        face_cascade = cv2.CascadeClassifier(cascade_path)
        
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.1, 4)
        
        if len(faces) == 0:
            logger.warning("No face detected in image")
            return None, False, 0.0
        
        # Select largest face (assumed to be the subject)
        largest_face = max(faces, key=lambda f: f[2] * f[3])
        x, y, w, h = largest_face
        
        # Add padding
        padding = int(0.2 * w)
        x = max(0, x - padding)
        y = max(0, y - padding)
        w = min(image.shape[1] - x, w + 2 * padding)
        h = min(image.shape[0] - y, h + 2 * padding)
        
        face_region = image[y:y+h, x:x+w]
        
        # Confidence is based on face size relative to image
        confidence = (w * h) / (image.shape[0] * image.shape[1])
        
        logger.info(f"Face extracted: size={face_region.shape}, confidence={confidence:.2f}")
        return face_region, True, min(confidence, 1.0)
    
    except Exception as e:
        logger.error(f"Error extracting face: {e}")
        return None, False, 0.0


def match_faces(face1: np.ndarray, face2: np.ndarray, threshold: float = 0.6) -> dict:
    """
    Compare two face images and return match score
    
    Args:
        face1: numpy array of first face (from document)
        face2: numpy array of second face (from selfie)
        threshold: match distance threshold (DeepFace uses cosine distance, 0-1)
    
    Returns:
        dict: {
            "match_score": 0-100 integer,
            "verified": boolean,
            "distance": float,
            "model": str
        }
    """
    try:
        _load_deepface()
        
        if DeepFace is None:
            logger.error("DeepFace not loaded")
            return {
                "match_score": 0,
                "verified": False,
                "distance": 1.0,
                "model": "unknown",
                "error": "DeepFace not available"
            }
        
        start_time = time.time()
        
        # Use DeepFace to verify faces
        result = DeepFace.verify(
            img1_path=face1,
            img2_path=face2,
            model_name="VGGFace2",
            enforce_detection=False
        )
        
        distance = result['distance']
        verified = result['verified']
        
        # Convert distance to match score (0-100)
        # Smaller distance = better match
        match_score = int((1 - distance) * 100)
        match_score = max(0, min(100, match_score))  # Clamp to 0-100
        
        elapsed = time.time() - start_time
        logger.info(f"Face match result: score={match_score}, verified={verified}, time={elapsed:.2f}s")
        
        return {
            "match_score": match_score,
            "verified": verified,
            "distance": float(distance),
            "model": "VGGFace2",
            "processing_time_ms": elapsed * 1000
        }
    
    except Exception as e:
        logger.error(f"Error matching faces: {e}")
        return {
            "match_score": 0,
            "verified": False,
            "distance": 1.0,
            "model": "VGGFace2",
            "error": str(e)
        }
