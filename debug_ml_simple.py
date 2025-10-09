#!/usr/bin/env python3
"""
Simple ML Debug Script - Works with Regular VS Code Debugging
Set breakpoints by clicking in the left margin, then press F5 to debug!
"""

import os
import sys

# Fix the import path issue
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None

if load_dotenv:
    load_dotenv()

if 'FRED_API_KEY' not in os.environ:
    raise RuntimeError(
        "FRED_API_KEY environment variable is missing. Set it in your environment or .env file before debugging."
    )

# Now imports will work
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from src.fetch_data import fetch_sp500_from_fred
from src.features import build_feature_set
from src.labels import make_std_labels
from src.config import LABEL_HORIZON
from src.model import make_mlp_bagging, fit_predict

def main():
    """Main debugging function - set breakpoints here!"""
    print("🚀 Starting ML Debug Session...")
    
    # BREAKPOINT 1: Set breakpoint here to start debugging
    print("🔄 Loading S&P 500 data...")
    df_raw = fetch_sp500_from_fred(start="2020-01-01")  # Smaller dataset for faster debugging
    
    # BREAKPOINT 2: Inspect raw data
    print(f"Raw data shape: {df_raw.shape}")
    print(f"Columns: {df_raw.columns.tolist()}")
    print(f"Date range: {df_raw['Date'].min()} to {df_raw['Date'].max()}")
    
    # BREAKPOINT 3: Feature building
    print("🔄 Building features...")
    df_features = build_feature_set(df_raw)
    
    # BREAKPOINT 4: Inspect features
    print(f"Features shape: {df_features.shape}")
    feature_cols = [c for c in df_features.columns if c not in {"Date", "Close"}]
    print(f"Feature columns: {feature_cols}")
    
    # BREAKPOINT 5: Label creation
    print("🔄 Creating labels...")
    df_labeled = make_std_labels(df_features, horizon=LABEL_HORIZON)
    
    # BREAKPOINT 6: Inspect labeled data
    exclude = {"Date", "Close", "label", "fwd_return", "vol_h"}
    feature_cols = [c for c in df_labeled.columns if c not in exclude]
    print(f"Final feature count: {len(feature_cols)}")
    print(f"Label distribution:")
    print(df_labeled['label'].value_counts())
    
    # BREAKPOINT 7: Prepare ML data
    print("🔄 Preparing ML data...")
    df_clean = df_labeled.dropna(subset=feature_cols + ["label"])
    sample_size = min(500, len(df_clean))  # Small sample for debugging
    df_sample = df_clean.head(sample_size)
    
    X = df_sample[feature_cols].values
    y = df_sample["label"].values.astype(int)
    
    # BREAKPOINT 8: Inspect ML arrays
    print(f"X shape: {X.shape}")
    print(f"y shape: {y.shape}")
    print(f"Label distribution: {dict(zip(*np.unique(y, return_counts=True)))}")
    
    # BREAKPOINT 9: Train/test split
    split_idx = int(0.7 * len(X))
    X_train, X_test = X[:split_idx], X[split_idx:]
    y_train, y_test = y[:split_idx], y[split_idx:]
    
    print(f"Train shape: {X_train.shape}, Test shape: {X_test.shape}")
    
    # BREAKPOINT 10: Model training (this is where things get interesting!)
    print("🔄 Training model...")
    clf = make_mlp_bagging()
    
    # BREAKPOINT 11: Inspect model before training
    print(f"Model type: {type(clf)}")
    print(f"Model parameters: {clf.get_params()}")
    
    # BREAKPOINT 12: Make predictions
    y_pred, y_proba, trained_clf = fit_predict(clf, X_train, y_train, X_test)
    
    # BREAKPOINT 13: Inspect results
    accuracy = (y_pred == y_test).mean()
    print(f"✅ Training complete!")
    print(f"Accuracy: {accuracy:.3f}")
    print(f"Predictions: {np.bincount(y_pred.astype(int))}")
    print(f"Probability range: {y_proba.min():.3f} - {y_proba.max():.3f}")
    
    # Return results for inspection
    return {
        'df_raw': df_raw,
        'df_features': df_features, 
        'df_labeled': df_labeled,
        'feature_cols': feature_cols,
        'X_train': X_train,
        'X_test': X_test,
        'y_train': y_train,
        'y_test': y_test,
        'y_pred': y_pred,
        'y_proba': y_proba,
        'accuracy': accuracy,
        'trained_model': trained_clf
    }

if __name__ == "__main__":
    # This is where the debugging starts!
    print("🐛 DEBUG MODE: Set breakpoints and press F5!")
    print("💡 Best breakpoint locations:")
    print("   - Line ~30: After data loading")
    print("   - Line ~45: After feature building")
    print("   - Line ~60: Before ML training")
    print("   - Line ~75: After model training")
    
    results = main()
    print("🎯 All done! Check the results dictionary.")
