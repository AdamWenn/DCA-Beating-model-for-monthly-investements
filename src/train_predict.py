# -*- coding: utf-8 -*-
"""
Rullande träning i driftläge (var 30:e handelsdag) på fast feature-set enligt Sub-model 4.
"""
import pandas as pd
from .schedule import retrain_anchors, training_window_indices
from .config import RETRAIN_STEP, ROLLING_TRAIN_WINDOW
from .model import make_mlp_bagging, fit_predict

def rolling_train_predict(df_feat_label: pd.DataFrame, feature_cols):
    dates = df_feat_label["Date"].reset_index(drop=True)
    anchors = retrain_anchors(dates, RETRAIN_STEP)

    preds = pd.Series(index=range(len(df_feat_label)), dtype=float)
    probas = pd.Series(index=range(len(df_feat_label)), dtype=float)

    for anchor in anchors:
        tr_start, tr_end = training_window_indices(anchor, ROLLING_TRAIN_WINDOW)
        train_slice = df_feat_label.iloc[tr_start:tr_end].copy().dropna(subset=["label"] + feature_cols)
        if len(train_slice) < 400:
            continue

        X_train = train_slice[feature_cols].values
        y_train = train_slice["label"].values

        next_anchor = anchor + RETRAIN_STEP
        test_slice = df_feat_label.iloc[anchor:next_anchor].copy().dropna(subset=feature_cols)
        if test_slice.empty:
            continue

        X_test = test_slice[feature_cols].values

        clf = make_mlp_bagging()
        y_pred, y_proba, _ = fit_predict(clf, X_train, y_train, X_test)

        preds.iloc[test_slice.index] = y_pred.astype(float)
        probas.iloc[test_slice.index] = y_proba.astype(float)

    out = df_feat_label.copy()
    out["pred"] = preds
    out["proba"] = probas
    return out
