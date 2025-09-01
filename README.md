# Lösnings-branch – snabb översikt

Denna mapp speglar projektet men med fyllda TODOs och små förbättringar.

## Nyckelskillnader
- `src/features.py`: Implementerad `add_ema` och `add_tema`; används i `add_minimal_features`.
- `src/model.py`: Lite starkare MLP (64-32) och fler bagging-estimatorer (7).
- `src/train_predict.py`: `rolling_train_predict(..., retrain_step=...)` gör omträningsfrekvensen lätt att experimentera med.
- `src/main_example.py`: Använder de nya features och skriver ut rapport + equity. 

## Körning
Samma som original:
```bash
$env:FRED_API_KEY="8d9ad11bf6016ba0a68f2f6f56f056ba"
pip install pandas numpy scikit-learn imbalanced-learn requests python-dateutil matplotlib
python -m src.main_example
```
