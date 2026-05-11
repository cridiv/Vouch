# Setup Guide

## Prerequisites

- Python 3.9+
- pip or conda (package manager)
- Git (for version control)

## Initial Setup

### 1. Create Virtual Environment

```bash
# Windows
python -m venv venv
.\venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Environment Configuration

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your settings (optional for development)
```

### 4. Run the Service

```bash
python app.py
```

The service will start on `http://localhost:5000`

### 5. Test Health Endpoint

```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "status": "OK",
  "service": "TrustLayer ML",
  "version": "0.1.0"
}
```

---

## Running Tests

```bash
# Run all tests
pytest tests/

# Run with coverage
pytest tests/ --cov=.

# Run specific test file
pytest tests/test_identity_verify.py -v
```

---

## Troubleshooting

### DeepFace Installation Issues

DeepFace requires TensorFlow. If you encounter issues:

```bash
# Install TensorFlow explicitly
pip install tensorflow

# Then install DeepFace
pip install deepface
```

### OpenCV Issues

If OpenCV fails to install:

```bash
pip install opencv-python-headless
```

### MediaPipe Issues

```bash
pip install mediapipe
```

---

## Performance Targets

- `/identity/verify`: < 500ms
- `/fraud/assess`: < 100ms

Monitor these in the logs and optimize as needed.

---

## Next Steps

1. Lock the fraud context schema with backend team (Day 1)
2. Implement Phase 1 (Environment setup) - see README.md
3. Begin Phase 2 (Identity verification)
