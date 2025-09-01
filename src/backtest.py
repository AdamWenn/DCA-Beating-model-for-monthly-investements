# -*- coding: utf-8 -*-
"""
Ettårs-backtest (6x2 mån) med fast Sub-model 4 feature-set.
"""
import pandas as pd
import numpy as np
from dateutil.relativedelta import relativedelta
from .model import make_mlp_bagging, fit_predict

def six_two_month_windows(df):
    end_all = pd.to_datetime(df["Date"].max()).normalize()
    start_all = end_all - relativedelta(months=12)
    windows = []
    cur = start_all
    for _ in range(6):
        nxt = cur + relativedelta(months=2)
        windows.append((cur, nxt))
        cur = nxt
    return windows

def train_on_older_data(df, cutoff_date):
    return df[df["Date"] < cutoff_date].copy()

def test_on_window(df, start, end):
    mask = (df["Date"] >= start) & (df["Date"] < end)
    return df[mask].copy()

def backtest_six_windows(df_feat_label, feature_cols):
    wins = six_two_month_windows(df_feat_label)
    results = []
    reports = []

    for (start, end) in wins:
        train_df = train_on_older_data(df_feat_label, start).dropna(subset=["label"] + feature_cols)
        test_df = test_on_window(df_feat_label, start, end).dropna(subset=feature_cols)

        if len(train_df) < 500 or len(test_df) == 0:
            continue

        X_train = train_df[feature_cols].values
        y_train = train_df["label"].values
        X_test = test_df[feature_cols].values

        clf = make_mlp_bagging()
        y_pred, y_proba, _ = fit_predict(clf, X_train, y_train, X_test)

        test_df = test_df.copy()
        test_df["pred"] = y_pred.astype(float)
        test_df["proba"] = y_proba.astype(float)
        results.append(test_df)

        true = test_df["label"].values
        pred = test_df["pred"].values
        tp = int(((pred == 1) & (true == 1)).sum())
        tn = int(((pred == 0) & (true == 0)).sum())
        fp = int(((pred == 1) & (true == 0)).sum())
        fn = int(((pred == 0) & (true == 1)).sum())
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0

        reports.append({
            "window_start": start.strftime("%Y-%m-%d"),
            "window_end": end.strftime("%Y-%m-%d"),
            "TP": tp, "TN": tn, "FP": fp, "FN": fn,
            "precision_1": round(precision, 4),
            "recall_1": round(recall, 4),
            "f1_1": round(f1, 4),
            "n": int(len(true)),
        })

    report_df = pd.DataFrame(reports)
    return results, report_df
