// Aktionen: alles, was Zustand verändert, Dateien liest oder die KI/API aufruft.
import type { Akte, Beweis, Item, Partei, Row, RspHit, RspPreviewState, StatusKey } from '../types';
import { get, set, touch } from './store';
import { RULES } from '../config/regelmodell';
import { providerState } from '../config/settings';
import { DB, memFiles } from '../lib/db';
import { buildDocs, pickFolder } from '../lib/files';
import { analysisText, docSig, readState, textCache } from '../lib/docText';
import { proofTarget } from '../lib/docSide';
import { detectRubrum, detectVerfahren, rubrumText, verfahrenFromText } from '../lib/rubrum';
import { judgeOf, pinRecord, pinnedAt, isRowPin, pruefOf, rowByKey, stepJudge } from '../lib/derive';
import { lsGet, lsSet, uid } from '../lib/util';
import { runAnalysis } from '../ai/analysis';
import { claudeOpts, llmNotices } from '../ai/llm';
import { risFileNumber, risMulti, widenRsp } from '../ris/api';
import { aiRspQueries, pruefHits, pruefQueries, rspQueries } from '../ris/queries';

llmNotices.push = msg => set({ notice: msg });

const save = (a: Akte) => DB.put(a).catch(() => {});
export const saveCurrent = async () => { const a = get().current; if (a) await save(a); touch(); };

/* ========================= Start & Akten ========================= */
export async function init() {
  await DB.open();
  const akten = (await DB.all()).sort((a, b) => (b.created || '').localeCompare(a.created || ''));
  set({ akten });
  if (akten[0]) await selectAkte(akten[0].id);
  else if (lsGet('t9_example_loaded') !== '1') { lsSet('t9_example_loaded', '1'); await loadExample(true); }
}

export async function selectAkte(id: string) {
  const current = get().akten.find(a => a.id === id) || null;
  set({ current, docs: null, preview: null, error: null, notice: null, showDocs: false, confirmDelete: false, menu: false });
  const an = current && current.analysis;
  if (an && (an.errors || []).length && !an.rows.some(r => r.klaeger.length || r.beklagter.length || r.beweis.length)) { current.analysis = null; await save(current); }
  if (current) {
    try { await loadDocs(current); } catch (e) { set({ error: e.message }); }
    touch(); readAllDocs();
  }
}

async function getEntries(akte: Akte) {
  if (!memFiles.has(akte.id)) { const stored = await DB.filesGet(akte.id).catch(() => null); if (stored && stored.length) memFiles.set(akte.id, stored); }
  return memFiles.get(akte.id) || null;
}

// Dateien der Akte zu Dokumenten zusammenstellen; neu hinzugekommene Dokumente merken
async function loadDocs(akte: Akte) {
  const entries = await getEntries(akte);
  if (!entries) { set({ docs: null }); return false; }
  const docs = await buildDocs(entries);
  set({ docs });
  const ids = [...docs.keys()];
  if (!akte.knownDocs) { akte.knownDocs = ids; akte.newDocs = []; }
  else {
    const fresh = ids.filter(i => !akte.knownDocs.includes(i));
    if (fresh.length) { akte.newDocs = [...new Set([...(akte.newDocs || []), ...fresh])]; akte.knownDocs = ids; }
  }
  akte.docCount = ids.length;
  await save(akte);
  return true;
}

// Liest jedes Dokument einmal (Textebene, sonst Texterkennung) und merkt sich das Ergebnis
let readRun: Promise<void> | null = null;
export function readAllDocs(): Promise<void> {
  if (readRun) return readRun;
  const docs = get().docs; if (!docs) return Promise.resolve();
  readRun = (async () => {
    const todo = [...docs.values()].filter(d => !textCache.has(docSig(d)));
    let i = 0;
    for (const d of todo) {
      if (get().docs !== docs) break; // andere Akte gewählt
      i++; set({ reading: `Dokumente werden gelesen – ${i} von ${todo.length} (${d.id}) …` });
      try { textCache.set(docSig(d), await analysisText(d, msg => set({ reading: `${msg} (${i} von ${todo.length})` }))); }
      catch (e) { textCache.set(docSig(d), { source: 'error', lines: [], error: e.message }); }
    }
    readRun = null;
    set({ reading: null });
    if (get().docs === docs && get().current) await autoVerfahren(get().current);
  })();
  return readRun;
}

// Verfahrensart aus dem gelesenen Text bestimmen, solange keine verwertbare Analyse vorliegt
async function autoVerfahren(a: Akte) {
  const docs = get().docs;
  if (a.verfahrenManual || !docs) return;
  if (a.analysis && a.analysis.rows.some(r => r.klaeger.length || r.beklagter.length)) return;
  const all = [...docs.values()].map(d => d.title + '\n' + ((readState(d) || { lines: [] }).lines).map(l => l.text).join(' ')).join('\n');
  const v = verfahrenFromText(all);
  if (v !== a.verfahren) { a.verfahren = v; await save(a); set({ notice: 'Verfahrensart anhand der Dokumente erkannt: ' + RULES[v].label + '.' }); }
}

const ignoredNotice = (a: Akte) => `${a.ignoredFiles.length} Datei(en) nicht eingelesen (Format nicht unterstützt): ${a.ignoredFiles.join(', ')}`;

// Neue Akte: nur der Ordner wird gewählt, Rubrum und Verfahrensart werden aus den Dokumenten ermittelt
export async function newAkte() {
  set({ newForm: null });
  let pf;
  try { pf = await pickFolder('folder'); } catch (err) { set({ newForm: { err: 'Ordner konnte nicht geöffnet werden: ' + err.message } }); return; }
  if (!pf) return;
  set({ newForm: { busy: 'Rubrum wird aus den Schriftsätzen erkannt …' } });
  let rub: any = {}, verfahren: Akte['verfahren'] = 'minderung';
  try { const text = await rubrumText(pf.entries); rub = await detectRubrum(text, pf.name); verfahren = await detectVerfahren(pf.entries); } catch { /* Rückfall: Ordnername */ }
  const akte: Akte = { id: uid(), az: rub.az || pf.name, klaeger: rub.klaeger || 'Kläger', beklagter: rub.beklagter || 'Beklagter', rubrumAuto: true, verfahren, folderName: pf.name, created: new Date().toISOString(), judge: {}, ignoredFiles: pf.ignored || [] };
  memFiles.set(akte.id, pf.entries); await DB.filesPut(akte.id, pf.entries).catch(() => {});
  await save(akte); set({ akten: [akte, ...get().akten], newForm: null });
  await selectAkte(akte.id);
  const miss = [!rub.az && 'Aktenzeichen', !rub.klaeger && 'Kläger', !rub.beklagter && 'Beklagter'].filter(Boolean);
  set({ notice: (miss.length ? `Rubrum unvollständig erkannt (fehlt: ${miss.join(', ')}).` : 'Rubrum automatisch aus den Schriftsätzen erkannt.') + ' Korrektur über ⋯ → Rubrum bearbeiten.'
    + (akte.ignoredFiles.length ? ' ' + ignoredNotice(akte) : '') });
}

// Aktenordner (erneut) wählen: nachgereichte Dokumente werden erkannt und markiert
export async function rescan() {
  const a = get().current; set({ error: null, notice: null });
  let pf; try { pf = await pickFolder(); } catch (e) { set({ error: e.message }); return; }
  if (!pf) return;
  memFiles.set(a.id, pf.entries); await DB.filesPut(a.id, pf.entries).catch(() => {});
  a.folderName = pf.name; a.ignoredFiles = pf.ignored || [];
  let error: string | null = null;
  try { await loadDocs(a); } catch (e) { error = e.message; }
  let notice = error ? '' : ((a.newDocs || []).length ? '' : 'Keine neuen Dokumente gefunden.');
  if (!error && a.ignoredFiles.length) notice = (notice ? notice + ' ' : '') + ignoredNotice(a);
  set({ error, notice: notice || null });
  readAllDocs();
}

export async function deleteCurrent() {
  const a = get().current;
  await DB.del(a.id); await DB.filesDel(a.id).catch(() => {}); memFiles.delete(a.id);
  set({ confirmDelete: false, akten: get().akten.filter(x => x !== a), current: null, docs: null, preview: null });
}

export async function saveRubrum(az: string, klaeger: string, beklagter: string) {
  const a = get().current;
  a.az = az.trim() || a.az; a.klaeger = klaeger.trim() || a.klaeger; a.beklagter = beklagter.trim() || a.beklagter; a.rubrumAuto = false;
  await save(a); set({ modal: null, notice: null });
}

export async function toggleVerfahren() {
  const a = get().current; a.verfahren = a.verfahren === 'raeumung' ? 'minderung' : 'raeumung'; a.verfahrenManual = true;
  await save(a); set({ notice: 'Verfahrensart umgestellt auf: ' + RULES[a.verfahren].label + '. Bitte neu analysieren.' });
}

export async function setOptGroup(g: string, on: boolean) {
  const a = get().current; a.optGroups = (a.optGroups || []).filter(x => x !== g);
  if (on) a.optGroups.push(g);
  await saveCurrent();
}

export async function setDocSide(docId: string, value: string) {
  const a = get().current; a.docSides = a.docSides || {};
  if (value) a.docSides[docId] = value as Partei | 'keine'; else delete a.docSides[docId];
  await save(a); set({ notice: 'Rolle geändert – bitte neu analysieren.' });
}

/* ========================= Analyse ========================= */
export async function analyze() {
  const a = get().current; set({ error: null, notice: null });
  // Nach einer Analyse mit Fehlern nicht die zwischengespeicherte Antwort wiedergeben, sondern neu fragen
  claudeOpts.refresh = !!(a.analysis && a.analysis.errors && a.analysis.errors.length);
  try {
    await runAnalysis(a, {
      docs: get().docs,
      readAll: readAllDocs,
      onProgress: (busy, partialRows) => set(partialRows ? { busy, partialRows } : { busy })
    });
    a.example = false; await save(a);
  } catch (e) { set({ error: 'Analyse fehlgeschlagen: ' + e.message }); }
  set({ busy: null, partialRows: null });
}

/* ========================= Export / Import ========================= */
export function exportAkte() {
  const a = get().current;
  const blob = new Blob([JSON.stringify(a, null, 2)], { type: 'application/json' });
  const l = document.createElement('a'); l.href = URL.createObjectURL(blob); l.download = `BGH-Pro-Max_${a.az.replace(/[^\w-]+/g, '_')}.json`; l.click();
  set({ notice: 'Analyse als JSON gespeichert.' });
}
export function importAkte() {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json';
  inp.onchange = async () => {
    try {
      const data = JSON.parse(await inp.files[0].text());
      const a = get().current; if (!a || !data.analysis) throw new Error('Datei enthält keine Analyse.');
      a.analysis = data.analysis; a.judge = data.judge || {}; if (data.verfahren) a.verfahren = data.verfahren;
      if (data.optGroups) a.optGroups = data.optGroups;
      if (data.risCache) a.risCache = { ...(a.risCache || {}), ...data.risCache };
      await save(a); set({ notice: 'Analyse und Prüfvermerke aus der Datei übernommen.' });
    } catch (e) { set({ error: 'Import fehlgeschlagen: ' + e.message }); }
  };
  inp.click();
}

// Beispielakte: liegt optional unter public/beispiel/ (manifest.json, analyse.json, Dateien)
export async function loadExample(silent = false) {
  set({ busy: 'Beispielakte wird geladen …' });
  try {
    const base = new URL('beispiel/', document.baseURI);
    const mr = await fetch(new URL('manifest.json', base));
    if (!mr.ok || /html/.test(mr.headers.get('content-type') || '')) throw new Error('Keine Beispielakte unter public/beispiel/ hinterlegt. Bitte „Neue Akte“ anlegen.');
    const list: string[] = await mr.json();
    const entries = [];
    for (const p of list) { const r = await fetch(new URL(p.split('/').map(encodeURIComponent).join('/'), base)); entries.push({ path: p.replace(/^westring\//, ''), file: new File([await r.blob()], p.split('/').pop(), { lastModified: 1 }) }); }
    // Vorab erstellte Analyse ist optional; ohne sie startet die Akte unanalysiert
    const ar = await fetch(new URL('analyse.json', base)).catch(() => null);
    const analysis = ar && ar.ok && !/html/.test(ar.headers.get('content-type') || '') ? await ar.json() : null;
    const akte: Akte = { id: 'beispiel-westring', az: 'SYN-C3-WEST-26', klaeger: 'Mira Fink', beklagter: 'Erik Weber', verfahren: 'minderung', folderName: 'Beispiel Westring', created: new Date().toISOString(), judge: {}, analysis, example: !!analysis };
    memFiles.set(akte.id, entries); await DB.filesPut(akte.id, entries).catch(() => {});
    await save(akte); set({ akten: [akte, ...get().akten.filter(a => a.id !== akte.id)], busy: null });
    await selectAkte(akte.id);
  } catch (e) { set({ busy: null, error: silent ? null : 'Beispielakte konnte nicht geladen werden: ' + e.message }); }
}

/* ========================= Einstellungen ========================= */
export function saveSettings(v: { ris: string; risDefault: string; provider: string; tier: string; key: string; model: string }) {
  lsSet('t9_ris', v.ris.trim() === v.risDefault ? '' : v.ris.trim());
  lsSet('t9_provider', v.provider); lsSet('t9_tier', v.tier); lsSet('t9_key', v.key); lsSet('t9_model', v.model);
  providerState.orBlocked = false; set({ modal: null });
}

/* ========================= Prüfvermerke des Gerichts ========================= */
export async function setChecked(key: string, on: boolean) { judgeOf(get().current, key).checked = on; await saveCurrent(); }
export async function setJudgeStatus(key: string, v: string) { judgeOf(get().current, key).status = (v || null) as StatusKey; await saveCurrent(); }
export async function setStepStatus(key: string, sid: string, v: string) { stepJudge(get().current, key, sid).status = v; await saveCurrent(); }
// Notizen: sofort im Speicher, verzögert in IndexedDB
let noteTimer: ReturnType<typeof setTimeout>;
const saveLater = () => { clearTimeout(noteTimer); noteTimer = setTimeout(() => saveCurrent(), 400); };
export function setNote(key: string, text: string) { judgeOf(get().current, key).note = text; saveLater(); }
export function setStepNote(key: string, sid: string, text: string) { stepJudge(get().current, key, sid).note = text; saveLater(); }

/* ========================= Seitenpanel: Dokument ========================= */
export function closePreview() { set({ preview: null }); }

export function openPreview(docId: string, quote: string | null, ref: string | null, anchor: string | null, via: { dok: string; zitat: string; anchor: string } | null = null, back: string | null = null) {
  const d = get().docs && get().docs.get(docId);
  if (!d) { set({ error: 'Dokument ' + docId + ' ist in den Dateien dieser Akte nicht vorhanden.' }); return; }
  const fmts = (['pdf', 'md', 'img'] as const).filter(f => d.variants[f]);
  set({ preview: { kind: 'doc', docId, quote, ref, anchor, via, back, fmt: fmts[0], fmts: [...fmts] } });
}

// Klick auf eine Angabe: Fundstelle anzeigen; bei Beweisangeboten mit Anlage das vorgelegte Dokument
export function openItem(r: Row, kind: 'klaeger' | 'beklagter' | 'beweis', i: number) {
  const s = get();
  const it: Item = kind === 'beweis' ? r.beweis[i] : r[kind][i];
  const ref = `${r.key}|${kind}|${i}`;
  const ziel = kind === 'beweis' ? proofTarget(s.docs, s.current, it as Beweis) : null;
  const back = s.preview && s.preview.kind === 'pruef' ? s.preview.key : null;
  if (ziel) openPreview(ziel, null, ref, null, { dok: it.dok, zitat: it.zitat, anchor: it.anchor }, back);
  else openPreview(it.dok, it.zitat, ref, it.anchor, null, back);
}

/* ========================= Seitenpanel: Prüfung ========================= */
export function showPruef(key: string) { set({ preview: { kind: 'pruef', key } }); }

/* ========================= Seitenpanel: Rechtsprechung ========================= */
const rspPreview = () => { const p = get().preview; return p && p.kind === 'rsp' ? p : null; };

// seed (optional): {query, res} – z. B. Trefferliste aus der Prüfung, damit „zurück zur Trefferliste“ sie zeigt
export function openRsp(key: string | null, detailNr: string | null = null, seed: { query: string; res: any } | null = null, back: string | null = null) {
  const a = get().current; const r = rowByKey(a, key);
  const p: RspPreviewState = { kind: 'rsp', key, query: seed ? seed.query : (r ? rspQueries(a, r).join('; ') : ''), court: '', detail: detailNr || null, res: seed ? seed.res : null, err: null, busy: false, note: '', back: back || null, token: uid() };
  set({ preview: p });
  if (!detailNr && p.query) runRsp();
}

export async function runRsp(fresh = false) {
  const p = rspPreview(); if (!p) return;
  const a = get().current;
  const queries = p.query.split(';').map(s => s.trim()).filter(Boolean);
  if (!queries.length) { p.err = 'Bitte Suchbegriffe eingeben.'; touch(); return; }
  const token = p.token = uid(); p.busy = true; p.err = null; p.detail = null; touch();
  try {
    const res = await risMulti(a, queries, p.court, fresh, () => save(a));
    await widenRsp(a, res, queries, p.court, fresh, () => save(a));
    if (token === p.token) p.res = res;
  } catch (e) { if (token === p.token) { p.err = e.message; p.res = null; } }
  if (token !== p.token) return;
  p.busy = false; touch();
}

export async function suggestRsp() {
  const p = rspPreview(); const r = rowByKey(get().current, p && p.key); if (!r) return;
  p.busy = true; p.err = null; p.note = 'KI schlägt Suchbegriffe vor …'; touch();
  try {
    const qs = await aiRspQueries(get().current, r);
    if (!qs.length) throw new Error('Die KI hat keine verwertbaren Suchbegriffe geliefert.');
    p.query = qs.join('; '); p.note = 'Suchbegriffe von der KI vorgeschlagen. Die Treffer stammen ausschließlich aus der amtlichen Datenbank.';
    await runRsp();
  } catch (e) { p.busy = false; p.note = ''; p.err = e.message; touch(); }
}

export function setRspDetail(nr: string | null) {
  const p = rspPreview(); if (!p) return;
  p.detail = nr; touch();
  if (!nr && !p.res && p.query) runRsp();
}

export async function togglePin(nr: string) {
  const p = rspPreview(); if (!p || !p.key) return;
  const j = judgeOf(get().current, p.key); j.urteile = j.urteile || [];
  const i = j.urteile.findIndex(u => u.nr === nr);
  if (i >= 0) j.urteile.splice(i, 1);
  else {
    const h = (p.res && p.res.hits.find(x => x.nr === nr)) || p.detailHit; if (!h) return;
    j.urteile.push({ ...pinRecord(h), zeile: true });
  }
  await saveCurrent();
}

/* ========================= Prüfung: Rechtsprechung je Prüfschritt ========================= */
export async function runPruefRsp(key: string, sid: string, fresh = false) {
  const a = get().current; const r = rowByKey(a, key); if (!r) return;
  const id = key + '#' + sid; const prev = get().pruefRsp[id] || {};
  const st = { ai: prev.ai || [], busy: true, note: prev.note || '' } as any;
  set({ pruefRsp: { ...get().pruefRsp, [id]: st } });
  const pr = pruefOf(a, r);
  const steps = pr ? (sid === '*' ? pr.schritte : pr.schritte.filter(s => s.id === sid)) : [];
  const queries = st.queries = pruefQueries(a, r, sid === '*' ? null : steps[0], st.ai);
  const azs = [...new Set(steps.flatMap(s => s.aktenzeichen || []))];
  const onCache = () => save(a);
  const [res, az] = await Promise.all([
    risMulti(a, queries, '', fresh, onCache).then(x => widenRsp(a, x, queries, '', fresh, onCache)).catch(e => ({ err: e })),
    Promise.all(azs.map(z => risFileNumber(a, z, fresh, onCache).then(x => ({ az: z, hits: x.hits, cached: x.cached }), e => ({ az: z, err: e.message }))))
  ]);
  if (get().pruefRsp[id] !== st) return;
  st.busy = false; st.az = az;
  if ((res as any).err) st.err = (res as any).err.message; else st.res = res;
  touch();
}

export async function aiPruefRsp(key: string, sid: string) {
  const r = rowByKey(get().current, key); if (!r) return;
  const id = key + '#' + sid;
  const st = { ...(get().pruefRsp[id] || {}), busy: true, err: null, note: 'KI schlägt Suchbegriffe vor …' };
  set({ pruefRsp: { ...get().pruefRsp, [id]: st } });
  try {
    const qs = await aiRspQueries(get().current, r);
    if (!qs.length) throw new Error('Die KI hat keine verwertbaren Suchbegriffe geliefert.');
    st.ai = qs; st.note = 'Ergänzt um KI-Suchbegriffe. Die Treffer stammen ausschließlich aus der amtlichen Datenbank.';
    await runPruefRsp(key, sid);
  } catch (e) { st.busy = false; st.note = ''; st.err = e.message; touch(); }
}

function findPruefHit(key: string, nr: string): RspHit | null {
  for (const [id, st] of Object.entries(get().pruefRsp)) if (id.startsWith(key + '#')) { const h = pruefHits(st).find(x => x.nr === nr); if (h) return h; }
  return null;
}

export async function toggleStepPin(key: string, sid: string, nr: string) {
  const j = judgeOf(get().current, key); j.urteile = j.urteile || [];
  let u = j.urteile.find(x => x.nr === nr);
  if (u) { u.zeile = isRowPin(u); u.schritte = u.schritte || []; }
  if (u && pinnedAt(u, sid)) {
    if (sid === '*') u.zeile = false; else u.schritte = u.schritte.filter(x => x !== sid);
    if (!u.zeile && !u.schritte.length) j.urteile.splice(j.urteile.indexOf(u), 1);
  } else {
    if (!u) { const h = findPruefHit(key, nr); if (!h) return; u = { ...pinRecord(h), zeile: false, schritte: [] }; j.urteile.push(u); }
    if (sid === '*') u.zeile = true; else u.schritte.push(sid);
  }
  await saveCurrent();
}

// Volltext / alle Treffer aus der Prüfung im Seitenpanel „Rechtsprechung“ öffnen
export function openRspFromPruef(key: string, sid: string, nr: string | null) {
  const st = get().pruefRsp[key + '#' + sid] || {};
  const p = get().preview;
  const back = p && p.kind === 'pruef' ? p.key : null;
  openRsp(key, nr, { query: (st.queries || []).join('; '), res: { hits: pruefHits(st), perQuery: st.res ? st.res.perQuery : [], cached: true } }, back);
}

// Geheftete Entscheidung öffnen (aus Übersicht oder Prüfung)
export function openPinned(key: string, nr: string) {
  const p = get().preview;
  if (p && p.kind === 'rsp' && p.key === key) { setRspDetail(nr); return; }
  openRsp(key, nr, null, p && p.kind === 'pruef' ? p.key : null);
}
