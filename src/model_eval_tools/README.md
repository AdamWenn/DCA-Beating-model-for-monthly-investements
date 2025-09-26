
Run instructions (example using your file paths):

python "/mnt/data/model_eval_tools/plot_confusion_and_equity.py" \
  --backtest-csv "data/outputs/pipeline_backtest_24m_20250924-164603.csv" \
  --live-csv "data/outputs/pipeline_live_until_next_retrain_20250924-164603.csv" \
  --monthly-day 25 \
  --contribution 1000 \
  --outdir "analysis_outputs"

Notes:
- If your CSVs do NOT include a 'Close' column, pass --price-csv to a file with 'date' and 'Close'.
- The model strategy buys the first day each month where y_pred == 1.
  If a month has no True, it falls back to the DCA day (25th on/after). Change with --fallback skip|month_end.
