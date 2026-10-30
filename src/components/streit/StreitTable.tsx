// Gesamttabelle: alle Merkmale mit Vortrag, Status, Beweislast und Beweisangeboten
import { Fragment } from 'react';
import type { Gruppe, Row, RuleSet } from '../../types';
import { useApp } from '../../state/store';
import { openRsp, showPruef } from '../../state/actions';
import { STATUS } from '../../config/status';
import { effStatus, judgeView, proofGap, sideOf } from '../../lib/derive';
import { Icon, Src } from '../layout/Icon';
import { ItemButton, ItemList } from './ItemButton';

function GroupRow({ g, n }: { g: Gruppe | undefined; n: number }) {
  return (
    <tr className="group"><td colSpan={6}>
      {g ? g.titel : 'Weitere streitige Punkte'}{n ? <span className="cnt">{n}</span> : null}
      {g && g.info && <div className="g-info"><Icon name="info" /> {g.info} <Src q={g.infoQuelle} /></div>}
    </td></tr>
  );
}

export const ChangeFlag = ({ r }: { r: Row }) => r.change ? <span className={'flag ' + r.change}>{r.change === 'neu' ? 'NEU' : 'GEÄNDERT'}</span> : null;

export function StreitTable({ rows, rules }: { rows: Row[]; rules: RuleSet }) {
  const a = useApp(s => s.current);
  if (!rows.length) return <div className="empty"><p>Keine Prüfpunkte für diesen Filter.</p></div>;
  let lastG: string = null;
  return (
    <div className="card table-wrap"><table className="st">
      <thead><tr><th>Merkmal</th><th className="th-kl">Kläger trägt vor</th><th className="th-bk">Beklagter erwidert</th><th>Status</th><th>Beweislast</th><th>Beweisangebote</th></tr></thead>
      <tbody>
        {rows.map(r => {
          const head = r.gid !== lastG ? <GroupRow g={rules.groups.find(x => x.id === r.gid)} n={rows.filter(x => x.gid === r.gid).length} /> : null;
          lastG = r.gid;
          const j = judgeView(a, r.key);
          const st = effStatus(a, r), side = sideOf(a, r.last), gap = proofGap(a, r);
          const lastTitle = [r.lastText, r.verify ? 'vom Team zu verifizieren' : ''].filter(Boolean).join(' – ');
          return (
            <Fragment key={r.key}>
              {head}
              <tr>
                <td className="merk">
                  <div className="lbl">{r.label}<ChangeFlag r={r} /></div>
                  {r.instanz && <span className="inst">{r.instanz}</span>}{r.norm && <div className="norm">{r.norm}</div>}
                  <div className="merk-acts">
                    <button className="note-btn" onClick={() => showPruef(r.key)}>Prüfung →</button>
                    <button className="rsp-btn" title="Passende Entscheidungen in der amtlichen Datenbank suchen" onClick={() => openRsp(r.key)}><Icon name="scales" /> {(j.urteile || []).length || ''}</button>
                    {j.checked && <span className="court" style={{ color: 'var(--green)' }}><Icon name="check" /> geprüft</span>}
                  </div>
                </td>
                <td className="side kl" data-label="Kläger trägt vor"><ItemList row={r} kind="klaeger" /></td>
                <td className="side bk" data-label="Beklagter erwidert"><ItemList row={r} kind="beklagter" /></td>
                <td className="status" data-label="Status"><span className={'st-badge s-' + st} title={STATUS[st].label + (r.begruendung ? ' – ' + r.begruendung : '')}>{STATUS[st].short}</span></td>
                <td className="last" data-label="Beweislast"><span className={'last-who' + (side || r.last === 'gestuft' ? '' : ' muted')} title={lastTitle || undefined}>{r.last === 'gestuft' ? 'gestuft' : side ? (side === 'klaeger' ? 'Kläger' : 'Beklagter') : '–'}</span></td>
                <td className="proof" data-label="Beweisangebote">
                  {r.beweis.length ? r.beweis.map((it, i) => (
                    <div key={i} className="proof-item"><span className={'who ' + (it.partei === 'klaeger' ? 'kl' : 'bk')}>{it.partei === 'klaeger' ? 'Kl.' : 'Bekl.'}</span><ItemButton row={r} kind="beweis" i={i} /></div>
                  )) : <span className="none">–</span>}
                  {gap && <div className="gap" title={`${gap === 'klaeger' ? 'Kläger' : 'Beklagter'} ist beweisbelastet, hat aber keinen Beweis angeboten`}><Icon name="warn" /> Beweislücke</div>}
                </td>
              </tr>
            </Fragment>
          );
        })}
      </tbody>
    </table></div>
  );
}
