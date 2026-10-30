# CLAUDE.md

React + TypeScript + Vite. Struktur und Regeln: siehe ARCHITEKTUR.md (zuerst lesen).

- Prüfen: `npm run typecheck` und `npm run build`
- Fachliche Inhalte liegen in `src/config/`, Prompts in `src/ai/prompts.ts` – Wortlaut nur auf ausdrücklichen Wunsch ändern.
- Komponenten enthalten keine Fachlogik; Zustandsänderungen nur über `src/state/actions.ts` (danach `touch()`/`saveCurrent()`).
- UI-Texte sind Deutsch.
