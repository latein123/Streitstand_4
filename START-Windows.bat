@echo off
chcp 65001 >nul
title BGH Pro Max
cd /d "%~dp0"

echo.
echo  ===============================================
echo   BGH Pro Max wird gestartet ...
echo  ===============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo  Node.js ist noch nicht installiert.
  echo  Es wird jetzt automatisch installiert ^(einmalig, ca. 1-2 Minuten^).
  echo  Falls Windows nachfragt, bitte mit "Ja" bestaetigen.
  echo.
  winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements
  if errorlevel 1 (
    echo.
    echo  Automatische Installation hat nicht geklappt.
    echo  Bitte Node.js von https://nodejs.org herunterladen ^(Knopf "LTS"^),
    echo  installieren und danach diese Datei erneut doppelklicken.
    start https://nodejs.org
    pause
    exit /b 1
  )
  echo.
  echo  Node.js wurde installiert. Bitte dieses Fenster schliessen
  echo  und START-Windows.bat noch einmal doppelklicken.
  pause
  exit /b 0
)

if not exist node_modules (
  echo  Erster Start: benoetigte Bausteine werden geladen ^(einmalig, ca. 1 Minute^) ...
  call npm install --no-fund --no-audit
  if errorlevel 1 (
    echo  Fehler beim Laden der Bausteine. Internetverbindung pruefen und erneut starten.
    pause
    exit /b 1
  )
)

echo.
echo  Die App oeffnet sich gleich im Browser: http://localhost:5173
echo  Dieses Fenster bitte offen lassen. Zum Beenden: Fenster schliessen.
echo.
call npm run dev -- --open
pause
