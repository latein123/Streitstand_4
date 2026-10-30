// Anker-Wächter und Abgleich: jede KI-Angabe muss wörtlich im Dokument stehen
import type { Doc, DocText, Discarded, Gruppe, Item, Row } from '../types';
import { findQuote, normQuote } from '../lib/quote';

export interface DocWithText { d: Doc; at: DocText }

// Jedes Zitat muss im genannten (oder einem anderen) Dokument wörtlich vorkommen; sonst landet es in "discarded"
export function verifyItem(item: any, docTexts: DocWithText[], ctx: { merkmal: string; instanz: string; partei: string }, discarded: Discarded[]): Item | null {
  const tryDoc = (id: string) => {
    const x = docTexts.find(z => z.d.id === id); if (!x) return null;
    const segs = x.at.lines.map(l => ({ text: l.text }));
    const hit = findQuote(segs, item.zitat); if (!hit) return null;
    const ln = x.at.lines[hit.firstSeg];
    return { anchor: ln.anchor || (ln.page ? `${id} S.${ln.page}` : id) };
  };
  const claimed = String(item.dok || '').trim().toUpperCase();
  let r = tryDoc(claimed), fixed = false, dok = claimed;
  if (!r) {
    for (const x of docTexts) { if (x.d.id === claimed) continue; const h = tryDoc(x.d.id); if (h) { r = h; dok = x.d.id; fixed = true; break; } }
  }
  if (!r) { discarded.push({ ...ctx, kurz: item.kurz, dok: claimed, zitat: item.zitat, grund: 'Zitat in keinem Dokument wörtlich gefunden' }); return null; }
  return { kurz: item.kurz || '', dok, zitat: item.zitat, anchor: r.anchor, fixed: fixed ? claimed : null };
}

export function dedupe<T extends Item>(items: T[], byMittel?: boolean): T[] {
  const seen = new Set<string>();
  return items.filter((i: any) => { const k = i.dok + '|' + normQuote(i.zitat) + (byMittel ? '|' + i.partei + i.mittel : ''); if (seen.has(k)) return false; seen.add(k); return true; });
}

// Wortähnlichkeit (Jaccard über Wörter ab 3 Buchstaben)
export function sim(a: string, b: string) {
  const w = (s: string) => new Set(String(s || '').toLowerCase().split(/[^a-zäöüß0-9]+/).filter(x => x.length >= 3));
  const A = w(a), B = w(b); if (!A.size && !B.size) return 1;
  let i = 0; A.forEach(x => { if (B.has(x)) i++; });
  return i / (A.size + B.size - i || 1);
}

// KI-Kennung (evtl. ungenau) einem Merkmal der Gruppe zuordnen
export function matchMerkmal(g: Gruppe, raw: string) {
  const n = (s: string) => String(s || '').toUpperCase().replace(/[^A-Z0-9ÄÖÜ]/g, '');
  const id = n(raw); if (!id) return null;
  return g.merkmale.find(m => m.id === id) || g.merkmale.find(m => id.length >= 3 && (id.includes(m.id) || m.id.includes(id))) || g.merkmale.find(m => n(m.label) === id) || null;
}

export function rowSig(r: Row) { return [r.status, r.klaeger.map(i => i.dok).sort().join(','), r.beklagter.map(i => i.dok).sort().join(','), r.beweis.length].join('|'); }
