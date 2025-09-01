# -*- coding: utf-8 -*-
"""
Enkla matplotlib-plots (ingen styling specificeras).
"""
import matplotlib.pyplot as plt

def plot_equity(df):
    plt.figure()
    plt.plot(df["Date"], df["equity"])
    plt.title("Equity-kurva (DCA + köp vid nästa '1')")
    plt.xlabel("Datum")
    plt.ylabel("Värde")
    plt.tight_layout()
    return plt.gcf()


def plot_equity_comparison(df_signal, df_baseline):
    plt.figure()
    plt.plot(df_signal["Date"], df_signal["equity"], label="Signalstyrd DCA")
    plt.plot(df_baseline["Date"], df_baseline["equity"], label="Ren DCA (baseline)")
    plt.title("Equity-kurvor: Signalstyrd vs Baseline")
    plt.xlabel("Datum")
    plt.ylabel("Värde")
    plt.legend()
    plt.tight_layout()
    return plt.gcf()
