#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Simple script to check the most recent NASDAQ data availability
and calculate how many days behind today it is.
"""

import pandas as pd
import requests
import os
from datetime import datetime, date
import warnings

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None

if load_dotenv:
    load_dotenv()

# Suppress warnings for cleaner output
warnings.filterwarnings('ignore')

def fetch_nasdaq_from_fred(series_id="NASDAQCOM", days_back=10):
    """
    Fetch recent NASDAQ data from FRED API to find the most recent available date.
    
    Args:
        series_id: FRED series ID for NASDAQ (default: "NASDAQCOM")
        days_back: How many days back to look from today (default: 10)
    
    Returns:
        tuple: (most_recent_date, most_recent_value) or (None, None) if failed
    """
    api_key = os.environ.get("FRED_API_KEY")
    
    if not api_key:
        print("❌ Error: FRED_API_KEY not found in environment variables")
        return None, None
    
    # Calculate date range (look back from today)
    today = date.today()
    start_date = (today - pd.Timedelta(days=days_back)).strftime("%Y-%m-%d")
    end_date = today.strftime("%Y-%m-%d")
    
    print(f"🔍 Checking NASDAQ data from {start_date} to {end_date}...")
    
    try:
        # FRED API endpoint
        url = "https://api.stlouisfed.org/fred/series/observations"
        params = {
            "series_id": series_id,
            "api_key": api_key,
            "file_type": "json",
            "observation_start": start_date,
            "observation_end": end_date,
            "sort_order": "desc",  # Most recent first
            "limit": 10
        }
        
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        observations = data.get("observations", [])
        
        if not observations:
            print("❌ No observations returned from FRED API")
            return None, None
        
        # Find most recent non-missing observation
        for obs in observations:
            if obs["value"] != "." and obs["value"]:
                most_recent_date = pd.to_datetime(obs["date"]).date()
                most_recent_value = float(obs["value"])
                return most_recent_date, most_recent_value
        
        print("❌ No valid (non-missing) observations found")
        return None, None
        
    except requests.RequestException as e:
        print(f"❌ Network error: {e}")
        return None, None
    except Exception as e:
        print(f"❌ Error fetching data: {e}")
        return None, None

def calculate_data_lag():
    """
    Main function to check NASDAQ data availability and calculate lag.
    """
    print("📊 NASDAQ Data Availability Checker")
    print("=" * 40)
    
    # Get current date and time
    now = datetime.now()
    today = now.date()
    current_time = now.strftime("%H:%M:%S")
    
    print(f"🕐 Current date/time: {today} {current_time}")
    print(f"📅 Today's weekday: {today.strftime('%A')}")
    
    # Fetch most recent NASDAQ data
    most_recent_date, most_recent_value = fetch_nasdaq_from_fred()
    
    if most_recent_date is None:
        print("\n❌ Failed to retrieve NASDAQ data")
        return
    
    # Calculate lag
    lag_days = (today - most_recent_date).days
    
    print(f"\n📈 Most recent NASDAQ data:")
    print(f"   Date: {most_recent_date} ({most_recent_date.strftime('%A')})")
    print(f"   Value: {most_recent_value:,.2f}")
    print(f"   Data lag: {lag_days} day(s) behind today")
    
    # Analysis and context
    print(f"\n🔍 Analysis:")
    if lag_days == 0:
        print("   ✅ Data is current (same day)")
    elif lag_days == 1:
        print("   ✅ Data is 1 day behind (normal for next-day reporting)")
    elif lag_days <= 3:
        print("   ⚠️ Data is a few days behind (possibly weekend/holiday)")
    else:
        print("   ❌ Data is significantly behind (potential issue)")
    
    # Weekend/holiday context
    weekday_today = today.weekday()  # 0=Monday, 6=Sunday
    weekday_data = most_recent_date.weekday()
    
    if weekday_today in [5, 6]:  # Saturday or Sunday
        print("   📅 Today is weekend - markets closed")
    elif weekday_data == 4 and lag_days <= 3:  # Data from Friday
        print("   📅 Most recent data from Friday (weekend gap)")
    
    print(f"\n📊 Data freshness: {((7-lag_days)/7)*100:.1f}%")

def check_trading_hours():
    """
    Check if markets are currently open (simplified US market hours).
    """
    now = datetime.now()
    weekday = now.weekday()
    hour = now.hour
    
    # Simplified: Monday-Friday, 9:30 AM - 4:00 PM ET (assumes local time ≈ ET)
    if weekday < 5 and 9 <= hour < 16:
        return True, "🟢 Markets likely open"
    elif weekday < 5:
        return False, "🔴 Markets closed (outside trading hours)"
    else:
        return False, "🔴 Markets closed (weekend)"

if __name__ == "__main__":
    try:
        # Main data check
        calculate_data_lag()
        
        # Trading hours context
        market_open, market_status = check_trading_hours()
        print(f"\n{market_status}")
        
        print(f"\n💡 Note: NASDAQ data typically updates after market close")
        print(f"   FRED API may have 1-2 day delays for financial data")
        
    except KeyboardInterrupt:
        print("\n\n👋 Cancelled by user")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")