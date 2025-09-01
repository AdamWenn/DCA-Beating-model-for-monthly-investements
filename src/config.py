# -*- coding: utf-8 -*-
"""
Konfigurationsfil för laboratoriet.
"""
# Serie-ID för S&P 500 hos FRED
FRED_SERIES_ID = "SP500"

# 70 handelsdagars prognoshorisont
LABEL_HORIZON = 70  # handelsdagar

# Återträning var 30:e handelsdag
RETRAIN_STEP = 30

# Rullande träningsfönster i drift (handelsdagar)
ROLLING_TRAIN_WINDOW = 3000

# Antal månader i backtest (1 år) uppdelat i 6 tvåmånadersfönster
BACKTEST_MONTHS = 12
BACKTEST_WINDOWS = 6  # 2 mån/fönster

# Std-baserad label: multiplikator för uppsidan
STD_UP_MULT = 1.0  # TODO: justera efter behov/övning
# (vill du även ha en nedre gräns kan du lägga till STD_DOWN_MULT)
