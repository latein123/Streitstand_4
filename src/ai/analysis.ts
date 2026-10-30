// KI-Analyse des Streitstands: Prompts verschicken, Antworten prüfen (Anker-Wächter), Zeilen bauen
import type { Akte, Antrag, Beweis, Discarded, Docs, Gruppe, Merkmal, Row } from '../types';
import { RULES } from '../config/regelmodell';
import { ANTRAEGE } from '../config/antraege';
import { MITTEL, STATUS } from '../config/status';
import { activeProvider, providerLabel } from '../config/settings';
import { analysisText, readState } from '../lib/docText';
import { docSide } from '../lib/docSide';
import { pool } from '../lib/util';
import { antraegePrompt, docBlock, gruppePrompt, merkmalPrompt, paketPrompt, zusatzPrompt } from './prompts';
import { ask, callLLM } from './llm';
import { dedupe, matchMerkmal, rowSig, sim, verifyItem, type DocWithText } from './verify';

export interface AnalysisCtx {
  docs: Docs;
  readAll: () => Promise<void>;          // alle Dokumente einmal lesen (Textebene/OCR)
  onProgress: (msg: string, partialRows?: Row[]) => void;
}

const HARD = ['not_granted', 'sampling_disabled', 'session_expired', 'unavailable'];

export async function runAnalysis(akte: Akte, ctx: AnalysisCtx) {
  const rules = RULES[akte.verfahren];
  const side = (id: string) => docSide(ctx.docs, akte, id);
  const docTexts: DocWithText[] = [], skipped: string[] = [];
  ctx.onProgress('Dokumente werden gelesen …');
  await ctx.readAll();
  for (const d of ctx.docs.values()) {
    const at = readState(d) || await analysisText(d, m => ctx.onProgress(m));
    if (at.lines.length) docTexts.push({ d, at }); else skipped.push(`${d.id} (${d.title})`);
  }
  const docs = docTexts.map(x => docBlock(x.d, x.at, side(x.d.id))).join('\n\n');
  const model = providerLabel();
  // Optionale Gruppen nur auf Wunsch; Merkmale mit „nurWenn“ nur, wenn die Akte dazu etwas enthält
  const groups: Gruppe[] = rules.groups.filter(g => !g.optional || (akte.optGroups || []).includes(g.id))
    .map(g => ({ ...g, merkmale: g.merkmale.filter(m => !m.nurWenn || m.nurWenn.test(docs)) })).filter(g => g.merkmale.length);
  const jobs = groups.flatMap(g => g.merkmale.map(m => ({ g, m })));
  const rows: Row[] = [], discarded: Discarded[] = [], errors: string[] = [], failed = new Set<string>();
  const order = jobs.map(j => j.m.id);
  const sortRows = (list: Row[]) => list.sort((a, b) => {
    const ia = order.indexOf(a.merkmal), ib = order.indexOf(b.merkmal);
    return ((ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib)) || a.instanz.localeCompare(b.instanz);
  });
  let doneG = 0;
  const progress = () => ctx.onProgress(`KI-Analyse läuft: ${doneG} von ${groups.length} Prüfungsgruppen erfasst (${model}) …`, sortRows(rows.slice()));
  const hasVortrag = (z: any) => z.status !== 'nicht_vorgetragen' && ((z.klaeger || []).length + (z.beklagter || []).length);

  const take = (g: Gruppe, m: Merkmal | null, z: any) => {
    const label = m ? m.label : (String(z.merkmal || z.titel || '').trim() || 'Weiterer streitiger Punkt');
    const inst = m && m.multi ? String(z.instanz || '').trim() : '';
    const c = { merkmal: label, instanz: inst };
    const mk = (arr: any[], partei: string) => dedupe((arr || []).map(it => verifyItem(it, docTexts, { ...c, partei }, discarded)).filter(Boolean));
    const proof = dedupe((z.beweisangebote || []).map((b: any) => {
      const v = verifyItem(b, docTexts, { ...c, partei: 'Beweis ' + (b.partei || '') }, discarded);
      return v ? { ...v, partei: b.partei === 'beklagter' ? 'beklagter' : 'klaeger', mittel: MITTEL[b.mittel] ? b.mittel : 'urkunde' } : null;
    }).filter(Boolean) as Beweis[], true);
    // Vortrag aus Schriftsätzen deterministisch der richtigen Seite zuordnen
    const kl = mk(z.klaeger, 'Kläger'), bk = mk(z.beklagter, 'Beklagter');
    const move = (from: any[], to: any[], s: string) => { for (let i = from.length - 1; i >= 0; i--) if (side(from[i].dok) === s) to.push(...from.splice(i, 1)); };
    move(kl, bk, 'beklagter'); move(bk, kl, 'klaeger');
    let key = g.id + '|' + (m ? m.id : 'SONST:' + label.toLowerCase()) + '|' + inst.toLowerCase().replace(/\s+/g, ' ');
    for (let n = 2; rows.some(r => r.key === key); n++) key = key.replace(/#\d+$/, '') + '#' + n;
    rows.push({
      key, gid: g.id, merkmal: m ? m.id : 'SONST', label, norm: m ? m.norm : '', instanz: inst,
      last: m ? m.last : null, lastText: m ? m.lastText : null, verify: m ? !!m.verify : false,
      klaeger: dedupe(kl), beklagter: dedupe(bk), beweis: proof,
      status: STATUS[z.status] ? z.status : 'offen', begruendung: z.begruendung || ''
    });
  };
  // Einzelabfrage je Merkmal – nur noch als Rückfall, wenn der Aufruf für eine ganze Gruppe scheitert
  const runJob = async ({ g, m }: { g: Gruppe; m: Merkmal }, instanzen?: string[] | null) => {
    try {
      const json = await ask(merkmalPrompt(akte, rules, m, docs, instanzen));
      (json.zeilen || []).forEach((z: any) => take(g, m, z));
    } catch (e) { failed.add(m.id); errors.push(`${m.label}: ${e.message}`); }
  };
  const runZusatz = async () => {
    try {
      const json = await ask(zusatzPrompt(akte, rules, docs));
      const g = groups[groups.length - 1];
      (json.zeilen || []).filter(hasVortrag).slice(0, 4).forEach((z: any) => take(g, null, z));
    } catch (e) { errors.push('Weitere Streitpunkte: ' + e.message); }
  };
  const runGroup = async (g: Gruppe, isLast: boolean) => {
    let json = null;
    try { json = await ask(gruppePrompt(akte, rules, g, docs, isLast)); }
    catch (e) { if ([...HARD, 'auth'].includes(e.code)) { g.merkmale.forEach(m => { failed.add(m.id); errors.push(`${m.label}: ${e.message}`); }); doneG++; progress(); return; } }
    if (json && Array.isArray(json.zeilen)) {
      let extra = 0;
      json.zeilen.forEach((z: any) => {
        const m = matchMerkmal(g, z.merkmal);
        if (m) take(g, m, z);
        else if (isLast && extra < 4 && hasVortrag(z)) { extra++; take(g, null, z); }
      });
    } else {
      // Rückfall: Merkmale dieser Gruppe einzeln abfragen (erstes "je Mangel"-Merkmal legt die Mängel fest)
      const own = g.merkmale.map(m => ({ g, m })), first = own.find(j => j.m.multi);
      let inst: string[] | null = null;
      if (first) { await runJob(first); inst = [...new Set(rows.filter(r => r.merkmal === first.m.id).map(r => r.instanz).filter(Boolean))]; }
      await pool(own.filter(j => j !== first).map(j => () => runJob(j, j.m.multi ? inst : null)), 3);
      if (isLast) await runZusatz();
    }
    doneG++; progress();
  };

  // Anträge der Parteien (mit Fundstelle, über den Anker-Wächter geprüft); scheitert der Aufruf, leitet die Übersicht sie ab
  let antraege: Antrag[] | null = null;
  const typen = new Set([...(ANTRAEGE[akte.verfahren] || []).map(t => t.typ), 'ABWEISUNG', 'SONST']);
  const seen = new Set<string>();
  const antrag = (x: any): Antrag | null => {
    const partei = x.partei === 'beklagter' ? 'beklagter' : 'klaeger';
    const v = verifyItem(x, docTexts, { merkmal: 'Antrag', instanz: String(x.nr || ''), partei: partei === 'klaeger' ? 'Kläger' : 'Beklagter' }, discarded);
    if (!v) return null;
    const typ = typen.has(x.typ) ? x.typ : 'SONST';
    const sig = partei + '|' + typ + '|' + (typ === 'SONST' ? v.kurz.toLowerCase() : '') + '|' + !!x.hilfsweise;
    if (seen.has(sig)) return null; seen.add(sig);
    return { ...v, nr: String(x.nr || '').trim(), partei, typ, hilfsweise: !!x.hilfsweise };
  };
  const runAntraege = async () => {
    try {
      const json = await ask(antraegePrompt(akte, rules, docs));
      antraege = (json.antraege || []).map(antrag).filter(Boolean);
    } catch { antraege = null; }
  };

  // Claude bedient nur etwa zwei Aufrufe gleichzeitig: Gruppen und Anträge auf zwei gleich große Pakete verteilen,
  // jede fertige Zeile sofort übernehmen; nur was ein abgebrochenes Paket nicht geliefert hat, wird einzeln nachgeholt
  const runPaket = async ({ gs, mitAntraegen }: { gs: Gruppe[]; mitAntraegen: boolean }) => {
    const mitZusatz = gs.includes(groups[groups.length - 1]);
    let extra = 0, err = null, truncated = false;
    if (mitAntraegen) antraege = antraege || [];
    const onLine = (z: any) => {
      if (z.antrag) { if (mitAntraegen) { const v = antrag(z); if (v) antraege.push(v); } return; }
      for (const g of gs) { const m = matchMerkmal(g, z.merkmal); if (m) { take(g, m, z); progress(); return; } }
      if (mitZusatz && extra < 4 && hasVortrag(z)) { extra++; take(groups[groups.length - 1], null, z); progress(); }
    };
    try { truncated = (await callLLM(paketPrompt(akte, rules, gs, docs, mitZusatz, mitAntraegen), { onLine })).truncated; }
    catch (e) { err = e; }
    if (err && HARD.includes(err.code)) {
      gs.forEach(g => g.merkmale.forEach(m => { failed.add(m.id); errors.push(`${m.label}: ${err.message}`); }));
    } else if (err || truncated) {
      // Nachholen: nur Merkmale ohne Zeile, „je Mangel“-Merkmale mit den schon erkannten Mängeln
      const inst = [...new Set(rows.filter(r => gs.some(g => g.merkmale.some(m => m.multi && m.id === r.merkmal))).map(r => r.instanz).filter(Boolean))];
      const missing = gs.flatMap(g => g.merkmale.filter(m => !rows.some(r => r.merkmal === m.id)).map(m => ({ g, m })));
      await pool(missing.map(j => () => runJob(j, j.m.multi && inst.length ? inst : null)), 2);
      if (mitAntraegen && !antraege.length) await runAntraege();
    }
    doneG += gs.length; progress();
  };
  const pakete = () => {
    const weight = (g: Gruppe) => g.merkmale.reduce((n, m) => n + (m.multi ? 2 : 1), 0);
    const p = [{ gs: [] as Gruppe[], w: 3, mitAntraegen: true }, { gs: [] as Gruppe[], w: 0, mitAntraegen: false }];
    [...groups].sort((a, b) => weight(b) - weight(a)).forEach(g => { const t = p[0].w <= p[1].w ? p[0] : p[1]; t.gs.push(g); t.w += weight(g); });
    p.forEach(x => x.gs.sort((a, b) => groups.indexOf(a) - groups.indexOf(b)));
    return p.filter(x => x.gs.length || x.mitAntraegen);
  };

  progress();
  if (activeProvider() === 'claude') await pool(pakete().map(x => () => runPaket(x)), 2);
  else {
    // OpenRouter verträgt alle Prüfungsgruppen gleichzeitig
    const tasks = [...groups.map((g, i) => () => runGroup(g, i === groups.length - 1)), runAntraege];
    await pool(tasks, tasks.length);
  }

  // Ist jeder Aufruf gescheitert, nichts speichern – eine frühere Analyse bleibt erhalten
  if (failed.size === jobs.length) {
    const reasons = [...new Set(errors.map(x => x.slice(x.indexOf(': ') + 2)))];
    throw new Error(reasons.join(' / '));
  }
  // Jedes Merkmal des Regelmodells erhält eine Zeile – auch wenn die KI nichts gefunden hat
  for (const { g, m } of jobs) if (!failed.has(m.id) && !rows.some(r => r.merkmal === m.id)) rows.push({
    key: g.id + '|' + m.id + '|', gid: g.id, merkmal: m.id, label: m.label, norm: m.norm, instanz: '', last: m.last, lastText: m.lastText, verify: !!m.verify,
    klaeger: [], beklagter: [], beweis: [], status: 'nicht_vorgetragen', begruendung: 'Die Analyse hat zu diesem Merkmal keine Fundstelle ermittelt – bitte selbst prüfen.' });

  // Ohne Klageerwiderung gibt es kein Zugestehen (§ 288 ZPO) und kein Nichtbestreiten (§ 138 Abs. 3 ZPO)
  if (!docTexts.some(x => side(x.d.id) === 'beklagter')) rows.forEach(r => {
    if (r.status !== 'nicht_vorgetragen') { r.status = 'offen'; r.begruendung = 'Noch keine Klageerwiderung – die Einlassung der beklagten Partei steht aus.'; }
  });

  // Reihenfolge gemäß Regelmodell, weitere Streitpunkte am Ende
  sortRows(rows);
  rows.forEach(r => { if (r.merkmal === 'SONST') r.gid = 'GX'; });

  // Änderungen gegenüber der vorherigen Analyse markieren; Prüfvermerke wandern mit
  const newDocs = akte.newDocs || [];
  if (akte.analysis) {
    const prevRows = akte.analysis.rows.slice(); akte.judge = akte.judge || {};
    rows.forEach(r => {
      let best: Row = null, bestSim = 0;
      prevRows.forEach(p => { if (p.merkmal !== r.merkmal || (r.merkmal === 'SONST' && p.label !== r.label && sim(p.label, r.label) < 0.4)) return; const s = sim(p.instanz, r.instanz); if (s > bestSim) { bestSim = s; best = p; } });
      if (best && bestSim >= 0.25) {
        prevRows.splice(prevRows.indexOf(best), 1);
        r.change = rowSig(best) !== rowSig(r) ? 'geaendert' : null;
        if (best.key !== r.key && akte.judge[best.key] && !akte.judge[r.key]) { akte.judge[r.key] = akte.judge[best.key]; delete akte.judge[best.key]; }
      } else r.change = 'neu';
    });
  }
  rows.forEach(r => { r.citesNew = [...r.klaeger, ...r.beklagter, ...r.beweis].some(i => newDocs.includes(i.dok)); });
  akte.analysis = { rows, antraege, discarded, errors, skipped, model, at: new Date().toISOString(), docIds: docTexts.map(x => x.d.id) };
  akte.newDocs = [];
}
