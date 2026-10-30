#!/bin/bash
# Doppelklick im Finder startet BGH Pro Max (beim ersten Mal: Rechtsklick → Öffnen)
cd "$(dirname "$0")"
echo ""
echo "  BGH Pro Max wird gestartet ..."
echo ""
if ! command -v node >/dev/null 2>&1; then
  echo "  Node.js ist noch nicht installiert."
  echo "  Bitte von https://nodejs.org herunterladen (Knopf „LTS“), installieren"
  echo "  und danach diese Datei erneut doppelklicken."
  open "https://nodejs.org"
  read -p "  Enter drücken zum Schließen ..."
  exit 1
fi
if [ ! -d node_modules ]; then
  echo "  Erster Start: benötigte Bausteine werden geladen (einmalig, ca. 1 Minute) ..."
  npm install --no-fund --no-audit || { read -p "  Fehler – Internet prüfen. Enter zum Schließen ..."; exit 1; }
fi
echo ""
echo "  Die App öffnet sich gleich im Browser: http://localhost:5173"
echo "  Dieses Fenster offen lassen. Zum Beenden: Fenster schließen."
echo ""
npm run dev -- --open
