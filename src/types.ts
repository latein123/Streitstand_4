// Zentrales Datenmodell. Wer ein Feld hinzufügt, ergänzt es hier zuerst.

export type Verfahren = 'minderung' | 'raeumung';
export type Partei = 'klaeger' | 'beklagter';
export type Last = 'mieter' | 'vermieter' | 'gestuft';
export type StatusKey = 'unstreitig' | 'nicht_bestritten' | 'bestritten' | 'nichtwissen' | 'pauschal' | 'rechtsfrage' | 'offen' | 'nicht_vorgetragen';

/* ---------- Regelmodell & Prüfungsschema (src/config) ---------- */
export interface PruefSchritt {
  id: string; text: string; hinweis?: string; quelle?: string; verify?: boolean;
  rsp?: string[]; aktenzeichen?: string[]; leit?: string;
}
export interface Pruefung {
  obersatz: string; definition?: string; quelle?: string; verify?: boolean; statusHinweis?: string; leit?: string;
  schritte: PruefSchritt[];
  streit?: { frage: string; ansichten: string[]; quelle?: string }[];
  hinweise?: { wenn: RegExp; text: string; quelle?: string }[];
}
export interface Merkmal {
  id: string; label: string; norm: string; last: Last; lastText?: string; hint: string;
  verify?: boolean; multi?: boolean; nurWenn?: RegExp; pruefung?: Pruefung;
}
export interface Gruppe { id: string; titel: string; optional?: boolean; info?: string; infoQuelle?: string; merkmale: Merkmal[] }
export interface RuleSet { label: string; klaegerRolle: string; beklagterRolle: string; groups: Gruppe[] }
export interface AntragDef { typ: string; titel: string; norm: string; kenn: string | null; merkmale: string[] | null }

/* ---------- Dokumente ---------- */
export interface FileEntry { path: string; file: File }
export interface Variant { path: string; file: File; sig: string }
export interface MdLine { anchor: string | null; text: string }
export interface ParsedMd { fm: Record<string, string>; title: string; lines: MdLine[] }
export interface Doc {
  id: string; title: string; date: string; release: string; autoId?: boolean;
  variants: Partial<Record<'md' | 'pdf' | 'img', Variant>>;
  md?: ParsedMd;
}
export type Docs = Map<string, Doc>;
export interface TextLine { anchor: string | null; text: string; page?: number; n?: number }
export interface DocText { source: 'md' | 'pdf' | 'ocr' | 'pdf+ocr' | 'none' | 'error'; lines: TextLine[]; error?: string }

/* ---------- Analyse ---------- */
export interface Item { kurz: string; dok: string; zitat: string; anchor: string; fixed: string | null }
export interface Beweis extends Item { partei: Partei; mittel: string }
export interface Row {
  key: string; gid: string; merkmal: string; label: string; norm: string; instanz: string;
  last: Last | null; lastText: string | null; verify: boolean;
  klaeger: Item[]; beklagter: Item[]; beweis: Beweis[];
  status: StatusKey; begruendung: string;
  change?: 'neu' | 'geaendert' | null; citesNew?: boolean; virtual?: boolean;
}
export interface Antrag extends Item { nr: string; partei: Partei; typ: string; hilfsweise: boolean }
export interface Discarded { merkmal: string; instanz: string; partei: string; kurz: string; dok: string; zitat: string; grund: string }
export interface Analysis {
  rows: Row[]; antraege: Antrag[] | null; discarded: Discarded[]; errors: string[]; skipped: string[];
  model: string; at: string; docIds: string[];
}

/* ---------- Prüfvermerke des Gerichts ---------- */
export interface Pin { nr: string; gericht: string; datum: string; az: string; titel: string; ecli: string; art: string; spruch: string; zeile?: boolean; schritte?: string[] }
export interface StepJudge { status?: string; note?: string }
export interface Judge { checked?: boolean; status?: StatusKey | null; note?: string; urteile?: Pin[]; schritte?: Record<string, StepJudge> }

/* ---------- Akte ---------- */
export interface Akte {
  id: string; az: string; klaeger: string; beklagter: string; verfahren: Verfahren;
  verfahrenManual?: boolean; rubrumAuto?: boolean; folderName?: string; created: string;
  judge: Record<string, Judge>; analysis?: Analysis | null; example?: boolean;
  knownDocs?: string[]; newDocs?: string[]; docCount?: number; ignoredFiles?: string[];
  docSides?: Record<string, Partei | 'keine'>; optGroups?: string[]; risCache?: Record<string, any>;
}

/* ---------- Rechtsprechung ---------- */
export interface RspHit {
  nr: string; ecli: string; gericht: string; spruch: string; datum: string; az: string; art: string; titel: string; kopf?: string;
  treffer: { name: string; text: string }[];
  score?: number; queries?: string[]; erweitert?: boolean; skript?: boolean;
}
export interface RspResult { hits: RspHit[]; perQuery: { q: string; n: number | null; err: string | null; erweitert?: boolean }[]; cached: boolean }
export interface PruefRspState {
  ai?: string[]; busy?: boolean; note?: string; err?: string | null; queries?: string[];
  res?: RspResult; az?: { az: string; hits?: RspHit[]; err?: string; cached?: boolean }[];
}

/* ---------- Seitenpanel rechts ---------- */
export interface DocPreviewState {
  kind: 'doc'; docId: string; quote: string | null; ref: string | null; anchor: string | null;
  via: { dok: string; zitat: string; anchor: string } | null; back: string | null; fmt: 'pdf' | 'md' | 'img'; fmts: ('pdf' | 'md' | 'img')[];
}
export interface RspPreviewState {
  kind: 'rsp'; key: string | null; query: string; court: string; detail: string | null; res: RspResult | null;
  err: string | null; busy: boolean; note: string; back: string | null; token: string; detailHit?: RspHit | Pin;
}
export interface PruefPreviewState { kind: 'pruef'; key: string }
export type PreviewState = DocPreviewState | RspPreviewState | PruefPreviewState;
