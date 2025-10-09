# -*- coding: utf-8 -*-
"""
API configuration file
Keep sensitive API keys here
"""

import os

# FRED API Key for fetching financial data
# Never commit real credentials. Configure via environment variables or secrets.
FRED_API_KEY = os.getenv("FRED_API_KEY")