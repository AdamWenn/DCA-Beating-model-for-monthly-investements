"""
Skapar std-baserade labels för 70 handelsdagars horisont.
Vi använder en enkel och tydlig konstruktion för undervisning:
  1) Beräkna dagliga logavkastningar och dess rullande std över ett fönster (t.ex. 252 dgr).
  2) Skala std till 70-dagars horisont med sqrt(horisont).
  3) Beräkna framtida avkastning över 70 dgr: r_fwd = Close[t+H]/Close[t] - 1.
  4) Label = 1 om r_fwd > m_up * std_252 * sqrt(H), annars 0.
De sista H dagarna kan inte få label (saknar framtid) -> sätts till NaN.
"""
import numpy as np
import pandas as pd
import sys
import os

# Add project root to path and try different import strategies
project_root = os.path.join(os.path.dirname(__file__), '..')
if project_root not in sys.path:
    sys.path.insert(0, project_root)

try:
    from src.config import LABEL_HORIZON, STD_UP_MULT
except ImportError:
    try:
        from .config import LABEL_HORIZON, STD_UP_MULT
    except ImportError:
        from config import LABEL_HORIZON, STD_UP_MULT

# def make_std_labels(df: pd.DataFrame, price_col="Close", vol_window=252, horizon=LABEL_HORIZON, up_mult=STD_UP_MULT):
#     prices = df[price_col].astype(float)
#     # dagliga logreturer
#     logret = np.log(prices / prices.shift(1))
#     vol = logret.rolling(vol_window, min_periods=vol_window).std()
#     vol_h = vol * np.sqrt(horizon)  # skala till H-dagars horisont

#     # framtida avkastning (vanlig procentuell, enkel att förstå)
#     fwd = prices.shift(-horizon) / prices - 1.0

#     label = np.where(fwd > (up_mult * vol_h), 1, 0).astype(float)
#     # sista H dagarna har NaN label
#     label[-horizon:] = np.nan

#     out = df.copy()
#     out["label"] = label
#     out["fwd_return"] = fwd
#     out["vol_h"] = vol_h
#     return out

def labels_give_data_set_with_0_or_1(df, price_col="Close"):
    prices = df[price_col].astype(float)
    n = len(prices)

    max_up = np.full(n, np.nan)
    min_down = np.full(n, np.nan)

    window = 70
    for i in range(n - window):
        P0 = prices[i]
        future_prices = prices[i + 1:i + 1 + window]
        rel = (future_prices - P0) / P0
        max_up[i] = np.max(rel)
        min_down[i] = np.min(rel)
      
    # condition 1: hit 10% up in next 70 days
    cond_rise = max_up >= 0.10
    # condition 2: did not hit -5% down in next 70 days
    cond_no_big_drop = min_down > -0.05

    labels = np.where(cond_rise & cond_no_big_drop, 1, 0).astype("float")
    labels[n-window:] = np.nan  # last 70 days have no label

    out = df.copy()
    out["label"] = labels
    return out