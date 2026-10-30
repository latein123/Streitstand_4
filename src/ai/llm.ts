// KI-Anbieter: OpenRouter (Schlüssel in den Einstellungen) oder Claude (nur innerhalb von Claude-Artefakten verfügbar)
import { SYSTEM_PROMPT } from './prompts';
import { activeProvider, orModel, providerPref, providerState, tierOf } from '../config/settings';
import { codedError, lsGet } from '../lib/util';

export interface LlmOpts { onLine?: (o: any) => void }

// Hinweise, die während eines Aufrufs entstehen (z. B. Ausweichen auf Claude), sammelt der Store ein
export const llmNotices: { push: (msg: string) => void } = { push: () => {} };

/* ---------- Claude (window.claude, nur im Claude-Artefakt) ---------- */
declare global { interface Window { claude?: { use: (cap: string) => Promise<any> } } }

let sampleFn: any;
async function getSample() {
  if (sampleFn === undefined) sampleFn = window.claude && window.claude.use ? await window.claude.use('sample') : null;
  return sampleFn;
}
const SAMPLE_MSG: Record<string, string> = {
  not_granted: 'Die Nutzung von Claude wurde für diese Seite nicht erlaubt. Seite neu laden und beim Analysieren zustimmen.',
  rate_limited: 'Gerade laufen zu viele Anfragen. Bitte in einer Minute erneut analysieren.',
  prompt_too_large: 'Die Akte ist für eine einzelne Anfrage zu umfangreich.',
  sampling_disabled: 'Claude ist für dieses Konto hier nicht verfügbar.',
  session_expired: 'Die Sitzung ist abgelaufen. Bitte die Seite neu laden.',
  invalid_json: 'Claude hat keine auswertbare Antwort geliefert.',
  empty_completion: 'Claude hat keine Antwort geliefert.'
};
// Antworten 24 h zwischenspeichern: eine unveränderte Akte wird sofort wiedergegeben, ohne erneuten Verbrauch
const CLAUDE_CACHE = { gcTime: 86400000 };
export const claudeOpts = { refresh: false };

// opts.onLine: Antwort als JSON Lines streamen und jedes fertige Objekt sofort weitergeben; liefert {lines, truncated}
async function callClaude(prompt: string, opts: LlmOpts = {}): Promise<any> {
  const sample = await getSample();
  if (!sample) throw codedError('Claude ist in dieser Ansicht nicht verfügbar. Bitte in den Einstellungen einen OpenRouter-Schlüssel hinterlegen.', 'unavailable');
  const base = { modelTier: tierOf(), cache: claudeOpts.refresh ? { ...CLAUDE_CACHE, refresh: true } : CLAUDE_CACHE };
  let lines = 0;
  try {
    if (!opts.onLine) return await sample.json(SYSTEM_PROMPT + '\n\n' + prompt, base);
    let pending = '';
    const eat = (raw: string) => {
      const t = raw.trim().replace(/^```(?:json)?/i, '').replace(/,$/, '').trim();
      if (!t.startsWith('{')) return;
      let o; try { o = JSON.parse(t); } catch { return; }
      lines++; opts.onLine(o);
    };
    const { text, truncated } = await sample(SYSTEM_PROMPT + '\n\n' + prompt, { ...base, onText: ({ delta }: { delta: string }) => {
      const parts = (pending + delta).split('\n'); pending = parts.pop(); parts.forEach(eat);
    } });
    eat(pending);
    // Hat das Modell statt Zeilen doch einen einzigen JSON-Block geschrieben, diesen auswerten
    if (!lines) {
      const a = text.indexOf('{'), b = text.lastIndexOf('}');
      try { const j = JSON.parse(text.slice(a, b + 1)); [...(j.zeilen || []), ...(j.antraege || []).map((x: any) => ({ ...x, antrag: true }))].forEach(o => { lines++; opts.onLine(o); }); } catch { /* unten */ }
    }
    if (!lines) throw { code: 'invalid_json' };
    return { lines, truncated };
  } catch (err) { throw codedError(SAMPLE_MSG[err && err.code] || (err && err.message) || 'Unbekannter Fehler', err && err.code, { lines }); }
}

/* ---------- OpenRouter ---------- */
// Schlüssel bereinigen: ganze .env-Zeile, Anführungszeichen, Leerzeichen/Zeilenumbrüche (z. B. aus PDF kopiert)
export function cleanKey(raw: string) {
  const s = String(raw || '').replace(/\s+/g, '');
  const m = s.match(/sk-or-[A-Za-z0-9_-]+/);
  return m ? m[0] : s.replace(/^.*=/, '').replace(/^["']|["']$/g, '');
}
export function parseEnvKey(text: string) {
  for (const line of String(text).split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?OPENROUTER_API_KEY\s*=\s*(.+?)\s*$/);
    if (m) return m[1].replace(/^["']|["']$/g, '').trim() || null;
  }
  const bare = String(text).match(/sk-or-[A-Za-z0-9_-]{20,}/);
  return bare ? bare[0] : null;
}

export async function callOpenRouter(model: string, prompt: string, keyOverride?: string) {
  const key = cleanKey(keyOverride || lsGet('t9_key'));
  if (!key) throw codedError('Kein OpenRouter-Schlüssel hinterlegt (Einstellungen).', 'auth');
  let r: Response;
  try {
    r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json', 'X-Title': 'BGH Pro Max' },
      // Ohne "reasoning: enabled false" verbraucht Haiku das Token-Limit mit Nachdenken und liefert leeren Text
      body: JSON.stringify({ model, temperature: 0, max_tokens: 16000, reasoning: { enabled: false }, messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: prompt }] })
    });
  } catch { throw codedError('OpenRouter ist von dieser Seite aus nicht erreichbar.', 'network'); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.choices) {
    const m = (j.error && j.error.message) || ('HTTP ' + r.status);
    if (r.status === 401) throw codedError('OpenRouter-Schlüssel ungültig oder abgelaufen (' + m + ')', 'auth');
    if (r.status === 402 || r.status === 403 || /limit exceeded|insufficient credits/i.test(m)) throw codedError('OpenRouter-Kontingent erschöpft (' + m + ')', 'quota');
    throw codedError('OpenRouter: ' + m, r.status === 429 ? 'rate_limited' : 'openrouter');
  }
  let t: string = j.choices[0].message.content || '';
  t = t.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  try { return JSON.parse(t.slice(a, b + 1)); }
  catch { throw codedError('Die KI hat keine auswertbare Antwort geliefert.', 'invalid_json'); }
}

/* ---------- Einstieg ---------- */
export async function callLLM(prompt: string, opts?: LlmOpts): Promise<any> {
  if (activeProvider() === 'openrouter') {
    try { return await callOpenRouter(orModel(), prompt); }
    catch (e) {
      // Aufgebrauchtes Kontingent: immer auf Claude ausweichen; nicht erreichbar: nur im Automatik-Modus
      if (e.code === 'quota') { providerState.orBlocked = true; llmNotices.push('OpenRouter-Kontingent erschöpft – die Analyse läuft über Claude.'); }
      else if (e.code === 'network' && providerPref() === 'auto') { providerState.orBlocked = true; llmNotices.push('OpenRouter ist in dieser Ansicht nicht erreichbar – die Analyse läuft über Claude.'); }
      else throw e;
    }
  }
  return callClaude(prompt, opts);
}

// Endgültige Fehler nicht wiederholen; alles andere (z. B. abgeschnittenes JSON) einmal neu anfragen
export const FATAL = ['not_granted', 'sampling_disabled', 'session_expired', 'unavailable', 'prompt_too_large', 'not_declared', 'auth', 'network'];
export async function ask(prompt: string) {
  try { return await callLLM(prompt); }
  catch (e) {
    if (FATAL.includes(e.code)) throw e;
    if (e.code === 'rate_limited') await new Promise(r => setTimeout(r, 8000));
    return callLLM(prompt + '\n\nAntworte ausschließlich mit gültigem, vollständigem JSON.');
  }
}
