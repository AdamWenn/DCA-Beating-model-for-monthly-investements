# -*- coding: utf-8 -*-
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
from .config import LABEL_HORIZON, STD_UP_MULT

def make_std_labels(df: pd.DataFrame, price_col="Close", vol_window=252, horizon=LABEL_HORIZON, up_mult=STD_UP_MULT):
    prices = df[price_col].astype(float)
    # dagliga logreturer
    logret = np.log(prices / prices.shift(1))
    vol = logret.rolling(vol_window, min_periods=vol_window).std()
    vol_h = vol * np.sqrt(horizon)  # skala till H-dagars horisont

    # framtida avkastning (vanlig procentuell, enkel att förstå)
    fwd = prices.shift(-horizon) / prices - 1.0

    label = np.where(fwd > (up_mult * vol_h), 1, 0).astype(float)
    # sista H dagarna har NaN label
    label[-horizon:] = np.nan

    out = df.copy()
    out["label"] = label
    out["fwd_return"] = fwd
    out["vol_h"] = vol_h
    return out
