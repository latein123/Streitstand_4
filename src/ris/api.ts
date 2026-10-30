// Rechtsprechung – amtliche Schnittstelle des Bundes (NeuRIS). Kein Schlüssel nötig.
import type { Akte, RspHit, RspResult } from '../types';
import { RIS_DEFAULT } from '../config/rechtsprechung';
import { esc, lsGet, stripTags } from '../lib/util';

export const risBase = () => (lsGet('t9_ris') || RIS_DEFAULT).trim().replace(/\/+$/, '');
// Neuer Pfad laut Spezifikation (10/2026) zuerst, alter Pfad aus der Doku als Rückfall; der funktionierende wird gemerkt
const RIS_PATHS = ['/v1/rechtsprechung', '/v1/case-law'];
let risPath: string | null = null;
export const resetRisPath = () => { risPath = null; };
export const currentRisPath = () => risPath;

export async function risTry<T>(fn: (path: string) => Promise<T>): Promise<T> {
  const order = risPath ? [risPath, ...RIS_PATHS.filter(x => x !== risPath)] : RIS_PATHS;
  let last: Error;
  for (const path of order) {
    try { const r = await fn(path); risPath = path; return r; }
    catch (e) { last = e; if (!/HTTP (404|410)|abgeschaltet/.test(e.message)) throw e; }
  }
  throw last;
}

// Treffer-Ausschnitte: alles escapen, nur <mark> der API zulassen
export const snipHtml = (s: string) => esc(String(s || '').replace(/\s+/g, ' ').trim()).replace(/&lt;(\/?)mark&gt;/gi, '<$1mark>').replace(/&lt;[^&]*?&gt;/g, '');

export async function risFetch(path: string, params: Record<string, any> | null, asText = false): Promise<any> {
  const u = new URL(risBase() + path);
  Object.entries(params || {}).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') u.searchParams.set(k, v); });
  let r: Response;
  try { r = await fetch(u.toString(), { headers: { Accept: asText ? 'text/html' : 'application/json' } }); }
  catch {
    throw new Error('Rechtsprechungs-API nicht erreichbar (keine Verbindung oder vom Browser blockiert/CORS). Tipp: in den Einstellungen eine Proxy-Adresse eintragen.');
  }
  if (r.status === 410) throw new Error('Diese API-Version wurde abgeschaltet (HTTP 410).');
  if (r.status === 429) throw new Error('Zu viele Anfragen an die Rechtsprechungs-API – bitte kurz warten.');
  if (!r.ok) throw new Error('Rechtsprechungs-API: HTTP ' + r.status);
  return asText ? r.text() : r.json();
}

function normHit(it: any, tm: any[]): RspHit {
  return {
    nr: it.documentNumber || String(it['@id'] || '').split('/').pop(),
    ecli: it.ecli || '', gericht: it.courtName || it.courtType || '', spruch: it.judicialBody || '',
    datum: it.decisionDate || '', az: (it.fileNumbers || []).join(', '), art: it.documentType || '',
    titel: stripTags(it.titleLine || it.headline || (it.decisionName || []).join(', ')).replace(/^\((.*)\)$/, '$1'),
    kopf: stripTags(it.headline || ''),
    treffer: (tm || []).filter(t => t && t.text).slice(0, 2).map(t => ({ name: t.name || '', text: String(t.text).slice(0, 600) }))
  };
}

// Eine Suche; Ergebnisse werden in der Akte gespeichert → funktioniert danach auch offline.
// onCache: Akte wurde verändert und sollte gespeichert werden.
export async function risSearch(a: Akte, term: string, court: string, fresh: boolean, onCache: () => void) {
  a.risCache = a.risCache || {};
  const key = term.toLowerCase() + '|' + (court || '');
  if (!fresh && a.risCache[key]) return { ...a.risCache[key], cached: true };
  const j = await risTry(path => risFetch(path, { searchTerm: term, court, size: 8 }));
  const res = { total: j.totalItems ?? (j.member || []).length, hits: (j.member || []).map((m: any) => normHit(m.item || m, m.textMatches)), at: new Date().toISOString() };
  a.risCache[key] = res; onCache();
  return res;
}

// Mehrere kurze Suchen parallel, Treffer zusammenführen (mehrfach gefunden = weiter oben)
export async function risMulti(a: Akte, queries: string[], court: string, fresh: boolean, onCache: () => void): Promise<RspResult> {
  const res = await Promise.all(queries.map(q => risSearch(a, q, court, fresh, onCache).then(r => ({ q, r, e: null }), e => ({ q, r: null, e }))));
  if (res.every(x => x.e)) throw res[0].e;
  const all = new Map<string, RspHit>();
  res.forEach(({ q, r }) => r && r.hits.forEach((h: RspHit, i: number) => {
    const x = all.get(h.nr);
    if (x) { x.score += 10 - i; x.queries.push(q); if (!x.treffer.length) x.treffer = h.treffer; }
    else all.set(h.nr, { ...h, score: 10 - i, queries: [q] });
  }));
  const hits = [...all.values()].sort((a, b) => (b.queries.length - a.queries.length) || (b.score - a.score));
  return { hits, perQuery: res.map(x => ({ q: x.q, n: x.r ? x.r.total : null, err: x.e ? x.e.message : null })), cached: res.every(x => !x.r || x.r.cached) };
}

// Datenbestand ist noch klein: bei < 3 Treffern automatisch mit Einzelbegriffen (+ „Miete“) erweitern (ergänzt res)
export async function widenRsp(a: Akte, res: RspResult, queries: string[], court: string, fresh: boolean, onCache: () => void) {
  if (res.hits.length >= 3) return res;
  const words = [...new Set(queries.flatMap(q => q.replace(/"/g, '').split(/\s+/)).filter(w => w.length >= 5 && !/^(miete|mieter|mietminderung|vermieter)$/i.test(w)))].slice(0, 4);
  const wide = words.map(w => w + ' Miete').filter(w => !queries.includes(w));
  if (!wide.length) return res;
  try {
    const more = await risMulti(a, wide, court, fresh, onCache);
    const have = new Set(res.hits.map(h => h.nr));
    more.hits.filter(h => !have.has(h.nr)).forEach(h => res.hits.push({ ...h, erweitert: true }));
    res.perQuery.push(...more.perQuery.map(x => ({ ...x, erweitert: true })));
  } catch { /* Erweiterung ist optional */ }
  return res;
}

// Im Skript genanntes Aktenzeichen über die API verifizieren (nur exakte Übereinstimmung zählt)
export async function risFileNumber(a: Akte, az: string, fresh: boolean, onCache: () => void) {
  a.risCache = a.risCache || {};
  const key = 'az:' + az.toLowerCase();
  if (!fresh && a.risCache[key]) return { ...a.risCache[key], cached: true };
  const j = await risTry(path => risFetch(path, { fileNumber: az, size: 5 }));
  const n = (s: string) => String(s || '').replace(/\s+/g, '').toLowerCase();
  const hits = (j.member || []).map((m: any) => normHit(m.item || m, m.textMatches)).filter((h: RspHit) => h.az.split(',').some(x => n(x) === n(az)));
  const res = { hits, at: new Date().toISOString() };
  a.risCache[key] = res; onCache();
  return res;
}

// Volltext einer Entscheidung, bereinigt (keine Skripte, Styles, Formulare)
const risHtmlCache = new Map<string, string>();
function cleanHtml(html: string) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script,style,link,meta,iframe,object,embed,form,img,svg,base').forEach(n => n.remove());
  doc.querySelectorAll('*').forEach(el => [...el.attributes].forEach(at => {
    if (/^on/i.test(at.name) || at.name === 'style' || at.name === 'class' || at.name === 'id') el.removeAttribute(at.name);
    else if ((at.name === 'href' || at.name === 'src') && /^\s*(javascript|data):/i.test(at.value)) el.removeAttribute(at.name);
  }));
  doc.querySelectorAll('a[href]').forEach((x: HTMLAnchorElement) => { const h = x.getAttribute('href'); if (h.startsWith('/')) x.setAttribute('href', risBase() + h); x.target = '_blank'; x.rel = 'noopener'; });
  return doc.body.innerHTML;
}
export async function risDocHtml(nr: string) {
  if (!risHtmlCache.has(nr)) risHtmlCache.set(nr, cleanHtml(await risTry(path => risFetch(`${path}/${encodeURIComponent(nr)}.html`, null, true))));
  return risHtmlCache.get(nr);
}
export const risDocUrl = (nr: string) => `${risBase()}${risPath || RIS_PATHS[0]}/${encodeURIComponent(nr)}.html`;
