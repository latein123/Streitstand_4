// Textnormalisierung & Zitat-Suche
// Vergleich nur über Buchstaben/Ziffern: robust gegen Zeilenumbrüche, Silbentrennung, Anführungszeichen.

export interface QuoteRange { si: number; start: number; end: number }
export interface QuoteHit { exact: boolean; ranges: QuoteRange[]; firstSeg: number }

function normChar(ch: string) {
  const l = ch.toLowerCase();
  return /[a-z0-9äöüß]/.test(l) ? l : '';
}
function buildIndex(segments: { text: string }[]) {
  const chars: string[] = [], map: [number, number][] = [];
  segments.forEach((seg, si) => {
    const t = (seg.text || '').normalize('NFC');
    for (let i = 0; i < t.length; i++) { const c = normChar(t[i]); if (c) { chars.push(c); map.push([si, i]); } }
  });
  return { str: chars.join(''), map };
}
export function normQuote(q: string) { return [...String(q || '').normalize('NFC')].map(normChar).join(''); }
function rangesFrom(idx: ReturnType<typeof buildIndex>, a: number, b: number): QuoteRange[] {
  const per = new Map<number, QuoteRange>();
  for (let k = a; k < b; k++) {
    const [si, i] = idx.map[k];
    const r = per.get(si); if (r) { r.end = i + 1; } else per.set(si, { si, start: i, end: i + 1 });
  }
  return [...per.values()];
}

// Liefert {exact, ranges:[{si,start,end}], firstSeg} oder null
export function findQuote(segments: { text: string }[], quote: string, fuzzy = false): QuoteHit | null {
  const idx = buildIndex(segments);
  const parts = String(quote || '').split(/\.\.\.|…|\[\.\.\.\]/).map(normQuote).filter(p => p.length >= 4);
  if (!parts.length || parts.reduce((n, p) => n + p.length, 0) < 10) return null;
  let pos = 0, ranges: QuoteRange[] = [], ok = true;
  for (const p of parts) {
    const at = idx.str.indexOf(p, pos);
    if (at < 0) { ok = false; break; }
    ranges = ranges.concat(rangesFrom(idx, at, at + p.length)); pos = at + p.length;
  }
  if (ok) return { exact: true, ranges, firstSeg: ranges[0].si };
  if (!fuzzy) return null;
  const q = parts.join('');
  for (const k of [0.75, 0.6, 0.45]) {
    const n = Math.max(10, Math.floor(q.length * k));
    let at = idx.str.indexOf(q.slice(0, n));
    if (at >= 0) { const r = rangesFrom(idx, at, Math.min(idx.str.length, at + q.length)); return { exact: false, ranges: r, firstSeg: r[0].si }; }
    at = idx.str.indexOf(q.slice(q.length - n));
    if (at >= 0) { const s = Math.max(0, at + n - q.length); const r = rangesFrom(idx, s, at + n); return { exact: false, ranges: r, firstSeg: r[0].si }; }
  }
  return null;
}
