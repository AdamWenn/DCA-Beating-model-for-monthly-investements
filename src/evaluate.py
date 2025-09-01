# -*- coding: utf-8 -*-
"""
Utvärdering och enkel equity-kurva för regeln "köp på nästa '1'-dag efter insättning".
"""
import pandas as pd
import numpy as np

def confusion_counts(y_true, y_pred):
    tp = int(((y_pred == 1) & (y_true == 1)).sum())
    tn = int(((y_pred == 0) & (y_true == 0)).sum())
    fp = int(((y_pred == 1) & (y_true == 0)).sum())
    fn = int(((y_pred == 0) & (y_true == 1)).sum())
    return tp, tn, fp, fn

def precision_recall_f1(tp, tn, fp, fn):
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0
    return precision, recall, f1

def equity_curve_buy_next_one(df, monthly_day=25, contribution=1000.0, price_col="Close"):
    """
    Förenklad DCA-simulering:
      - varje månad vid 'monthly_day' sätts en kontant-insättning (contribution)
      - köp utförs på första handelsdag >= insättningsdagen där pred == 1
      - köpet sker till 'Close' den dagen, andelsmängd = contribution / Close
      - annars ligger kontanter kvar tills villkor inträffar
      - återinvestera inte utdelningar (index)
    Returnerar DataFrame med kolumner: cash, units, equity.
    """
    df = df.copy()
    df = df.dropna(subset=[price_col]).reset_index(drop=True)

    df["cash"] = 0.0
    df["units"] = 0.0

    cash = 0.0
    units = 0.0
    last_month = None
    pending = 0.0

    for i, row in df.iterrows():
        d = pd.to_datetime(row["Date"])
        # månatlig insättning
        if (last_month is None) or (d.month != last_month):
            last_month = d.month
            # hitta månadens "betalningsdag"
            if d.day >= monthly_day:
                # om vi är på eller efter "betalningsdagen" denna månad
                cash += contribution
                pending += contribution
            else:
                # vänta tills vi når betalningsdagen
                pass

        # om dagen är exakt betalningsdag, lägg in pengarna
        if d.day == monthly_day:
            cash += contribution
            pending += contribution

        # köp om pred == 1 och pending > 0
        if (row.get("pred", np.nan) == 1) and (pending > 0):
            price = row[price_col]
            if price > 0:
                buy_units = pending / price
                units += buy_units
                cash -= pending
                pending = 0.0

        df.loc[i, "cash"] = cash + pending  # pending räknas som kontanter tills köp sker
        df.loc[i, "units"] = units

    df["equity"] = df["units"] * df[price_col] + df["cash"]
    return df


def equity_curve_dca_baseline(df, monthly_day=25, contribution=1000.0, price_col="Close"):
    """
    Baseline DCA: köp alltid på 'monthly_day' (eller första handelsdagen >= monthly_day).
    """
    df = df.copy().dropna(subset=[price_col]).reset_index(drop=True)
    df["cash"] = 0.0
    df["units"] = 0.0

    cash = 0.0
    units = 0.0
    last_month = None

    for i, row in df.iterrows():
        d = pd.to_datetime(row["Date"])
        if (last_month is None) or (d.month != last_month):
            last_month = d.month
            if d.day >= monthly_day:
                # köp direkt på denna dag
                price = row[price_col]
                if price > 0:
                    buy_units = contribution / price
                    units += buy_units
            else:
                # vänta tills vi når betalningsdagen denna månad
                pass

        if d.day == monthly_day:
            price = row[price_col]
            if price > 0:
                buy_units = contribution / price
                units += contribution / price

        df.loc[i, "cash"] = cash
        df.loc[i, "units"] = units

    df["equity"] = df["units"] * df[price_col] + df["cash"]
    return df
