"""
Liveness detection utilities using MediaPipe
Implements blink detection and head turn detection
"""

import logging
import time
import cv2
import numpy as np
from typing import Tuple, List, Optional

logger = logging.getLogger(__name__)

# Lazy load MediaPipe
_mediapipe_loaded = False
mp_face_mesh = None
mp_drawing = None


def _load_mediapipe():
    """Lazy load MediaPipe on first use"""
    global _mediapipe_loaded, mp_face_mesh, mp_drawing
    if not _mediapipe_loaded:
        try:
            import mediapipe as mp
            # Try standard attribute access
            if hasattr(mp, 'solutions'):
                mp_face_mesh = mp.solutions.face_mesh
                mp_drawing = mp.solutions.drawing_utils
            else:
                # Try internal path if top-level attribute is missing
                from mediapipe.python.solutions import face_mesh, drawing_utils
                mp_face_mesh = face_mesh
                mp_drawing = drawing_utils
            
            _mediapipe_loaded = True
            logger.info("✓ MediaPipe loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load MediaPipe: {e}")
            _mediapipe_loaded = True 


def get_eye_aspect_ratio(landmarks, eye_indices: List[int]) -> float:
    """
    Calculate eye aspect ratio for blink detection
    
    Args:
        landmarks: MediaPipe face landmarks
        eye_indices: Indices of eye points (e.g., left or right eye)
    
    Returns:
        float: Eye aspect ratio
    """
    if len(eye_indices) < 6:
        return 0.0
    
    points = [landmarks[i] for i in eye_indices]
    
    # Vertical distances
    vertical1 = np.linalg.norm(np.array(points[1]) - np.array(points[5]))
    vertical2 = np.linalg.norm(np.array(points[2]) - np.array(points[4]))
    
    # Horizontal distance
    horizontal = np.linalg.norm(np.array(points[0]) - np.array(points[3]))
    
    # Eye aspect ratio
    ear = (vertical1 + vertical2) / (2.0 * horizontal)
    return ear


def detect_blink(frames: List[np.ndarray], num_required_blinks: int = 2, ear_threshold: float = 0.2) -> dict:
    """
    Detect eye blinks across video frames
    
    Args:
        frames: list of numpy arrays (video frames in BGR)
        num_required_blinks: number of blinks to require
        ear_threshold: eye aspect ratio threshold for closed eye
    
    Returns:
        dict: {
            "blink_detected": boolean,
            "num_blinks": int,
            "confidence": float,
            "processing_time_ms": float
        }
    """
    try:
        _load_mediapipe()
        
        if mp_face_mesh is None or not frames or len(frames) == 0:
            return {
                "blink_detected": False,
                "num_blinks": 0,
                "confidence": 0.0,
                "error": "MediaPipe not loaded or no frames provided"
            }
        
        start_time = time.time()
        
        # MediaPipe indices for eye landmarks
        LEFT_EYE = [362, 385, 387, 263, 373, 380]
        RIGHT_EYE = [33, 160, 158, 133, 153, 144]
        
        blink_count = 0
        in_blink = False
        ear_history = []
        
        with mp_face_mesh.FaceMesh(
            static_image_mode=False,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5
        ) as face_mesh:
            
            for frame in frames:
                if frame is None:
                    continue
                
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                result = face_mesh.process(rgb_frame)
                
                if not result.multi_face_landmarks:
                    continue
                
                landmarks = [(lm.x, lm.y, lm.z) for lm in result.multi_face_landmarks[0].landmark]
                
                # Calculate EAR for both eyes
                left_ear = get_eye_aspect_ratio(landmarks, LEFT_EYE)
                right_ear = get_eye_aspect_ratio(landmarks, RIGHT_EYE)
                avg_ear = (left_ear + right_ear) / 2.0
                
                ear_history.append(avg_ear)
                
                # Detect blink (eye closed then opened)
                if avg_ear < ear_threshold:
                    if not in_blink:
                        in_blink = True
                else:
                    if in_blink:
                        blink_count += 1
                        in_blink = False
        
        elapsed = time.time() - start_time
        blink_detected = blink_count >= num_required_blinks
        confidence = min(blink_count / num_required_blinks, 1.0) if num_required_blinks > 0 else 0.0
        
        logger.info(f"Blink detection: detected={blink_detected}, count={blink_count}, confidence={confidence:.2f}")
        
        return {
            "blink_detected": blink_detected,
            "num_blinks": blink_count,
            "confidence": float(confidence),
            "processing_time_ms": elapsed * 1000
        }
    
    except Exception as e:
        logger.error(f"Error detecting blinks: {e}")
        return {
            "blink_detected": False,
            "num_blinks": 0,
            "confidence": 0.0,
            "error": str(e)
        }


def detect_head_turn(frames: List[np.ndarray], rotation_threshold_degrees: float = 30.0) -> dict:
    """
    Detect head rotation across video frames
    
    Args:
        frames: list of numpy arrays (video frames in BGR)
        rotation_threshold_degrees: minimum rotation degree
    
    Returns:
        dict: {
            "head_turn_detected": boolean,
            "max_rotation": float,
            "confidence": float,
            "processing_time_ms": float
        }
    """
    try:
        _load_mediapipe()
        
        if mp_face_mesh is None or not frames or len(frames) == 0:
            return {
                "head_turn_detected": False,
                "max_rotation": 0.0,
                "confidence": 0.0,
                "error": "MediaPipe not loaded or no frames provided"
            }
        
        start_time = time.time()
        
        # Use face landmarks to estimate head pose
        # Landmarks for nose tip and face center
        NOSE_TIP = 1
        CHIN = 152
        LEFT_EYE = 33
        RIGHT_EYE = 263
        
        rotations = []
        
        with mp_face_mesh.FaceMesh(
            static_image_mode=False,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5
        ) as face_mesh:
            
            for frame in frames:
                if frame is None:
                    continue
                
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                result = face_mesh.process(rgb_frame)
                
                if not result.multi_face_landmarks:
                    continue
                
                landmarks = result.multi_face_landmarks[0].landmark
                
                # Get key points
                nose = np.array([landmarks[NOSE_TIP].x, landmarks[NOSE_TIP].y])
                chin = np.array([landmarks[CHIN].x, landmarks[CHIN].y])
                left_eye = np.array([landmarks[LEFT_EYE].x, landmarks[LEFT_EYE].y])
                right_eye = np.array([landmarks[RIGHT_EYE].x, landmarks[RIGHT_EYE].y])
                
                # Calculate face center
                face_center = (left_eye + right_eye) / 2.0
                
                # Calculate vertical vector (from face center to nose)
                vertical = nose - face_center
                
                # Calculate yaw (horizontal rotation) based on nose position relative to eyes
                yaw = np.arctan2(vertical[0], vertical[1]) * 180 / np.pi
                rotations.append(abs(yaw))
        
        max_rotation = max(rotations) if rotations else 0.0
        head_turn_detected = max_rotation >= rotation_threshold_degrees
        confidence = min(max_rotation / rotation_threshold_degrees, 1.0) if rotation_threshold_degrees > 0 else 0.0
        
        elapsed = time.time() - start_time
        logger.info(f"Head turn detection: detected={head_turn_detected}, max_rotation={max_rotation:.1f}°, confidence={confidence:.2f}")
        
        return {
            "head_turn_detected": head_turn_detected,
            "max_rotation": float(max_rotation),
            "confidence": float(confidence),
            "processing_time_ms": elapsed * 1000
        }
    
    except Exception as e:
        logger.error(f"Error detecting head turn: {e}")
        return {
            "head_turn_detected": False,
            "max_rotation": 0.0,
            "confidence": 0.0,
            "error": str(e)
        }

def check_liveness(frames: List[np.ndarray]) -> dict:
    """
    Comprehensive liveness check combining blink and head turn
    
    Args:
        frames: list of numpy arrays (video frames in BGR)
    
    Returns:
        dict: {
            "liveness_passed": boolean,
            "blink_detected": boolean,
            "head_turn_detected": boolean,
            "confidence": float,
            "processing_time_ms": float
        }
    """
    try:
        start_time = time.time()
        
        if not frames or len(frames) == 0:
            return {
                "liveness_passed": False,
                "blink_detected": False,
                "head_turn_detected": False,
                "confidence": 0.0,
                "error": "No frames provided"
            }
        
        # Run both checks
        blink_result = detect_blink(frames, num_required_blinks=1)
        head_result = detect_head_turn(frames, rotation_threshold_degrees=15.0)
        
        # Liveness passes if either blink or head turn is detected
        # (more lenient for MVP, can be tightened later)
        liveness_passed = blink_result.get("blink_detected", False) or head_result.get("head_turn_detected", False)
        
        
        # Confidence is average of both
        blink_conf = blink_result.get("confidence", 0.0)
        head_conf = head_result.get("confidence", 0.0)
        confidence = (blink_conf + head_conf) / 2.0
        
        elapsed = time.time() - start_time
        
        logger.info(f"Liveness check: passed={liveness_passed}, confidence={confidence:.2f}")
        
        return {
            "liveness_passed": liveness_passed,
            "blink_detected": blink_result.get("blink_detected", False),
            "head_turn_detected": head_result.get("head_turn_detected", False),
            "confidence": float(confidence),
            "processing_time_ms": elapsed * 1000
        }
    
    except Exception as e:
        logger.error(f"Error checking liveness: {e}")
        return {
            "liveness_passed": False,
            "blink_detected": False,
            "head_turn_detected": False,
            "confidence": 0.0,
            "error": str(e)
        }
