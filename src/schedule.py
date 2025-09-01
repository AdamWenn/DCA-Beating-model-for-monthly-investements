# -*- coding: utf-8 -*-
"""
Skapar en schema-generator för återträning var 30:e handelsdag.
"""
import pandas as pd
from .config import RETRAIN_STEP, ROLLING_TRAIN_WINDOW

def retrain_anchors(dates: pd.Series, step: int = RETRAIN_STEP):
    """
    Returnerar indexpositioner för när modellen ska tränas om.
    """
    idxs = list(range(step, len(dates), step))
    return idxs

def training_window_indices(anchor_idx: int, window: int = ROLLING_TRAIN_WINDOW):
    start = max(0, anchor_idx - window)
    end = anchor_idx  # exkluderande
    return start, end
