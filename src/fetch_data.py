# -*- coding: utf-8 -*-
"""
Hämtar S&P 500-data från FRED.
Kräver en API-nyckel i miljövariabeln FRED_API_KEY.
Dok: https://fred.stlouisfed.org/
"""
import os
import pandas as pd
import requests
from pathlib import Path

# Try to import API key from config, fallback to environment variable
try:
    from src.api_config import FRED_API_KEY as DEFAULT_API_KEY
except ImportError:
    try:
        from .api_config import FRED_API_KEY as DEFAULT_API_KEY
    except ImportError:
        try:
            from api_config import FRED_API_KEY as DEFAULT_API_KEY
        except ImportError:
            DEFAULT_API_KEY = None

# Load environment variables from .env file if it exists
def load_env_file():
    env_path = Path(__file__).parent.parent / '.env'
    if env_path.exists():
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key.strip()] = value.strip()

load_env_file()

FRED_BASE = "https://api.stlouisfed.org/fred/series/observations"

def fetch_sp500_from_fred(start="1990-01-01", end=None, series_id="SP500"):
    """
    Hämtar dagliga observationer (slutvärde) för S&P 500 från FRED.
    Returnerar en DataFrame med kolumnerna: Date (datetime64[ns]), Close (float).
    """
    api_key = os.environ.get("FRED_API_KEY", DEFAULT_API_KEY)
    if api_key is None:
        raise RuntimeError("Saknar FRED_API_KEY i miljövariablerna. Sätt t.ex. export FRED_API_KEY='din-nyckel'")

    if end is None:
        end = pd.Timestamp.today().strftime("%Y-%m-%d")

    params = {
        "series_id": series_id,
        "api_key": api_key,
        "file_type": "json",
        "observation_start": start,
        "observation_end": end,
    }
    r = requests.get(FRED_BASE, params=params, timeout=30)
    r.raise_for_status()
    data = r.json()["observations"]
    df = pd.DataFrame(data)
    # FRED returnerar 'date' och 'value' som strängar
    df["Date"] = pd.to_datetime(df["date"])
    # Värdet kan vara '.' för saknad
    df = df[df["value"] != "."]
    df["Close"] = df["value"].astype(float)
    df = df[["Date", "Close"]].sort_values("Date").reset_index(drop=True)

    # Konvertera till "handelsdagar" genom att filtrera till vardagar (M-F)
    df = df[df["Date"].dt.dayofweek < 5].reset_index(drop=True)

    return df
