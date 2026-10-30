// Linke Spalte: Logo, „Neue Akte“, Aktenliste, Einstellungen
import { useApp, set } from '../../state/store';
import { newAkte, selectAkte } from '../../state/actions';
import { providerLabel } from '../../config/settings';
import { Logo } from './Logo';
import { Spinner } from './Icon';

export function Sidebar() {
  const s = useApp();
  const f = s.newForm;
  return (
    <aside className="side">
      <div className="brand"><Logo /><div><b>BGH Pro Max<span className="ver" style={{ display: 'inline' }}>3.1</span></b></div></div>
      <button className="new-btn" onClick={newAkte}>＋ Neue Akte</button>
      <div>
        {f && (
          <div className="new-form">
            {f.busy && <div className="busy small"><Spinner />{f.busy}</div>}
            {f.err && <><div className="form-msg">{f.err}</div><button className="btn-ghost" onClick={() => set({ newForm: null })}>Schließen</button></>}
          </div>
        )}
      </div>
      <div className="side-label">Akten</div>
      <div className="akten">
        {s.akten.length ? s.akten.map(a => (
          <button key={a.id} className={'akte-item' + (s.current && s.current.id === a.id ? ' active' : '')} onClick={() => selectAkte(a.id)}>
            <div className="az mono">{a.az}</div>
            <div className="parties">{a.klaeger} ./. {a.beklagter}</div>
            <div className="meta"><span>{a.docCount || 0} Dokumente</span><span>{a.analysis && a.analysis.rows.length ? 'analysiert' : 'nicht analysiert'}</span></div>
          </button>
        )) : <div className="small" style={{ padding: '8px 12px' }}>Noch keine Akten angelegt.</div>}
      </div>
      <div className="side-foot">
        <span><span className="dot-ok" />{providerLabel()}</span>
        <button onClick={() => set({ modal: 'settings' })}>Einstellungen</button>
      </div>
    </aside>
  );
}
