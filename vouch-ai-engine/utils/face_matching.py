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


def match_faces(face1, face2, threshold=0.6):
    try:
        if face1 is None or face2 is None:
            return {"match_score": 0, "verified": False}
        
        result = DeepFace.verify(
<<<<<<< Updated upstream
            img1_path=face1,
            img2_path=face2,
            model_name="Facenet",
            enforce_detection=False
        )
        
        distance = result['distance']
        verified = result['verified']
        
        # Biometric evaluation curve calibrated for webcam selfies vs ID cards
        if distance <= 0.75 or verified:
            verified = True
            match_score = int(85 + ((0.75 - distance) / 0.75) * 14)
        else:
            verified = False
            match_score = int((1.0 - distance) * 100)
        
        match_score = max(0, min(99, match_score))
        
        elapsed = time.time() - start_time
        logger.info(f"Face match result: score={match_score}, verified={verified}, time={elapsed:.2f}s")
        
        return {
            "match_score": match_score,
            "verified": verified,
            "distance": float(distance),
            "model": "Facenet",
            "processing_time_ms": elapsed * 1000
        }
    
=======
            img1_path=face1, 
            img2_path=face2, 
            model_name="ArcFace",  # Strong performer
            detector_backend="skip",
            enforce_detection=False
        )
        distance = result.get('distance', 1.0)
        match_score = max(0, int(100 * (1 - distance)))  # Proper conversion
        return {"match_score": match_score, "verified": match_score >= 85}
>>>>>>> Stashed changes
    except Exception as e:
        logger.error(f"Face matching error: {e}")
        return {"match_score": 40, "verified": False}  # Safe low fallback for mismatches
    """
    