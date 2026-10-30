import type { StatusKey } from '../types';

// Status je Zeile nach ZPO
export const STATUS: Record<StatusKey, { label: string; short: string; needsProof: boolean }> = {
  unstreitig:       { label: 'unstreitig (zugestanden, § 288 ZPO)', short: 'unstreitig', needsProof: false },
  nicht_bestritten:  { label: 'nicht bestritten (§ 138 Abs. 3 ZPO)', short: 'nicht bestritten', needsProof: false },
  bestritten:        { label: 'bestritten', short: 'bestritten', needsProof: true },
  nichtwissen:       { label: 'mit Nichtwissen bestritten (§ 138 Abs. 4 ZPO)', short: 'Nichtwissen', needsProof: true },
  pauschal:          { label: 'pauschal bestritten – Erheblichkeit prüfen', short: 'pauschal bestritten', needsProof: true },
  rechtsfrage:       { label: 'nur rechtlich streitig', short: 'Rechtsfrage', needsProof: false },
  offen:             { label: 'offen (noch keine Erwiderung)', short: 'offen', needsProof: false },
  nicht_vorgetragen: { label: 'nicht vorgetragen', short: 'nicht vorgetragen', needsProof: false }
};
export const MITTEL: Record<string, string> = { zeuge: 'Zeuge', urkunde: 'Urkunde', sachverstaendiger: 'Sachverst.', augenschein: 'Augenschein', partei: 'Partei' };
// Status eines Prüfschritts (vom Gericht gesetzt)
export const SSTAT: Record<string, string> = { erfuellt: 'erfüllt', nicht_erfuellt: 'nicht erfüllt', offen: 'offen' };
