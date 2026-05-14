"""
Fraud Model Training — LightGBM
Generates synthetic training data and trains the fraud detection ensemble model.
Run this once to generate fraud_model.pkl and fraud_scaler.pkl

Usage:
    python models/train_fraud_model.py
"""

import random
import logging
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from lightgbm import LGBMClassifier
import joblib
import os

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def generate_normal_transaction():
    """Generate a synthetic normal/legitimate transaction"""
    return {
        'account_age_days': random.randint(30, 730),
        'previous_transactions': random.randint(3, 50),
        'is_vpn': 0,
        'is_proxy': 0,
        'location_distance_km': random.randint(0, 200),
        'device_matches_onboarding': 1,
        'device_seen_before': 1,
        'transaction_amount': random.randint(5000, 500000),
        'identity_match_score': random.uniform(85, 99),
        'identity_verified': 1,
        'liveness_passed': 1,
        'time_since_last_tx_hrs': random.uniform(24, 720),
        'ip_reputation_score': random.randint(60, 100),
        'is_location_anomaly': 0,
        'rule_score': random.randint(0, 35),
    }


def generate_fraud_transaction():
    """Generate a synthetic fraudulent transaction"""
    fraud_type = random.choice(['vpn_user', 'new_device', 'impossible_travel', 'unverified', 'velocity', 'large_amount'])
    
    base = {
        'account_age_days': random.randint(0, 30),
        'previous_transactions': random.randint(0, 3),
        'is_vpn': random.choice([0, 1]),
        'is_proxy': random.choice([0, 1]),
        'location_distance_km': random.randint(500, 10000),
        'device_matches_onboarding': 0,
        'device_seen_before': 0,
        'transaction_amount': random.randint(500000, 5000000),
        'identity_match_score': random.uniform(0, 70),
        'identity_verified': random.choice([0, 1]),
        'liveness_passed': 0,
        'time_since_last_tx_hrs': random.uniform(0, 1),
        'ip_reputation_score': random.randint(0, 40),
        'is_location_anomaly': 1,
        'rule_score': random.randint(60, 100),
    }
    
    # Add fraud-specific characteristics
    if fraud_type == 'vpn_user':
        base['is_vpn'] = 1
        base['is_proxy'] = 0
    elif fraud_type == 'new_device':
        base['device_seen_before'] = 0
        base['device_matches_onboarding'] = 0
    elif fraud_type == 'impossible_travel':
        base['location_distance_km'] = random.randint(5000, 15000)
    elif fraud_type == 'unverified':
        base['identity_verified'] = 0
        base['liveness_passed'] = 0
    elif fraud_type == 'velocity':
        base['time_since_last_tx_hrs'] = random.uniform(0.1, 0.5)
        base['previous_transactions'] = random.randint(3, 10)
    
    return base


def generate_training_data(num_normal=800, num_fraud=200):
    """Generate synthetic training dataset"""
    logger.info(f"🔄 Generating synthetic training data ({num_normal} normal + {num_fraud} fraud)...")
    
    normal_transactions = [generate_normal_transaction() for _ in range(num_normal)]
    fraud_transactions = [generate_fraud_transaction() for _ in range(num_fraud)]
    
    # Combine and label
    transactions = normal_transactions + fraud_transactions
    labels = [0] * num_normal + [1] * num_fraud
    
    # Shuffle
    combined = list(zip(transactions, labels))
    random.shuffle(combined)
    transactions, labels = zip(*combined)
    
    df = pd.DataFrame(list(transactions))
    df['label'] = list(labels)
    
    logger.info(f"✓ Generated {len(df)} transactions ({df['label'].sum()} fraud, {(df['label']==0).sum()} normal)")
    return df


def train_model(df, output_dir='models'):
    """Train LightGBM model on synthetic data"""
    logger.info("🚀 Training LightGBM model...")
    
    # Feature set
    features = [
        'account_age_days', 'previous_transactions', 'is_vpn', 'is_proxy',
        'location_distance_km', 'device_matches_onboarding', 'device_seen_before',
        'transaction_amount', 'identity_match_score', 'identity_verified',
        'liveness_passed', 'time_since_last_tx_hrs', 'ip_reputation_score',
        'is_location_anomaly', 'rule_score'
    ]
    
    X = df[features].values
    y = df['label'].values
    
    # Scale features
    logger.info("📊 Scaling features...")
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Train LightGBM with speed-optimized parameters
    logger.info("⏱️  Training with speed-optimized parameters...")
    model = LGBMClassifier(
        n_estimators=100,           # Fast but effective
        max_depth=6,                # Shallow tree for speed
        learning_rate=0.1,
        num_leaves=31,              # LightGBM-specific (faster than XGBoost)
        subsample=0.8,              # Avoid overfitting
        colsample_bytree=0.8,
        random_state=42,
        n_jobs=-1,                  # Parallel training
        verbose=-1,                 # Silent
        tree_method='hist'          # Histogram-based, faster
    )
    
    model.fit(
        X_scaled, y,
        eval_set=[(X_scaled, y)],
        callbacks=[
            # Early stopping not needed for fixed n_estimators
        ]
    )
    
    logger.info("✓ Model trained successfully")
    
    # Save model and scaler
    os.makedirs(output_dir, exist_ok=True)
    
    model_path = os.path.join(output_dir, 'fraud_model.pkl')
    scaler_path = os.path.join(output_dir, 'fraud_scaler.pkl')
    
    joblib.dump(model, model_path)
    joblib.dump(scaler, scaler_path)
    
    logger.info(f"💾 Model saved to: {model_path}")
    logger.info(f"💾 Scaler saved to: {scaler_path}")
    
    # Log feature importance
    logger.info("\n📊 Feature Importance (Top 10):")
    feature_importance = pd.DataFrame({
        'feature': features,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False).head(10)
    
    for idx, row in feature_importance.iterrows():
        logger.info(f"  {row['feature']}: {row['importance']:.4f}")
    
    # Evaluate on training set
    train_pred_proba = model.predict_proba(X_scaled)[:, 1]
    train_pred = model.predict(X_scaled)
    
    from sklearn.metrics import roc_auc_score, precision_score, recall_score, f1_score
    
    auc = roc_auc_score(y, train_pred_proba)
    precision = precision_score(y, train_pred)
    recall = recall_score(y, train_pred)
    f1 = f1_score(y, train_pred)
    
    logger.info(f"\n✅ Model Performance (Training Set):")
    logger.info(f"  AUC-ROC: {auc:.4f} (target: >0.85)")
    logger.info(f"  Precision: {precision:.4f}")
    logger.info(f"  Recall: {recall:.4f}")
    logger.info(f"  F1-Score: {f1:.4f}")
    
    return model, scaler, X_scaled, y


def benchmark_inference(model, scaler, X_test, num_iterations=1000):
    """Benchmark model inference speed"""
    import time
    
    logger.info(f"\n⏱️  Benchmarking inference speed ({num_iterations} iterations)...")
    
    times = []
    for _ in range(num_iterations):
        start = time.perf_counter()
        _ = model.predict_proba(X_test)
        elapsed = (time.perf_counter() - start) * 1000
        times.append(elapsed)
    
    mean_time = np.mean(times)
    p95_time = np.percentile(times, 95)
    p99_time = np.percentile(times, 99)
    
    logger.info(f"✅ Inference Performance:")
    logger.info(f"  Mean: {mean_time:.2f}ms")
    logger.info(f"  P95:  {p95_time:.2f}ms")
    logger.info(f"  P99:  {p99_time:.2f}ms")
    logger.info(f"  Throughput: {1000/mean_time:.0f} predictions/sec")


def main():
    """Main training pipeline"""
    logger.info("="*60)
    logger.info("🚀 LightGBM Fraud Model Training Pipeline")
    logger.info("="*60)
    
    # Generate synthetic data
    df = generate_training_data(num_normal=800, num_fraud=200)
    
    # Train model
    model, scaler, X_scaled, y = train_model(df)
    
    # Benchmark
    benchmark_inference(model, scaler, X_scaled[:100], num_iterations=1000)
    
    logger.info("\n" + "="*60)
    logger.info("✅ Model training complete!")
    logger.info("="*60)
    logger.info("\nNext steps:")
    logger.info("1. Model saved to: models/fraud_model.pkl")
    logger.info("2. Scaler saved to: models/fraud_scaler.pkl")
    logger.info("3. Ready to use in /fraud/assess endpoint")


if __name__ == "__main__":
    main()
