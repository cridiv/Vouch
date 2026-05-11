# Fraud Detection Rules Reference

## Scoring Rules Breakdown

### Rule Definitions

These rules are used in the weighted rule engine for fraud scoring.

```
Base Score: 20
Range: 0–100 (clamped)
```

### Network & Location Rules

| Rule | Signal | Points | Logic |
|------|--------|--------|-------|
| R1 | is_vpn | +15 | VPN usage indicates attempt to hide location |
| R2 | is_proxy | +15 | Proxy usage similar to VPN |
| R3 | impossible_travel | +25 | Hard RED - physically impossible movement |
| R4 | location_distance > 500km | +5 | Potential anomaly but not always fraud |

### Device Rules

| Rule | Signal | Points | Logic |
|------|--------|--------|-------|
| R5 | device_matches_onboarding | -5 | Reduces risk - same device as KYC |
| R6 | device_seen_before | -3 | Slight reduction - device has history |
| R7 | new_device | +10 | Increases risk - first use |

### Behavioral Rules

| Rule | Signal | Points | Logic |
|------|--------|--------|-------|
| R8 | account_age_days < 7 | +8 | New accounts are riskier |
| R9 | previous_transactions > 10 | -10 | History reduces risk |
| R10 | transaction_amount > 1M | +12 | Unusually large amount |
| R11 | time_since_last_tx < 1 hour | +6 | Rapid velocity suspicious |

### Identity Rules

| Rule | Signal | Points | Logic |
|------|--------|--------|-------|
| R12 | identity_verified | -10 | Reduced risk - passed KYC |
| R13 | identity_match_score > 95 | -5 | High match confidence |
| R14 | liveness_passed | -8 | Passed liveness check |

### Squad Transaction Rules

| Rule | Signal | Points | Logic |
|------|--------|--------|-------|
| R15 | squad_payer_name != verified_name | +12 | Name mismatch suspicious |
| R16 | squad_card_bin in fraud_list | +20 | Known fraud card BIN |
| R17 | squad_amount_matches_agreement | -3 | Amount consistency |

---

## Examples

### Scenario 1: New User, VPN, Large Amount

```
Base: 20
+ New account (R8): 8
+ High amount (R10): 12
+ VPN (R1): 15
+ New device (R7): 10
= 65 points → AMBER (require verification)
```

### Scenario 2: VPN + Impossible Travel

```
Base: 20
+ VPN (R1): 15
+ Impossible travel (R3): 25
= 60 points → AMBER
OR if impossible_travel is hard rule → RED (override)
```

### Scenario 3: Verified User, Recurring

```
Base: 20
- Identity verified (R12): -10
- High match score (R13): -5
- Many transactions (R9): -10
- Same device (R5): -5
= -10 → 0 (clamped) → GREEN
```

---

## Tuning

### Adjusting Thresholds

To make fraud detection more strict:
- Increase RED threshold from 70 to 75
- Increase point values for suspicious signals

To make it more lenient:
- Decrease point values
- Lower thresholds

### Adding New Signals

1. Define the signal in Fraud Request schema
2. Assign point value based on fraud likelihood
3. Add rule to assessment logic
4. Test with sample data
5. Document in this file

---

## Testing Rules

Use `samples/fraud_request_vpn.json` as the baseline test case:

```bash
curl -X POST http://localhost:5000/fraud/assess \
  -H "Content-Type: application/json" \
  -d @samples/fraud_request_vpn.json
```

Expected: `score >= 70`, `flag: RED`

---

## Future Improvements

- Machine learning model to learn rule weights from data
- Card BIN fraud list integration with external service
- Velocity checks (transactions per hour/day)
- Geographic zone risk scores

---

**Last Updated:** 2026-05-08
**Status:** DRAFT - AWAITING BACKEND FEEDBACK
