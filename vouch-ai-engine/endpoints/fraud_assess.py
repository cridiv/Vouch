"""
Fraud Assessment Endpoint — Two-Layer Ensemble
Scores transaction risk using:
- Layer 1: Deterministic rule-based scoring (per API_CONTRACT.md)
- Layer 2: LightGBM ML refinement (0-100 confidence)
- Ensemble: 45% rules + 55% ML with hard overrides
- Explainability: SHAP values for model interpretability
All 5 backend-review fixes applied to rule engine
"""

import logging
import time
import joblib
import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from pathlib import Path
from utils.model_cache import ResponseCache

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/fraud", tags=["fraud"])

# Load ML models on module import (lazy-loaded to avoid startup delays)
_ml_models_loaded = False
_fraud_model = None
_fraud_scaler = None
_shap_explainer = None


def _load_ml_models():
    """Lazy load ML models and SHAP explainer on first use"""
    global _ml_models_loaded, _fraud_model, _fraud_scaler, _shap_explainer
    
    if _ml_models_loaded:
        return
    
    try:
        models_dir = Path(__file__).parent.parent / "models"
        
        # Load pre-trained LightGBM model
        model_path = models_dir / "fraud_model.pkl"
        if not model_path.exists():
            logger.warning(f"⚠️  ML model not found at {model_path} - ML layer disabled")
            _ml_models_loaded = True
            return
        
        _fraud_model = joblib.load(model_path)
        logger.info("✓ LightGBM fraud model loaded")
        
        # Load scaler for feature normalization
        scaler_path = models_dir / "fraud_scaler.pkl"
        if scaler_path.exists():
            _fraud_scaler = joblib.load(scaler_path)
            logger.info("✓ Feature scaler loaded")
        
        # Initialize SHAP explainer for model interpretability
        try:
            import shap
            # Create SHAP explainer using KernelExplainer (model-agnostic)
            # Note: We'll use a sample of background data for efficiency
            _shap_explainer = "enabled"  # Flag indicating SHAP is available
            logger.info("✓ SHAP explainer initialized (KernelExplainer)")
        except ImportError:
            logger.warning("⚠️  SHAP not installed - model explanations unavailable")
            _shap_explainer = None
        
        _ml_models_loaded = True
    except Exception as e:
        logger.error(f"Error loading ML models: {e}")
        _ml_models_loaded = True

# Fraud card bin list for Squad signals
FRAUD_CARD_BINS = [
    "419999",  # Example test BIN
    "000000",  # Test/invalid BIN
]

# ML Model features (must match training data)
ML_FEATURES = [
    'account_age_days', 'previous_transactions', 'is_vpn', 'is_proxy',
    'location_distance_km', 'device_matches_onboarding', 'device_seen_before',
    'transaction_amount', 'identity_match_score', 'identity_verified',
    'liveness_passed', 'time_since_last_tx_hrs', 'ip_reputation_score',
    'is_location_anomaly', 'rule_score'
]


def _prepare_ml_features(context: 'FraudAssessRequest', rule_score: int) -> Optional[np.ndarray]:
    """
    Convert FraudAssessRequest context to ML feature vector
    
    Args:
        context: FraudAssessRequest with all signals
        rule_score: Layer 1 rule-based score (0-100)
    
    Returns:
        numpy array of shape (1, n_features) or None if conversion fails
    """
    try:
        feature_dict = {
            'account_age_days': context.account_age_days,
            'previous_transactions': context.previous_transactions,
            'is_vpn': int(context.is_vpn),
            'is_proxy': int(context.is_proxy),
            'location_distance_km': context.location_distance_km,
            'device_matches_onboarding': int(context.device_matches_onboarding),
            'device_seen_before': int(context.device_seen_before),
            'transaction_amount': context.transaction_amount,
            'identity_match_score': context.identity_match_score,
            'identity_verified': int(context.identity_verified),
            'liveness_passed': int(context.liveness_passed),
            'time_since_last_tx_hrs': context.time_since_last_tx_hrs,
            'ip_reputation_score': context.ip_reputation_score,
            'is_location_anomaly': int(context.location_distance_km > 500),  # Derived feature
            'rule_score': rule_score,  # Layer 1 input to Layer 2
        }
        
        # Create feature vector in correct order
        X = np.array([[feature_dict[f] for f in ML_FEATURES]], dtype=np.float32)
        return X
    except Exception as e:
        logger.error(f"Error preparing ML features: {e}")
        return None


def get_lightgbm_score(context: 'FraudAssessRequest', rule_score: int) -> Optional[int]:
    """
    Get ML layer fraud score using pre-trained LightGBM model
    
    Layer 2: LightGBM fraud detection with normalized features
    Output: 0-100 confidence score
    
    Args:
        context: FraudAssessRequest with all signals
        rule_score: Layer 1 rule-based score (used as feature input)
    
    Returns:
        ML score (0-100) or None if ML unavailable
    """
    global _fraud_model, _fraud_scaler
    
    if _fraud_model is None or _fraud_scaler is None:
        return None
    
    try:
        # Prepare feature vector
        X = _prepare_ml_features(context, rule_score)
        if X is None:
            return None
        
        # Scale features using pre-fitted scaler
        X_scaled = _fraud_scaler.transform(X)
        
        # Get LightGBM prediction (probability of fraud)
        # predict_proba returns [[prob_not_fraud, prob_fraud]]
        fraud_probability = _fraud_model.predict_proba(X_scaled)[0][1]
        
        # Convert probability to 0-100 score
        ml_score = int(fraud_probability * 100)
        
        logger.debug(f"ML prediction: probability={fraud_probability:.4f}, score={ml_score}")
        return ml_score
    
    except Exception as e:
        logger.error(f"Error during ML scoring: {e}")
        return None


def get_shap_explanation(context: 'FraudAssessRequest', rule_score: int) -> Optional[Dict[str, Any]]:
    """
    Generate SHAP explanation for ML model prediction
    
    Provides feature importance values explaining which signals most influenced
    the fraud score, enabling auditable and transparent fraud decisions.
    
    Args:
        context: FraudAssessRequest with all signals
        rule_score: Layer 1 rule-based score
    
    Returns:
        dict with top_features, base_value, model_prediction or None if SHAP unavailable
    """
    global _shap_explainer, _fraud_model, _fraud_scaler
    
    if _shap_explainer is None or _fraud_model is None:
        return None
    
    try:
        import shap
        
        # Prepare feature vector
        X = _prepare_ml_features(context, rule_score)
        if X is None:
            return None
        
        X_scaled = _fraud_scaler.transform(X)
        
        # Create SHAP explainer if not already done
        # Note: Using KernelExplainer for model-agnostic explanation
        explainer = shap.KernelExplainer(
            lambda x: _fraud_model.predict_proba(x)[:, 1],  # Fraud probability
            shap.sample(X_scaled, min(100, max(10, X_scaled.shape[0])))  # Background data
        )
        
        # Get SHAP values for this prediction
        shap_values = explainer.shap_values(X_scaled)
        
        # Get model prediction
        model_pred = _fraud_model.predict_proba(X_scaled)[0][1]
        base_value = explainer.expected_value
        
        # Extract top feature importances
        feature_importance = np.abs(shap_values[0])
        top_indices = np.argsort(feature_importance)[-5:][::-1]  # Top 5 features
        
        top_features = {}
        for idx in top_indices:
            feature_name = ML_FEATURES[idx]
            importance = float(feature_importance[idx])
            shap_value = float(shap_values[0][idx])
            
            top_features[feature_name] = {
                "shap_value": shap_value,
                "abs_importance": importance,
                "direction": "increases_risk" if shap_value > 0 else "decreases_risk"
            }
        
        return {
            "top_features": top_features,
            "base_value": float(base_value),
            "model_prediction": int(model_pred * 100),
            "explanation_type": "SHAP (KernelExplainer)"
        }
    
    except Exception as e:
        logger.warning(f"SHAP explanation failed (non-critical): {e}")
        return None



class FraudAssessRequest(BaseModel):
    """Request model for fraud assessment per API_CONTRACT.md"""
    transaction_id: str
    platform_user_id: str
    external_user_id: str
    
    # Network signals
    ip_address: str
    ip_reputation_score: int
    is_vpn: bool
    is_proxy: bool
    geolocation: Dict[str, str]
    onboarding_location: Optional[Dict[str, str]] = None
    location_distance_km: float
    impossible_travel: bool
    
    # Device signals
    device_fingerprint: str
    device_seen_before: bool
    device_matches_onboarding: bool
    
    # Behavioral signals
    account_age_days: int
    previous_transactions: int
    transaction_amount: float
    time_since_last_tx_hrs: float
    
    # Identity signals
    identity_verified: bool
    identity_match_score: float
    liveness_passed: bool
    
    # Squad transaction signals (optional)
    squad_payment_channel: Optional[str] = None
    squad_card_bin: Optional[str] = None
    squad_payer_name: Optional[str] = None
    squad_amount_matches_agreement: Optional[bool] = None
    squad_transaction_ref: Optional[str] = None


class FraudAssessResponse(BaseModel):
    """Response model for fraud assessment with two-layer ensemble"""
    score: int  # 0-100 integer (final ensemble score)
    flag: str  # GREEN | AMBER | RED
    category: str  # Low Risk | Elevated Risk | High Risk
    triggered_signals: List[str]
    recommendation: str  # proceed | require_additional_verification | block
    
    # New: ML layer transparency
    rule_score: int  # Layer 1 deterministic score
    ml_score: Optional[int] = None  # Layer 2 LightGBM prediction (None if ML unavailable)
    ensemble_weights: Dict[str, float]  # {"rules": 0.45, "ml": 0.55}
    
    # New: Explainability via SHAP
    shap_explanation: Optional[Dict[str, Any]] = None  # Top features influencing ML score
    
    processing_time_ms: float


class FraudScoringEngine:
    """Two-layer fraud scoring: deterministic rules + ML ensemble with SHAP explainability"""
    
    @staticmethod
    def calculate_rule_score(context: 'FraudAssessRequest') -> tuple:
        """
        Layer 1: Deterministic rule-based fraud scoring
        Per backend-review.md with all 5 fixes applied:
        - FIX 1: Collapsed device_seen_before and new_device (mutually exclusive)
        - FIX 2: Two-sided device_matches_onboarding scoring
        - FIX 3: impossible_travel as hard RED override (early return)
        - FIX 4: Null guards on Squad signals
        - FIX 5: R15 (payer_name_mismatch) commented out for v2
        
        Args:
            context: FraudAssessRequest with all signals
        
        Returns:
            tuple (score, triggered_signals, has_critical_override)
        """
        start_time = time.time()
        triggered_signals = []
        has_critical_override = False
        
        # ── HARD OVERRIDES (checked BEFORE scoring) ──────────────────────────
        # FIX 3: impossible_travel must be a hard RED override
        # Early return - no other signals can override this
        if context.impossible_travel:
            return 85, ["impossible_travel"], True
        
        # ── Base score ────────────────────────────────────────────────────────
        score = 20
        
        # ── NETWORK & LOCATION ────────────────────────────────────────────────
        if context.is_vpn:
            score += 15
            triggered_signals.append("vpn_detected")
        
        if context.is_proxy:
            score += 15
            triggered_signals.append("proxy_detected")
        
        if context.location_distance_km > 500:
            score += 5
            triggered_signals.append("unusual_location_distance")
        
        # ── DEVICE ────────────────────────────────────────────────────────────
        # FIX 1: Collapse device_seen_before and new_device into ONE mutually exclusive conditional
        # Removed duplicate scoring - now single if/else block
        if context.device_seen_before:
            score -= 3
        else:
            score += 10
            triggered_signals.append("new_device")
        
        # FIX 2: device_matches_onboarding must be two-sided (not just -5)
        # Now handles both positive AND negative cases
        if context.device_matches_onboarding:
            score -= 5  # Same device as KYC — reduces risk
        else:
            score += 8  # Different device — increases risk
            triggered_signals.append("device_mismatch")
        
        # ── BEHAVIORAL ────────────────────────────────────────────────────────
        if context.account_age_days < 7:
            score += 8
            triggered_signals.append("new_account")
        
        if context.transaction_amount > 1_000_000:
            score += 12
            triggered_signals.append("high_value_transaction")
        
        if context.time_since_last_tx_hrs < 1 and context.previous_transactions > 0:
            score += 6
            triggered_signals.append("rapid_transaction_velocity")
        
        if context.previous_transactions > 10:
            score -= 10
        
        # ── IDENTITY ──────────────────────────────────────────────────────────
        if context.identity_verified:
            score -= 10
        else:
            score += 15
            triggered_signals.append("identity_not_verified")
        
        if context.identity_match_score > 95:
            score -= 5
        
        if context.liveness_passed:
            score -= 8
        
        # ── SQUAD SIGNALS ─────────────────────────────────────────────────────
        # FIX 4: Squad signals need null guards
        # These fields are only populated AFTER the first payment webhook fires
        # On pre-payment assessment, they will be None — skip silently
        
        # FIX 5: R15 (payer_name_mismatch) deferred to v2
        # TODO: requires verified_name extracted from identity document
        # Deferred to v2 — add to PlatformUser model and context DTO when ready
        # if context.squad_payer_name and context.verified_name:
        #     if context.squad_payer_name != context.verified_name:
        #         score += 12
        #         triggered_signals.append("payer_name_mismatch")
        
        # R16: Fraud card bin detection (with null guard)
        if context.squad_card_bin and context.squad_card_bin in FRAUD_CARD_BINS:
            score += 20
            triggered_signals.append("fraud_card_bin_detected")
        
        # R17: Amount agreement check (with explicit None check)
        if context.squad_amount_matches_agreement is not None:
            if context.squad_amount_matches_agreement:
                score -= 3
        
        # ── CLAMP ─────────────────────────────────────────────────────────────
        score = max(0, min(100, score))
        
        return score, triggered_signals, has_critical_override


@router.post("/assess", response_model=FraudAssessResponse)
async def assess_fraud(context: FraudAssessRequest) -> FraudAssessResponse:
    """
    Assess fraud risk using two-layer ensemble
    
    Per API_CONTRACT.md:
    - Synchronous endpoint (max 5s response)
    - Score 0-100 integer (final ensemble score)
    - Flag: GREEN (0-39), AMBER (40-69), RED (70-100)
    - Transparency: rule_score, ml_score shown separately
    - Explainability: SHAP values for ML predictions
    
    Architecture:
    - Layer 1 (45%): Deterministic rule-based scoring
    - Layer 2 (55%): LightGBM ML refinement
    - Ensemble: 0.45 * rule_score + 0.55 * ml_score
    - Hard override: impossible_travel forces score >= 75
    
    Args:
        context: FraudAssessRequest with all signals
    
    Returns:
        FraudAssessResponse with fraud assessment and explainability
    """
    start_time = time.time()
    logger.info(f"[{context.transaction_id}] Starting fraud assessment for user {context.platform_user_id}...")
    
    try:
        # Check response cache first
        cache_key = f"fraud_{context.transaction_id}"
        cached_response = ResponseCache.get(cache_key)
        if cached_response:
            logger.info(f"[{context.transaction_id}] Returning cached fraud assessment")
            return FraudAssessResponse(**cached_response)
        
        # ── LAYER 1: DETERMINISTIC RULES ──────────────────────────────────────
        rule_score, triggered_signals, has_critical = FraudScoringEngine.calculate_rule_score(context)
        logger.info(f"[{context.transaction_id}] Rule score: {rule_score}, critical_override: {has_critical}")
        
        # ── LAYER 2: ML REFINEMENT ────────────────────────────────────────────
        # Load ML models if not already loaded
        _load_ml_models()
        
        ml_score = get_lightgbm_score(context, rule_score)
        if ml_score is not None:
            logger.info(f"[{context.transaction_id}] ML score: {ml_score}")
        else:
            logger.warning(f"[{context.transaction_id}] ML layer unavailable, using rule score only")
        
        # ── ENSEMBLE: Combine layers ──────────────────────────────────────────
        if ml_score is not None:
            # Weighted ensemble: 45% rules + 55% ML
            ensemble_weights = {"rules": 0.45, "ml": 0.55}
            final_score = int(0.45 * rule_score + 0.55 * ml_score)
            logger.debug(f"[{context.transaction_id}] Ensemble: ({rule_score} * 0.45) + ({ml_score} * 0.55) = {final_score}")
        else:
            # ML unavailable: use rule score only
            ensemble_weights = {"rules": 1.0, "ml": 0.0}
            final_score = rule_score
        
        # ── HARD OVERRIDE: Critical signals take precedence ───────────────────
        if has_critical:
            final_score = max(final_score, 75)  # Ensure RED even with good ML score
            logger.info(f"[{context.transaction_id}] Hard override applied: final_score raised to {final_score}")
        
        # Clamp final score
        final_score = max(0, min(100, final_score))
        
        # ── DETERMINE FLAG AND RECOMMENDATION ──────────────────────────────────
        if final_score < 40:
            flag = "GREEN"
            category = "Low Risk"
            recommendation = "proceed"
        elif final_score < 70:
            flag = "AMBER"
            category = "Elevated Risk"
            recommendation = "require_additional_verification"
        else:
            flag = "RED"
            category = "High Risk"
            recommendation = "block"
        
        # ── GET SHAP EXPLANATION (for model transparency) ─────────────────────
        shap_explanation = None
        try:
            if ml_score is not None:
                shap_explanation = get_shap_explanation(context, rule_score)
                if shap_explanation:
                    logger.info(f"[{context.transaction_id}] SHAP explanation generated")
        except Exception as e:
            logger.warning(f"[{context.transaction_id}] SHAP explanation failed (non-critical): {e}")
        
        # ── BUILD RESPONSE ────────────────────────────────────────────────────
        processing_time_ms = int((time.time() - start_time) * 1000)
        
        response_dict = {
            "score": final_score,
            "flag": flag,
            "category": category,
            "triggered_signals": triggered_signals,
            "recommendation": recommendation,
            "rule_score": rule_score,
            "ml_score": ml_score,
            "ensemble_weights": ensemble_weights,
            "shap_explanation": shap_explanation,
            "processing_time_ms": processing_time_ms
        }
        
        # Cache the response for duplicate requests
        ResponseCache.set(cache_key, response_dict)
        
        logger.info(
            f"[{context.transaction_id}] Fraud assessment complete: "
            f"rule={rule_score}, ml={ml_score}, final={final_score}, "
            f"flag={flag}, signals={len(triggered_signals)}, time={processing_time_ms}ms"
        )
        
        return FraudAssessResponse(**response_dict)
    
    except Exception as e:
        logger.error(f"[{context.transaction_id}] Exception during fraud assessment: {e}", exc_info=True)
        # Per API_CONTRACT.md fail-safe: don't return default GREEN, return error
        raise HTTPException(status_code=500, detail=f"Fraud model error: {str(e)}")


class FraudAssessRequest(BaseModel):
    """Request model for fraud assessment per API_CONTRACT.md"""
    transaction_id: str
    platform_user_id: str
    external_user_id: str
    
    # Network signals
    ip_address: str
    ip_reputation_score: int
    is_vpn: bool
    is_proxy: bool
    geolocation: Dict[str, str]
    onboarding_location: Optional[Dict[str, str]] = None
    location_distance_km: float
    impossible_travel: bool
    
    # Device signals
    device_fingerprint: str
    device_seen_before: bool
    device_matches_onboarding: bool
    
    # Behavioral signals
    account_age_days: int
    previous_transactions: int
    transaction_amount: float
    time_since_last_tx_hrs: float
    
    # Identity signals
    identity_verified: bool
    identity_match_score: float
    liveness_passed: bool
    
    # Squad transaction signals (optional)
    squad_payment_channel: Optional[str] = None
    squad_card_bin: Optional[str] = None
    squad_payer_name: Optional[str] = None
    squad_amount_matches_agreement: Optional[bool] = None
    squad_transaction_ref: Optional[str] = None


class FraudAssessResponse(BaseModel):
    """Response model for fraud assessment per API_CONTRACT.md"""
    score: int  # 0-100 integer (final combined score)
    rule_score: Optional[int] = None  # Rule engine score before ML ensemble
    ml_score: Optional[int] = None  # LightGBM ML layer score
    flag: str  # GREEN | AMBER | RED
    category: str  # Low Risk | Elevated Risk | High Risk | Critical
    triggered_signals: List[str]
    recommendation: str  # proceed | require_additional_verification | block
    has_critical_flag: Optional[bool] = None  # True if critical override triggered
    processing_time_ms: float


class FraudScoringEngine:
    """Weighted rule-based fraud scoring engine (Layer 1)"""
    
    @staticmethod
    def calculate_score(context: FraudAssessRequest) -> dict:
        """
        Calculate fraud score based on context signals
        Per backend-review.md with all 5 fixes applied
        
        Args:
            context: FraudAssessRequest with all signals
        
        Returns:
            dict with score, triggered_signals, has_critical_flag, and details
        """
        score = 20  # Base score
        triggered_signals = []
        has_critical_flag = False
        
        # ── HARD OVERRIDES (checked BEFORE scoring) ──────────────────────────
        # FIX 3: impossible_travel must be a hard RED override
        if context.impossible_travel:
            return {
                "score": 85,
                "triggered_signals": ["impossible_travel"],
                "has_critical_flag": True,
                "details": context.dict()
            }
        
        # ── NETWORK & LOCATION ───────────────────────────────────────────────
        if context.is_vpn:
            score += 15
            triggered_signals.append("vpn_detected")
            has_critical_flag = True
        
        if context.is_proxy:
            score += 15
            triggered_signals.append("proxy_detected")
            has_critical_flag = True
        
        if context.location_distance_km > 500:
            score += 5
            triggered_signals.append("unusual_location_distance")
        
        # ── DEVICE ───────────────────────────────────────────────────────────
        # FIX 1: Collapse device_seen_before and new_device into one mutually exclusive conditional
        if context.device_seen_before:
            score -= 3
        else:
            score += 10
            triggered_signals.append("new_device")
        
        # FIX 2: device_matches_onboarding scoring - make it two-sided
        if context.device_matches_onboarding:
            score -= 5  # Same device as KYC — reduces risk
        else:
            score += 8  # Different device — increases risk
            triggered_signals.append("device_mismatch")
        
        # ── BEHAVIORAL ───────────────────────────────────────────────────────
        if context.account_age_days < 7:
            score += 8
            triggered_signals.append("new_account")
        
        if context.transaction_amount > 1_000_000:
            score += 12
            triggered_signals.append("high_value_transaction")
        
        if context.time_since_last_tx_hrs < 1 and context.previous_transactions > 0:
            score += 6
            triggered_signals.append("rapid_transaction_velocity")
        
        if context.previous_transactions > 10:
            score -= 10
        
        # ── IDENTITY ─────────────────────────────────────────────────────────
        if context.identity_verified:
            score -= 10
        else:
            score += 15
            triggered_signals.append("identity_not_verified")
            has_critical_flag = True
        
        if context.identity_match_score > 95:
            score -= 5
        
        if context.liveness_passed:
            score -= 8
        else:
            # Liveness failed is a critical signal
            has_critical_flag = True
        
        # ── SQUAD SIGNALS (null-safe — skipped if data not yet available) ────
        # FIX 5: Drop R15 for this sprint (comment out payer name check)
        # TODO: requires verified_name extracted from identity document
        # Deferred to v2 — add to PlatformUser model and context DTO when ready
        # if context.get("squad_payer_name") and context.get("verified_name"):
        #     if context["squad_payer_name"] != context["verified_name"]:
        #         score += 12
        #         triggered_signals.append("payer_name_mismatch")
        
        # FIX 4: Squad signals need null guards
        if context.squad_card_bin and context.squad_card_bin in FRAUD_CARD_BINS:
            score += 20
            triggered_signals.append("fraud_card_bin_detected")
        
        if context.squad_amount_matches_agreement is not None:
            if context.squad_amount_matches_agreement:
                score -= 3
        
        # ── CLAMP ────────────────────────────────────────────────────────────
        score = max(0, min(100, score))
        
        # Apply critical flag minimum
        if has_critical_flag:
            score = max(score, 70)
        
        return {
            "score": score,
            "triggered_signals": triggered_signals,
            "has_critical_flag": has_critical_flag,
            "details": context.dict()
        }


class MLScoringEngine:
    """LightGBM ML-based fraud scoring engine (Layer 2)"""
    
    @staticmethod
    def get_ml_score(context: FraudAssessRequest, rule_score: int) -> Optional[int]:
        """
        Get ML score from LightGBM model
        
        Args:
            context: Request context with all signals
            rule_score: Rule engine score (used as feature)
        
        Returns:
            ML score (0-100) or None if model not available
        """
        try:
            # Get cached models
            model = ModelCache.get_fraud_model()
            scaler = ModelCache.get_fraud_scaler()
            
            if model is None or scaler is None:
                logger.debug("ML models not available, skipping ML layer")
                return None
            
            # Feature engineering - must match training features
            features = [
                context.account_age_days,
                context.previous_transactions,
                1 if context.is_vpn else 0,
                1 if context.is_proxy else 0,
                context.location_distance_km,
                1 if context.device_matches_onboarding else 0,
                1 if context.device_seen_before else 0,
                context.transaction_amount,
                context.identity_match_score,
                1 if context.identity_verified else 0,
                1 if context.liveness_passed else 0,
                context.time_since_last_tx_hrs,
                rule_score,  # Include rule score as feature
            ]
            
            # Scale features using fitted scaler
            features_array = np.array([features])
            features_scaled = scaler.transform(features_array)
            
            # Get LightGBM prediction (probability of fraud)
            ml_prediction = model.predict_proba(features_scaled)[0][1]
            ml_score = int(ml_prediction * 100)
            
            logger.debug(f"ML score: {ml_score} (raw prediction: {ml_prediction:.3f})")
            return ml_score
        
        except Exception as e:
            logger.warning(f"ML scoring failed, continuing with rule engine only: {e}")
            return None


class FraudEnsemble:
    """Combines rule engine and ML layer into final score"""
    
    RULE_WEIGHT = 0.35  # Rule engine weight
    ML_WEIGHT = 0.65    # ML layer weight
    
    @staticmethod
    def ensemble_scores(rule_score: int, ml_score: Optional[int], has_critical_flag: bool) -> int:
        """
        Combine rule and ML scores
        
        Args:
            rule_score: Rule engine score
            ml_score: LightGBM score (or None if unavailable)
            has_critical_flag: Whether critical override triggered
        
        Returns:
            Final ensemble score (0-100)
        """
        if ml_score is None:
            # ML unavailable, use rule score only
            final_score = rule_score
        else:
            # Ensemble formula: weighted combination
            final_score = int((rule_score * FraudEnsemble.RULE_WEIGHT) + 
                            (ml_score * FraudEnsemble.ML_WEIGHT))
        
        # Apply critical flag minimum
        if has_critical_flag:
            final_score = max(final_score, 70)
        
        # Clamp to 0-100
        final_score = max(0, min(100, final_score))
        
        return final_score


@router.post("/assess", response_model=FraudAssessResponse)
async def assess_fraud(context: FraudAssessRequest) -> FraudAssessResponse:
    """
    Assess fraud risk for a transaction (two-layer ensemble)
    
    Per API_CONTRACT.md:
    - Synchronous endpoint (max 5s response)
    - Score 0-100 integer (final combined score)
    - Flag: GREEN (0-39), AMBER (40-69), RED (70-100)
    - Return triggered signals for transparency
    
    Layer 1 (Rule Engine): 35% weight - transparent, auditable rules
    Layer 2 (LightGBM ML): 65% weight - pattern detection, anomaly scoring
    
    Args:
        context: FraudAssessRequest with full signal context
    
    Returns:
        FraudAssessResponse with fraud assessment (rule + ML scores)
    """
    start_time = time.time()
    logger.info(f"[{context.transaction_id}] Starting fraud assessment (Rule + ML) for user {context.platform_user_id}...")
    
    try:
        # Check response cache first (caches final ensemble response)
        cache_key = f"fraud_{context.transaction_id}"
        cached_response = ResponseCache.get(cache_key)
        if cached_response:
            logger.info(f"[{context.transaction_id}] Returning cached fraud assessment")
            return FraudAssessResponse(**cached_response)
        
        # ─ LAYER 1: Rule Engine Scoring ──────────────────────────────────────
        rule_result = FraudScoringEngine.calculate_score(context)
        rule_score = rule_result["score"]
        triggered_signals = rule_result["triggered_signals"]
        has_critical_flag = rule_result["has_critical_flag"]
        
        logger.debug(
            f"[{context.transaction_id}] Rule engine: score={rule_score}, "
            f"critical_flag={has_critical_flag}, signals={triggered_signals}"
        )
        
        # ─ LAYER 2: LightGBM ML Scoring ──────────────────────────────────────
        ml_score = MLScoringEngine.get_ml_score(context, rule_score)
        logger.debug(f"[{context.transaction_id}] ML score: {ml_score}")
        
        # ─ ENSEMBLE: Combine scores ──────────────────────────────────────────
        final_score = FraudEnsemble.ensemble_scores(rule_score, ml_score, has_critical_flag)
        logger.debug(f"[{context.transaction_id}] Final ensemble score: {final_score}")
        
        # Determine flag and category
        if final_score < 40:
            flag = "GREEN"
            category = "Low Risk"
            recommendation = "proceed"
        elif final_score < 70:
            flag = "AMBER"
            category = "Elevated Risk"
            recommendation = "require_additional_verification"
        else:
            flag = "RED"
            category = "High Risk"
            recommendation = "block"
        
        elapsed = (time.time() - start_time) * 1000
        
        # Build response
        response_dict = {
            "score": final_score,
            "rule_score": rule_score,
            "ml_score": ml_score,
            "flag": flag,
            "category": category,
            "triggered_signals": triggered_signals,
            "recommendation": recommendation,
            "has_critical_flag": has_critical_flag,
            "processing_time_ms": elapsed
        }
        
        # Cache the response for duplicate requests
        ResponseCache.set(cache_key, response_dict)
        
        logger.info(
            f"[{context.transaction_id}] Fraud assessment complete: "
            f"final_score={final_score} (rule={rule_score}, ml={ml_score}), "
            f"flag={flag}, critical={has_critical_flag}, time={elapsed:.1f}ms"
        )
        
        return FraudAssessResponse(**response_dict)
    
    except Exception as e:
        logger.error(f"[{context.transaction_id}] Exception during fraud assessment: {e}", exc_info=True)
        # Per API_CONTRACT.md fail-safe: don't return default GREEN, return error
        raise HTTPException(status_code=500, detail=f"Fraud model error: {str(e)}")
