@echo off
echo Testing daily update process (DRY RUN)...
echo.

echo Step 1: Testing step1.py...
cd /d "%~dp0"
python src\API_Usage2_0\step1.py
if %errorlevel% neq 0 (
    echo ERROR: step1.py failed
    pause
    exit /b 1
)

echo.
echo Step 2: Testing step2.py...
python src\API_Usage2_0\step2.py
if %errorlevel% neq 0 (
    echo ERROR: step2.py failed
    pause
    exit /b 1
)

echo.
echo Step 3: Testing file copy...
if exist "signals_with_equity.csv" (
    echo ✅ signals_with_equity.csv exists
    copy "signals_with_equity.csv" "src\API_Usage2_0\web_6\public\signals_with_equity.csv"
    echo ✅ File copied successfully
) else (
    echo ❌ signals_with_equity.csv not found
)

echo.
echo Step 4: Checking git status...
git status

echo.
echo SUCCESS: Dry run completed!
echo To actually commit and push, run daily_update.bat
echo.
pause