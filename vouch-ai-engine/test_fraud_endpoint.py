"""
Test the fraud assessment endpoint with LightGBM ML layer
Tests all 5 backend-review fixes and ML ensemble
"""

import json
import requests
import time
from datetime import datetime

# Test scenarios per backend-review.md

# Scenario A: Fully clean verified user (should be GREEN)
scenario_a = {
    "transaction_id": "txn_clean_user_001",
    "platform_user_id": "user_001",
    "external_user_id": "ext_001",
    "ip_address": "192.168.1.1",
    "ip_reputation_score": 85,
    "is_vpn": False,
    "is_proxy": False,
    "geolocation": {"country": "NG", "city": "Lagos"},
    "onboarding_location": {"country": "NG", "city": "Lagos"},
    "location_distance_km": 10.0,
    "impossible_travel": False,
    "device_fingerprint": "device_001",
    "device_seen_before": True,
    "device_matches_onboarding": True,
    "account_age_days": 365,
    "previous_transactions": 15,
    "transaction_amount": 50000,
    "time_since_last_tx_hrs": 48.0,
    "identity_verified": True,
    "identity_match_score": 97.5,
    "liveness_passed": True,
}

# Scenario B: VPN only (should be AMBER)
scenario_b = {
    "transaction_id": "txn_vpn_user_002",
    "platform_user_id": "user_002",
    "external_user_id": "ext_002",
    "ip_address": "192.168.1.2",
    "ip_reputation_score": 40,
    "is_vpn": True,
    "is_proxy": False,
    "geolocation": {"country": "US", "city": "New York"},
    "onboarding_location": {"country": "NG", "city": "Lagos"},
    "location_distance_km": 100.0,
    "impossible_travel": False,
    "device_fingerprint": "device_002",
    "device_seen_before": False,  # New device
    "device_matches_onboarding": False,
    "account_age_days": 5,  # New account
    "previous_transactions": 0,
    "transaction_amount": 100000,
    "time_since_last_tx_hrs": 0.5,
    "identity_verified": False,  # Not verified
    "identity_match_score": 45.0,
    "liveness_passed": False,
}

# Scenario C: Impossible travel (should be RED regardless)
scenario_c = {
    "transaction_id": "txn_impossible_travel_003",
    "platform_user_id": "user_003",
    "external_user_id": "ext_003",
    "ip_address": "192.168.1.3",
    "ip_reputation_score": 90,
    "is_vpn": False,
    "is_proxy": False,
    "geolocation": {"country": "GB", "city": "London"},
    "onboarding_location": {"country": "NG", "city": "Lagos"},
    "location_distance_km": 8000.0,  # Impossible travel
    "impossible_travel": True,  # Hard override
    "device_fingerprint": "device_003",
    "device_seen_before": True,
    "device_matches_onboarding": True,
    "account_age_days": 180,
    "previous_transactions": 20,
    "transaction_amount": 50000,
    "time_since_last_tx_hrs": 24.0,
    "identity_verified": True,
    "identity_match_score": 98.0,
    "liveness_passed": True,
}

# Test with Squad signals
scenario_d = {
    "transaction_id": "txn_squad_signals_004",
    "platform_user_id": "user_004",
    "external_user_id": "ext_004",
    "ip_address": "192.168.1.4",
    "ip_reputation_score": 70,
    "is_vpn": False,
    "is_proxy": False,
    "geolocation": {"country": "NG", "city": "Lagos"},
    "onboarding_location": {"country": "NG", "city": "Lagos"},
    "location_distance_km": 5.0,
    "impossible_travel": False,
    "device_fingerprint": "device_004",
    "device_seen_before": True,
    "device_matches_onboarding": True,
    "account_age_days": 90,
    "previous_transactions": 8,
    "transaction_amount": 200000,
    "time_since_last_tx_hrs": 36.0,
    "identity_verified": True,
    "identity_match_score": 94.0,
    "liveness_passed": True,
    "squad_card_bin": "419999",  # Fraud BIN
    "squad_amount_matches_agreement": True,
}


def test_fraud_endpoint(base_url="https://vouch-2uoc.onrender.com"):
    """Test fraud assessment endpoint with all scenarios"""
    
    print("="*70)
    print("🧪 FRAUD ENDPOINT TEST — LightGBM ML Ensemble + Backend Review Fixes")
    print("="*70)
    
    scenarios = [
        ("Scenario A: Clean verified user (should be GREEN)", scenario_a, "GREEN"),
        ("Scenario B: VPN user (should be AMBER)", scenario_b, "AMBER"),
        ("Scenario C: Impossible travel (should be RED)", scenario_c, "RED"),
        ("Scenario D: Squad fraud signals (AMBER or RED)", scenario_d, None),
    ]
    
    for title, scenario, expected_flag in scenarios:
        print(f"\n{title}")
        print("-" * 70)
        
        try:
            start = time.time()
            response = requests.post(
                f"{base_url}/fraud/assess",
                json=scenario,
                timeout=5
            )
            elapsed = time.time() - start
            
            if response.status_code == 200:
                result = response.json()
                
                print(f"✅ Status: {response.status_code}")
                print(f"⏱️  Latency: {elapsed*1000:.1f}ms")
                print(f"📊 Score: {result['score']} (rule={result.get('rule_score', 'N/A')}, ml={result.get('ml_score', 'N/A')})")
                print(f"🚩 Flag: {result['flag']}")
                print(f"📝 Category: {result['category']}")
                print(f"💡 Recommendation: {result['recommendation']}")
                print(f"⚠️  Critical Flag: {result.get('has_critical_flag', False)}")
                print(f"📋 Signals ({len(result['triggered_signals'])}): {', '.join(result['triggered_signals'][:5])}")
                
                # Validate against expected
                if expected_flag:
                    status = "✓" if result['flag'] == expected_flag else "✗"
                    print(f"{status} Expected: {expected_flag}")
                
                # Check latency is within budget
                if elapsed * 1000 < 100:
                    print(f"✓ Latency under 100ms budget")
                else:
                    print(f"⚠️  Latency over 100ms: {elapsed*1000:.1f}ms")
                
            else:
                print(f"❌ Status: {response.status_code}")
                print(f"Error: {response.text}")
        
        except requests.exceptions.ConnectionError:
            print(f"❌ Connection failed - server not responding on {base_url}")
            return False
        except Exception as e:
            print(f"❌ Error: {e}")
    
    print("\n" + "="*70)
    print("✅ Test completed!")
    print("="*70)
    
    return True


if __name__ == "__main__":
    import sys
    
    # Optional: allow custom URL
    url = sys.argv[1] if len(sys.argv) > 1 else "https://vouch-2uoc.onrender.com"
    
    success = test_fraud_endpoint(url)
    sys.exit(0 if success else 1)
