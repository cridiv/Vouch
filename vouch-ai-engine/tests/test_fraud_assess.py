"""
Test Identity Verification Endpoint
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import pytest
from fastapi.testclient import TestClient
from app import app

client = TestClient(app)


def test_health_check():
    """Test health check endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "OK"
    assert "endpoints" in data
    assert "identity_verify" in data["endpoints"]
    assert "fraud_assess" in data["endpoints"]


def test_identity_verify_missing_fields():
    """Test identity verification with missing fields"""
    response = client.post("/identity/verify")
    assert response.status_code == 422  # Validation error


def test_fraud_assess_valid_request():
    """Test fraud assessment with valid GREEN context"""
    context = {
        "transaction_id": "txn_test_001",
        "platform_user_id": "usr_test_001",
        "external_user_id": "buyer_001",
        
        "ip_address": "197.210.84.1",
        "ip_reputation_score": 85,
        "is_vpn": False,
        "is_proxy": False,
        "geolocation": {"country": "NG", "city": "Lagos"},
        "onboarding_location": {"country": "NG", "city": "Lagos"},
        "location_distance_km": 0,
        "impossible_travel": False,
        
        "device_fingerprint": "fp_test",
        "device_seen_before": True,
        "device_matches_onboarding": True,
        
        "account_age_days": 365,
        "previous_transactions": 50,
        "transaction_amount": 100000,
        "time_since_last_tx_hrs": 24,
        
        "identity_verified": True,
        "identity_match_score": 95,
        "liveness_passed": True,
        
        "squad_payment_channel": "card",
        "squad_card_bin": "539983",
        "squad_payer_name": "John Doe",
        "squad_amount_matches_agreement": True,
        "squad_transaction_ref": "SQD_001"
    }
    
    response = client.post("/fraud/assess", json=context)
    assert response.status_code == 200
    data = response.json()
    
    # Should be GREEN (low risk)
    assert "score" in data
    assert "flag" in data
    assert data["flag"] == "GREEN"
    assert data["score"] < 40
    assert data["recommendation"] == "proceed"
    assert "triggered_signals" in data


def test_fraud_assess_red_vpn():
    """Test fraud assessment with VPN (should be RED)"""
    context = {
        "transaction_id": "txn_vpn_001",
        "platform_user_id": "usr_vpn_001",
        "external_user_id": "buyer_vpn",
        
        "ip_address": "197.210.84.1",
        "ip_reputation_score": 85,
        "is_vpn": True,  # VPN flag
        "is_proxy": False,
        "geolocation": {"country": "US", "city": "New York"},
        "onboarding_location": {"country": "NG", "city": "Lagos"},
        "location_distance_km": 9000,
        "impossible_travel": False,
        
        "device_fingerprint": "fp_test",
        "device_seen_before": True,
        "device_matches_onboarding": True,
        
        "account_age_days": 365,
        "previous_transactions": 50,
        "transaction_amount": 100000,
        "time_since_last_tx_hrs": 24,
        
        "identity_verified": True,
        "identity_match_score": 95,
        "liveness_passed": True,
        
        "squad_payment_channel": "card",
        "squad_card_bin": "539983",
        "squad_payer_name": "John Doe",
        "squad_amount_matches_agreement": True,
        "squad_transaction_ref": "SQD_001"
    }
    
    response = client.post("/fraud/assess", json=context)
    assert response.status_code == 200
    data = response.json()
    
    # Should be RED due to VPN
    assert data["flag"] == "RED"
    assert data["score"] >= 70
    assert "is_vpn" in data["triggered_signals"]
    assert data["recommendation"] == "block"


def test_fraud_assess_amber_new_account():
    """Test fraud assessment with new account (should be AMBER)"""
    context = {
        "transaction_id": "txn_new_001",
        "platform_user_id": "usr_new_001",
        "external_user_id": "buyer_new",
        
        "ip_address": "197.210.84.1",
        "ip_reputation_score": 85,
        "is_vpn": False,
        "is_proxy": False,
        "geolocation": {"country": "NG", "city": "Lagos"},
        "onboarding_location": {"country": "NG", "city": "Lagos"},
        "location_distance_km": 0,
        "impossible_travel": False,
        
        "device_fingerprint": "fp_test",
        "device_seen_before": False,  # New device
        "device_matches_onboarding": False,
        
        "account_age_days": 2,  # Very new account
        "previous_transactions": 0,
        "transaction_amount": 500000,  # Large amount
        "time_since_last_tx_hrs": 24,
        
        "identity_verified": True,
        "identity_match_score": 92,
        "liveness_passed": True,
    }
    
    response = client.post("/fraud/assess", json=context)
    assert response.status_code == 200
    data = response.json()
    
    # Should be AMBER due to new account, new device, large amount
    assert data["flag"] == "AMBER"
    assert 40 <= data["score"] < 70
    assert data["recommendation"] == "require_additional_verification"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
