# -*- coding: utf-8 -*-
"""
Konfigurationsfil för laboratoriet.
"""
import os


# Serie-ID för S&P 500 hos FRED
FRED_SERIES_ID = "SP500"

# 70 handelsdagars prognoshorisont
LABEL_HORIZON = 70  # handelsdagar

# Återträning var 30:e handelsdag
RETRAIN_STEP = 30

# Rullande träningsfönster i drift (handelsdagar)
ROLLING_TRAIN_WINDOW = 3000

# Antal månader i backtest (2 år) uppdelat i 24 enmånadersfönster
BACKTEST_MONTHS = 24
BACKTEST_WINDOWS = 24  # 1 mån/fönster

# Std-baserad label: multiplikator för uppsidan
STD_UP_MULT = 1.0  # TODO: justera efter behov/övning
# (vill du även ha en nedre gräns kan du lägga till STD_DOWN_MULT)


def get_fred_api_key() -> str:
	"""Return the FRED API key from environment variables.

	Raises:
		RuntimeError: if the key is missing.
	"""

	api_key = os.getenv("FRED_API_KEY")
	if not api_key:
		raise RuntimeError(
			"FRED_API_KEY environment variable is not set. "
			"Create a .env file or configure the variable before running the pipeline."
		)
	return api_key


# Maintain backwards compatibility for modules expecting FRED_API_KEY constant
FRED_API_KEY = os.getenv("FRED_API_KEY")
