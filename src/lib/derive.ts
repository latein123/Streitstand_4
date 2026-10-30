// Abgeleitete Werte aus Akte + Regelmodell (reine Funktionen, keine UI)
import type { Akte, AntragDef, Antrag, Judge, Last, Partei, Pin, RspHit, Row, StepJudge } from '../types';
import { RULES } from '../config/regelmodell';
import '../config/pruefungsschema'; // hängt das Prüfungsschema an die Merkmale
import { ANTRAEGE } from '../config/antraege';
import { STATUS } from '../config/status';

/* ---------- Beweislast & Status ---------- */
export function sideOf(akte: Akte, last: Last | null): Partei | null {
  if (!last || last === 'gestuft') return null;
  const r = RULES[akte.verfahren];
  return (last === 'mieter') === (r.klaegerRolle === 'Mieter') ? 'klaeger' : 'beklagter';
}
export function judgeOf(akte: Akte, key: string): Judge { akte.judge = akte.judge || {}; return akte.judge[key] || (akte.judge[key] = {}); }
export const judgeView = (akte: Akte, key: string): Judge => (akte.judge || {})[key] || {};
export function effStatus(akte: Akte, r: Row) { const j = (akte.judge || {})[r.key]; return (j && j.status) || r.status; }
export function needsProof(akte: Akte, r: Row) { return STATUS[effStatus(akte, r)].needsProof; }
export function proofGap(akte: Akte, r: Row): Partei | null {
  const side = sideOf(akte, r.last); if (!side || !needsProof(akte, r)) return null;
  return r.beweis.some(b => b.partei === side) ? null : side;
}
export function partyName(akte: Akte, side: Partei) {
  const r = RULES[akte.verfahren];
  return side === 'klaeger' ? `Kläger (${r.klaegerRolle})` : `Beklagter (${r.beklagterRolle})`;
}

/* ---------- Prüfungsschema ---------- */
export function merkmalOf(a: Akte, r: Row | null) { return r ? RULES[a.verfahren].groups.flatMap(g => g.merkmale).find(m => m.id === r.merkmal) || null : null; }
export function pruefOf(a: Akte, r: Row | null) { const m = merkmalOf(a, r); return (m && m.pruefung) || null; }
export function stepJudge(a: Akte, key: string, sid: string): StepJudge { const j = judgeOf(a, key); j.schritte = j.schritte || {}; return j.schritte[sid] || (j.schritte[sid] = {}); }
export function stepState(a: Akte, key: string, sid: string): StepJudge { const j = (a.judge || {})[key]; return (j && j.schritte && j.schritte[sid]) || {}; }

/* ---------- Geheftete Entscheidungen ---------- */
// Nur Felder aus der API-Antwort. zeile = an der Zeile/am Merkmal geheftet, schritte = Prüfschritte, an denen sie geheftet ist.
export const pinRecord = (h: RspHit | Pin): Pin => ({ nr: h.nr, gericht: h.gericht, datum: h.datum, az: h.az, titel: h.titel, ecli: h.ecli, art: h.art || '', spruch: h.spruch || '' });
export const isRowPin = (u: Pin) => u.zeile ?? !(u.schritte && u.schritte.length);
export const pinnedAt = (u: Pin, sid: string) => sid === '*' ? isRowPin(u) : (u.schritte || []).includes(sid);
export function pinsOf(a: Akte, key: string | null): Pin[] { return key ? ((a.judge || {})[key]?.urteile || []) : []; }

/* ---------- Zeilen ---------- */
// Nicht analysierte optionale Gruppen: Zeilen ohne Vortrag, damit Prüfungsschema und Rechtsprechung trotzdem nutzbar sind
export function virtualRows(a: Akte): Row[] {
  const have = new Set((a.analysis ? a.analysis.rows : []).map(r => r.gid));
  return RULES[a.verfahren].groups.filter(g => g.optional && !have.has(g.id)).flatMap(g => g.merkmale.map(m => ({
    key: g.id + '|' + m.id + '|', gid: g.id, merkmal: m.id, label: m.label, norm: m.norm, instanz: '', last: m.last, lastText: m.lastText || null, verify: !!m.verify,
    klaeger: [], beklagter: [], beweis: [], status: 'nicht_vorgetragen' as const, begruendung: '', virtual: true })));
}
export function rowByKey(a: Akte | null, key: string | null): Row | null {
  return key && a && a.analysis ? (a.analysis.rows.find(r => r.key === key) || virtualRows(a).find(r => r.key === key) || null) : null;
}

/* ---------- Klageanträge ---------- */
export interface AntragView extends Partial<Antrag> { id: string; nr: string; typ: string; kurz: string; def: AntragDef | null; merkmale: string[] | null; abgeleitet?: boolean; hilfsweise?: boolean }

export const inAntrag = (ant: { merkmale: string[] | null }, r: Row) => r.merkmal !== 'SONST' && (ant.merkmale === null || ant.merkmale.includes(r.merkmal));

// Anträge der Akte; ohne erfasste Anträge (ältere Analysen, Fehler) aus dem Regelmodell abgeleitet
export function antraegeOf(a: Akte): { kl: AntragView[]; bk: Antrag[] } {
  const defs = ANTRAEGE[a.verfahren] || [];
  const rows = a.analysis ? a.analysis.rows : [];
  const src = (a.analysis && a.analysis.antraege) || [];
  let kl: any[] = src.filter(x => x.partei === 'klaeger').map(x => ({ ...x, def: defs.find(d => d.typ === x.typ) || null }));
  const bk = src.filter(x => x.partei === 'beklagter');
  if (!kl.length) {
    const vortrag = (id: string) => rows.some(r => r.merkmal === id && (r.klaeger.length || r.beklagter.length));
    kl = defs.filter(d => d.kenn && vortrag(d.kenn)).map(d => ({ typ: d.typ, kurz: d.titel, def: d, abgeleitet: true }));
    if (!kl.length && defs.length && rows.length) kl = [{ typ: defs[0].typ, kurz: defs[0].titel, def: defs[0], abgeleitet: true }];
    kl.forEach((x, i) => { x.nr = String(i + 1); });
  }
  kl.sort((x, y) => (parseInt(x.nr, 10) || 99) - (parseInt(y.nr, 10) || 99));
  return { kl: kl.map((x, i) => ({ ...x, id: 'A' + i, merkmale: x.def ? x.def.merkmale : [] })), bk };
}
