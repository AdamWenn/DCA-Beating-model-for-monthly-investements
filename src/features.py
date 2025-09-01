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
from .indicators import ema, tema, sma, momentum, rate_of_change, rsma, mom_ema, rc_tema, rtf, rolling_min, rolling_avg

def build_feature_set(df: pd.DataFrame, price_col="Close") -> pd.DataFrame:
    px = df[price_col].astype(float)

    out = df.copy()

    # --- RTF --- (trend_metric: slope på logpris, length=70)
    out["RTF_70_slope"] = rtf(px, window=70)

    # TODO: Lägg till en alternativ RTF-variant (t.ex. length=50) på en rad:
    # out["RTF_50_slope"] = rtf(px, window=50)

    # --- SMA-min/avg ---
    for n in (30, 100, 150):
        out[f"SMA_{n}_avg"] = rolling_avg(px, n)      # medelvärde av pris över n
        out[f"SMA_{n}_min"] = rolling_min(px, n)      # minsta pris över n

    # --- Relative indicators ---
    # MomEma (n, ofs)
    out["MomEma_150_15"] = mom_ema(px, span=150, window=15)
    out["MomEma_70_15"]  = mom_ema(px, span=70,  window=15)
    out["MomEma_100_15"] = mom_ema(px, span=100, window=15)

    # MomTema (n, ofs)
    out["MomTema_300_15"] = tema(px, 300) - tema(px, 300).shift(15)

    # RCTema (n)
    out["RCTema_200"] = rc_tema(px, span=200, window=200)
    out["RCTema_100"] = rc_tema(px, span=100, window=100)

    # --- Standard indicator ---
    out["LogReturn_30"] = np.log(px / px.shift(30))

    return out
