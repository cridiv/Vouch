## Fraud Engine Review — Backend Feedback

Overall the design is solid and the approach is correct. Higher score = more risk, lower score = more trust, >70 is RED. That convention is consistent throughout and makes sense. Good call on the weighted rule engine over XGBoost.

That said there are five things that need fixing before you implement. Go through all of them.

---

### Fix 1 — R6 and R7 are the same signal scored twice

Your table has:

| Rule | Signal | Points |
|---|---|---|
| R6 | `device_seen_before` | -3 |
| R7 | `new_device` | +10 |

`new_device` is just `!device_seen_before`. These are the same condition written twice. If both are in your scoring loop, a user on a new device gets +10 from R7 AND misses the -3 from R6 — that is fine accidentally but confusing and fragile.

Collapse them into one conditional:

```python
# ONE conditional — mutually exclusive
if device_seen_before:
    score -= 3
else:
    score += 10
```

Remove the separate `new_device` row from your rules table entirely.

---

### Fix 2 — `device_matches_onboarding` scoring is inverted

Your current table:

| Rule | Signal | Points |
|---|---|---|
| R5 | `device_matches_onboarding` | -5 |

This only handles the positive case. What happens when `device_matches_onboarding` is False? Currently nothing — no points added. But a device mismatch is a fraud signal and should increase the score.

Fix it to be explicitly two-sided like R6/R7:

```python
if device_matches_onboarding:
    score -= 5   # same device as KYC — reduces risk
else:
    score += 8   # different device — increases risk
```

Update your rules table to show both sides explicitly.

---

### Fix 3 — `impossible_travel` must be a hard RED override

Your Scenario 2 example contradicts itself:

```
Base: 20
+ VPN: 15
+ Impossible travel: 25
= 60 → AMBER
OR if impossible_travel is hard rule → RED
```

Pick one. We are going with hard RED override. Here is why:

Impossible travel means someone else has this account. A fraudster in London logged into a Lagos user's account. No combination of good signals should cancel that out — not a high identity score, not 50 previous transactions, nothing. Once impossible travel fires, the answer is RED, full stop.

Also the math is wrong anyway. `20 + 15 + 25 = 60` which is AMBER not RED even by your own thresholds. So the +25 alone is insufficient.

Implement it as an early return before any scoring runs:

```python
def assess(context):

    triggered_signals = []

    # Hard overrides — checked BEFORE scoring
    # These return RED immediately regardless of other signals
    if context.get("impossible_travel"):
        return {
            "score": 85,
            "flag": "RED",
            "category": "High Risk",
            "triggered_signals": ["impossible_travel"],
            "recommendation": "block",
            "processing_time_ms": ...
        }

    # Normal scoring only reached if no hard overrides triggered
    score = 20
    # ... rest of rules
```

This also makes the demo reliable — `simulate_impossible_travel: true` always guarantees RED with no edge cases.

---

### Fix 4 — Squad signals need null guards

R15, R16, R17 all depend on Squad webhook data:

| Rule | Signal |
|---|---|
| R15 | `squad_payer_name != verified_name` |
| R16 | `squad_card_bin in fraud_list` |
| R17 | `squad_amount_matches_agreement` |

Here is the problem: the Squad webhook fires **after the buyer pays**. But our fraud assessment runs **before the buyer pays** — to decide whether to even show them the virtual account number.

This means on the first fraud check, these three fields will always be null or missing. If your code tries to evaluate them without null guards it will either crash or score incorrectly.

Wrap all three in null guards:

```python
# Squad signals — only populated after first payment webhook fires
# On pre-payment assessment these will be None — skip silently

if context.get("squad_payer_name") and context.get("verified_name"):
    if context["squad_payer_name"] != context["verified_name"]:
        score += 12
        triggered_signals.append("payer_name_mismatch")

if context.get("squad_card_bin") and fraud_card_bins:
    if context["squad_card_bin"] in fraud_card_bins:
        score += 20
        triggered_signals.append("fraud_card_bin_detected")

if context.get("squad_amount_matches_agreement") is not None:
    if context["squad_amount_matches_agreement"]:
        score -= 3
        triggered_signals.append("amount_matches_agreement")
```

These rules activate automatically on the second assessment (delivery confirmation) once Squad data has flowed in. No other changes needed — just the null guards.

---

### Fix 5 — Drop R15 for this sprint

R15 (`squad_payer_name != verified_name`) requires a `verified_name` field — the name extracted from the identity document during KYC. That field does not currently exist in our context DTO and extracting it from documents is out of scope right now.

Comment it out and mark it TODO:

```python
# R15 — payer name mismatch
# TODO: requires verified_name extracted from identity document
# Deferred to v2 — add to PlatformUser model and context DTO when ready
# if context.get("squad_payer_name") and context.get("verified_name"):
#     if context["squad_payer_name"] != context["verified_name"]:
#         score += 12
#         triggered_signals.append("payer_name_mismatch")
```

We will mention it to judges as a scoped v2 signal.

---

### The Corrected Full Scoring Formula

Here is the complete formula with all fixes applied. Use this as your implementation reference:

```python
def assess(context):
    triggered_signals = []
    start_time = time.time()

    # ── Hard overrides (checked before scoring) ──────────────────────────────
    if context.get("impossible_travel"):
        return {
            "score": 85,
            "flag": "RED",
            "category": "High Risk",
            "triggered_signals": ["impossible_travel"],
            "recommendation": "block",
            "processing_time_ms": int((time.time() - start_time) * 1000)
        }

    # ── Base score ────────────────────────────────────────────────────────────
    score = 20

    # ── Network & Location ────────────────────────────────────────────────────
    if context.get("is_vpn"):
        score += 15
        triggered_signals.append("vpn_detected")

    if context.get("is_proxy"):
        score += 15
        triggered_signals.append("proxy_detected")

    if context.get("location_distance_km", 0) > 500:
        score += 5
        triggered_signals.append("unusual_location_distance")

    # ── Device ────────────────────────────────────────────────────────────────
    if context.get("device_seen_before"):
        score -= 3
    else:
        score += 10
        triggered_signals.append("new_device")

    if context.get("device_matches_onboarding"):
        score -= 5
    else:
        score += 8
        triggered_signals.append("device_mismatch")

    # ── Behavioural ───────────────────────────────────────────────────────────
    if context.get("account_age_days", 999) < 7:
        score += 8
        triggered_signals.append("new_account")

    if context.get("transaction_amount", 0) > 1_000_000:
        score += 12
        triggered_signals.append("high_value_transaction")

    time_since = context.get("time_since_last_tx_hrs")
    if time_since is not None and time_since < 1:
        score += 6
        triggered_signals.append("rapid_transaction_velocity")

    if context.get("previous_transactions", 0) > 10:
        score -= 10

    # ── Identity ──────────────────────────────────────────────────────────────
    if context.get("identity_verified"):
        score -= 10
    else:
        score += 15
        triggered_signals.append("identity_not_verified")

    if context.get("identity_match_score", 0) > 95:
        score -= 5

    if context.get("liveness_passed"):
        score -= 8

    # ── Squad signals (null-safe — skipped if data not yet available) ─────────
    # R15 deferred to v2 — verified_name not in context DTO yet

    if context.get("squad_card_bin") and FRAUD_CARD_BINS:
        if context["squad_card_bin"] in FRAUD_CARD_BINS:
            score += 20
            triggered_signals.append("fraud_card_bin_detected")

    if context.get("squad_amount_matches_agreement") is not None:
        if context["squad_amount_matches_agreement"]:
            score -= 3

    # ── Clamp ─────────────────────────────────────────────────────────────────
    score = max(0, min(100, score))

    # ── Flag ──────────────────────────────────────────────────────────────────
    if score >= 70:
        flag = "RED"
        category = "High Risk"
        recommendation = "block"
    elif score >= 40:
        flag = "AMBER"
        category = "Elevated Risk"
        recommendation = "require_additional_verification"
    else:
        flag = "GREEN"
        category = "Low Risk"
        recommendation = "proceed"

    return {
        "score": score,
        "flag": flag,
        "category": category,
        "triggered_signals": triggered_signals,
        "recommendation": recommendation,
        "processing_time_ms": int((time.time() - start_time) * 1000)
    }
```

---

### Walk These Three Scenarios Manually Before Implementing

**Scenario A — Fully clean verified user (should be GREEN):**
```
Base: 20
identity_verified (-10): 10
liveness_passed (-8): 2
identity_match > 95 (-5): 0 → clamped to 0
previous_transactions > 10 (-10): 0 → clamped to 0
device_matches_onboarding (-5): 0 → clamped to 0
device_seen_before (-3): 0 → clamped to 0
Result: 0 → GREEN ✅
```

**Scenario B — VPN only (should be AMBER):**
```
Base: 20
VPN (+15): 35
new_device (+10): 45
new_account (+8): 53
identity_not_verified (+15): 68 → AMBER ✅
```

**Scenario C — Impossible travel (should be RED regardless):**
```
Hard override fires immediately → score: 85, RED ✅
No other signals matter
```

---

### Response Shape — Do Not Change This

The response must match this exactly. Our backend DTO depends on it:

```json
{
  "score": 61,
  "flag": "AMBER",
  "category": "Elevated Risk",
  "triggered_signals": ["vpn_detected", "new_device"],
  "recommendation": "require_additional_verification",
  "processing_time_ms": 84
}
```

Once your endpoint is running, share the URL so we can hit it with a raw Postman request to confirm the shape before wiring it into the backend.