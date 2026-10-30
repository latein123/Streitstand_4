// Schriftsätze erkennen: Klageschrift/Replik = Klägerseite, Klageerwiderung/Duplik = Beklagtenseite
import type { Akte, Beweis, Doc, Docs, Partei } from '../types';
import { readState } from './docText';

export function docSide(docs: Docs | null, akte: Akte | null, id: string): Partei | null {
  const d = docs && docs.get(id); if (!d) return null;
  const manual = akte && (akte.docSides || {})[id];
  if (manual) return manual === 'keine' ? null : manual;
  return docSideAuto(d);
}
// Erst am Titel bzw. Dateinamen, dann am Text des Schriftsatzes erkennen – der Dateiname muss nichts verraten
export function docSideAuto(d: Doc): Partei | null {
  return sideFromTitle(d) || sideFromText(d);
}
function sideFromText(d: Doc): Partei | null {
  const r = readState(d); if (!r || !r.lines.length) return null;
  const t = r.lines.slice(0, 80).map(l => l.text).join(' ').toLowerCase().replace(/\s+/g, ' ');
  const kopf = t.slice(0, 300);
  if (/(amtsgericht|landgericht)/.test(kopf) && /(beschluss|verfügung|urteil|protokoll)/.test(kopf) && !/rechtsanw/.test(kopf)) return null; // gerichtliches Dokument
  const pos = (re: RegExp) => { const m = t.match(re); return m ? m.index : Infinity; };
  const bk = Math.min(pos(/in vollmacht (des|der) beklagten/), pos(/die klage abzuweisen/), pos(/vertreten wir (den|die) beklagte/), pos(/wir (den|die) beklagten vertreten/), pos(/zum schriftsatz der klägerseite|zur replik/));
  const kl = Math.min(pos(/in vollmacht (des|der) kläger/), pos(/erheben wir .{0,40}klage/), pos(/vertreten wir (den|die) kläger/), pos(/zur klageerwiderung .{0,40}stellung/));
  if (bk === Infinity && kl === Infinity) return null;
  return bk < kl ? 'beklagter' : 'klaeger';
}
function sideFromTitle(d: Doc): Partei | null {
  const t = (d.title || '').toLowerCase();
  if (/erwiderung|duplik|schriftsatz\W*(de[rs]\W*)?beklagt|beklagt\w*\W*schriftsatz/.test(t)) return 'beklagter';
  if (/klageschrift|replik|räumungsklage|klage\b|schriftsatz\W*(de[rs]\W*)?kläger|schriftsatz\W*(de[rs]\W*)?klaeger/.test(t)) return 'klaeger';
  return null;
}

// Beweisangebot "Mietvertrag …, Anlage K1" -> das vorgelegte Dokument (K01) selbst, nicht die Verweisung im Schriftsatz
export function proofTarget(docs: Docs | null, akte: Akte | null, it: Beweis): string | null {
  if (!docs || it.mittel === 'zeuge' || !docSide(docs, akte, it.dok)) return null; // Zitat stammt bereits aus der Anlage
  const ids = [...docs.keys()];
  const find = (l: string, n: string) => { const L = l.toUpperCase(); return ids.find(i => i === L + String(+n).padStart(2, '0')) || ids.find(i => i === L + n) || null; };
  for (const t of [String(it.zitat || ''), String(it.kurz || '')]) {
    for (const re of [/Anlagen?\s+([A-Z]{1,2})\s?(\d{1,3})/g, /(?:^|[^A-Za-z0-9])([A-Z]{1,2})\s?(\d{1,3})(?=[^A-Za-z0-9]|$)/g]) {
      let m: RegExpExecArray | null; while ((m = re.exec(t))) { const id = find(m[1], m[2]); if (id && id !== it.dok) return id; }
    }
  }
  return null;
}
