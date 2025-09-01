# -*- coding: utf-8 -*-
"""
Adaptiv feature-subset: välj top-K features vid varje träningstillfälle.
Vi använder mutual information som enkel, robust rankare.
"""
import numpy as np
import pandas as pd
from sklearn.feature_selection import mutual_info_classif

def rank_features(X: np.ndarray, y: np.ndarray, feature_names):
    mi = mutual_info_classif(X, y, discrete_features=False, random_state=None)
    ranking = sorted(zip(feature_names, mi), key=lambda t: t[1], reverse=True)
    return ranking

def select_top_k(feature_names, ranking, k):
    keep = [name for name, score in ranking[:k]]
    return keep

def apply_feature_subset(df: pd.DataFrame, keep_names):
    # return only kept columns (they should exist)
    return df[keep_names].copy()
