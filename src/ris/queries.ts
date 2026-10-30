// Suchbegriffe für die Rechtsprechungssuche
import type { Akte, PruefRspState, PruefSchritt, Row, RspHit } from '../types';
import { RULES } from '../config/regelmodell';
import { RSP_TERMS } from '../config/rechtsprechung';
import { pruefOf } from '../lib/derive';
import { callLLM } from '../ai/llm';
import { rspQueryPrompt } from '../ai/prompts';

const STOP = new Set('und oder der die das des den dem ein eine einer aus von mit nach bei für zur zum auf über unter wegen sowie durch nicht'.split(' '));
const keywords = (s: string) => String(s || '').split(/[^A-Za-zÄÖÜäöüß0-9-]+/).filter(w => w.length >= 5 && !STOP.has(w.toLowerCase()));

// Konkretes Mangel-Stichwort einer Zeile (z. B. „Schimmel“ aus „Feuchtigkeit/Schimmel Schlafzimmer“)
function mangelWort(r: Row) {
  const kw = keywords(r.instanz);
  return kw.find(w => /schimmel|lärm|heiz|wasser|aufzug|ungeziefer|zugluft|baustelle|warmwasser|balkon|fenster/i.test(w)) || kw[0];
}

// Startbegriffe für eine Zeile: Merkmal-Vorlage + konkreter Mangel (z. B. „Schimmel“)
export function rspQueries(a: Akte, r: Row) {
  const preset = (RSP_TERMS[a.verfahren] || {})[r.merkmal] || [];
  const q: string[] = [];
  const inst = mangelWort(r);
  if (inst) q.push(inst + ' Mietminderung');
  preset.forEach(t => q.push(t));
  if (r.merkmal === 'SONST') { const k = keywords(r.label).slice(0, 2); if (k.length) q.push(k.join(' ')); }
  if (!q.length) { const k = keywords(r.label).slice(0, 2); if (k.length) q.push(k.join(' ')); }
  return [...new Set(q)].slice(0, 3);
}

// Prüfung: 1. kuratierte Begriffe am Prüfschritt, 2. konkreter Mangel + Leitbegriff, 3. ggf. KI-Vorschläge
export function pruefQueries(a: Akte, r: Row, step: PruefSchritt | null, extra?: string[]) {
  const pr = pruefOf(a, r); const q: string[] = [];
  if (step) q.push(...(step.rsp || []));
  else if (pr) pr.schritte.forEach(s => { if (s.rsp && s.rsp[0]) q.push(s.rsp[0]); });
  const w = mangelWort(r);
  if (w) q.push(w + ' ' + ((step && step.leit) || (pr && pr.leit) || 'Mietminderung'));
  q.push(...(extra || []));
  if (!q.length) q.push(...rspQueries(a, r));
  return [...new Set(q)].slice(0, 6);
}

export async function aiRspQueries(a: Akte, r: Row) {
  const j = await callLLM(rspQueryPrompt(a, RULES[a.verfahren], r));
  return (j.suchbegriffe || []).map((s: unknown) => String(s).replace(/[§"]/g, '').trim()).filter((s: string) => s.length >= 3).slice(0, 3) as string[];
}

// Alle Treffer einer Prüfschritt-Suche; Treffer zum Skript-Aktenzeichen zuerst
export function pruefHits(st: PruefRspState): RspHit[] {
  const skript = (st.az || []).flatMap(x => (x.hits || []).map(h => ({ ...h, skript: true })));
  const have = new Set(skript.map(h => h.nr));
  return [...skript, ...(st.res ? st.res.hits.filter(h => !have.has(h.nr)) : [])];
}
