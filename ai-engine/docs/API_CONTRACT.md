# Vouch API Contract: Backend ↔ ML Service

**Status:** `FINALIZED`  
**Architecture:** Multi-tenant B2B SDK  
**Last Updated:** May 9, 2026

---

## Overview

This document defines the strict data contract between the **Vouch NestJS Backend** and the **Python ML Service**. Both services must adhere to these schemas to ensure seamless integration and correct fraud detection workflows.

---

## Table of Contents

1. [Identity Verification Endpoint](#1-identity-verification-endpoint)
2. [Fraud Assessment Endpoint](#2-fraud-assessment-endpoint)
3. [Implementation Rules](#3-implementation-rules)
4. [Dashboard Mapping](#4-dashboard-mapping)
5. [Error Handling](#5-error-handling)

---

## 1. Identity Verification Endpoint

### Route
```
POST /identity/verify
```

### Content-Type
```
multipart/form-data
```

### Input (Multipart Form Data)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `platform_user_id` | `string` | ✅ | The internal Vouch UUID for the user (not the external client ID) |
| `document_image` | `file` | ✅ | JPEG/PNG image of the government ID |
| `selfie_image` | `file` | ✅ | JPEG/PNG image of the user's selfie |
| `selfie_frames` | `files[]` | ❌ | 3–5 frames for liveness detection logic (optional) |

### Output (JSON)

```json
{
  "verified": boolean,
  "match_score": int,
  "liveness_passed": boolean,
  "document_type": string,
  "face_extracted": boolean,
  "rejection_reason": string | null,
  "processing_time_ms": float
}
```

#### Field Specifications

| Field | Type | Description |
|-------|------|-------------|
| `verified` | `boolean` | Whether the identity verification passed |
| `match_score` | `int` | Face match score from 0–100 |
| `liveness_passed` | `boolean` | Whether liveness detection succeeded |
| `document_type` | `string` | One of: `"drivers_license"`, `"nin"`, `"passport"`, `"voters_card"` |
| `face_extracted` | `boolean` | Whether a face was successfully extracted from the document |
| `rejection_reason` | `string \| null` | One of: `"face_not_found"`, `"liveness_failed"`, `"match_below_threshold"`, `"document_unreadable"`, or `null` if verified |
| `processing_time_ms` | `float` | Time taken to process the request in milliseconds |

### Example Response

#### Successful Verification
```json
{
  "verified": true,
  "match_score": 94,
  "liveness_passed": true,
  "document_type": "drivers_license",
  "face_extracted": true,
  "rejection_reason": null,
  "processing_time_ms": 320.5
}
```

#### Failed Verification
```json
{
  "verified": false,
  "match_score": 42,
  "liveness_passed": false,
  "document_type": "nin",
  "face_extracted": true,
  "rejection_reason": "liveness_failed",
  "processing_time_ms": 280.3
}
```

---

## 2. Fraud Assessment Endpoint

### Route
```
POST /fraud/assess
```

### Content-Type
```
application/json
```

### Input (JSON)

This payload is assembled by the Vouch backend from IP analysis, device fingerprinting, behavioral signals, identity verification results, and Squad payment metadata.

```json
{
  "transaction_id": "string",
  "platform_user_id": "string",
  "external_user_id": "string",
  
  "ip_address": "string",
  "ip_reputation_score": int,
  "is_vpn": boolean,
  "is_proxy": boolean,
  "geolocation": {
    "country": "string",
    "city": "string"
  },
  "onboarding_location": {
    "country": "string",
    "city": "string"
  } | null,
  "location_distance_km": float,
  "impossible_travel": boolean,
  
  "device_fingerprint": "string",
  "device_seen_before": boolean,
  "device_matches_onboarding": boolean,
  
  "account_age_days": int,
  "previous_transactions": int,
  "transaction_amount": float,
  "time_since_last_tx_hrs": float,
  
  "identity_verified": boolean,
  "identity_match_score": float,
  "liveness_passed": boolean,
  
  "squad_payment_channel": "string (optional)",
  "squad_card_bin": "string (optional)",
  "squad_payer_name": "string (optional)",
  "squad_amount_matches_agreement": "boolean (optional)",
  "squad_transaction_ref": "string (optional)"
}
```

#### Signal Categories

| Category | Fields |
|----------|--------|
| **Transaction** | `transaction_id`, `platform_user_id`, `external_user_id` |
| **Network & Location** | `ip_address`, `ip_reputation_score`, `is_vpn`, `is_proxy`, `geolocation`, `onboarding_location`, `location_distance_km`, `impossible_travel` |
| **Device** | `device_fingerprint`, `device_seen_before`, `device_matches_onboarding` |
| **Behavioral** | `account_age_days`, `previous_transactions`, `transaction_amount`, `time_since_last_tx_hrs` |
| **Identity** | `identity_verified`, `identity_match_score`, `liveness_passed` |
| **Squad Signals** | `squad_payment_channel`, `squad_card_bin`, `squad_payer_name`, `squad_amount_matches_agreement`, `squad_transaction_ref` |

### Output (JSON)

```json
{
  "score": int,
  "flag": "GREEN" | "AMBER" | "RED",
  "category": "string",
  "triggered_signals": ["string"],
  "recommendation": "proceed" | "require_additional_verification" | "block",
  "processing_time_ms": float
}
```

#### Field Specifications

| Field | Type | Description |
|-------|------|-------------|
| `score` | `int` | Fraud risk score from 0–100 |
| `flag` | `enum` | One of: `"GREEN"` (0–39), `"AMBER"` (40–69), `"RED"` (70–100) |
| `category` | `string` | Human-readable risk category: `"Low Risk"`, `"Elevated Risk"`, `"High Risk"`, `"Critical"` |
| `triggered_signals` | `string[]` | List of fraud signals that contributed to the score (e.g., `["is_vpn", "impossible_travel"]`) |
| `recommendation` | `enum` | One of: `"proceed"`, `"require_additional_verification"`, `"block"` |
| `processing_time_ms` | `float` | Time taken to process the request in milliseconds |

### Example Request

```json
{
  "transaction_id": "txn_abc123",
  "platform_user_id": "usr_xyz789",
  "external_user_id": "buyer_456",
  
  "ip_address": "197.210.84.1",
  "ip_reputation_score": 82,
  "is_vpn": false,
  "is_proxy": false,
  "geolocation": {
    "country": "NG",
    "city": "Lagos"
  },
  "onboarding_location": {
    "country": "NG",
    "city": "Abuja"
  },
  "location_distance_km": 530.2,
  "impossible_travel": false,
  
  "device_fingerprint": "fp_d3a9c1b2",
  "device_seen_before": true,
  "device_matches_onboarding": false,
  
  "account_age_days": 14,
  "previous_transactions": 3,
  "transaction_amount": 150000,
  "time_since_last_tx_hrs": 0.4,
  
  "identity_verified": true,
  "identity_match_score": 94.2,
  "liveness_passed": true,
  
  "squad_payment_channel": "card",
  "squad_card_bin": "539983",
  "squad_payer_name": "John Doe",
  "squad_amount_matches_agreement": true,
  "squad_transaction_ref": "SQD_abc123"
}
```

### Example Responses

#### GREEN Flag (Low Risk)
```json
{
  "score": 28,
  "flag": "GREEN",
  "category": "Low Risk",
  "triggered_signals": [],
  "recommendation": "proceed",
  "processing_time_ms": 84.2
}
```

#### AMBER Flag (Elevated Risk)
```json
{
  "score": 61,
  "flag": "AMBER",
  "category": "Elevated Risk",
  "triggered_signals": [
    "device_does_not_match_onboarding",
    "location_distance_530km"
  ],
  "recommendation": "require_additional_verification",
  "processing_time_ms": 92.7
}
```

#### RED Flag (High Risk)
```json
{
  "score": 87,
  "flag": "RED",
  "category": "Critical",
  "triggered_signals": [
    "is_vpn",
    "impossible_travel",
    "ip_reputation_low"
  ],
  "recommendation": "block",
  "processing_time_ms": 78.5
}
```

---

## 3. Implementation Rules

### 3.1 ID Isolation
- The ML service **must** use the `platform_user_id` for all internal logs and tracking.
- This ensures data can be cross-referenced with the Vouch database.
- The `external_user_id` is for context only and should not be used as a primary identifier.

### 3.2 Integer Scoring
- All scores (`match_score`, `score`) **must** be returned as **integers** in the range 0–100.
- This maintains consistency with the Prisma schema and Developer Dashboard UI.
- Do not return floats for score fields.

### 3.3 Synchronous Assessment
- The `/fraud/assess` endpoint **must** be synchronous.
- The Vouch backend will `await` this response before proceeding with the payment flow.
- Maximum response time: **5 seconds** (recommended: under 500ms).

### 3.4 Endpoint Stability
- Both endpoints must be available at all times during the demo.
- Endpoints should return proper HTTP status codes:
  - `200 OK` for successful processing
  - `400 Bad Request` for invalid input
  - `500 Internal Server Error` for model failures
  - `503 Service Unavailable` if the service is down

---

## 4. Dashboard Mapping

The fraud score determines the action taken by the Vouch backend:

| Flag | Score Range | Category | Action |
|------|-------------|----------|--------|
| **GREEN** | 0–39 | Low Risk | Proceed to payment. Squad virtual account details surfaced to buyer. |
| **AMBER** | 40–69 | Elevated Risk | Trigger secondary verification (additional liveness check or manual review). |
| **RED** | 70–100 | High Risk / Critical | **Freeze escrow.** Block payment. Squad virtual account NOT surfaced. Developer log shows `FRAUD_BLOCKED`. |

---

## 5. Error Handling

### ML Service Errors

In the event of a model timeout, internal error, or service unavailability:

1. **Return HTTP 500** with a descriptive error message
2. **Do NOT return a default score** — let the backend handle the failure

### Backend Fail-Safe Protocol

When the ML service returns an error:

1. **Fail to AMBER** — default to elevated risk
2. Log the error with `eventType: 'FRAUD_ERROR'`
3. Surface to developer: "Fraud assessment temporarily unavailable. Transaction requires manual review."
4. **Do NOT automatically approve (GREEN)** — err on the side of caution

### Example Error Response

```json
{
  "error": "Internal Server Error",
  "message": "Fraud model timed out",
  "statusCode": 500
}
```

---

## Testing Checklist

### Identity Endpoint
- [ ] Valid document + selfie → `verified: true`
- [ ] Low match score → `verified: false`, `rejection_reason: "match_below_threshold"`
- [ ] No face in document → `verified: false`, `rejection_reason: "face_not_found"`
- [ ] Liveness fails → `verified: false`, `rejection_reason: "liveness_failed"`

### Fraud Endpoint
- [ ] Clean context → `score: 0-39`, `flag: "GREEN"`
- [ ] `is_vpn: true` → `score: 70+`, `flag: "RED"`, `triggered_signals: ["is_vpn"]`
- [ ] `impossible_travel: true` → `score: 70+`, `flag: "RED"`
- [ ] Device mismatch + distance → `score: 40-69`, `flag: "AMBER"`
- [ ] All Squad signals populated → included in assessment logic

---

## Contact & Coordination

**Backend Engineer:** Responsible for assembling fraud context and handling ML responses  
**ML Engineer:** Responsible for model accuracy, endpoint stability, and response formatting

**Critical Sync Points:**
1. Confirm endpoint base URLs (`ML_BASE_URL` in backend `.env`)
2. Test both endpoints with real payloads before integration
3. Coordinate demo timing — both services must be running during presentation

---

**This contract is frozen. Any changes require approval from both backend and ML engineers.**
