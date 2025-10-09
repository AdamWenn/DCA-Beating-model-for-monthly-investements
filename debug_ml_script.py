# Debug ML Script - Regular Python debugging in VS Code
# This file can be debugged normally with F5, breakpoints, etc.

import os
import sys
import pandas as pd
import numpy as np

# Add the project directory to path
sys.path.append(r'c:\Users\adisw\Downloads\lab_project_with_solutions\project_solutions')

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None

if load_dotenv:
    load_dotenv()

if 'FRED_API_KEY' not in os.environ:
    raise RuntimeError(
        "FRED_API_KEY environment variable is missing. Set it before running this debugging script."
    )

def main():
    print("🐛 REGULAR DEBUGGING SCRIPT")
    print("=" * 40)
    
    # Import our modules
    from src.fetch_data import fetch_sp500_from_fred
    from src.features import build_feature_set
    from src.labels import make_std_labels
    from src.config import LABEL_HORIZON
    from src.model import make_mlp_bagging, fit_predict
    
    # Step 1: Load data - SET BREAKPOINT HERE (click left margin)
    print("🔄 Loading S&P 500 data...")
    df_raw = fetch_sp500_from_fred(start="2020-01-01")  # Smaller dataset for faster debugging
    
    # Step 2: Build features - SET BREAKPOINT HERE
    print("🔄 Building features...")
    df_features = build_feature_set(df_raw)
    
    # Step 3: Create labels - SET BREAKPOINT HERE  
    print("🔄 Creating labels...")
    df_labeled = make_std_labels(df_features, horizon=LABEL_HORIZON)
    
    # Step 4: Prepare data for ML - SET BREAKPOINT HERE
    exclude = {"Date","Close","label","fwd_return","vol_h"}
    feature_cols = [c for c in df_labeled.columns if c not in exclude]
    
    df_clean = df_labeled.dropna(subset=feature_cols+["label"])
    sample_size = min(500, len(df_clean))  # Small sample for debugging
    df_sample = df_clean.head(sample_size)
    
    X = df_sample[feature_cols].values
    y = df_sample["label"].values.astype(int)
    
    print(f"📊 Data prepared:")
    print(f"  - Sample size: {X.shape}")
    print(f"  - Features: {len(feature_cols)}")
    print(f"  - Label distribution: {dict(zip(*np.unique(y, return_counts=True)))}")
    
    # Step 5: Train/test split - SET BREAKPOINT HERE
    split_idx = int(0.7 * len(X))
    X_train, X_test = X[:split_idx], X[split_idx:]
    y_train, y_test = y[:split_idx], y[split_idx:]
    
    # Step 6: Train model - SET BREAKPOINT HERE
    print("\n🔄 Training model...")
    clf = make_mlp_bagging()
    y_pred, y_proba, trained_clf = fit_predict(clf, X_train, y_train, X_test)
    
    # Step 7: Calculate results - SET BREAKPOINT HERE
    accuracy = (y_pred == y_test).mean()
    print(f"✅ Model trained! Accuracy: {accuracy:.3f}")
    
    # Debug variables you can inspect:
    debug_vars = {
        'data_shape': df_clean.shape,
        'feature_count': len(feature_cols),
        'accuracy': accuracy,
        'prediction_sample': y_pred[:10],
        'probability_sample': y_proba[:10]
    }
    
    print("\n🎯 Debug variables created!")
    print("Set breakpoints and inspect variables in VS Code debugger")
    
    return debug_vars

if __name__ == "__main__":
    # This will run when you press F5 or use "Run Python File in Terminal"
    result = main()
    print("\n✅ Script completed!")
    print("You can now debug this script normally in VS Code!")
