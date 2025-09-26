# API Usage Examples

Drop these files in `src/API Usage/` and run them directly. They add the project
root to `sys.path` at runtime so `src.*` imports work even though the folder name
has a space and isn’t a Python package.

## Scripts

1. **01_monthly_backtest_example.py**  
   Runs the 24-month walk-forward backtest (3000-day training per window).  
   Saves a CSV and prints a short JSON summary.

   ```bash
   python "src/API Usage/01_monthly_backtest_example.py" --start 1990-01-01 --out data/outputs
   ```

2. **02_live_predictions_example.py**  
   Trains at the latest month-end anchor and produces *live* predictions from
   the day **after** the backtest month through the most recent row.

   ```bash
   python "src/API Usage/02_live_predictions_example.py" --start 1990-01-01 --out data/outputs
   ```

3. **03_run_monthly_pipeline_cli.py**  
   Full orchestration: fetch → features → labels → 24m backtest → live preds.
   Prints retrain meta (last backtest end, next retrain date, whether due today).

   ```bash
   python "src/API Usage/03_run_monthly_pipeline_cli.py"      --start 1990-01-01 --out data/outputs --today 2025-09-24
   ```

## Notes

- These examples assume you added the earlier functions:
  - `src.schedule.monthly_anchors`, `next_retrain_due`, `next_retrain_date`
  - `src.backtest.last_24_month_backtest`
  - `src.train_predict.live_predictions_until_next_retrain`
  - `src.pipeline.run_monthly_pipeline`
- Output CSVs land in `data/outputs/` by default; feel free to change the flag.
- For production, wire `03_run_monthly_pipeline_cli.py` into cron and parse the
  JSON it prints for monitoring/alerts.
