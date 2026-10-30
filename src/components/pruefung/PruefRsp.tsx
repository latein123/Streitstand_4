// Rechtsprechung je Prüfschritt (bzw. '*' = ganzes Merkmal): Suchknöpfe, Treffer, geheftete Entscheidungen
import type { Row, RspHit } from '../../types';
import { useApp } from '../../state/store';
import { aiPruefRsp, openRspFromPruef, runPruefRsp, toggleStepPin } from '../../state/actions';
import { pinnedAt, pinsOf } from '../../lib/derive';
import { risDocUrl } from '../../ris/api';
import { pruefHits } from '../../ris/queries';
import { Icon, Spinner } from '../layout/Icon';
import { PinChip } from '../streit/ItemButton';
import { HitBody, HitMeta, PerQuery } from '../preview/RspPanel';

export function PinChips({ r, sid }: { r: Row; sid: string }) {
  const a = useApp(s => s.current);
  const pins = pinsOf(a, r.key).filter(u => pinnedAt(u, sid)); if (!pins.length) return null;
  return <div className="rsp-pins">{pins.map(u => <PinChip key={u.nr} rowKey={r.key} u={u} />)}</div>;
}

export function RspBar({ r, sid }: { r: Row; sid: string }) {
  return (
    <div className="pf-rsp-bar">
      <button className="rsp-btn" onClick={() => runPruefRsp(r.key, sid)}><Icon name="scales" /> Einschlägige Rechtsprechung anzeigen</button>
      <button className="rsp-btn" title="KI schlägt nur Suchbegriffe vor – Treffer kommen ausschließlich aus der amtlichen Datenbank" onClick={() => aiPruefRsp(r.key, sid)}><Icon name="spark" /> KI-Suchbegriffe</button>
    </div>
  );
}

function PruefHit({ r, sid, h }: { r: Row; sid: string; h: RspHit }) {
  const a = useApp(s => s.current);
  const pinned = pinsOf(a, r.key).some(u => u.nr === h.nr && pinnedAt(u, sid));
  return (
    <div className={'rsp-hit pf-hit' + (pinned ? ' pinned' : '')}>
      <HitMeta h={h} /><HitBody h={h} />
      <div className="rsp-act">
        <button onClick={() => openRspFromPruef(r.key, sid, h.nr)}>Volltext</button>
        <button className={pinned ? 'pin-on' : ''} onClick={() => toggleStepPin(r.key, sid, h.nr)}><Icon name="pin" />{pinned ? ' geheftet (lösen)' : (sid === '*' ? ' an Merkmal heften' : ' an Prüfschritt heften')}</button>
        <a href={risDocUrl(h.nr)} target="_blank" rel="noopener">im neuen Tab ↗</a>
      </div>
    </div>
  );
}

export function PruefRsp({ r, sid }: { r: Row; sid: string }) {
  const st = useApp(s => s.pruefRsp[r.key + '#' + sid]);
  useApp(s => s.rev); // bei Änderungen am (veränderlichen) Suchzustand neu zeichnen
  if (!st) return null;
  if (st.busy) return <div className="pf-res"><div className="busy small"><Spinner />{st.note && !st.res ? st.note : 'Amtliche Datenbank wird durchsucht …'}</div></div>;
  const all = pruefHits(st); const nSkript = all.filter(x => x.skript).length;
  const shown = all.slice(0, Math.max(5, nSkript));
  const hasHits = st.res || (st.az || []).some(x => x.hits && x.hits.length);
  return (
    <div className="pf-res">
      {st.note && <p className="small" style={{ margin: '0 0 6px' }}>{st.note}</p>}
      {st.err && <div className="banner err" style={{ margin: '0 0 8px' }}>{st.err}</div>}
      {(st.az || []).map(x => x.err
        ? <div key={x.az} className="pf-az-miss">Im Skript genannte Entscheidung (Az. {x.az}) konnte nicht abgefragt werden: {x.err}</div>
        : !x.hits.length ? <div key={x.az} className="pf-az-miss">Im Skript genannt (Az. {x.az}) – in der Datenbank nicht gefunden. Wird nicht als Beleg angezeigt.</div> : null)}
      {hasHits && <>
        {st.res && <><PerQuery res={st.res} suffix="" onFresh={() => runPruefRsp(r.key, sid, true)} /><div style={{ height: 8 }} /></>}
        {shown.length ? <>
          {shown.map(h => <PruefHit key={h.nr} r={r} sid={sid} h={h} />)}
          {all.length > shown.length && <p className="small">{all.length - shown.length} weitere Treffer – <button className="note-btn" style={{ margin: 0 }} onClick={() => openRspFromPruef(r.key, sid, null)}>alle im Seitenpanel anzeigen</button></p>}
        </> : <p className="small">Keine Entscheidungen gefunden. Die amtliche Datenbank ist noch im Aufbau – das ist kein Fehler. „KI-Suchbegriffe“ oder die freie Suche im Seitenpanel können helfen.</p>}
      </>}
    </div>
  );
}
