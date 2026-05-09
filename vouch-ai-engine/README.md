# ML Engineer — TrustLayer SDK

## Role Overview

You own two HTTP endpoints. That is your entire surface area. Keep them stable.

**Endpoint 1:** Identity Verification (`POST /identity/verify`)
- Document image analysis via computer vision
- Face extraction and liveness detection
- Output: verified status, match score, confidence

**Endpoint 2:** Fraud Decision Engine (`POST /fraud/assess`)
- Synchronous fraud scoring on transaction context
- Score: 0–100 mapped to GREEN/AMBER/RED
- Output: triggered signals, recommendation

### Key Constraint

Both endpoints must be **synchronous** — the backend waits for responses before proceeding. No async queues.

### Demo Highlight

Show live score changes: when VPN simulation is toggled (`is_vpn: true`, `impossible_travel: true`), your model must return RED and block the payment.

---

## TODO Checklist

### PHASE 1: Setup & Foundation (Days 1–2)

#### 1.1 Environment Setup
- [ ] Python environment setup (venv or conda)
- [ ] Dependency installation (see `requirements.txt`)
- [ ] Create virtual environment: `python -m venv venv`
- [ ] Activate: `.\venv\Scripts\activate` (Windows) or `source venv/bin/activate` (Mac/Linux)
- [ ] Install dependencies: `pip install -r requirements.txt`
- [ ] Test that all libraries import without error

#### 1.2 Schema Agreement
- [ ] Review fraud context JSON schema (README Section 4 in parent repo)
- [ ] Confirm all signal names with backend developer
- [ ] Agree on data types, null handling, units (e.g., km vs miles)
- [ ] Lock the schema — no changes after this point
- [ ] Document in `docs/API_CONTRACT.md`

#### 1.3 API Framework Scaffolding
- [ ] FastAPI app initialized
- [ ] Create health check endpoint: `GET /health` → `{ status: "OK" }`
- [ ] Logging configured (request ID, timing, error tracking)
- [ ] Base project structure set up
- [ ] Test endpoint responsiveness locally

---

### PHASE 2: Identity Verification Endpoint (Days 2–4)

#### 2.1 Computer Vision — Face Extraction
- [ ] Install and test OpenCV locally
- [ ] Load sample document images (government ID format)
- [ ] Implement face region extraction from document:
  - [ ] Detect all faces in image
  - [ ] Select largest face (assumed to be the ID holder)
  - [ ] Crop bounding box + padding
- [ ] Test with 5+ sample documents — validate extraction works
- [ ] Handle edge cases:
  - [ ] No face found → rejection reason: `face_not_found`
  - [ ] Multiple faces → take largest
  - [ ] Poor image quality → log, continue

#### 2.2 Computer Vision — Document Field Extraction
- [ ] Use OCR or template matching to extract:
  - [ ] Document type (driver's license, national ID, passport)
  - [ ] Expiry date (check if expired)
  - [ ] Name field (store for later validation)
- [ ] Return detected fields in response
- [ ] Document extraction failures create rejection with reason

#### 2.3 Face Matching — DeepFace Integration
- [ ] Install DeepFace: `pip install deepface`
- [ ] Test face comparison locally:
  - [ ] Load two sample face images
  - [ ] Run `DeepFace.verify()` — get match distance
  - [ ] Convert distance to match_score (0–100 scale)
  - [ ] Set threshold: 85% = PASS, below = FAIL
- [ ] Implementation:
  - [ ] Extract face from document
  - [ ] Extract face from selfie
  - [ ] Compare using DeepFace
  - [ ] Return `match_score` and `verified` boolean
- [ ] Test with 10+ identity pairs (match + non-match)
- [ ] Document the distance-to-score conversion formula

#### 2.4 Liveness Detection
- [ ] Research liveness signals:
  - [ ] Blink detection (eyes open → close → open)
  - [ ] Head turn detection (360° angle change)
  - [ ] Anti-spoof: detect static images vs video
- [ ] Implement blink detection:
  - [ ] Use MediaPipe for facial landmarks
  - [ ] Detect eye closure ratio changing over frames
  - [ ] Require 2+ blinks within 5 seconds
- [ ] Implement head turn detection:
  - [ ] Require 30°+ rotation on yaw axis
  - [ ] Detect within video frame sequence
- [ ] Test with 5+ real selfie videos + static images
- [ ] Handle edge cases:
  - [ ] Low light → still attempt, log confidence
  - [ ] Motion blur → mark as poor quality
  - [ ] Liveness fails → rejection reason: `liveness_failed`

#### 2.5 `/identity/verify` Endpoint Implementation
- [ ] API route: `POST /identity/verify`
- [ ] Input handling:
  - [ ] Accept `document_image`, `selfie_image` (base64 or multipart)
  - [ ] Accept optional `selfie_frames[]` (array for liveness)
  - [ ] Accept `user_id` (for audit logging)
  - [ ] Validate file types (JPEG/PNG only)
  - [ ] Validate max file size (5MB per image)
- [ ] Processing flow implemented
- [ ] Response JSON with correct format
- [ ] Error handling:
  - [ ] Return rejection reasons correctly
  - [ ] 400 for bad input
  - [ ] 500 with error details for processing failures
- [ ] Test with 20+ real samples
- [ ] Measure latency — target < 500ms per request

---

### PHASE 3: Fraud Decision Model (Days 3–5)

#### 3.1 Model Architecture Design
- [ ] Review fraud context schema
- [ ] Define fraud signals across all categories
- [ ] Choose model approach (Recommended: Weighted Rule Engine for MVP speed)
- [ ] Document decision in `docs/MODEL_DESIGN.md`

#### 3.2 Training Data Preparation (If Using XGBoost)
- [ ] Create synthetic dataset (1000+ samples) with fraud labels
- [ ] Populate all signals from schema
- [ ] Fraud examples to include:
  - [ ] VPN + impossible travel = RED (fraud)
  - [ ] New account + large amount + high velocity = AMBER (suspicious)
  - [ ] Verified user + normal location + recurring behavior = GREEN (safe)
- [ ] Validation set (20% of data)
- [ ] Save dataset as CSV: `data/fraud_training_data.csv`

#### 3.3 Model Training (If Using XGBoost)
- [ ] Feature engineering (normalization, encoding, imputation)
- [ ] Train XGBoost classifier
- [ ] Hyperparameter tuning
- [ ] Cross-validation (5-fold)
- [ ] Evaluate (AUC-ROC > 0.85)
- [ ] Save model: `models/fraud_model.pkl`
- [ ] Document training process in `docs/MODEL_TRAINING.md`

#### 3.4 Rule Engine Implementation (Fastest Path)
- [ ] If using rule engine, define scoring rules
- [ ] Map score to flag (GREEN: 0–39, AMBER: 40–69, RED: 70–100)
- [ ] Document rules in `docs/FRAUD_RULES.md`

#### 3.5 `/fraud/assess` Endpoint Implementation
- [ ] API route: `POST /fraud/assess`
- [ ] Input validation (all required fields, type checking)
- [ ] Processing flow implemented
- [ ] Response JSON with correct format
- [ ] Error handling (400/500 responses)
- [ ] Performance: target latency < 100ms per request
- [ ] Test 50+ scenarios covering all signal combinations

---

### PHASE 4: Live Demo & Scoring Validation (Days 4–5)

#### 4.1 VPN Simulation Test (Demo Highlight)
- [ ] Ensure fraud model correctly triggers RED when:
  - [ ] `is_vpn: true` → score jumps to AMBER/RED
  - [ ] `impossible_travel: true` → hard RED
- [ ] Test locally with curl/Postman
- [ ] Document test results in `docs/DEMO_TEST_LOG.md`

#### 4.2 Edge Case Testing
- [ ] Test with incomplete context (missing optional fields)
- [ ] Test with null/zero values
- [ ] Test with extreme values
- [ ] Test with contradictory signals
- [ ] Confirm endpoint returns sensible scores

#### 4.3 Performance Profiling
- [ ] Measure `/identity/verify` latency breakdown
- [ ] Measure `/fraud/assess` latency (target < 100ms)
- [ ] Create load test (10 concurrent requests)
- [ ] Document in `docs/PERFORMANCE.md`

#### 4.4 Integration Testing with Backend
- [ ] Confirm backend can call both endpoints
- [ ] Test response parsing
- [ ] Test error handling
- [ ] Agree on timeout values with backend

---

### PHASE 5: Documentation & Handoff (Day 5)

#### 5.1 API Documentation
- [ ] Create `docs/API_SPEC.md`
- [ ] Create `docs/SETUP_GUIDE.md`

#### 5.2 Model Documentation
- [ ] Create `docs/MODEL_DETAILS.md`

#### 5.3 Testing & Validation
- [ ] Create `tests/test_identity_verify.py` (unit tests)
- [ ] Create `tests/test_fraud_assess.py` (unit tests)
- [ ] Create `tests/test_integration.py`
- [ ] Create `tests/test_edge_cases.py`
- [ ] All tests must pass: `pytest tests/`
- [ ] Aim for 80%+ code coverage

#### 5.4 Sample Data & Demo Files
- [ ] Populate `samples/` with:
  - [ ] Sample identity request/response JSON
  - [ ] Sample fraud request/response JSON
- [ ] Create `docs/DEMO_SCRIPT.md`

#### 5.5 Deployment Readiness
- [ ] `.env.example` configured
- [ ] Dockerfile created for ML service
- [ ] `docker-compose.yml` created (if needed)
- [ ] Document startup command
- [ ] Ensure service logs on startup

#### 5.6 Handoff Checklist
- [ ] Both endpoints callable via HTTP
- [ ] Responses match agreed schema
- [ ] Latency targets met
- [ ] VPN demo works (RED on suspicious input)
- [ ] Documentation complete
- [ ] Backend developer can integrate without questions
- [ ] Repo ready for demo day

---

## Success Criteria

- ✅ Identity endpoint returns verified status + match score for real document + selfie pairs
- ✅ Fraud endpoint scores transactions 0–100 with meaningful triggered signals
- ✅ VPN simulation toggles fraud score from GREEN to RED visibly
- ✅ Both endpoints respond in < 500ms and < 100ms respectively
- ✅ All code documented and tested
- ✅ Backend integration working end-to-end

---

## Quick Start

```bash
# 1. Create virtual environment
python -m venv venv
.\venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Run the app
python app.py

# 4. Test health endpoint
curl http://localhost:5000/health

# 5. Run tests
pytest tests/
```

---

## Folder Structure

```
ml-engineer/
├── README.md                 (this document)
├── requirements.txt
├── .env.example
├── Dockerfile
├── app.py                    (FastAPI main entry)
├── models/
│   ├── fraud_model.pkl
│   └── __init__.py
├── endpoints/
│   ├── identity_verify.py
│   ├── fraud_assess.py
│   └── __init__.py
├── utils/
│   ├── face_matching.py
│   ├── liveness_detection.py
│   ├── image_processing.py
│   └── __init__.py
├── tests/
│   ├── test_identity_verify.py
│   ├── test_fraud_assess.py
│   ├── test_integration.py
│   └── test_edge_cases.py
├── data/
│   └── fraud_training_data.csv
├── samples/
│   ├── identity_request.json
│   ├── identity_response.json
│   ├── fraud_request.json
│   └── fraud_response.json
└── docs/
    ├── API_SPEC.md
    ├── API_CONTRACT.md
    ├── MODEL_DESIGN.md
    ├── MODEL_TRAINING.md
    ├── MODEL_DETAILS.md
    ├── FRAUD_RULES.md
    ├── SETUP_GUIDE.md
    ├── DEMO_SCRIPT.md
    ├── DEMO_TEST_LOG.md
    └── PERFORMANCE.md
```

---

## Critical Dependencies

| Blocker | Impact | Owner | ETA |
|---------|--------|-------|-----|
| Schema not locked | Backend cannot build aggregator | All three | Day 1 EOD |
| DeepFace installation fails | Identity endpoint blocked | ML | Day 2 |
| Fraud model latency > 200ms | Demo performance poor | ML | Day 4 |
| Backend integration delayed | No end-to-end test | Backend | Day 4 |

---

**Start with PHASE 1.** Lock the schema on Day 1 — everything else depends on it.
