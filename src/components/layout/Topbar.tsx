// Kopfzeile mit Rubrum, Werkzeugen und Menü „⋯“
import { useEffect, useRef } from 'react';
import { useApp, set } from '../../state/store';
import { analyze, closePreview, deleteCurrent, exportAkte, importAkte, openRsp, rescan, setOptGroup, toggleVerfahren } from '../../state/actions';
import { RULES } from '../../config/regelmodell';
import { Icon } from './Icon';

function Menu() {
  const s = useApp(); const a = s.current; const rules = RULES[a.verfahren];
  const close = (fn: () => void) => () => { set({ menu: false }); fn(); };
  const opt = rules.groups.filter(g => g.optional);
  return (
    <div className="menu" role="menu">
      <button disabled={!!s.busy} onClick={close(rescan)}>Ordner neu einlesen</button>
      <button disabled={!a.analysis} onClick={close(exportAkte)}>Analyse exportieren (JSON)</button>
      <button onClick={close(importAkte)}>Analyse importieren …</button>
      <button onClick={close(() => set({ modal: 'rubrum' }))}>Rubrum bearbeiten …</button>
      <button onClick={close(toggleVerfahren)}>Verfahrensart: {rules.label} – umstellen</button>
      {opt.length > 0 && <>
        <hr /><div className="menu-h">Bei der nächsten Analyse einbeziehen</div>
        {opt.map(g => (
          <label key={g.id} className="menu-check">
            <input type="checkbox" checked={(a.optGroups || []).includes(g.id)} onChange={e => setOptGroup(g.id, e.target.checked)} /> {g.titel}
          </label>
        ))}
      </>}
      <hr />
      <button className="danger" style={{ color: 'var(--red)' }} onClick={close(() => set({ confirmDelete: true }))}>Akte entfernen</button>
    </div>
  );
}

export function Topbar() {
  const s = useApp(); const a = s.current;
  const docsOk = !!s.docs;
  const moreRef = useRef<HTMLDivElement>(null);

  // Menü schließt sich bei jedem Klick außerhalb
  useEffect(() => {
    if (!s.menu) return;
    const onDown = (e: MouseEvent) => { if (moreRef.current && !moreRef.current.contains(e.target as Node)) set({ menu: false }); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [s.menu]);

  return (
    <div className="topbar">
      <button className="tb icon show-side" title="Aktenliste einblenden" onClick={closePreview}>☰</button>
      <div className="rubrum"><span className="az-chip mono">{a.az}</span>
        <h1>{a.klaeger}<span className="vs">./.</span>{a.beklagter}</h1></div>
      <div className="toolbar">
        {s.confirmDelete ? <>
          <span className="small">Akte wirklich entfernen?</span>
          <button className="tb danger" onClick={deleteCurrent}>Ja, entfernen</button>
          <button className="tb" onClick={() => set({ confirmDelete: false })}>Abbrechen</button>
        </> : <>
          <button className="tb" disabled={!docsOk} onClick={() => set({ showDocs: !s.showDocs })}>{s.showDocs ? 'Dokumente ausblenden' : 'Dokumente · ' + (s.docs ? s.docs.size : 0)}</button>
          <button className="tb" title="Freie Suche in der amtlichen Rechtsprechungsdatenbank" onClick={() => openRsp(null)}><Icon name="scales" /> Rechtsprechung</button>
          <button className="tb" disabled={!a.analysis} title="Druckbare Gliederung für die Entscheidungsgründe – ohne KI-Würdigung" onClick={() => set({ modal: 'geruest' })}>Begründungsgerüst</button>
          <button className="tb primary" disabled={!!(s.busy || s.reading || !docsOk)} onClick={analyze}>{a.analysis ? '↻ Neu analysieren' : '▶ Streitstand analysieren'}</button>
          <div className="more" ref={moreRef}>
            <button className="tb icon" title="Weitere Aktionen" aria-haspopup="true" aria-expanded={s.menu} onClick={() => set({ menu: !s.menu })}>⋯</button>
            {s.menu && <Menu />}
          </div>
        </>}
      </div>
    </div>
  );
}
