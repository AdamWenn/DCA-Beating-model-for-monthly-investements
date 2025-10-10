import os
import sys

# Add the project root to Python path
project_root = os.path.join(os.path.dirname(__file__), '..', '..')
sys.path.insert(0, project_root)

import numpy as np
import pandas as pd
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    accuracy_score,
    roc_auc_score,
    precision_recall_fscore_support,
    average_precision_score,
)
from sklearn.utils.class_weight import compute_sample_weight

# Imports from this project
try:
    from src.features import build_feature_set
    from src.fetch_data import fetch_sp500_from_fred
    from src.labels import labels_give_data_set_with_0_or_1
    from src.model import make_mlp_bagging, make_hgb
except ImportError:
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
    from features import build_feature_set
    from fetch_data import fetch_sp500_from_fred
    from labels import labels_give_data_set_with_0_or_1
    from model import make_mlp_bagging, make_hgb


# --- Global state (mirrors step1) ---
last_train_date = pd.to_datetime("1900-01-01")
clf = None
decision_threshold = None  # Updated at retrain for future days
y_proba_storage = []
df_signals = pd.DataFrame(columns=["Date", "Close", "Signal"])  # will gain extra cols

# Model/threshold selection configuration via env
MODEL_NAME = os.environ.get("STEP1_MODEL", "mlp_bagging").lower()


def _choose_threshold(
    y_true: np.ndarray,
    y_score: np.ndarray,
    target_recall: float = 0.64,
    min_precision: float = 0.0,
    target_precision: float = 0.6,
    mode: str = "prec_at_recall",
) -> float:
    """Threshold selection policy for future days.

    - mode == 'prec_at_recall': maximize precision s.t. recall >= target_recall and precision >= min_precision
    - mode == 'recall_at_prec': maximize recall s.t. precision >= target_precision
    Fallback: best F1 on Buy; else default 0.3
    """
    ts = np.linspace(0.05, 0.95, 181)
    if mode == "recall_at_prec":
        best_rec, best_t = -1.0, None
        for t in ts:
            y_pred = (y_score >= t).astype(int)
            prec, rec, f1, _ = precision_recall_fscore_support(y_true, y_pred, labels=[0, 1], zero_division=0)
            p1, r1 = float(prec[1]), float(rec[1])
            if p1 >= target_precision and r1 > best_rec:
                best_rec, best_t = r1, float(t)
        if best_t is not None:
            return best_t
    else:
        best_prec, best_t = -1.0, None
        for t in ts:
            y_pred = (y_score >= t).astype(int)
            prec, rec, f1, _ = precision_recall_fscore_support(y_true, y_pred, labels=[0, 1], zero_division=0)
            p1, r1 = float(prec[1]), float(rec[1])
            if r1 >= target_recall and p1 >= min_precision and p1 > best_prec:
                best_prec, best_t = p1, float(t)
        if best_t is not None:
            return best_t

    # fallback: best F1 on Buy
    best_f1, best_t = -1.0, None
    for t in ts:
        y_pred = (y_score >= t).astype(int)
        prec, rec, f1, _ = precision_recall_fscore_support(y_true, y_pred, labels=[0, 1], zero_division=0)
        if float(f1[1]) > best_f1:
            best_f1, best_t = float(f1[1]), float(t)
    return float(best_t) if best_t is not None else 0.3


def something(start: str = None):
    # Allow overriding fetch start and years-back via env
    fetch_start = os.environ.get("STEP1_FETCH_START", None)
    years_back_env = os.environ.get("STEP1_YEARS_BACK", "2")
    try:
        years_back = int(years_back_env)
    except Exception:
        years_back = 2

    df = fetch_sp500_from_fred(start=fetch_start or start or "1999-01-01")
    df_feat = build_feature_set(df, price_col="Close")
    df_feat_label = labels_give_data_set_with_0_or_1(df_feat, price_col="Close")
    df_feat_label = df_feat_label.dropna(subset=["label"])  # only rows with labels for training

    feature_cols = [c for c in df_feat_label.columns if c not in ("label", "Close", "Date")]
    before = df_feat_label.shape[0]
    df_feat_label = df_feat_label.dropna(subset=feature_cols)
    dropped_rows = before - df_feat_label.shape[0]
    if dropped_rows > 0:
        print(f"Dropped {dropped_rows} rows from feature columns")

    date_most_recent = df["Date"].max()

    loop_start = date_most_recent - pd.DateOffset(years=years_back)
    for date in pd.date_range(end=date_most_recent, start=loop_start):
        get_predictions(date, df_feat_label)


def _fit_model(X, Y):
    global clf
    if MODEL_NAME == "hgb":
        y_arr = np.asarray(Y).astype(int)
        classes, counts = np.unique(y_arr, return_counts=True)
        n = len(y_arr)
        k = len(classes)
        if k < 2:
            return  # not enough class diversity to train meaningfully
        # instantiate with/without early_stopping depending on class counts
        if np.min(counts) < 2 or n < 100:
            clf = make_hgb(early_stopping=False)
        else:
            clf = make_hgb()
        # manual balanced weights: n / (k * n_c)
        cw = {c: (n / (k * cnt)) for c, cnt in zip(classes, counts)}
        sw = np.array([cw[int(c)] for c in y_arr], dtype=float)
        clf.fit(X, y_arr, sample_weight=sw)
    else:
        clf = make_mlp_bagging()
        y_arr = np.asarray(Y).astype(int)
        clf.fit(X, y_arr)


def get_predictions(date_most_recent: pd.Timestamp, df_feat_label: pd.DataFrame):
    """Safe fix #2 (no look-ahead on retrain days):
    - If retrain is due, first predict the current date with the OLD model (using the last threshold),
      record that signal, then retrain and retune threshold for future days.
    - If no retrain, predict with the current model.
    """
    global clf, last_train_date, y_proba_storage, df_signals, decision_threshold

    # env controls
    threshold_env = os.environ.get("STEP1_THRESHOLD", "")
    target_recall_env = float(os.environ.get("STEP1_TARGET_RECALL", "0.64"))
    min_precision_env = float(os.environ.get("STEP1_MIN_PRECISION", "0.0"))
    target_precision_env = float(os.environ.get("STEP1_TARGET_PRECISION", "0.60"))
    policy_env = os.environ.get("STEP1_THRESH_POLICY", "prec_at_recall").lower()

    # Remove future rows
    df_sub = df_feat_label[df_feat_label["Date"] <= date_most_recent].copy()
    feature_cols = [c for c in df_sub.columns if c not in ("label", "Close", "Date")]

    # If model not trained yet, train on history up to current date and set threshold for future days
    if clf is None:
        if len(df_sub) < 50:
            # Not enough history with clean features yet
            return
        X, Y = df_sub[feature_cols], df_sub["label"]
        if len(X) == 0:
            return
        _fit_model(X, Y)
        last_train_date = date_most_recent
        # threshold selection for future
        labeled = df_sub.dropna(subset=["label"])  # all are labeled here
        val = labeled.tail(min(300, len(labeled)))
        if len(val) > 5:
            Xv = val[feature_cols].values
            yv = val["label"].values.astype(int)
            yv_score = clf.predict_proba(Xv)[:, 1]
            decision_threshold = _choose_threshold(
                yv,
                yv_score,
                target_recall=target_recall_env,
                min_precision=min_precision_env,
                target_precision=target_precision_env,
                mode=policy_env,
            )
        else:
            decision_threshold = 0.3
        return  # no signal for the very first date (cold start)

    # Otherwise, we have a model; decide if we should retrain
    days_since = (date_most_recent - last_train_date).days
    features_today = df_sub[df_sub["Date"] == date_most_recent][feature_cols]

    def _append_signal(y_proba: np.ndarray):
        global df_signals
        # choose threshold (old one if set, else env, else default)
        if threshold_env:
            try:
                thr = float(threshold_env)
            except ValueError:
                thr = 0.3
        else:
            thr = decision_threshold if decision_threshold is not None else 0.3

        current_date_data = df_sub[df_sub["Date"] == date_most_recent]
        new_signals = pd.DataFrame({
            "Date": current_date_data["Date"],
            "Close": current_date_data["Close"],
            "Signal": np.where(y_proba[:, 1] > thr, "Buy", "Hold"),
            "TN_TP_FP_FN": np.where(
                current_date_data["label"] == 1,
                np.where(y_proba[:, 1] > thr, "TP", "FN"),
                np.where(y_proba[:, 1] > thr, "FP", "TN"),
            ),
            "proba_buy": y_proba[:, 1],
            "proba_hold": y_proba[:, 0],
        })
        # store
        y_proba_storage.append(y_proba)
        df_signals = pd.concat([df_signals, new_signals], ignore_index=True)

    if days_since >= 30:
        # 1) Predict with OLD model for current date and store
        if len(features_today) > 0:
            y_proba_old = clf.predict_proba(features_today)
            _append_signal(y_proba_old)

        # 2) Retrain on all data <= today for use starting NEXT day
        X, Y = df_sub[feature_cols], df_sub["label"]
        if len(X) > 0:
            _fit_model(X, Y)
        last_train_date = date_most_recent

        # 3) Select threshold for future days
        labeled = df_sub.dropna(subset=["label"])  # safety
        val = labeled.tail(min(300, len(labeled)))
        if len(val) > 5:
            Xv = val[feature_cols].values
            yv = val["label"].values.astype(int)
            yv_score = clf.predict_proba(Xv)[:, 1]
            decision_threshold = _choose_threshold(
                yv,
                yv_score,
                target_recall=target_recall_env,
                min_precision=min_precision_env,
                target_precision=target_precision_env,
                mode=policy_env,
            )
        else:
            decision_threshold = 0.3
        # Do NOT re-predict for this date with the new model
        return

    # No retrain due; predict with current model
    if len(features_today) > 0:
        y_proba = clf.predict_proba(features_today)
        _append_signal(y_proba)


def add_recent_signals():
    """Generate signals for recent unlabeled dates using the trained model (no evaluation)."""
    global clf, df_signals
    if clf is None:
        print("ERROR: No trained model available. Run something() first.")
        return

    last_signal_date = df_signals["Date"].max()
    print(f"Last evaluated signal date: {last_signal_date}")

    df_recent = fetch_sp500_from_fred(start="1999-01-01")
    df_feat_recent = build_feature_set(df_recent, price_col="Close")
    feature_cols = [c for c in df_feat_recent.columns if c not in ("Close", "Date")]
    df_feat_clean = df_feat_recent.dropna(subset=feature_cols)

    recent_dates = df_feat_clean[df_feat_clean["Date"] > last_signal_date].copy()
    if len(recent_dates) == 0:
        print("No recent dates found (all dates already have signals)")
        return

    print(f"Generating {len(recent_dates)} recent predictions:")
    print(f"  Date range: {recent_dates['Date'].min()} to {recent_dates['Date'].max()}")

    # choose final threshold (env overrides)
    threshold_env = os.environ.get("STEP1_THRESHOLD", "")
    if threshold_env:
        try:
            thr = float(threshold_env)
        except ValueError:
            thr = decision_threshold if decision_threshold is not None else 0.3
    else:
        thr = decision_threshold if decision_threshold is not None else 0.3

    for _, row in recent_dates.iterrows():
        features = row[feature_cols].values.reshape(1, -1)
        y_proba = clf.predict_proba(features)
        signal = "Buy" if y_proba[0, 1] > thr else "Hold"
        new_signal = pd.DataFrame({
            "Date": [row["Date"]],
            "Close": [row["Close"]],
            "Signal": [signal],
            "TN_TP_FP_FN": [""],
            "proba_buy": [float(y_proba[0, 1])],
            "proba_hold": [float(y_proba[0, 0])],
        })
        df_signals = pd.concat([df_signals, new_signal], ignore_index=True)
    print(f"OK: Successfully added {len(recent_dates)} recent trading signals")


if __name__ == "__main__":
    # 1) Walk-forward with no look-ahead on retrain days
    something()

    # 2) Add recent unlabeled signals
    print("\n=== Adding recent signals ===")
    add_recent_signals()

    # 3) Export signals
    df_signals.to_csv("signals.csv", index=False)

    # 4) Summaries & metrics for labeled portion
    with_eval = df_signals[df_signals["TN_TP_FP_FN"] != ""]
    without_eval = df_signals[df_signals["TN_TP_FP_FN"] == ""]
    print("\n=== FINAL SUMMARY ===")
    print(f"Total signals: {len(df_signals)}")
    print(f"With evaluation: {len(with_eval)}")
    print(f"Recent predictions: {len(without_eval)}")
    print(f"Date range: {df_signals['Date'].min()} to {df_signals['Date'].max()}")

    if len(with_eval) > 0:
        tn_tp_fp_fn = with_eval["TN_TP_FP_FN"].values
        y_true, y_pred = [], []
        for val in tn_tp_fp_fn:
            if val == "TP":
                y_true.append(1); y_pred.append(1)
            elif val == "FN":
                y_true.append(1); y_pred.append(0)
            elif val == "FP":
                y_true.append(0); y_pred.append(1)
            elif val == "TN":
                y_true.append(0); y_pred.append(0)
        y_true = np.array(y_true); y_pred = np.array(y_pred)
        accuracy = accuracy_score(y_true, y_pred)
        precision, recall, f1, support = precision_recall_fscore_support(y_true, y_pred, labels=[0, 1])
        try:
            y_score = with_eval["proba_buy"].to_numpy()
            auc = roc_auc_score(y_true, y_score)
            pr_auc = average_precision_score(y_true, y_score)
            print(f"ROC-AUC: {auc:.4f}")
            print(f"PR-AUC:  {pr_auc:.4f}")
        except Exception as e:
            print(f"AUC/PR-AUC: Could not calculate: {e}")
        print(f"\nOverall Accuracy: {accuracy:.4f}")
        print(f"\n{'Class':<10} {'Precision':<12} {'Recall':<12} {'F1-Score':<12} {'Support':<10}")
        print("=" * 60)
        print(f"{'Label 0':<10} {precision[0]:<12.4f} {recall[0]:<12.4f} {f1[0]:<12.4f} {support[0]:<10}")
        print(f"{'Label 1':<10} {precision[1]:<12.4f} {recall[1]:<12.4f} {f1[1]:<12.4f} {support[1]:<10}")
        cm = confusion_matrix(y_true, y_pred)
        print("\nConfusion Matrix:")
        print(f"                 Predicted Hold  Predicted Buy")
        print(f"Actual Hold      {cm[0,0]:<15} {cm[0,1]:<15}")
        print(f"Actual Buy       {cm[1,0]:<15} {cm[1,1]:<15}")
