"""
Test conftest - Shared pytest configuration
"""

import pytest
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))


@pytest.fixture
def mock_deepface_monkeypatch(monkeypatch):
    """Mock DeepFace for testing without model downloads"""
    
    class MockDeepFace:
        @staticmethod
        def verify(img1_path, img2_path, **kwargs):
            # Simulate successful face match
            return {
                "verified": True,
                "distance": 0.25,
                "threshold": 0.6,
                "model": "VGGFace2",
                "detector_backend": "opencv",
                "align": True
            }
    
    monkeypatch.setattr("utils.face_matching.DeepFace", MockDeepFace)
