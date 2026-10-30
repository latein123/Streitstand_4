// Zentraler App-Zustand (zustand). Komponenten lesen mit useApp(), Aktionen liegen in actions.ts.
//
// Hinweis zum Muster: Akten-Objekte werden – wie im Original – direkt verändert (z. B. akte.judge[key].note = …).
// Danach ruft die Aktion touch() auf; das erhöht `rev` und zeichnet alle Komponenten neu.
import { create } from 'zustand';
import type { Akte, Docs, PreviewState, PruefRspState, Row } from '../types';

export type ModalKind = 'settings' | 'rubrum' | 'geruest' | null;

export interface AppState {
  rev: number;
  akten: Akte[];
  current: Akte | null;
  docs: Docs | null;
  showDocs: boolean;
  busy: string | null;          // laufende Analyse (Fortschrittstext)
  reading: string | null;       // Dokumente werden gelesen
  partialRows: Row[] | null;    // Zwischenstand während der Analyse
  error: string | null;
  notice: string | null;
  newForm: { busy?: string; err?: string } | null;
  preview: PreviewState | null; // Seitenpanel rechts
  modal: ModalKind;
  menu: boolean;
  confirmDelete: boolean;
  // Übersicht
  viewTable: boolean;
  antragSel: string | null;
  antragFor: string | null;
  openSec: Set<string>;
  openRow: Set<string>;
  // Prüfung: Suchergebnisse je „key#Schritt“
  pruefRsp: Record<string, PruefRspState>;
}

export const useApp = create<AppState>(() => ({
  rev: 0, akten: [], current: null, docs: null, showDocs: false,
  busy: null, reading: null, partialRows: null, error: null, notice: null, newForm: null,
  preview: null, modal: null, menu: false, confirmDelete: false,
  viewTable: false, antragSel: null, antragFor: null, openSec: new Set(), openRow: new Set(),
  pruefRsp: {}
}));

export const get = useApp.getState;
export const set = (patch: Partial<AppState>) => useApp.setState(s => ({ ...patch, rev: s.rev + 1 }));
// Nach direkter Veränderung eines Objekts (Akte, Preview …) neu zeichnen
export const touch = () => useApp.setState(s => ({ rev: s.rev + 1 }));

// Während der Analyse den Zwischenstand zeigen, danach das Ergebnis
export function shownRows(s: AppState, a: Akte): Row[] {
  return s.busy && s.partialRows && s.partialRows.length ? s.partialRows : (a.analysis ? a.analysis.rows : []);
}
