@echo off
echo Starting daily data update process...
echo.

echo Step 1: Running data fetch and prediction (SAFE)…
cd /d "%~dp0"
set STEP1_MODEL=hgb
set STEP1_THRESH_POLICY=recall_at_prec
set STEP1_TARGET_PRECISION=0.60
rem Optional: uncomment to change lookback window for daily run
rem set STEP1_YEARS_BACK=2
py src\API_Usage2_0\step1_safe2.py
if %errorlevel% neq 0 (
    echo ERROR: step1_safe2.py failed
    pause
    exit /b 1
)

echo.
echo Step 2: Running backtest and analysis...
py src\API_Usage2_0\step2.py
if %errorlevel% neq 0 (
    echo ERROR: step2.py failed
    pause
    exit /b 1
)

echo.
echo Step 3: Copying updated CSV to web6...
copy "signals_with_equity.csv" "src\API_Usage2_0\web_6\public\signals_with_equity.csv"
if %errorlevel% neq 0 (
    echo ERROR: Failed to copy CSV file
    pause
    exit /b 1
)

echo.
echo Step 4: Adding files to git...
git add signals_with_equity.csv
git add src\API_Usage2_0\web_6\public\signals_with_equity.csv
git add .

echo.
echo Step 5: Committing changes...
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /format:list') do set datetime=%%I
set current_date=%datetime:~0,4%-%datetime:~4,2%-%datetime:~6,2%
git commit -m "Daily data update %current_date%: Updated signals and equity data"

echo.
echo Step 6: Pushing to GitHub...
git push origin main
if %errorlevel% neq 0 (
    echo ERROR: Failed to push to GitHub
    pause
    exit /b 1
)

echo.
echo SUCCESS: Daily update completed successfully!
echo New data has been deployed to GitHub Pages.
echo.
pause
