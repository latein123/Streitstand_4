// Prüfung eines Merkmals im Seitenpanel: Obersatz, Prüfschritte, Streitstände, Bezug zur Akte, Rechtsprechung
import type { PruefPreviewState, Row } from '../../types';
import { useApp } from '../../state/store';
import { closePreview, setChecked, setJudgeStatus, setNote, setStepNote, setStepStatus } from '../../state/actions';
import { RULES } from '../../config/regelmodell';
import { SSTAT, STATUS } from '../../config/status';
import { effStatus, judgeView, pruefOf, rowByKey, stepState } from '../../lib/derive';
import { Icon, Src, Verify } from '../layout/Icon';
import { ItemList } from '../streit/ItemButton';
import { CloseBtn } from '../preview/PreviewPane';
import { PinChips, RspBar, PruefRsp } from './PruefRsp';

function Ctrl({ r }: { r: Row }) {
  const a = useApp(s => s.current);
  const j = judgeView(a, r.key);
  return (
    <div className="pf-ctrl">
      <label className="chk"><input type="checkbox" checked={!!j.checked} onChange={e => setChecked(r.key, e.target.checked)} /> Merkmal geprüft</label>
      <select value={j.status || ''} title="Status korrigieren" onChange={e => setJudgeStatus(r.key, e.target.value)}>
        <option value="">Status wie KI: {STATUS[r.status].short}</option>
        {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.short}</option>)}
      </select>
      {j.status && j.status !== r.status && <span className="court">vom Gericht geändert (KI: {STATUS[r.status].short})</span>}
      <textarea className="note" placeholder="Notiz des Gerichts zu diesem Merkmal …" defaultValue={j.note || ''} key={r.key} onChange={e => setNote(r.key, e.target.value)} />
    </div>
  );
}

function Pruefung({ r }: { r: Row }) {
  const a = useApp(s => s.current);
  const pr = pruefOf(a, r); const st = effStatus(a, r);
  const ctx = [r.instanz, r.label, ...r.klaeger.map(i => i.kurz), ...r.beklagter.map(i => i.kurz)].join(' ');
  const side = (
    <div className="pf-side"><div className="pf-sec">Bezug zur Akte</div>
      {r.virtual ? <p className="small">Diese Gruppe wurde noch nicht analysiert.</p> : <>
        <div className="pf-lab">Kläger</div><ItemList row={r} kind="klaeger" />
        <div className="pf-lab" style={{ marginTop: 8 }}>Beklagter</div><ItemList row={r} kind="beklagter" />
      </>}
      <div className="pf-sec" style={{ marginTop: 14 }}>Rechtsprechung zum ganzen Merkmal</div>
      <PinChips r={r} sid="*" /><RspBar r={r} sid="*" /><PruefRsp r={r} sid="*" />
      <p className="small">Treffer nur aus der amtlichen Datenbank des Bundes. Geheftete Entscheidungen erscheinen im Begründungsgerüst.</p>
    </div>
  );
  return (
    <div className="pf">
      <Ctrl r={r} />
      {!pr ? <><p className="small" style={{ marginTop: 0 }}>Für diesen Punkt ist im Regelmodell kein Prüfungsschema hinterlegt.</p><div className="pf-cols">{side}</div></> : <>
        <div className="pf-head">
          <div><span className="pf-lab">Obersatz</span>{pr.obersatz} <Src q={pr.quelle} /></div>
          {pr.definition && <div><span className="pf-lab">Definition</span>{pr.definition} <Src q={pr.quelle} /> <Verify on={pr.verify} /></div>}
        </div>
        {pr.statusHinweis && ['pauschal', 'bestritten', 'nichtwissen'].includes(st) && <div className="banner warn" style={{ margin: '8px 0 0' }}>Hinweis zur Statusbewertung („{STATUS[st].short}“): {pr.statusHinweis} <Src q={pr.quelle} /></div>}
        {(pr.hinweise || []).filter(x => x.wenn.test(ctx)).map((x, i) => <div key={i} className="banner info" style={{ margin: '8px 0 0' }}><Icon name="info" /> {x.text} <Src q={x.quelle} /></div>)}
        <div className="pf-cols">
          <div className="pf-main">
            <div className="pf-sec">Prüfschritte</div>
            <ol className="pf-steps">{pr.schritte.map(s => {
              const ss = stepState(a, r.key, s.id); const val = ss.status || 'offen';
              return (
                <li key={s.id} className={'pf-step pf-' + val}>
                  <div className="pf-step-top"><span className="pf-sid">{s.id}</span>
                    <div className="pf-txt">{s.text}{s.hinweis && <div className="pf-hint">{s.hinweis}</div>}<div className="pf-meta"><Src q={s.quelle} /><Verify on={s.verify} /></div></div>
                    <div className="pf-seg">{Object.entries(SSTAT).map(([v, l]) => <button key={v} className={val === v ? 'on s-' + v : ''} onClick={() => setStepStatus(r.key, s.id, v)}>{l}</button>)}</div>
                  </div>
                  <textarea className="note pf-note" placeholder="Notiz zum Prüfschritt …" defaultValue={ss.note || ''} key={r.key + s.id} onChange={e => setStepNote(r.key, s.id, e.target.value)} />
                  <PinChips r={r} sid={s.id} /><RspBar r={r} sid={s.id} /><PruefRsp r={r} sid={s.id} />
                </li>
              );
            })}</ol>
            {(pr.streit || []).length > 0 && <>
              <div className="pf-sec">Streitstände</div>
              {pr.streit.map((x, i) => <div key={i} className="pf-streit"><b>{x.frage}</b><ul>{x.ansichten.map(v => <li key={v}>{v}</li>)}</ul><Src q={x.quelle} /></div>)}
            </>}
          </div>
          {side}
        </div>
      </>}
    </div>
  );
}

export function PruefPanel({ p }: { p: PruefPreviewState }) {
  const a = useApp(s => s.current);
  const r = rowByKey(a, p.key);
  if (!r) { queueMicrotask(closePreview); return null; }
  const g = RULES[a.verfahren].groups.find(x => x.id === r.gid);
  return (
    <>
      <div className="pv-head"><div className="pv-title">
        <div><b>Prüfung · {r.label}</b><div className="meta">{[r.instanz, r.norm].filter(Boolean).join(' · ')}</div></div>
        <CloseBtn title="Prüfung schließen (Esc)" />
      </div></div>
      <div className="pv-body pf-panel">
        {g && g.info && <div className="banner info"><Icon name="info" /> {g.info} <Src q={g.infoQuelle} /></div>}
        <Pruefung r={r} />
      </div>
    </>
  );
}
