// Eine Merkmalszeile in der Antragsansicht (aufklappbar) und ihr aufgeklappter Inhalt
import type { Row } from '../../types';
import { useApp, set } from '../../state/store';
import { openItem, openRsp, showPruef } from '../../state/actions';
import { MITTEL, STATUS } from '../../config/status';
import { effStatus, judgeView, needsProof, partyName, pinsOf, proofGap, pruefOf, sideOf, stepState } from '../../lib/derive';
import { proofTarget } from '../../lib/docSide';
import { Icon } from '../layout/Icon';
import { ItemButton, PinChip } from './ItemButton';
import { ChangeFlag } from './StreitTable';

export function MerkmalLine({ r, sid, auch, num }: { r: Row; sid: string; auch?: string[] | null; num: number }) {
  const s = useApp(); const a = s.current;
  const st = effStatus(a, r), side = sideOf(a, r.last), gap = proofGap(a, r), j = judgeView(a, r.key);
  const pr = pruefOf(a, r);
  const done = pr ? pr.schritte.filter(x => ['erfuellt', 'nicht_erfuellt'].includes(stepState(a, r.key, x.id).status)).length : 0;
  const k = sid + '|' + r.key;
  const open = s.openRow.has(k), active = s.preview && s.preview.kind === 'pruef' && s.preview.key === r.key;
  const nPins = pinsOf(a, r.key).length;
  // Beweislast im Klartext nur als Tooltip – das Dropdown wiederholt sie nicht
  const lastTip = [r.last === 'gestuft' ? 'Beweislast gestuft' : side ? 'Beweislast: ' + partyName(a, side) : 'Beweislast nicht im Regelmodell', r.lastText, !r.virtual && r.last && !needsProof(a, r) ? 'derzeit nicht beweisbedürftig' : '', r.verify ? 'vom Team zu verifizieren' : ''].filter(Boolean).join(' – ');
  const toggle = () => { const n = new Set(s.openRow); n.has(k) ? n.delete(k) : n.add(k); set({ openRow: n }); };
  return (
    <>
      <button className={'ml-row' + (open ? ' open' : '') + (active ? ' active' : '')} aria-expanded={open} onClick={toggle}>
        <span className="ml-chev"><Icon name="chev" /></span>
        <span className="ml-lbl" title={r.norm || undefined}>
          {num ? <span className="ml-num">{num}.</span> : null}{r.label}
          {r.instanz && <span className="inst">{r.instanz}</span>}<ChangeFlag r={r} />
          {auch && auch.length > 0 && <span className="ml-auch">auch {auch.join(', ')}</span>}
        </span>
        <span className={'st-badge s-' + st} title={STATUS[st].label}>{STATUS[st].short}</span>
        <span className="ml-last" title={lastTip}>{r.last === 'gestuft' ? 'gestuft' : side ? (side === 'klaeger' ? 'Kläger' : 'Beklagter') : '–'}{r.verify && <> <span className="ml-verify"><Icon name="flag" /></span></>}</span>
        <span className="ml-ind">
          {gap && <span className="gap"><Icon name="warn" /> Lücke</span>}
          {j.checked ? <span className="ml-ok"><Icon name="check" /> geprüft</span> : pr && done ? <span className="ml-prog">{done} von {pr.schritte.length}</span> : null}
          {nPins > 0 && <span className="ml-pins" title="Geheftete Entscheidungen"><Icon name="pin" /> {nPins}</span>}
          {j.status && j.status !== r.status && <span className="court" title="Status vom Gericht geändert">✎</span>}
        </span>
      </button>
      {open && <MerkmalDetail r={r} />}
    </>
  );
}

// Aufgeklapptes Merkmal: Begründung + Werkzeuge oben, darunter der Vortrag (Beweise jeweils bei der Partei)
function MerkmalDetail({ r }: { r: Row }) {
  const s = useApp(); const a = s.current;
  const top = (why: React.ReactNode) => (
    <div className="ml-top">{why}<div className="ml-tools">
      {pinsOf(a, r.key).map(u => <PinChip key={u.nr} rowKey={r.key} u={u} />)}
      <button className="ml-ico" title="Prüfung öffnen" aria-label="Prüfung öffnen" onClick={() => showPruef(r.key)}><Icon name="list" /></button>
      <button className="ml-ico" title="Rechtsprechung" aria-label="Rechtsprechung" onClick={() => openRsp(r.key)}><Icon name="scales" /></button>
    </div></div>
  );
  if (r.virtual) return <div className="ml-detail">{top(<p className="ml-why">Noch nicht analysiert – Prüfungsschema und Rechtsprechung sind trotzdem verfügbar.{r.norm ? ' ' + r.norm : ''}{r.verify && <> <span className="verify"><Icon name="flag" /> vom Team zu verifizieren</span></>}</p>)}</div>;

  const st = effStatus(a, r), gap = proofGap(a, r);
  const why = r.begruendung ? <p className="ml-why" title={r.begruendung}>{r.begruendung}</p> : <span className="ml-why" />;
  const say = (side: 'klaeger' | 'beklagter') => r[side].length ? r[side].map((_, i) => <ItemButton key={i} row={r} kind={side} i={i} />) : <span className="none">–</span>;
  const ancBtn = (kind: 'klaeger' | 'beklagter' | 'beweis', i: number, label: string, tip: string) =>
    <button key={kind + i} className="anc-btn" title={tip} onClick={() => openItem(r, kind, i)}><span className="anc">{label}</span></button>;

  if (st === 'unstreitig' || st === 'nicht_bestritten') {
    const main = r.klaeger.length ? 'klaeger' : 'beklagter', other = main === 'klaeger' ? 'beklagter' : 'klaeger';
    const zug = r[other].map((it, i) => ancBtn(other, i, it.anchor, it.kurz));
    const bw = r.beweis.map((it, i) => ancBtn('beweis', i, proofTarget(s.docs, a, it) || it.anchor, (MITTEL[it.mittel] || it.mittel) + ': ' + it.kurz));
    return (
      <div className="ml-detail">{top(why)}<div className="ml-one">{say(main)}
        <div className="ml-one-meta"><span>{st === 'unstreitig' ? 'zugestanden' : 'nicht bestritten'}</span>{zug}{bw.length > 0 && <><span className="sep">·</span><span>Beweis</span>{bw}</>}</div>
      </div></div>
    );
  }
  const col = (side: 'klaeger' | 'beklagter', h: string) => {
    const pr = r.beweis.map((it, i) => it.partei === side ? <ItemButton key={i} row={r} kind="beweis" i={i} compact /> : null).filter(Boolean);
    return (
      <div className={'ml-side ' + (side === 'klaeger' ? 'kl' : 'bk')}><div className="ml-h">{h}</div>{say(side)}
        {pr.length > 0 && <div className="proof-minis">{pr}</div>}
        {gap === side && <div className="gap"><Icon name="warn" /> kein Beweisangebot</div>}
      </div>
    );
  };
  return <div className="ml-detail">{top(why)}<div className="ml-cols">{col('klaeger', 'Kläger trägt vor')}{col('beklagter', 'Beklagter erwidert')}</div></div>;
}
