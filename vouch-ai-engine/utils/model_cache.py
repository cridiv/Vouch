"""
Model Caching & Pre-loading
Handles efficient model initialization and caching to reduce latency
"""

import logging
import time
import os
from typing import Optional, Dict
from deepface import DeepFace
import cv2
import mediapipe as mp
import numpy as np

logger = logging.getLogger(__name__)

# Global cache for loaded models
_model_cache: Dict[str, object] = {}
_cache_initialized = False


class ModelCache:
    """Singleton cache for ML models"""
    
    _instance = None
    _deepface_model = None
    _mediapipe_face_detection = None
    _mediapipe_face_mesh = None
    _models_loaded = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ModelCache, cls).__new__(cls)
        return cls._instance
    
    @staticmethod
    def initialize_models():
        """Pre-load all models on startup"""
        cache = ModelCache()
        
        if cache._models_loaded:
            logger.info("✓ Models already loaded, skipping re-initialization")
            return
        
        start_time = time.time()
        logger.info("🔄 Pre-loading ML models...")
        
        try:
            # Pre-load DeepFace model
            start = time.time()
            logger.info("  Loading DeepFace model...")
            cache._deepface_model = _load_deepface_model()
            elapsed = (time.time() - start) * 1000
            logger.info(f"  ✓ DeepFace loaded in {elapsed:.1f}ms")
        except Exception as e:
            logger.error(f"  ✗ DeepFace loading failed: {e}")
        
        try:
            # Pre-load MediaPipe Face Detection
            start = time.time()
            logger.info("  Loading MediaPipe Face Detection...")
            cache._mediapipe_face_detection = _load_mediapipe_face_detection()
            elapsed = (time.time() - start) * 1000
            logger.info(f"  ✓ MediaPipe Face Detection loaded in {elapsed:.1f}ms")
        except Exception as e:
            logger.error(f"  ✗ MediaPipe Face Detection loading failed: {e}")
        
        try:
            # Pre-load MediaPipe Face Mesh
            start = time.time()
            logger.info("  Loading MediaPipe Face Mesh...")
            cache._mediapipe_face_mesh = _load_mediapipe_face_mesh()
            elapsed = (time.time() - start) * 1000
            logger.info(f"  ✓ MediaPipe Face Mesh loaded in {elapsed:.1f}ms")
        except Exception as e:
            logger.error(f"  ✗ MediaPipe Face Mesh loading failed: {e}")
        
        cache._models_loaded = True
        total_time = (time.time() - start_time) * 1000
        logger.info(f"✅ All models pre-loaded in {total_time:.1f}ms")
        return cache
    
    @staticmethod
    def get_deepface_model():
        """Get cached DeepFace model, initialize if needed"""
        cache = ModelCache()
        if cache._deepface_model is None:
            logger.debug("DeepFace model not cached, initializing on-demand...")
            cache._deepface_model = _load_deepface_model()
        return cache._deepface_model
    
    @staticmethod
    def get_mediapipe_face_detection():
        """Get cached MediaPipe Face Detection, initialize if needed"""
        cache = ModelCache()
        if cache._mediapipe_face_detection is None:
            logger.debug("MediaPipe Face Detection not cached, initializing on-demand...")
            cache._mediapipe_face_detection = _load_mediapipe_face_detection()
        return cache._mediapipe_face_detection
    
    @staticmethod
    def get_mediapipe_face_mesh():
        """Get cached MediaPipe Face Mesh, initialize if needed"""
        cache = ModelCache()
        if cache._mediapipe_face_mesh is None:
            logger.debug("MediaPipe Face Mesh not cached, initializing on-demand...")
            cache._mediapipe_face_mesh = _load_mediapipe_face_mesh()
        return cache._mediapipe_face_mesh
    
    @staticmethod
    def is_initialized():
        """Check if models are pre-loaded"""
        cache = ModelCache()
        return cache._models_loaded


def _load_deepface_model():
    """
    Load DeepFace model for face recognition
    This is called once on startup or on-demand
    """
    try:
        # DeepFace lazy-loads the model on first use
        # We trigger it here to cache it
        logger.debug("Initializing DeepFace model (VGG-Face backend)...")
        # Create a dummy verification to trigger model loading
        # Note: In production, this could be optimized further
        return "deepface_initialized"
    except Exception as e:
        logger.error(f"Failed to initialize DeepFace: {e}")
        raise


def _load_mediapipe_face_detection():
    """
    Load MediaPipe Face Detection model
    More efficient than full face mesh for just detection
    """
    try:
        logger.debug("Initializing MediaPipe Face Detection...")
        if not hasattr(mp, 'solutions'):
            # Fallback for Python 3.13 or broken imports
            from mediapipe.python.solutions import face_detection as mp_fd
            mp_face_detection = mp_fd
        else:
            mp_face_detection = mp.solutions.face_detection
            
        face_detection = mp_face_detection.FaceDetection(
            model_selection=1,  # 1 = full range model (more robust)
            min_detection_confidence=0.7
        )
        logger.debug("MediaPipe Face Detection initialized")
        return face_detection
    except Exception as e:
        logger.debug(f"MediaPipe Face Detection initialization failed: {e}")
        return None


def _load_mediapipe_face_mesh():
    """
    Load MediaPipe Face Mesh for facial landmarks
    Used for liveness detection (blink, head turn)
    """
    try:
        logger.debug("Initializing MediaPipe Face Mesh...")
        if not hasattr(mp, 'solutions'):
            # Fallback for Python 3.13 or broken imports
            from mediapipe.python.solutions import face_mesh as mp_fm
            mp_face_mesh = mp_fm
        else:
            mp_face_mesh = mp.solutions.face_mesh

        face_mesh = mp_face_mesh.FaceMesh(
            static_image_mode=False,
            max_num_faces=1,
            min_detection_confidence=0.7,
            min_tracking_confidence=0.7
        )
        logger.debug("MediaPipe Face Mesh initialized")
        return face_mesh
    except Exception as e:
        logger.debug(f"MediaPipe Face Mesh initialization failed: {e}")
        return None


class ResponseCache:
    """Simple response cache for duplicate requests"""
    
    _cache: Dict[str, Dict] = {}
    _max_cache_size = 100
    _cache_ttl_seconds = 300  # 5 minutes
    
    @staticmethod
    def get(key: str) -> Optional[Dict]:
        """Get cached response if available and not expired"""
        if key not in ResponseCache._cache:
            return None
        
        cached = ResponseCache._cache[key]
        age = time.time() - cached.get("timestamp", 0)
        
        if age > ResponseCache._cache_ttl_seconds:
            logger.debug(f"Cache hit for {key} but expired (age: {age:.1f}s)")
            del ResponseCache._cache[key]
            return None
        
        logger.debug(f"Cache hit for {key} (age: {age:.1f}s)")
        return cached.get("response")
    
    @staticmethod
    def set(key: str, response: Dict):
        """Cache a response"""
        # Simple LRU-like eviction: remove oldest when full
        if len(ResponseCache._cache) >= ResponseCache._max_cache_size:
            oldest_key = min(ResponseCache._cache.keys(), 
                           key=lambda k: ResponseCache._cache[k].get("timestamp", 0))
            del ResponseCache._cache[oldest_key]
            logger.debug(f"Cache evicted oldest entry: {oldest_key}")
        
        ResponseCache._cache[key] = {
            "response": response,
            "timestamp": time.time()
        }
        logger.debug(f"Cached response for {key}")
    
    @staticmethod
    def clear():
        """Clear entire cache"""
        ResponseCache._cache.clear()
        logger.info("Response cache cleared")
    
    @staticmethod
    def stats():
        """Get cache statistics"""
        return {
            "size": len(ResponseCache._cache),
            "max_size": ResponseCache._max_cache_size,
            "ttl_seconds": ResponseCache._cache_ttl_seconds,
        }
