"""
Image processing utilities for document and face handling
"""

import logging
import io
import base64
import cv2
import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)


def decode_base64_to_image(base64_str: str) -> np.ndarray:
    """
    Decode base64 string to numpy array (OpenCV format)
    
    Args:
        base64_str: Base64 encoded image string
    
    Returns:
        numpy array in BGR format (OpenCV)
    """
    try:
        # Remove data URI prefix if present
        if ',' in base64_str:
            base64_str = base64_str.split(',')[1]
        
        image_bytes = base64.b64decode(base64_str)
        image = Image.open(io.BytesIO(image_bytes))
        
        # Convert to BGR (OpenCV format)
        image_array = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        return image_array
    except Exception as e:
        logger.error(f"Error decoding base64 image: {e}")
        return None


def decode_file_to_image(file_bytes) -> np.ndarray:
    """
    Decode image file bytes to numpy array
    
    Args:
        file_bytes: File bytes from upload
    
    Returns:
        numpy array in BGR format (OpenCV)
    """
    try:
        nparr = np.frombuffer(file_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        return image
    except Exception as e:
        logger.error(f"Error decoding image file: {e}")
        return None


def validate_image_quality(image: np.ndarray) -> dict:
    """
    Validate image quality (brightness, contrast, blur)
    
    Args:
        image: numpy array of image
    
    Returns:
        dict with quality metrics
    """
    try:
        # Check if image is too dark or too bright
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        brightness = np.mean(gray)
        
        # Calculate Laplacian variance (blur detection)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        
        # Calculate contrast
        contrast = np.std(gray)
        
        return {
            "brightness": float(brightness),
            "contrast": float(contrast),
            "blur_score": float(laplacian_var),
            "is_valid": 20 < brightness < 235 and laplacian_var > 100
        }
    except Exception as e:
        logger.error(f"Error validating image quality: {e}")
        return {"is_valid": False, "error": str(e)}
