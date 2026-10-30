# Architektur

Migriert aus der Einzeldatei `streitstand_v3.html` (≈3.200 Zeilen) nach React + TypeScript. Fachliche Logik, Prompts und Texte sind **inhaltsgleich** übernommen; neu ist nur die Aufteilung.

## Ordner & Zuständigkeiten

```
src/
  config/        FACHLICHES – von Jurist:innen pflegbar, kein React
    regelmodell.ts       Verfahrensarten, Prüfungsgruppen, Merkmale, Beweislast
    pruefungsschema.ts   Obersatz, Definition, Prüfschritte, Streitstände je Merkmal
    antraege.ts          Antragstypen → zu prüfende Merkmale
    status.ts            Status (ZPO), Beweismittel, Prüfschritt-Status
    rechtsprechung.ts    Suchbegriffe je Merkmal, Gerichte, API-Adresse
    settings.ts          KI-Anbieter, Modelle, Einstellungen (localStorage)
  types.ts       Datenmodell (Akte, Row, Item, Analysis, Judge …) – hier zuerst ergänzen
  lib/           Reine Logik ohne UI
    files.ts             Ordner/ZIP einlesen, Markdown parsen, Dokument-Kennungen
    pdf.ts, ocr.ts       pdf.js und Tesseract
    docText.ts           beste Textquelle je Dokument (MD > PDF > OCR), Zwischenspeicher
    docSide.ts           Schriftsatz Kläger/Beklagter erkennen, Anlagen-Verweise auflösen
    quote.ts             Zitat-Suche (robust gegen Umbrüche, Silbentrennung)
    derive.ts            abgeleitete Werte: Beweislast, Beweislücke, Anträge, Pins …
    rubrum.ts            Aktenzeichen/Parteien/Verfahrensart erkennen
    geruest.ts           Begründungsgerüst (HTML zum Drucken)
    db.ts                IndexedDB (Akten, Dateien, OCR-Cache)
  ai/            Alles rund um die KI
    prompts.ts           SÄMTLICHE Prompts – Änderungen juristisch gegenlesen
    llm.ts               OpenRouter / Claude, Fehlercodes, Wiederholung
    verify.ts            Anker-Wächter: jedes Zitat muss wörtlich im Dokument stehen
    analysis.ts          Ablauf der Streitstand-Analyse
  ris/           Rechtsprechung (NeuRIS-API des Bundes)
    api.ts               Suche, Aktenzeichen-Abfrage, Volltext, Cache
    queries.ts           Suchbegriffe bilden (kuratiert, Mangel-Stichwort, KI-Vorschlag)
  state/
    store.ts             zentraler Zustand (zustand)
    actions.ts           alle Aktionen (Akte anlegen, analysieren, heften, Notizen …)
  components/    Reine Darstellung
    layout/              Sidebar, Topbar (+Menü), MainView, Banners, Icon, Logo
    docs/                Dokumentenliste
    streit/              Antragsansicht, Merkmalszeilen, Gesamttabelle, Verworfenes
    preview/             Seitenpanel: Dokument (drawDoc.ts), Rechtsprechung
    pruefung/            Seitenpanel: Prüfung je Merkmal + Rechtsprechung je Prüfschritt
    modals/              Einstellungen, Rubrum, Begründungsgerüst
  styles/        CSS in der Reihenfolge des Originals (01 … 11), Farben in 01-tokens.css
public/beispiel/ Beispielakte (manifest.json + Dateien, optional analyse.json)
```

## Datenfluss

```
Komponente ──Klick──► actions.ts ──► lib/ · ai/ · ris/
     ▲                     │
     └──── useApp() ◄── store.ts (set / touch)
```

- **Komponenten** lesen Zustand mit `useApp()` und rufen Funktionen aus `state/actions.ts` auf. Sie enthalten keine Fachlogik.
- **Akten werden direkt verändert** (wie im Original: `akte.judge[key].note = …`). Danach ruft die Aktion `touch()` bzw. `set()` auf, damit neu gezeichnet wird. Wer neue Aktionen schreibt: nach jeder Veränderung `touch()` / `saveCurrent()` nicht vergessen.
- `lib/`, `ai/`, `ris/` kennen den Store nicht – sie bekommen alles als Parameter. Dadurch sind sie einzeln testbar.

## Parallel arbeiten – wer fasst was an?

| Aufgabe | Dateien |
|---|---|
| Neues Merkmal / Prüfschritt / Antragstyp | nur `src/config/*` |
| Prompt verbessern | nur `src/ai/prompts.ts` |
| Analyse-Ablauf, Validierung | `src/ai/analysis.ts`, `src/ai/verify.ts` |
| Neue Ansicht / UI-Baustein | neue Datei in `src/components/…`, ggf. Aktion in `actions.ts` |
| Farben, Abstände, Schrift | `src/styles/01-tokens.css`, `11-gestaltung-tinte-papier.css` |
| Rechtsprechungssuche | `src/ris/*` |
| Neues Feld in der Akte | erst `types.ts`, dann Aktion, dann Komponente |

Faustregel: Eine Aufgabe = möglichst ein Ordner. `actions.ts` und `types.ts` sind gemeinsame Dateien – dort kleine, getrennte Änderungen machen.

## Hinweise für KI-Assistenten

- Fachtexte (Konjunktiv, „vom Team zu verifizieren“, Quellenangaben) nicht umformulieren, ohne dass das Team zustimmt.
- Die App erfindet keine Rechtsprechung: angezeigt werden nur Treffer der amtlichen API. Das muss so bleiben.
- Jede KI-Angabe läuft durch `verifyItem` (Zitat muss wörtlich vorkommen). Neue KI-Ausgaben ebenfalls so absichern.
- Nach Änderungen: `npm run typecheck`.
- In der Entwicklungsansicht gibt es `window.__T9` (Store, Aktionen, DB) für Tests in der Browser-Konsole.

## Bekannte Grenzen / mögliche nächste Schritte

- TypeScript läuft bewusst nicht im `strict`-Modus (Portierung). Schrittweise verschärfen.
- Claude als KI-Anbieter funktioniert nur im Claude-Artefakt (`window.claude`); lokal wird OpenRouter genutzt.
- Keine automatisierten Tests – guter Startpunkt: `lib/quote.ts`, `lib/files.ts`, `ai/verify.ts` mit Vitest.
