# API Contract

## Overview

This document defines the data contract between the backend and ML service. Lock this schema before implementation begins.

## Identity Verification Endpoint

**Route:** `POST /identity/verify`

**Input (Multipart Form Data):**
```
- user_id (string): Unique user identifier for audit logging
- document_image (file): Government-issued ID (JPEG/PNG, max 5MB)
- selfie_image (file): Selfie for face matching (JPEG/PNG, max 5MB)
- selfie_frames (files, optional): Video frames for liveness (JPEG/PNG array)
```

**Output (JSON):**
```json
{
  "verified": boolean,
  "match_score": float (0-100),
  "liveness_passed": boolean,
  "document_type": string,
  "face_extracted": boolean,
  "rejection_reason": string | null,
  "processing_time_ms": float
}
```

**Rejection Reasons:**
- `face_not_found`: No face detected in document or selfie
- `liveness_failed`: Liveness check failed
- `match_below_threshold`: Face match score below 85%
- `document_unreadable`: Cannot read document fields

---

## Fraud Assessment Endpoint

**Route:** `POST /fraud/assess`

**Input (JSON):**
See `samples/fraud_request.json` for full schema.

**Output (JSON):**
```json
{
  "score": float (0-100),
  "flag": string (GREEN | AMBER | RED),
  "category": string,
  "triggered_signals": array<string>,
  "recommendation": string,
  "processing_time_ms": float
}
```

**Flag Mapping:**
- GREEN: 0–39 (payment allowed)
- AMBER: 40–69 (require additional verification)
- RED: 70–100 (payment blocked)

---

## Signal Schema

All signals must follow the types and names defined in the fraud context JSON (parent README Section 4).

**Last Updated:** 2026-05-08
**Status:** DRAFT - AWAITING BACKEND AGREEMENT
