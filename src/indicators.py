# -*- coding: utf-8 -*-
"""
Indikatorbibliotek enligt rapportens anda: dynamiska trendindikatorer och relativa mått.
Vi implementerar generiska varianter som kan kombineras fritt.
"""
import numpy as np
import pandas as pd

def ema(series: pd.Series, span: int) -> pd.Series:
    return series.ewm(span=span, adjust=False, min_periods=span).mean()

def tema(series: pd.Series, span: int) -> pd.Series:
    e1 = ema(series, span)
    e2 = ema(e1, span)
    e3 = ema(e2, span)
    return 3*e1 - 3*e2 + e3

def sma(series: pd.Series, window: int) -> pd.Series:
    return series.rolling(window=window, min_periods=window).mean()

def momentum(series: pd.Series, window: int) -> pd.Series:
    return series - series.shift(window)

def rate_of_change(series: pd.Series, window: int) -> pd.Series:
    prev = series.shift(window)
    return (series / prev) - 1.0

def rsma(price: pd.Series, window: int) -> pd.Series:
    """Relativt SMA: pris relativt SMA - 1."""
    s = sma(price, window)
    return (price / s) - 1.0

def mom_ema(price: pd.Series, span: int, window: int) -> pd.Series:
    """Momentum på EMA: EMA(price) - EMA(price).shift(window)."""
    e = ema(price, span)
    return e - e.shift(window)

def rc_tema(price: pd.Series, span: int, window: int) -> pd.Series:
    """Rate-of-change på TEMA."""
    t = tema(price, span)
    return (t / t.shift(window)) - 1.0

def linreg_slope(series: pd.Series, window: int) -> pd.Series:
    """
    Linjär regressionslutning över ett rullande fönster.
    Returnerar lutning per dag (unitless, på samma skala som serien).
    """
    import numpy as np
    y = series.values
    n = len(series)
    slopes = np.full(n, np.nan, dtype=float)
    x = np.arange(window, dtype=float)
    x = (x - x.mean())  # center
    denom = (x**2).sum()
    for i in range(window-1, n):
        y_win = y[i-window+1:i+1]
        if np.any(np.isnan(y_win)):
            continue
        # slope = cov(x,y)/var(x) med centrerad x
        slopes[i] = (x * (y_win - y_win.mean())).sum() / denom
    return pd.Series(slopes, index=series.index)

def rtf(price: pd.Series, window: int = 70) -> pd.Series:
    """
    Relative Trend Forecast (approximation):
      - beräkna lutning (linreg) på log-pris över 'window'
      - skala till 'window' steg framåt: rtf = slope * window
      - uttryck relativt aktuell nivå (logskala -> approx procent)
    """
    logp = np.log(price.astype(float))
    sl = linreg_slope(logp, window=window)
    return sl * window  # approx framtida log-avkastning över 'window'


def rolling_min(series: pd.Series, window: int) -> pd.Series:
    return series.rolling(window=window, min_periods=window).min()

def rolling_avg(series: pd.Series, window: int) -> pd.Series:
    return series.rolling(window=window, min_periods=window).mean()
