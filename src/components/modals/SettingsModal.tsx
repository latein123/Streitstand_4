// Einstellungen: KI-Anbieter, OpenRouter-Schlüssel und -Modell, Rechtsprechungs-API
import { useState } from 'react';
import { saveSettings } from '../../state/actions';
import { MODELS, PROVIDERS, TIERS, orModel, providerPref, tierOf } from '../../config/settings';
import { RIS_DEFAULT } from '../../config/rechtsprechung';
import { callOpenRouter, cleanKey, parseEnvKey } from '../../ai/llm';
import { currentRisPath, resetRisPath, risBase, risFetch, risTry } from '../../ris/api';
import { lsGet, lsSet } from '../../lib/util';
import { Modal, closeModal } from './Modal';

type Msg = { text: string; cls?: 'ok' | 'err' };
const color = (m: Msg) => ({ color: m.cls === 'ok' ? 'var(--green)' : m.cls === 'err' ? 'var(--red)' : 'var(--muted)' });

export function SettingsModal() {
  const [provider, setProvider] = useState(providerPref());
  const [tier, setTier] = useState(tierOf());
  const [key, setKey] = useState(lsGet('t9_key') || '');
  const [model, setModel] = useState(orModel());
  const [ris, setRis] = useState(risBase());
  const [msg, setMsg] = useState<Msg>({ text: '' });
  const [risMsg, setRisMsg] = useState<Msg>({ text: '' });

  const loadEnv = () => {
    const inp = document.createElement('input'); inp.type = 'file';
    inp.onchange = async () => {
      const f = inp.files[0]; if (!f) return;
      const k = parseEnvKey(await f.text());
      if (k) { setKey(k); setMsg({ text: `✓ Schlüssel aus „${f.name}“ übernommen. Jetzt „OpenRouter prüfen“ oder „Speichern“.`, cls: 'ok' }); }
      else setMsg({ text: `In „${f.name}“ wurde keine Zeile OPENROUTER_API_KEY=… gefunden.`, cls: 'err' });
    };
    inp.click();
  };
  const testOr = async () => {
    const k = cleanKey(key); if (!k) { setMsg({ text: 'Bitte zuerst einen Schlüssel eintragen oder laden.', cls: 'err' }); return; }
    setMsg({ text: 'Verbindung wird geprüft …' });
    try { await callOpenRouter(model, 'Antworte nur mit {"ok":true}', k); setMsg({ text: '✓ OpenRouter erreichbar, Schlüssel gültig.', cls: 'ok' }); }
    catch (e) {
      if (e.code === 'invalid_json') setMsg({ text: '✓ OpenRouter erreichbar, Schlüssel gültig.', cls: 'ok' });
      else setMsg({ text: '✗ ' + e.message, cls: 'err' });
    }
  };
  const testRis = async () => {
    const old = lsGet('t9_ris');
    lsSet('t9_ris', ris.trim() || RIS_DEFAULT); setRisMsg({ text: 'Verbindung wird geprüft …' });
    try {
      resetRisPath();
      const j = await risTry(path => risFetch(path, { searchTerm: 'Mietminderung', size: 1 }));
      setRisMsg({ text: `✓ Erreichbar – ${j.totalItems ?? '?'} Entscheidungen zu „Mietminderung“ (Pfad ${currentRisPath()}).`, cls: 'ok' });
    } catch (e) { setRisMsg({ text: '✗ ' + e.message, cls: 'err' }); }
    finally { lsSet('t9_ris', old || ''); }
  };
  const save = () => saveSettings({ ris, risDefault: RIS_DEFAULT, provider, tier, key: cleanKey(key), model });

  return (
    <Modal title="Einstellungen">
      <label htmlFor="mProv">KI-Anbieter</label>
      <select id="mProv" value={provider} onChange={e => setProvider(e.target.value)}>
        {Object.entries(PROVIDERS).map(([k, v]) => <option key={k} value={k}>{k === 'auto' ? 'automatisch – OpenRouter, wenn ein Schlüssel hinterlegt ist, sonst Claude' : v}</option>)}
      </select>
      <label htmlFor="mTier">Claude: Analyse-Stufe</label>
      <select id="mTier" value={tier} onChange={e => setTier(e.target.value)}>
        {Object.entries(TIERS).map(([k, v]) => <option key={k} value={k}>{v}{k === 'quick' ? ' (Standard)' : ' (deutlich länger)'}</option>)}
      </select>
      <label htmlFor="mKey">OpenRouter-API-Schlüssel</label>
      <div style={{ display: 'flex', gap: 6 }}>
        <input id="mKey" type="password" value={key} placeholder="sk-or-…" style={{ flex: 1 }} onChange={e => setKey(e.target.value)} />
        <button className="tb" type="button" onClick={loadEnv}>Aus .env-Datei laden …</button>
      </div>
      <p className="small" style={{ margin: '6px 0 0' }}>Die Datei liegt unter <i>Tool - OpenRouter für LLM Nutzung / openrouter-example / .env</i>. Sie ist versteckt: Im Windows-Dateidialog den Dateinamen <b>.env</b> direkt eintippen, am Mac <b>Cmd + Shift + Punkt</b>.</p>
      <div className="small" style={{ marginTop: 8, minHeight: 18, ...color(msg) }}>{msg.text}</div>
      <label htmlFor="mModel">OpenRouter-Modell</label>
      <select id="mModel" value={model} onChange={e => setModel(e.target.value)}>{MODELS.map(m => <option key={m}>{m}</option>)}</select>
      <label htmlFor="mRis">Rechtsprechungs-API (amtliche Datenbank, kein Schlüssel nötig)</label>
      <div style={{ display: 'flex', gap: 6 }}>
        <input id="mRis" value={ris} placeholder={RIS_DEFAULT} style={{ flex: 1 }} onChange={e => setRis(e.target.value)} />
        <button className="tb" type="button" onClick={testRis}>API testen</button>
      </div>
      <div className="small" style={{ marginTop: 6, minHeight: 16, ...color(risMsg) }}>{risMsg.text}</div>
      <p className="small">In der lokalen App läuft die Analyse über OpenRouter (Schlüssel nötig). Claude ist nur verfügbar, wenn die App als Claude-Artefakt geöffnet wird. Der Schlüssel wird nur in diesem Browser gespeichert. Die Dokumente werden an den gewählten Anbieter gesendet – nur synthetische Übungsakten verwenden.</p>
      <div className="actions">
        <button className="tb" type="button" onClick={testOr}>OpenRouter prüfen</button><span style={{ flex: 1 }} />
        <button className="tb" onClick={closeModal}>Abbrechen</button>
        <button className="tb primary" onClick={save}>Speichern</button>
      </div>
    </Modal>
  );
}
