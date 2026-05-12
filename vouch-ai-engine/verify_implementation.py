#!/usr/bin/env python3
"""
Quick verification test - Tests fraud scoring without pytest overhead
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from endpoints.fraud_assess import FraudScoringEngine, FraudAssessRequest

def test_green_scenario():
    """Test GREEN flag - clean, established user"""
    context = FraudAssessRequest(
        transaction_id="txn_test_001",
        platform_user_id="usr_test_001",
        external_user_id="buyer_001",
        ip_address="197.210.84.1",
        ip_reputation_score=85,
        is_vpn=False,
        is_proxy=False,
        geolocation={"country": "NG", "city": "Lagos"},
        onboarding_location={"country": "NG", "city": "Lagos"},
        location_distance_km=0,
        impossible_travel=False,
        device_fingerprint="fp_test",
        device_seen_before=True,
        device_matches_onboarding=True,
        account_age_days=365,
        previous_transactions=50,
        transaction_amount=100000,
        time_since_last_tx_hrs=24,
        identity_verified=True,
        identity_match_score=95,
        liveness_passed=True,
        squad_payment_channel="card",
        squad_card_bin="539983",
        squad_payer_name="John Doe",
        squad_amount_matches_agreement=True,
        squad_transaction_ref="SQD_001"
    )
    
    result = FraudScoringEngine.calculate_score(context)
    score = result["score"]
    
    print(f"✓ GREEN Test: score={score}, signals={len(result['triggered_signals'])}")
    assert score < 40, f"GREEN score should be < 40, got {score}"
    assert "identity_verified" in result["triggered_signals"]
    assert "liveness_passed" in result["triggered_signals"]
    print(f"  Signals: {result['triggered_signals']}")
    return True


def test_red_vpn_scenario():
    """Test RED flag - VPN detected"""
    context = FraudAssessRequest(
        transaction_id="txn_vpn_001",
        platform_user_id="usr_vpn_001",
        external_user_id="buyer_vpn",
        ip_address="197.210.84.1",
        ip_reputation_score=85,
        is_vpn=True,  # VPN!
        is_proxy=False,
        geolocation={"country": "US", "city": "New York"},
        onboarding_location={"country": "NG", "city": "Lagos"},
        location_distance_km=9000,
        impossible_travel=False,
        device_fingerprint="fp_test",
        device_seen_before=True,
        device_matches_onboarding=True,
        account_age_days=365,
        previous_transactions=50,
        transaction_amount=100000,
        time_since_last_tx_hrs=24,
        identity_verified=True,
        identity_match_score=95,
        liveness_passed=True,
        squad_payment_channel="card",
        squad_card_bin="539983",
        squad_payer_name="John Doe",
        squad_amount_matches_agreement=True,
        squad_transaction_ref="SQD_001"
    )
    
    result = FraudScoringEngine.calculate_score(context)
    score = result["score"]
    
    print(f"✓ RED (VPN) Test: score={score}, signals={len(result['triggered_signals'])}")
    assert score >= 70, f"RED VPN score should be >= 70, got {score}"
    assert "is_vpn" in result["triggered_signals"]
    print(f"  Signals: {result['triggered_signals']}")
    return True


def test_red_impossible_travel():
    """Test RED flag - Impossible travel"""
    context = FraudAssessRequest(
        transaction_id="txn_travel_001",
        platform_user_id="usr_travel_001",
        external_user_id="buyer_travel",
        ip_address="197.210.84.1",
        ip_reputation_score=85,
        is_vpn=False,
        is_proxy=False,
        geolocation={"country": "US", "city": "New York"},
        onboarding_location={"country": "NG", "city": "Lagos"},
        location_distance_km=10000,
        impossible_travel=True,  # Impossible travel!
        device_fingerprint="fp_test",
        device_seen_before=True,
        device_matches_onboarding=True,
        account_age_days=365,
        previous_transactions=50,
        transaction_amount=100000,
        time_since_last_tx_hrs=0.1,  # Only 6 minutes since last
        identity_verified=True,
        identity_match_score=95,
        liveness_passed=True,
    )
    
    result = FraudScoringEngine.calculate_score(context)
    score = result["score"]
    
    print(f"✓ RED (Impossible Travel) Test: score={score}, signals={len(result['triggered_signals'])}")
    assert score >= 70, f"RED impossible travel score should be >= 70, got {score}"
    assert "impossible_travel" in result["triggered_signals"]
    print(f"  Signals: {result['triggered_signals']}")
    return True


def test_amber_new_account():
    """Test AMBER flag - New account with suspicious behavior"""
    context = FraudAssessRequest(
        transaction_id="txn_new_001",
        platform_user_id="usr_new_001",
        external_user_id="buyer_new",
        ip_address="197.210.84.1",
        ip_reputation_score=85,
        is_vpn=False,
        is_proxy=False,
        geolocation={"country": "NG", "city": "Lagos"},
        onboarding_location={"country": "NG", "city": "Lagos"},
        location_distance_km=0,
        impossible_travel=False,
        device_fingerprint="fp_test",
        device_seen_before=False,  # New device
        device_matches_onboarding=False,
        account_age_days=3,  # Very new account
        previous_transactions=0,
        transaction_amount=550000,  # Large amount (>500k)
        time_since_last_tx_hrs=24,
        identity_verified=True,
        identity_match_score=92,
        liveness_passed=True,
    )
    
    result = FraudScoringEngine.calculate_score(context)
    score = result["score"]
    
    print(f"✓ AMBER Test: score={score}, signals={len(result['triggered_signals'])}")
    assert 40 <= score < 70, f"AMBER score should be 40-69, got {score}"
    assert "account_very_new" in result["triggered_signals"]
    assert "device_not_seen_before" in result["triggered_signals"]
    assert "high_transaction_amount" in result["triggered_signals"]
    print(f"  Signals: {result['triggered_signals']}")
    return True


if __name__ == "__main__":
    print("=" * 60)
    print("🧪 TrustLayer Fraud Scoring Engine - Verification Tests")
    print("=" * 60)
    print()
    
    try:
        test_green_scenario()
        print()
        test_red_vpn_scenario()
        print()
        test_red_impossible_travel()
        print()
        test_amber_new_account()
        
        print()
        print("=" * 60)
        print("✅ All fraud scoring tests passed!")
        print("=" * 60)
        sys.exit(0)
    except Exception as e:
        print()
        print("=" * 60)
        print(f"❌ Test failed: {e}")
        print("=" * 60)
        import traceback
        traceback.print_exc()
        sys.exit(1)
