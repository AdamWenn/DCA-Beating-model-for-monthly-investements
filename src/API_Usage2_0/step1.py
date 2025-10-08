
import sys
import os


import sys
import os

# Add the project root to Python path and run as module
project_root = os.path.join(os.path.dirname(__file__), '..', '..')
sys.path.insert(0, project_root)

import pandas as pd
import numpy as np

# Try different import strategies
try:
    from src.features import build_feature_set
    from src.fetch_data import fetch_sp500_from_fred
    from src.labels import labels_give_data_set_with_0_or_1
    from src.model import fit_predict, make_mlp_bagging
except ImportError:
    # If that fails, try from parent directory
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
    from features import build_feature_set
    from fetch_data import fetch_sp500_from_fred
    from labels import labels_give_data_set_with_0_or_1
    from model import fit_predict, make_mlp_bagging

last_train_date = pd.to_datetime("1900-01-01")
clf = None
y_proba_storage = []  # Store the latest prediction probabilities here
df_signals = pd.DataFrame(columns=["Date", "Close", "Signal"])  # Global signals dataframe


def something(start="1999-01-01"):
    df = fetch_sp500_from_fred(start=start)
    # Add features
    df_feat = build_feature_set(df, price_col="Close")
    df_feat_label = labels_give_data_set_with_0_or_1(df_feat, price_col="Close")

    # Drop naN rows in label column
    df_feat_label = df_feat_label.dropna(subset=["label"])

    # Drop naN rows in feature columns and report on dropped rows
    feature_cols = [c for c in df_feat_label.columns if c not in ("label", "Close", "Date")]
    before = df_feat_label.shape[0]
    df_feat_label = df_feat_label.dropna(subset=feature_cols)
    dropped_rows = before - df_feat_label.shape[0]
    if dropped_rows > 0:
        print(f"Dropped {dropped_rows} rows from feature columns")

    # For every day 2 years back from most recent close in from fred, where its in form pd.to_datetime
    date_moste_recent = df["Date"].max()

    for date in pd.date_range(end=date_moste_recent, start=date_moste_recent - pd.DateOffset(years=2)):
        print(date)
        get_predictions(date, df_feat_label)


def get_predictions(date_most_recent, df_feat_label):
    global clf, last_train_date, y_proba_storage, df_signals
    y_proba = None

    threshold = 0.3

    # Remove future data
    df_feat_label = df_feat_label[df_feat_label["Date"] <= date_most_recent].copy()
    
    # Define feature columns (exclude non-feature columns)
    feature_cols = [c for c in df_feat_label.columns if c not in ("label", "Close", "Date")]
    
    days_since = (date_most_recent - last_train_date).days
    if days_since == 0:
        # already retrained today
        return
    if days_since >= 30 or clf is None:
        # First make the precitions with old model
        if clf is not None:
            features_for_current_date = df_feat_label[df_feat_label["Date"] == date_most_recent][feature_cols]
            if len(features_for_current_date) > 0: # Might be no features for this date if it was dropped due to NaN and the nasdaq market being closed
                # print("Making live predictions for date", date_most_recent)
                # print("Features:", features_for_current_date)
                y_proba = clf.predict_proba(features_for_current_date)
                print(y_proba)

        # retrain model
        X, Y = df_feat_label[feature_cols], df_feat_label["label"]

        clf = make_mlp_bagging()
        clf.fit(X, Y)
        last_train_date = date_most_recent
        pass
    # 0 < days_since < 30
    # not time to retrain yet
    # but can still make live predictions
    features_for_current_date = df_feat_label[df_feat_label["Date"] == date_most_recent][feature_cols]
    if len(features_for_current_date) > 0: # Might be no features for this date if it was dropped due to NaN and the nasdaq market being closed
        # print("Making live predictions for date", date_most_recent)
        # print("Features:", features_for_current_date)
        y_proba = clf.predict_proba(features_for_current_date)
        print(y_proba)

    if y_proba is not None:
        # DEBUG: Print probability for current date
        print(f"DEBUG TRAINING: {date_most_recent.date()} -> P(Buy)={y_proba[0, 1]:.3f}, P(Hold)={y_proba[0, 0]:.3f}")
        
        # Store it
        y_proba_storage.append(y_proba)
        # Get Date and Close for current date
        current_date_data = df_feat_label[df_feat_label["Date"] == date_most_recent]
        # Generate signals Buy/Hold and add to global DataFrame
        new_signals = pd.DataFrame({
            "Date": current_date_data["Date"],
            "Close": current_date_data["Close"],
            "Signal": np.where(y_proba[:, 1] > threshold, "Buy", "Hold"), # This threshold represents the decision boundary in the equation. So for example, if threshold=0.3, then if prob of class 1 is >0.3, we classify as class 1 (Buy), else class 0 (Hold).
            "TN_TP_FP_FN": np.where(current_date_data["label"] == 1,
                                   np.where(y_proba[:, 1] > threshold, "TP", "FN"),
                                   np.where(y_proba[:, 1] > threshold, "FP",  "TN"))
        })
        df_signals = pd.concat([df_signals, new_signals], ignore_index=True)
        print(df_signals.tail())

    # A very fancy print of the probabilities
    if len(y_proba_storage) > 0:
        all_probs = np.vstack(y_proba_storage)
        print(all_probs.shape)  # (700, 2) if binary classification
    else:
        print("No predictions made yet")


def add_recent_signals():
    """
    Generate trading signals for recent dates that don't have labels (after June 26, 2025).
    
    This function:
    1. Uses the already-trained model from something() 
    2. Fetches recent market data (June 27, 2025 onwards)
    3. Generates Buy/Hold predictions for these dates
    4. Adds them to df_signals with empty TN_TP_FP_FN (since we can't evaluate future performance)
    
    Note: Must be called after something() to ensure the model is trained.
    """
    global clf, df_signals
    
    if clf is None:
        print("ERROR: No trained model available. Run something() first.")
        return
    
    # Get the latest date in our current signals (should be around June 26, 2025)
    last_signal_date = df_signals["Date"].max()
    print(f"Last evaluated signal date: {last_signal_date}")
    
    # Get fresh market data including recent dates
    print("Fetching latest market data...")
    df_recent = fetch_sp500_from_fred(start="1999-01-01")
    df_feat_recent = build_feature_set(df_recent, price_col="Close")
    
    # Drop rows with missing technical indicators
    feature_cols = [c for c in df_feat_recent.columns if c not in ("Close", "Date")]
    df_feat_clean = df_feat_recent.dropna(subset=feature_cols)
    
    # Find dates after our last evaluated signal (recent unlabeled dates)
    recent_dates = df_feat_clean[df_feat_clean["Date"] > last_signal_date].copy()
    
    if len(recent_dates) > 0:
        print(f"Generating {len(recent_dates)} recent predictions:")
        print(f"  Date range: {recent_dates['Date'].min()} to {recent_dates['Date'].max()}")
        
        threshold = 0.3  # Same threshold as in get_predictions()
        
        for _, row in recent_dates.iterrows():
            # Prepare features for prediction
            features = row[feature_cols].values.reshape(1, -1)
            y_proba = clf.predict_proba(features)
            signal = "Buy" if y_proba[0, 1] > threshold else "Hold"
            
            # DEBUG: Print probability information
            print(f"DEBUG: {row['Date'].date()} -> P(Buy)={y_proba[0, 1]:.3f}, P(Hold)={y_proba[0, 0]:.3f} -> {signal}")
            
            # Add to signals DataFrame with empty evaluation column
            new_signal = pd.DataFrame({
                "Date": [row["Date"]],
                "Close": [row["Close"]],
                "Signal": [signal],
                "TN_TP_FP_FN": [""]  # Empty - can't evaluate without 70 days of future data
            })
            
            df_signals = pd.concat([df_signals, new_signal], ignore_index=True)
        
        print(f"✓ Successfully added {len(recent_dates)} recent trading signals")
    else:
        print("No recent dates found (all dates already have signals)")


if __name__ == "__main__":
    something()

    # Add recent signals using the trained model
    print("\n=== Adding recent signals ===")
    add_recent_signals()

    # Export the signals to CSV
    df_signals.to_csv("signals.csv", index=False)
    
    # Show summary
    with_eval = df_signals[df_signals["TN_TP_FP_FN"] != ""]
    without_eval = df_signals[df_signals["TN_TP_FP_FN"] == ""]
    
    print(f"\n=== FINAL SUMMARY ===")
    print(f"Total signals: {len(df_signals)}")
    print(f"With evaluation: {len(with_eval)}")
    print(f"Recent predictions: {len(without_eval)}")
    print(f"Date range: {df_signals['Date'].min()} to {df_signals['Date'].max()}")