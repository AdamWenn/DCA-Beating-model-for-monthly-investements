# Automatisk Datauppdatering

Detta repo har två sätt att uppdatera data automatiskt:

## 🦇 Lokal Batch-fil (`daily_update.bat`)

Kör denna fil lokalt för att:
1. Hämta ny marknadsdata (step1.py)
2. Köra backtest och analys (step2.py) 
3. Kopiera uppdaterad CSV till web6 mappen
4. Committa och pusha ändringar till GitHub

**Användning:**
```bash
double-click daily_update.bat
# eller från kommandoraden:
daily_update.bat
```

## ☁️ GitHub Actions (Automatisk i molnet)

GitHub Actions kör automatiskt varje dag kl 01:00 UTC och gör samma sak som batch-filen.

**Filer:**
- `.github/workflows/daily-update.yml` - GitHub Actions workflow
- Körs automatiskt varje dag
- GRATIS (GitHub ger 2000 minuter/månad gratis)

**Manual körning:**
1. Gå till GitHub repo → Actions tab
2. Välj "Daily Data Update" workflow  
3. Klicka "Run workflow"

## 📊 Vad händer automatiskt:

1. **Data hämtas** från Yahoo Finance och andra källor
2. **Modellen körs** för att generera nya signaler
3. **Backtest uppdateras** med senaste data
4. **CSV-filen** kopieras till web6/public/ mappen
5. **Ändringar committas** automatiskt till GitHub
6. **GitHub Pages uppdateras** automatiskt med ny data
7. **Kalkylatorn** på hemsidan får senaste data

## 🔑 Fördelar med GitHub Actions:

✅ **Helt gratis** (upp till 2000 minuter/månad)  
✅ **Kör automatiskt** varje dag  
✅ **Ingen lokal dator behövs**  
✅ **Alltid senaste data** på hemsidan  
✅ **Backup i molnet**  
✅ **Loggar och historik** sparas  

## 📅 Schema:

- **Daglig körning:** 01:00 UTC (02:00/03:00 svensk tid)
- **Helger:** Kör även på helger (marknaden stängd = ingen ny data)
- **Manual:** Kan köras när som helst från GitHub Actions

## 🛠️ Felsökning:

**Om GitHub Actions misslyckas:**
1. Gå till GitHub repo → Actions
2. Klicka på den misslyckade körningen  
3. Läs loggarna för att se vad som gick fel
4. Ofta API-limits eller nätverksproblem som löser sig själva

**Om batch-filen misslyckas:**
- Kontrollera att Python är installerat
- Kontrollera att alla pip-paket är installerade
- Kontrollera internetanslutning för data-hämtning