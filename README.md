# BGH Pro Max 3.1

Der Streitstand einer Mietrechtsakte auf einen Blick: Vortrag und Gegenvortrag je Tatbestandsmerkmal – jede Angabe per Klick an der Originalstelle prüfbar. Dazu Prüfungsschema, Rechtsprechung aus der amtlichen Datenbank des Bundes und ein druckbares Begründungsgerüst.

> Nur für **synthetische Übungsakten**: Die Dokumente werden zur Analyse an den gewählten KI-Anbieter gesendet.

---

## Starten – ohne Vorkenntnisse

### Windows

1. Den Ordner `bgh-pro-max` irgendwo ablegen (z. B. Desktop).
2. **`START-Windows.bat` doppelklicken.**
   - Beim allerersten Mal wird Node.js installiert, falls es fehlt. Windows fragt evtl. „Möchten Sie zulassen …?“ → **Ja**. Danach das Fenster schließen und `START-Windows.bat` **noch einmal** doppelklicken.
   - Dann werden einmalig die Bausteine geladen (ca. 1 Minute, Internet nötig).
3. Der Browser öffnet sich mit der App unter **http://localhost:5173**.
4. Das schwarze Fenster **offen lassen**, solange Sie arbeiten. Zum Beenden: Fenster schließen.

Falls die automatische Installation nicht klappt: Node.js von **https://nodejs.org** laden (Knopf „LTS“), installieren, dann Schritt 2 wiederholen.

### Mac

1. Node.js von **https://nodejs.org** installieren (Knopf „LTS“), falls noch nicht vorhanden.
2. **`START-Mac.command`** doppelklicken. Beim ersten Mal ggf. Rechtsklick → „Öffnen“ (Sicherheitsabfrage).
3. Der Browser öffnet sich unter **http://localhost:5173**.

### KI einrichten (einmalig)

Unten links auf **Einstellungen** → OpenRouter-Schlüssel eintragen oder mit „Aus .env-Datei laden …“ übernehmen → „OpenRouter prüfen“ → **Speichern**.
Ohne Schlüssel funktionieren Dokumentansicht, Prüfungsschema und Rechtsprechungssuche trotzdem – nur „Streitstand analysieren“ braucht die KI.

### Bedienung in drei Schritten

1. Links **„Neue Akte“** → Aktenordner wählen (PDF, Markdown, Bilder, ZIP werden gelesen).
2. **„Streitstand analysieren“**.
3. Auf einen Vortrag klicken → rechts öffnet sich die Fundstelle im Originaldokument.

Beim ersten Start wird automatisch die **Beispielakte Westring** geladen (liegt in `public/beispiel/`).

---

## Für Entwickler:innen (und KI-Assistenten)

```bash
npm install        # Abhängigkeiten
npm run dev        # Entwicklungsserver mit Live-Neuladen: http://localhost:5173
npm run build      # Typprüfung + fertige Dateien in dist/
npm run typecheck  # nur Typprüfung
```

Technik: **React 18 + TypeScript + Vite**, Zustand mit **zustand**, PDF mit **pdf.js**, Texterkennung mit **Tesseract.js**, ZIP mit **JSZip**. Kein eigener Server – alles läuft im Browser, Daten liegen in IndexedDB.

Aufbau, Zuständigkeiten der Dateien und Regeln fürs parallele Arbeiten: **[ARCHITEKTUR.md](ARCHITEKTUR.md)**.

### Fertige Version weitergeben (ohne Node beim Empfänger)

`npm run build` erzeugt den Ordner `dist/`. Den kann man auf jeden Webserver legen (z. B. GitHub Pages, Netlify, Intranet). Direktes Öffnen von `dist/index.html` per Doppelklick funktioniert wegen Browser-Sicherheitsregeln **nicht** – dafür ist das Startskript da.
