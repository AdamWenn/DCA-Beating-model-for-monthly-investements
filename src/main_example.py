# -*- coding: utf-8 -*-
import pandas as pd
import warnings
from src.fetch_data import fetch_sp500_from_fred
from src.features import build_feature_set
from src.labels import make_std_labels
from src.train_predict import rolling_train_predict
from src.backtest import backtest_six_windows
from src.evaluate import confusion_counts, precision_recall_f1, equity_curve_buy_next_one, equity_curve_dca_baseline
from src.config import LABEL_HORIZON

if __name__ == "__main__":
    # Dölj ConvergenceWarnings från MLPClassifier
    warnings.filterwarnings("ignore", category=UserWarning, module="sklearn")
    
    df = fetch_sp500_from_fred(start="2000-01-01")
    df_feat = build_feature_set(df)
    df_lab = make_std_labels(df_feat, horizon=LABEL_HORIZON)

    exclude = {"Date","Close","label","fwd_return","vol_h"}
    feature_cols = [c for c in df_lab.columns if c not in exclude]

    df_pred = rolling_train_predict(df_lab, feature_cols=feature_cols)

    win_results, report_df = backtest_six_windows(df_lab.dropna(subset=feature_cols+["label"]), feature_cols=feature_cols)
    print("Backtest-rapport (per fönster):")
    print(report_df)

    if len(win_results) > 0:
        sample = win_results[0].dropna(subset=["label", "pred"])
        tp, tn, fp, fn = confusion_counts(sample["label"].values, sample["pred"].values)
        precision, recall, f1 = precision_recall_f1(tp, tn, fp, fn)
        print("\nExempel på mått för första fönstret:")
        print(f"TP={tp}, TN={tn}, FP={fp}, FN={fn}")
        print(f"precision(klass 1)={precision:.3f}, recall(klass 1)={recall:.3f}, F1(klass 1)={f1:.3f}")

    dca_df = equity_curve_buy_next_one(df_pred.dropna(subset=["pred"]))
    baseline_df = equity_curve_dca_baseline(df_pred.dropna(subset=["pred"]))
    
    print("\nAlgoritm Equity (första 5 rader):")
    print(dca_df[["Date", "cash", "units", "equity"]].head())
    print("\nAlgoritm Equity (sista 5 rader):")
    print(dca_df[["Date", "cash", "units", "equity"]].tail())
    
    print("\nDCA Baseline Equity (första 5 rader):")
    print(baseline_df[["Date", "cash", "units", "equity"]].head())
    print("\nDCA Baseline Equity (sista 5 rader):")
    print(baseline_df[["Date", "cash", "units", "equity"]].tail())
    
    # Jämförelse av slutlig equity
    final_algo_equity = dca_df["equity"].iloc[-1]
    final_dca_equity = baseline_df["equity"].iloc[-1]
    
    print(f"\nJämförelse:")
    print(f"Algoritm slutlig equity: ${final_algo_equity:,.2f}")
    print(f"DCA Baseline slutlig equity: ${final_dca_equity:,.2f}")
    print(f"Skillnad: ${final_algo_equity - final_dca_equity:,.2f} ({((final_algo_equity / final_dca_equity - 1) * 100):+.2f}%)")
