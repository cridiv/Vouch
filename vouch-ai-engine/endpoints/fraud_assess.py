"""
Fraud Assessment Endpoint
Scores transaction risk based on multiple signal categories per API_CONTRACT.md
"""

import logging
import time
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/fraud", tags=["fraud"])


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
    score: int  # 0-100 integer
    flag: str  # GREEN | AMBER | RED
    category: str  # Low Risk | Elevated Risk | High Risk | Critical
    triggered_signals: List[str]
    recommendation: str  # proceed | require_additional_verification | block
    processing_time_ms: float


class FraudScoringEngine:
    """Weighted rule-based fraud scoring engine"""
    
    # Scoring rules: signal -> points
    # Higher points = higher fraud risk
    RULES = {
        # CRITICAL signals - instant RED territory
        "is_vpn": 35,                          # VPN is strong fraud indicator
        "is_proxy": 30,                        # Proxy also suspicious
        "impossible_travel": 50,               # Physically impossible = definite fraud
        "liveness_failed": 40,                 # Failed liveness check
        "identity_not_verified": 35,           # Unverified identity
        
        # Device signals - moderate risk
        "device_not_seen_before": 15,          # New device
        "device_not_matches_onboarding": 12,   # Device mismatch
        
        # Location signals - moderate risk
        "location_distance_high": 12,          # Far from home location
        "ip_reputation_low": 18,               # Low IP reputation
        
        # Account behavior - varies by risk level
        "account_very_new": 20,                # Brand new account = risky
        "high_transaction_amount": 16,         # Large first transaction
        "high_velocity": 14,                   # Rapid transactions
        
        # POSITIVE signals - reduce risk (negative points)
        "established_customer": -12,           # Long account history
        "identity_verified": -10,              # Verified identity
        "identity_high_match_score": -8,       # Excellent face match
        "liveness_passed": -8,                 # Passed liveness check
        "device_seen_before": -5,              # Recognized device
    }
    
    @staticmethod
    def calculate_score(context: FraudAssessRequest) -> dict:
        """
        Calculate fraud score based on context signals
        
        Args:
            context: FraudAssessRequest with all signals
        
        Returns:
            dict with score, triggered_signals, and details
        """
        score = 20  # Base score
        triggered_signals = []
        has_critical_flag = False
        
        # 1. CRITICAL signals (immediate RED - cannot be canceled)
        if context.is_vpn:
            score += 50  # Significant increase
            triggered_signals.append("is_vpn")
            has_critical_flag = True
        
        if context.is_proxy:
            score += 45
            triggered_signals.append("is_proxy")
            has_critical_flag = True
        
        if context.impossible_travel:
            score += 60
            triggered_signals.append("impossible_travel")
            has_critical_flag = True
        
        # 2. Device signals
        if not context.device_seen_before:
            score += 15
            triggered_signals.append("device_not_seen_before")
        
        if not context.device_matches_onboarding:
            score += 12
            triggered_signals.append("device_not_matches_onboarding")
        
        # 3. Location signals
        if context.location_distance_km > 500:
            score += 12
            triggered_signals.append(f"location_distance_{int(context.location_distance_km)}km")
        
        # 4. Account behavior signals
        if context.account_age_days < 7:
            score += 20
            triggered_signals.append("account_very_new")
        elif context.account_age_days > 365 and not has_critical_flag:
            # Only reduce for old accounts if no critical flag
            score -= 5
            triggered_signals.append("established_account")
        
        if context.transaction_amount > 500000:
            score += 16
            triggered_signals.append("high_transaction_amount")
        
        if context.time_since_last_tx_hrs < 1 and context.previous_transactions > 0:
            score += 14
            triggered_signals.append("high_velocity")
        
        if context.previous_transactions > 10 and not has_critical_flag:
            # Only reduce for repeat customers if no critical flag
            score -= 8
            triggered_signals.append("repeat_customer")
        
        # 5. Identity signals - MOST IMPORTANT
        if not context.identity_verified:
            score += 40
            triggered_signals.append("identity_not_verified")
            has_critical_flag = True
        else:
            if not has_critical_flag:  # Only reduce if no critical fraud signals
                score -= 10
                triggered_signals.append("identity_verified")
            else:
                triggered_signals.append("identity_verified")
        
        if context.identity_verified and context.identity_match_score < 85:
            score += 25
            triggered_signals.append("identity_low_match_score")
        elif context.identity_verified and context.identity_match_score > 95 and not has_critical_flag:
            score -= 5
            triggered_signals.append("identity_high_confidence")
        
        if not context.liveness_passed:
            score += 45
            triggered_signals.append("liveness_failed")
            has_critical_flag = True
        else:
            if not has_critical_flag:
                score -= 8
                triggered_signals.append("liveness_passed")
            else:
                triggered_signals.append("liveness_passed")
        
        # 6. IP reputation
        if context.ip_reputation_score < 30:
            score += 18
            triggered_signals.append("ip_reputation_low")
        
        # 7. Squad signals
        if context.squad_amount_matches_agreement is False:
            score += 25
            triggered_signals.append("squad_amount_mismatch")
        
        # Ensure minimum score for critical flags
        if has_critical_flag:
            score = max(score, 70)  # Critical flags guarantee at least 70 (RED)
        
        # Clamp score to 0-100
        score = max(0, min(100, score))
        
        return {
            "score": score,
            "triggered_signals": triggered_signals,
            "details": context.dict()
        }


@router.post("/assess", response_model=FraudAssessResponse)
async def assess_fraud(context: FraudAssessRequest) -> FraudAssessResponse:
    """
    Assess fraud risk for a transaction
    
    Per API_CONTRACT.md:
    - Synchronous endpoint (max 5s response)
    - Score 0-100 integer
    - Flag: GREEN (0-39), AMBER (40-69), RED (70-100)
    - Return triggered signals for transparency
    
    Args:
        context: FraudAssessRequest with full signal context
    
    Returns:
        FraudAssessResponse with fraud assessment
    """
    start_time = time.time()
    logger.info(f"[{context.transaction_id}] Starting fraud assessment for user {context.platform_user_id}...")
    
    try:
        # Calculate fraud score
        result = FraudScoringEngine.calculate_score(context)
        score = result["score"]
        triggered_signals = result["triggered_signals"]
        
        # Determine flag and category
        if score < 40:
            flag = "GREEN"
            category = "Low Risk"
            recommendation = "proceed"
        elif score < 70:
            flag = "AMBER"
            category = "Elevated Risk"
            recommendation = "require_additional_verification"
        else:
            flag = "RED"
            category = "Critical"
            recommendation = "block"
        
        elapsed = (time.time() - start_time) * 1000
        
        logger.info(
            f"[{context.transaction_id}] Fraud assessment complete: "
            f"score={score}, flag={flag}, signals={len(triggered_signals)}, time={elapsed:.1f}ms"
        )
        
        return FraudAssessResponse(
            score=score,
            flag=flag,
            category=category,
            triggered_signals=triggered_signals,
            recommendation=recommendation,
            processing_time_ms=elapsed
        )
    
    except Exception as e:
        logger.error(f"[{context.transaction_id}] Exception during fraud assessment: {e}", exc_info=True)
        # Per API_CONTRACT.md fail-safe: don't return default GREEN, return error
        raise HTTPException(status_code=500, detail=f"Fraud model error: {str(e)}")
