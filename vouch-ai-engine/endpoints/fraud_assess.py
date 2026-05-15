
import logging
import time
from typing import List, Optional, Dict, Any
from pathlib import Path

import joblib
import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/fraud", tags=["fraud"])

# ====================== MODEL LOADING ======================
_ml_model = None
_ml_scaler = None


def load_ml_models():
    """Load LightGBM model and scaler once"""
    global _ml_model, _ml_scaler
    
    if _ml_model is not None:
        return
    
    models_dir = Path(__file__).parent.parent / "models"
    
    try:
        model_path = models_dir / "fraud_model.pkl"
        scaler_path = models_dir / "fraud_scaler.pkl"
        
        if model_path.exists():
            _ml_model = joblib.load(model_path)
            logger.info(f"LightGBM model loaded from {model_path}")
        else:
            logger.warning("LightGBM model not found - falling back to rules only")
        
        if scaler_path.exists():
            _ml_scaler = joblib.load(scaler_path)
            logger.info("Feature scaler loaded")
            
    except Exception as e:
        logger.error(f"Failed to load ML models: {e}")


# ====================== RULE ENGINE ======================
FRAUD_CARD_BINS = {"419999", "000000", "123456"}

def calculate_rule_score(context: Dict) -> tuple:
    """Layer 1: Deterministic Weighted Rules (All backend-review fixes applied)"""
    triggered = []
    has_critical = False
    
    # Hard override
    if context.get("impossible_travel"):
        return 85, ["impossible_travel"], True
    
    score = 20

    # Network
    if context.get("is_vpn"):
        score += 15
        triggered.append("vpn_detected")
        has_critical = True
    if context.get("is_proxy"):
        score += 15
        triggered.append("proxy_detected")
        has_critical = True
    if context.get("location_distance_km", 0) > 500:
        score += 5
        triggered.append("unusual_location_distance")

    # Device
    if context.get("device_seen_before"):
        score -= 3
    else:
        score += 10
        triggered.append("new_device")

    if context.get("device_matches_onboarding"):
        score -= 5
    else:
        score += 8
        triggered.append("device_mismatch")

    # Behavioral
    if context.get("account_age_days", 999) < 7:
        score += 8
        triggered.append("new_account")
    if context.get("transaction_amount", 0) > 1_000_000:
        score += 12
        triggered.append("high_value_transaction")
    if context.get("time_since_last_tx_hrs", 24) < 1:
        score += 6
        triggered.append("rapid_transaction_velocity")
    if context.get("previous_transactions", 0) > 10:
        score -= 10

    # Identity
    if context.get("identity_verified"):
        score -= 10
    else:
        score += 15
        triggered.append("identity_not_verified")
        has_critical = True
    if context.get("identity_match_score", 0) > 95:
        score -= 5
    if context.get("liveness_passed"):
        score -= 8
    else:
        has_critical = True

    # Squad (null-safe)
    if context.get("squad_card_bin") in FRAUD_CARD_BINS:
        score += 20
        triggered.append("fraud_card_bin_detected")
    if context.get("squad_amount_matches_agreement") is True:
        score -= 3
        triggered.append("amount_matches_agreement")

    score = max(0, min(100, score))
    return score, triggered, has_critical


# ====================== LIGHTGBM LAYER ======================
def get_ml_score(context: Dict, rule_score: int) -> Optional[int]:
    """Layer 2: LightGBM prediction"""
    global _ml_model, _ml_scaler
    if _ml_model is None or _ml_scaler is None:
        return None

    try:
        features = [
            float(context.get("account_age_days", 30)),
            float(context.get("previous_transactions", 5)),
            int(context.get("is_vpn", 0)),
            int(context.get("is_proxy", 0)),
            float(context.get("location_distance_km", 0)),
            int(context.get("device_matches_onboarding", 1)),
            int(context.get("device_seen_before", 1)),
            float(context.get("transaction_amount", 100000)),
            float(context.get("identity_match_score", 85)),
            int(context.get("identity_verified", 1)),
            int(context.get("liveness_passed", 1)),
            float(context.get("time_since_last_tx_hrs", 24)),
            float(context.get("ip_reputation_score", 50)),
            int(context.get("location_distance_km", 0) > 500),
            float(rule_score),
        ]
        
        X = np.array([features])
        X_scaled = _ml_scaler.transform(X)
        
        prob_fraud = _ml_model.predict_proba(X_scaled)[0][1]
        return int(prob_fraud * 100)
        
    except Exception as e:
        logger.error(f"LightGBM prediction failed: {e}")
        return None


# ====================== REQUEST / RESPONSE MODELS ======================
class FraudAssessRequest(BaseModel):
    """Matches API_CONTRACT.md"""
    transaction_id: str
    platform_user_id: str
    external_user_id: str
    
    ip_address: str
    ip_reputation_score: int
    is_vpn: bool
    is_proxy: bool
    geolocation: Dict[str, Any]
    onboarding_location: Optional[Dict[str, Any]] = None
    location_distance_km: float
    impossible_travel: bool
    
    device_fingerprint: str
    device_seen_before: bool
    device_matches_onboarding: bool
    
    account_age_days: int
    previous_transactions: int
    transaction_amount: float
    time_since_last_tx_hrs: float
    
    identity_verified: bool
    identity_match_score: float
    liveness_passed: bool
    
    squad_payment_channel: Optional[str] = None
    squad_card_bin: Optional[str] = None
    squad_payer_name: Optional[str] = None
    squad_amount_matches_agreement: Optional[bool] = None
    squad_transaction_ref: Optional[str] = None


class FraudAssessResponse(BaseModel):
    score: int
    rule_score: int
    ml_score: Optional[int]
    flag: str
    category: str
    triggered_signals: List[str]
    recommendation: str
    processing_time_ms: float


# ====================== ENDPOINT ======================
@router.post("/assess", response_model=FraudAssessResponse)
async def assess_fraud(context: FraudAssessRequest):
    start_time = time.time()
    
    try:
        load_ml_models()  # Lazy load
        
        # Layer 1: Rules
        rule_score, triggered_signals, has_critical = calculate_rule_score(context.dict())
        
        # Layer 2: LightGBM
        ml_score = get_ml_score(context.dict(), rule_score)
        
        # Ensemble: ContextBuilder rules have 70% weight, ML model has 30% weight
        if ml_score is not None:
            final_score = int(0.60 * rule_score + 0.40 * ml_score)
        else:
            final_score = rule_score
        
        if has_critical:
            final_score = max(final_score, 75)
        
        final_score = max(0, min(100, final_score))
        
        # Determine flag
        if final_score >= 70:
            flag, category, rec = "RED", "High Risk", "block"
        elif final_score >= 40:
            flag, category, rec = "AMBER", "Elevated Risk", "require_additional_verification"
        else:
            flag, category, rec = "GREEN", "Low Risk", "proceed"
        
        processing_time_ms = round((time.time() - start_time) * 1000, 1)
        
        logger.info(f"[{context.transaction_id}] Fraud result: {flag} | Rule={rule_score} | ML={ml_score} | Final={final_score}")
        
        return FraudAssessResponse(
            score=final_score,
            rule_score=rule_score,
            ml_score=ml_score,
            flag=flag,
            category=category,
            triggered_signals=triggered_signals,
            recommendation=rec,
            processing_time_ms=processing_time_ms
        )
        
    except Exception as e:
        logger.error(f"Fraud assessment error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Fraud assessment failed")