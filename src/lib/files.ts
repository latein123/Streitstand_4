// Aktenordner einlesen: Dateiauswahl, ZIP-Entpacken, Markdown-Parser, Dokument-Kennungen
import JSZip from 'jszip';
import type { Doc, Docs, FileEntry, ParsedMd } from '../types';

const ID_RE = /(?:^|[^A-Za-z0-9])([A-Z]{1,2}\d{2})(?=[^A-Za-z0-9]|$)/;
export const ACCEPT = '.md,.markdown,.txt,.eml,.csv,.pdf,.png,.jpg,.jpeg,.webp,.gif,.bmp,.zip';

export function fmtOf(name: string): 'md' | 'pdf' | 'img' | null {
  const e = name.toLowerCase().split('.').pop();
  if (['md', 'markdown', 'txt', 'eml', 'csv'].includes(e)) return 'md';
  if (e === 'pdf') return 'pdf';
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'].includes(e)) return 'img';
  return null;
}
export const isZip = (n: string) => /\.zip$/i.test(n);

// ZIP-Archive werden im Browser entpackt; ihre Dateien zählen wie die eines Unterordners
export async function unzipEntries(file: Blob, prefix: string, ignored?: string[]): Promise<FileEntry[]> {
  const zip = await JSZip.loadAsync(file), out: FileEntry[] = [];
  for (const z of Object.values(zip.files)) {
    const name = z.name.split('/').pop();
    if (z.dir || !name || name.startsWith('.') || z.name.startsWith('__MACOSX/')) continue;
    const p = prefix + '/' + z.name;
    if (isZip(name)) out.push(...await unzipEntries(new File([await z.async('blob')], name), p.replace(/\.zip$/i, ''), ignored));
    else if (fmtOf(name)) out.push({ path: p, file: new File([await z.async('blob')], name, { lastModified: z.date ? z.date.getTime() : 1 }) });
    else if (ignored) ignored.push(p);
  }
  return out;
}

export interface PickedFolder { name: string; entries: FileEntry[]; count: number; ignored: string[] }

// Ordner (oder einzelne Dateien) über den Browser-Dialog wählen
export function pickFolder(mode: 'folder' | 'files' = 'folder'): Promise<PickedFolder> {
  return new Promise((res, rej) => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.multiple = true;
    if (mode === 'files') inp.accept = ACCEPT; else inp.setAttribute('webkitdirectory', '');
    inp.onchange = async () => {
      try {
        const all = [...inp.files].filter(f => !f.name.startsWith('.'));
        const rel = (f: File) => (f.webkitRelativePath || f.name);
        const sub = (f: File) => mode === 'files' ? f.name : (rel(f).split('/').slice(1).join('/') || f.name);
        const entries: FileEntry[] = [], ignored: string[] = [];
        for (const f of all) {
          if (fmtOf(f.name)) entries.push({ path: sub(f), file: f });
          else if (isZip(f.name)) entries.push(...await unzipEntries(f, sub(f).replace(/\.zip$/i, ''), ignored));
          else ignored.push(sub(f));
        }
        if (!entries.length) { rej(new Error('Keine lesbaren Dateien gefunden' + (ignored.length ? ' (nicht unterstützt: ' + ignored.join(', ') + ')' : '') + '.')); return; }
        const name = mode === 'files' ? entries.length + ' Dateien' : rel(all[0]).split('/')[0];
        res({ name, entries, count: entries.length, ignored });
      } catch (err) { rej(err); }
    };
    inp.click();
  });
}

export function parseMd(text: string): ParsedMd {
  const fm: Record<string, string> = {}; let body = text;
  const m = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (m) { m[1].split('\n').forEach(l => { const i = l.indexOf(':'); if (i > 0) fm[l.slice(0, i).trim()] = l.slice(i + 1).trim(); }); body = text.slice(m[0].length); }
  let title = ''; const lines: ParsedMd['lines'] = [];
  body.split('\n').forEach(raw => {
    const l = raw.trim(); if (!l) return;
    if (!title && l.startsWith('#')) { title = l.replace(/^#+\s*/, ''); return; }
    const a = l.match(/^\[([A-Z]{1,2}\d{2}:L\d+)\]\s*(.*)$/);
    lines.push(a ? { anchor: a[1], text: a[2] } : { anchor: null, text: l.replace(/^#+\s*/, '') });
  });
  return { fm, title, lines };
}

// Lesbarer Titel aus dem Dateinamen: "01_Klageschrift_2026-10-12.pdf" -> "Klageschrift 2026-10-12"
export function cleanName(path: string, id?: string) {
  let n = path.split('/').pop().replace(/\.[^.]+$/, '');
  if (id) n = n.replace(new RegExp('^(.*?[^A-Za-z0-9])?' + id + '(?=[^A-Za-z0-9]|$)'), '');
  return n.replace(/^[\d\s._-]+(?=[A-Za-zÄÖÜäöü])/, '').replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim() || path.split('/').pop();
}
// Dateiname ohne Kennung und Nummernpräfix ("eingang_02_M03.pdf" -> "", "K03_Foto_1.png" -> "foto 1")
function restName(path: string, id: string) {
  const base = path.split('/').pop(), c = cleanName(path, id);
  return c === base ? '' : c.toLowerCase();
}

const sigOf = (e: FileEntry) => e.path + '|' + e.file.size + '|' + e.file.lastModified;

// Dateien zu Dokumenten gruppieren (gleiche Kennung = gleiches Dokument in mehreren Fassungen: PDF, Text, Bild)
export async function buildDocs(entries: FileEntry[]): Promise<Docs> {
  entries.sort((a, b) => a.path.localeCompare(b.path));
  const docs = new Map<string, Doc>(), unnamed = new Map<string, { e: FileEntry; format: string; md: ParsedMd | null }[]>();
  for (const e of entries) {
    const format = fmtOf(e.path);
    let id: string | null = null, md: ParsedMd | null = null;
    if (format === 'md') {
      md = parseMd(await e.file.text());
      id = md.fm.document_id || null;
    }
    if (!id) { const m = e.path.split('/').pop().match(ID_RE); id = m ? m[1] : null; }
    if (!id) { const k = e.path.replace(/\.[^.]+$/, ''); if (!unnamed.has(k)) unnamed.set(k, []); unnamed.get(k).push({ e, format, md }); continue; }
    // Gleiche Kennung = gleiches Dokument nur, wenn der Rest des Dateinamens passt (leer oder gleich).
    // Sonst eigenes Dokument (K03, K03-2 …), damit z. B. "K03_Foto_1.png" und "K03_Foto_2.png" beide gelesen werden.
    const rest = restName(e.path, id);
    const fits = (d: Doc) => {
      const same = (x: { path: string }) => { const r = restName(x.path, id); return !r || !rest || r === rest; };
      const v = d.variants[format]; return v ? same(v) : Object.values(d.variants).every(same);
    };
    let docId = id, k = 1, d = docs.get(id);
    while (d && !fits(d)) { docId = id + '-' + (++k); d = docs.get(docId); }
    if (!d) { d = { id: docId, title: '', date: '', release: '', variants: {} }; docs.set(docId, d); }
    if (d.variants[format]) continue; // echte Dublette (z. B. 05_RELEASES, 04_MIXED_INPUT) – erste Fassung gewinnt
    d.variants[format] = { path: e.path, file: e.file, sig: sigOf(e) };
    if (md) {
      d.md = md;
      d.title = d.title || md.title.replace(/^[A-Z]{1,2}\d{2}\s*\|\s*/, '');
      d.date = d.date || md.fm.document_date || '';
      d.release = d.release || md.fm.release || '';
    }
  }
  // Dateien ohne Kennung (z. B. Schriftsätze "01_Klageschrift.pdf") erhalten eine eigene Kennung S01, S02 …
  let n = 1;
  for (const [, list] of unnamed) {
    let id: string; do { id = 'S' + String(n++).padStart(2, '0'); } while (docs.has(id));
    const d: Doc = { id, title: '', date: '', release: '', variants: {}, autoId: true };
    for (const { e, format, md } of list) {
      if (d.variants[format]) continue;
      d.variants[format] = { path: e.path, file: e.file, sig: sigOf(e) };
      if (md) { d.md = md; d.title = md.title; d.date = md.fm.document_date || ''; }
    }
    d.title = d.title || cleanName(list[0].e.path);
    docs.set(id, d);
  }
  for (const d of docs.values()) if (!d.title) d.title = cleanName((d.variants.pdf || d.variants.img || d.variants.md).path, d.id);
  return new Map([...docs.entries()].sort((a, b) => a[0].localeCompare(b[0], 'de', { numeric: true })));
}
