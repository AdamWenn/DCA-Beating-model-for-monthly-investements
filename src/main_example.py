# -*- coding: utf-8 -*-
import pandas as pd
import warnings
import sys
import os

# Add project root to path
project_root = os.path.join(os.path.dirname(__file__), '..')
if project_root not in sys.path:
    sys.path.insert(0, project_root)

# Import with fallback strategies
try:
    from src.fetch_data import fetch_sp500_from_fred
    from src.features import build_feature_set
    from src.labels import make_std_labels
    from src.train_predict import rolling_train_predict
    from src.backtest import backtest_six_windows
    from src.evaluate import confusion_counts, precision_recall_f1, equity_curve_buy_next_one, equity_curve_dca_baseline
    from src.config import LABEL_HORIZON
except ImportError:
    try:
        from .fetch_data import fetch_sp500_from_fred
        from .features import build_feature_set
        from .labels import make_std_labels
        from .train_predict import rolling_train_predict
        from .backtest import backtest_six_windows
        from .evaluate import confusion_counts, precision_recall_f1, equity_curve_buy_next_one, equity_curve_dca_baseline
        from .config import LABEL_HORIZON
    except ImportError:
        from fetch_data import fetch_sp500_from_fred
        from features import build_feature_set
        from labels import make_std_labels
        from train_predict import rolling_train_predict
        from backtest import backtest_six_windows
        from evaluate import confusion_counts, precision_recall_f1, equity_curve_buy_next_one, equity_curve_dca_baseline
        from config import LABEL_HORIZON

if __name__ == "__main__":
    # Dölj ConvergenceWarnings från MLPClassifier
    warnings.filterwarnings("ignore", category=UserWarning, module="sklearn")

    try:
        from dotenv import load_dotenv
    except ImportError:
        load_dotenv = None

    if load_dotenv:
        load_dotenv()

    if "FRED_API_KEY" not in os.environ:
        raise RuntimeError(
            "FRED_API_KEY environment variable is not set. "
            "Create a .env file or configure the variable before running this example."
        )

    # Sätt custom threshold för trading modellen
    CUSTOM_THRESHOLD = 0.9
    print(f"🎯 Använder custom threshold: {CUSTOM_THRESHOLD}")
    
    df = fetch_sp500_from_fred(start="2000-01-01")
    df_feat = build_feature_set(df)
    df_lab = make_std_labels(df_feat, horizon=LABEL_HORIZON)

    exclude = {"Date","Close","label","fwd_return","vol_h"}
    feature_cols = [c for c in df_lab.columns if c not in exclude]

    df_pred = rolling_train_predict(df_lab, feature_cols=feature_cols, decision_threshold=CUSTOM_THRESHOLD)

    win_results, report_df = backtest_six_windows(df_lab.dropna(subset=feature_cols+["label"]), feature_cols=feature_cols, decision_threshold=CUSTOM_THRESHOLD)
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
    
    # Skapa S&P 500 graf med confusion matrix kategorier
    print(f"\n📈 Skapar S&P 500 visualisering med trading signals...")
    import matplotlib.pyplot as plt
    import numpy as np
    
    # Ta data med predictions
    analysis_df = df_pred.dropna(subset=["pred", "label"]).copy()
    
    if len(analysis_df) > 0:
        # Beräkna confusion matrix kategorier
        true_positives = (analysis_df["label"] == 1) & (analysis_df["pred"] == 1)
        false_positives = (analysis_df["label"] == 0) & (analysis_df["pred"] == 1)
        true_negatives = (analysis_df["label"] == 0) & (analysis_df["pred"] == 0)
        false_negatives = (analysis_df["label"] == 1) & (analysis_df["pred"] == 0)
        
        print(f"   True Positives: {true_positives.sum()}")
        print(f"   False Positives: {false_positives.sum()}")
        print(f"   True Negatives: {true_negatives.sum()}")
        print(f"   False Negatives: {false_negatives.sum()}")
        
        # Skapa graf
        fig, ax = plt.subplots(1, 1, figsize=(15, 8))
        
        # Plot S&P 500 price
        dates = pd.to_datetime(analysis_df["Date"])
        prices = analysis_df["Close"]
        ax.plot(dates, prices, 'b-', linewidth=1.5, alpha=0.7, label='S&P 500 Price', zorder=1)
        
        # Lägg till confusion matrix markers
        if true_positives.sum() > 0:
            tp_dates = dates[true_positives]
            tp_prices = prices[true_positives]
            ax.scatter(tp_dates, tp_prices, color='darkgreen', s=100, marker='^',
                      label=f'✅ True Positives ({true_positives.sum()})', zorder=5, alpha=0.9, edgecolors='black')
        
        if false_positives.sum() > 0:
            fp_dates = dates[false_positives]
            fp_prices = prices[false_positives]
            ax.scatter(fp_dates, fp_prices, color='red', s=100, marker='v',
                      label=f'❌ False Positives ({false_positives.sum()})', zorder=5, alpha=0.9, edgecolors='black')
        
        if true_negatives.sum() > 0:
            tn_dates = dates[true_negatives]
            tn_prices = prices[true_negatives]
            ax.scatter(tn_dates, tn_prices, color='lightblue', s=30, marker='o',
                      label=f'✅ True Negatives ({true_negatives.sum()})', zorder=3, alpha=0.5)
        
        if false_negatives.sum() > 0:
            fn_dates = dates[false_negatives]
            fn_prices = prices[false_negatives]
            ax.scatter(fn_dates, fn_prices, color='orange', s=80, marker='x',
                      label=f'😞 False Negatives ({false_negatives.sum()})', zorder=4, alpha=0.8, linewidths=3)
        
        ax.set_title(f'S&P 500 Price with Trading Signals (Threshold: {CUSTOM_THRESHOLD})', fontsize=14, fontweight='bold')
        ax.set_ylabel('Price ($)', fontsize=12)
        ax.set_xlabel('Date', fontsize=12)
        ax.legend(loc='upper left', fontsize=10)
        ax.grid(True, alpha=0.3)
        ax.tick_params(axis='x', rotation=45)
        
        plt.tight_layout()
        plt.show()
        
        print(f"✅ Graf skapad med {len(analysis_df)} datapunkter!")
    else:
        print("❌ Ingen data tillgänglig för visualisering")
