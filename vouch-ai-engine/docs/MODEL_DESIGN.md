# Model Design Document

## Overview

This document outlines the fraud detection model approach for TrustLayer SDK.

## Recommended Approach: Weighted Rule Engine (MVP)

For rapid MVP development, we recommend a **weighted rule engine** instead of XGBoost:

**Advantages:**
- No training data required
- Fast implementation (Hours, not days)
- Fully interpretable — judges understand the scoring
- Easy to tune and adjust weights
- Perfect for demo purposes

**Disadvantages:**
- Less sophisticated than ML models
- Weights are manual assumptions (not learned from data)

---

## Signal Categories

### 1. Network & Location Signals
- `is_vpn`: +15 points (high fraud indicator)
- `is_proxy`: +15 points
- `impossible_travel`: +25 points (instant RED)
- `location_distance_km > 500`: +5 points

### 2. Device Signals
- `device_seen_before`: -3 points (reduces risk)
- `device_matches_onboarding`: -5 points
- `new_device`: +10 points

### 3. Behavioral Signals
- `account_age_days < 7`: +8 points
- `transaction_amount > 1M`: +12 points
- `time_since_last_tx_hrs < 1`: +6 points
- `previous_transactions > 10`: -10 points (reduces risk)

### 4. Identity Signals
- `identity_verified`: -10 points
- `identity_match_score > 95`: -5 points
- `liveness_passed`: -8 points

### 5. Squad Transaction Signals
- `squad_payment_channel == card`: 0 points (neutral)
- `squad_card_bin in fraud_list`: +20 points (TBD)
- `squad_payer_name != verified_name`: +12 points

---

## Scoring Formula

```
score = 20 (base)
      + is_vpn ? 15 : 0
      + is_proxy ? 15 : 0
      + impossible_travel ? 25 : 0
      + location_distance_km > 500 ? 5 : 0
      + device_seen_before ? -3 : 10
      + device_matches_onboarding ? 0 : -5
      + account_age_days < 7 ? 8 : 0
      + transaction_amount > 1000000 ? 12 : 0
      + time_since_last_tx_hrs < 1 ? 6 : 0
      + previous_transactions > 10 ? -10 : 0
      + identity_verified ? -10 : 0
      + identity_match_score > 95 ? -5 : 0
      + liveness_passed ? -8 : 0
      + [squad signals...]
      
score = max(0, min(100, score))  # Clamp to 0-100
```

---

## Flag Determination

```
if score >= 70:
    flag = RED
    category = "High Risk"
    recommendation = "payment_blocked"
elif score >= 40:
    flag = AMBER
    category = "Elevated Risk"
    recommendation = "require_additional_verification"
else:
    flag = GREEN
    category = "Low Risk"
    recommendation = "payment_allowed"
```

---

## Future: XGBoost Model

If needed after MVP, upgrade to XGBoost for better accuracy:

1. Collect 1000+ labeled transactions
2. Extract features from signals
3. Train on historical data
4. Replace rule engine with model inference
5. Maintain same API contract

---

## Implementation Location

See `endpoints/fraud_assess.py` for implementation.

## Testing

See `tests/test_fraud_assess.py` for test cases.

---

**Status:** DRAFT - AWAITING BACKEND REVIEW
**Last Updated:** 2026-05-08
