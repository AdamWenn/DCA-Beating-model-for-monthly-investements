# -*- coding: utf-8 -*-
"""
Indikatorbibliotek enligt rapportens anda: dynamiska trendindikatorer och relativa mått.
Vi implementerar generiska varianter som kan kombineras fritt.
"""
import numpy as np
import pandas as pd

# def ema(series: pd.Series, span: int) -> pd.Series:
#     return series.ewm(span=span, adjust=False, min_periods=span).mean()

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

# def mom_ema(price: pd.Series, span: int, window: int) -> pd.Series:
#     """Momentum på EMA: EMA(price) - EMA(price).shift(window)."""
#     e = ema(price, span)
#     return e - e.shift(window)

def ema_seeded(close: pd.Series, n: int) -> pd.Series:
    """
    EMA with SMA(n) seed as in the paper:
      k = 2/(n+1)
      EMA_n = SMA of the first n closes
      EMA_t = k*C_t + (1-k)*EMA_{t-1}  for t > n
    Returns a Series aligned to 'close'. First n-1 values are NaN.
    """
    close = close.astype(float)
    k = 2.0 / (n + 1.0)
    ema = pd.Series(np.nan, index=close.index)

    if len(close) < n:
        return ema

    # seed at index n-1 (0-based)
    seed_idx = close.index[n-1]
    ema.loc[seed_idx] = close.iloc[:n].mean()

    # recursive update
    prev = ema.loc[seed_idx]
    for idx in close.index[n:]:
        val = k * close.loc[idx] + (1.0 - k) * prev
        ema.loc[idx] = val
        prev = val

    return ema

# --- TEMA per paper: 3*EMA1 - 3*EMA2 + EMA3 ---
def tema_paper(series: pd.Series, n: int) -> pd.Series:
    ema1 = ema_seeded(series, n)
    ema2 = ema_seeded(ema1.dropna(), n).reindex(series.index)
    ema3 = ema_seeded(ema2.dropna(), n).reindex(series.index)
    return 3.0 * ema1 - 3.0 * ema2 + ema3

def mom_ema(close: pd.Series, n: int, ofs: int, log_ratio: bool = False) -> pd.Series:
    """
    MomEma_t(n, ofs) = EMA_t(n) / EMA_{t-ofs}(n)
    Uses EMA defined by ema_seeded (SMA seed).
    """
    ema = ema_seeded(close, n)
    base = ema.shift(ofs)
    ratio = ema / base
    if log_ratio:
        return np.log(ratio)
    return ratio

# --- MomTema ratio (optionally log-ratio) ---
def mom_tema(series: pd.Series, n: int, ofs: int, log_ratio: bool = False) -> pd.Series:
    """MomTema_t(n, ofs) = TEMA_t(n) / TEMA_{t-ofs}(n)"""
    tma = tema_paper(series, n)
    ratio = tma / tma.shift(ofs)
    return np.log(ratio) if log_ratio else ratio

# def rc_tema(price: pd.Series, span: int, window: int) -> pd.Series:
#     """Rate-of-change på TEMA."""
#     t = tema(price, span)
#     return (t / t.shift(window)) - 1.0

# --- RCTema: close / TEMA ---
def rc_tema(series: pd.Series, n: int, mode: str = "ratio") -> pd.Series:
    """
    RCTema_t(n) = Close_t / TEMA_t(n)
    mode:
      - 'ratio' (default): Close / TEMA
      - 'log'            : log(Close / TEMA)
      - 'pct'            : (Close / TEMA) - 1
    """
    tma = tema_paper(series, n)
    ratio = series.astype(float) / tma
    if mode == "log":
        return np.log(ratio)
    if mode == "pct":
        return ratio - 1.0
    return ratio


def log_return(series: pd.Series, n: int) -> pd.Series:
    s = series.astype(float).replace(0, np.nan)  # avoid -inf if any zeros
    return np.log(s) - np.log(s.shift(n))        # equivalent to np.log(s / s.shift(n))

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


# def rolling_min(series: pd.Series, window: int) -> pd.Series:
#     return series.rolling(window=window, min_periods=window).min()

# def rolling_avg(series: pd.Series, window: int) -> pd.Series:
#     return series.rolling(window=window, min_periods=window).mean()



def _pad_left(vals, target_len):
    """Left-pad a short list with its first value until it reaches target_len."""
    if not vals:
        return [np.nan] * target_len
    while len(vals) < target_len:
        vals.insert(0, vals[0])
    return vals

def rtf_recursive_ses_H_eq_n(close: pd.Series,
                             alpha: float = 0.3,
                             sma_windows=(30, 100, 150)) -> pd.DataFrame:
    """
    No look-ahead. For each SMA window n, horizon H = n.
    At each t:
      - update SES level l_t = α*C_t + (1-α)*l_{t-1}
      - forecast next H closes flat at l_t
      - seed SMA with last (n-1) actual closes up to t (left-pad at very start)
      - compute the next H SMA(n) values over [seed + H forecasts]
      - take avg/min of those H values (forward metrics)

    Returns columns:
      FWD_SMA_{n}_avg, FWD_SMA_{n}_min, and also RTF_* if you want them later.
    """
    close = close.astype(float)
    y = close.to_numpy()
    idx = close.index
    n_obs = len(y)

    # init SES level with the first close
    l = y[0]

    out = {}
    for n in sma_windows:
      out[f"FWD_SMA_{n}_avg"] = []
      out[f"FWD_SMA_{n}_min"] = []

    for t in range(n_obs):
        # recursive SES update using only data up to t
        l = alpha * y[t] + (1 - alpha) * l

        for n in sma_windows:
            H = n  # convention: lookahead = SMA length

            # forecast H steps (flat)
            fc = np.full(H, l)

            # seed = last (n-1) closes up to t (pad at the very beginning)
            start = max(0, t - (n - 1))
            seed = y[start:t+1].tolist()
            seed = seed[-(n-1):]
            seed = _pad_left(seed, n - 1)

            # build sequence and compute H future SMA(n)
            seq = pd.Series(seed + fc.tolist())
            sma = seq.rolling(n, min_periods=n).mean().iloc[n-1:]
            sma_future = sma.iloc[:H]

            out[f"FWD_SMA_{n}_avg"].append(float(sma_future.mean()))
            out[f"FWD_SMA_{n}_min"].append(float(sma_future.min()))

    return pd.DataFrame(out, index=idx)

