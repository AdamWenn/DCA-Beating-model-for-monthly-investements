# -*- coding: utf-8 -*-
"""
Sub-model 4 feature set enligt specifikationen.

Innehåll:
- RTF (trend-type, length, trend-metric) -> vi tillhandahåller RTF_slopes över 70 dagar (logpris-slope * length)
- SMA (30/100/150) - både min och avg (rolling min/mean på pris över fönstret)
- Relative indicators:
    MomEma (n, ofs): (150,15), (70,15), (100,15)
    MomTema (n, ofs): (300,15)
    RCTema (n): (200), (100)
- Standard indicator:
    LogReturn (30)
Små TODOs lämnas för studenten (t.ex. lägga till en ytterligare RTF-variant).
"""
import numpy as np
import pandas as pd
from .indicators import  log_return, mom_tema, rtf_recursive_ses_H_eq_n, tema, sma, momentum, rate_of_change, rsma, mom_ema, rc_tema, rtf

def build_feature_set(df: pd.DataFrame, price_col="Close") -> pd.DataFrame:
    px = df[price_col].astype(float)

    out = df.copy()

    # # --- RTF --- (trend_metric: slope på logpris, length=70)
    # out["RTF_70_slope"] = rtf(px, window=70)

    # # TODO: Lägg till en alternativ RTF-variant (t.ex. length=50) på en rad:
    # # out["RTF_50_slope"] = rtf(px, window=50)

    # --- SMA-min/avg on ES-FORECASTED closes with H = n (no look-ahead) ---
    sma_windows = (30, 100, 150)
    ses_alpha = 0.5  # pick your SES alpha (fixed for unbiased recursive updates)

    fwd = rtf_recursive_ses_H_eq_n(px, alpha=ses_alpha, sma_windows=sma_windows)

    for n in sma_windows:
        # forward metrics of SMA(n) over the *next n* forecasted steps
        out[f"SMA_{n}_avg"] = fwd[f"FWD_SMA_{n}_avg"]
        out[f"SMA_{n}_min"] = fwd[f"FWD_SMA_{n}_min"]

    # # --- SMA-min/avg ---
    # for n in (30, 100, 150):
    #     out[f"SMA_{n}_avg"] = rolling_avg(px, n)      # medelvärde av pris över n // px should be the forcasted value.
    #     out[f"SMA_{n}_min"] = rolling_min(px, n)      # minsta pris över n

    # --- Relative indicators ---
    # MomEma (n, ofs)
    out["MomEma_150_15"] = mom_ema(px, n=150, ofs=15)
    out["MomEma_70_15"]  = mom_ema(px, n=70,  ofs=15)
    out["MomEma_100_15"] = mom_ema(px, n=100, ofs=15)

    # MomTema (n, ofs)
    out["MomTema_300_15"] = mom_tema(px, n=300, ofs=15)

    # RCTema (n)
    out["RCTema_200"] = rc_tema(px, n=200)
    out["RCTema_100"] = rc_tema(px, n=100)

    # --- Standard indicator ---
    #out["LogReturn_30"] = np.log(px / px.shift(30))
    out["LogReturn_30"] = log_return(px, 30)

    return out
