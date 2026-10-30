// Übersicht nach Klageanträgen: Navigation links, gewählter Antrag mit Prüfungsschema rechts
import { useEffect } from 'react';
import type { Akte, Row } from '../../types';
import { useApp, set } from '../../state/store';
import { openPreview } from '../../state/actions';
import { RULES } from '../../config/regelmodell';
import { antraegeOf, inAntrag, needsProof, proofGap } from '../../lib/derive';
import { Icon } from '../layout/Icon';
import { MerkmalLine } from './MerkmalLine';

interface Section {
  id: string; rows: Row[]; minor?: boolean; groups?: false; auch?: (r: Row) => string[];
  navKick?: string; navTitle: string; navSub?: string;
  kicker: string; title: string; sub?: React.ReactNode; anc?: React.ReactNode; empty?: string;
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

function SchSum({ a, rows }: { a: Akte; rows: Row[] }) {
  if (rows.every(r => r.virtual)) return null;
  const nStreit = rows.filter(r => needsProof(a, r)).length, nGap = rows.filter(r => proofGap(a, r)).length;
  if (!nStreit) return <span className="sch-sum ok"><Icon name="check" /> kein Beweisbedarf</span>;
  return <span className="sch-sum">{nStreit} beweisbedürftig{nGap > 0 && <> · <span className="red"><Icon name="warn" /> {nGap} Lücke{nGap === 1 ? '' : 'n'}</span></>}</span>;
}

function NavItem({ o }: { o: Section }) {
  const s = useApp();
  const on = s.antragSel === o.id, nGap = o.rows.filter(r => proofGap(s.current, r)).length;
  const select = () => { if (s.antragSel !== o.id) set({ antragSel: o.id, openRow: new Set(), openSec: new Set() }); };
  return (
    <button className={'ant-nav-item' + (on ? ' on' : '') + (o.minor ? ' minor' : '')} aria-current={on} onClick={select}>
      {o.navKick && <span className="ani-kick">{o.navKick}</span>}<span className="ani-title">{o.navTitle}</span>
      {(o.navSub || nGap > 0) && <span className="ani-sub">{o.navSub || ''}{nGap > 0 && <span className="ani-gap" title="Beweislücken"><Icon name="warn" /> {nGap}</span>}</span>}
    </button>
  );
}

// Gewählter Antrag: Prüfungsschema (I., II. … mit nummerierten Merkmalen) und aufklappbare Streitstände
function AntragPanel({ o }: { o: Section }) {
  const s = useApp(); const a = s.current;
  const line = (r: Row, n: number) => <MerkmalLine key={r.key} r={r} sid={o.id} auch={o.auch ? o.auch(r) : null} num={n} />;
  let body: React.ReactNode;
  if (!o.rows.length) body = <div className="ant-empty">{o.empty || 'Keine Prüfpunkte.'}</div>;
  else if (o.groups === false) body = o.rows.map((r, i) => line(r, i + 1));
  else {
    const parts: { gid: string; rows: Row[] }[] = [];
    o.rows.forEach(r => { let p = parts[parts.length - 1]; if (!p || p.gid !== r.gid) parts.push(p = { gid: r.gid, rows: [] }); p.rows.push(r); });
    body = parts.map((p, k) => {
      const g = RULES[a.verfahren].groups.find(x => x.id === p.gid);
      // Abschnitte sind zunächst eingeklappt; ein Klick auf den Kopf blendet die Prüfungspunkte ein
      const sk = o.id + '|' + p.gid, open = s.openSec.has(sk);
      const toggle = () => { const n = new Set(s.openSec); n.has(sk) ? n.delete(sk) : n.add(sk); set({ openSec: n }); };
      return (
        <section key={sk} className={'sch-sec' + (open ? ' open' : '')}>
          <button className="sch-h" aria-expanded={open} onClick={toggle}>
            <span className="ml-chev"><Icon name="chev" /></span><span className="sch-nr">{ROMAN[k] || k + 1}.</span>
            <span className="sch-t">{g ? g.titel : 'Weitere Merkmale'}<span className="sch-n">{p.rows.length} Prüfungspunkt{p.rows.length === 1 ? '' : 'e'}</span></span>
            <SchSum a={a} rows={p.rows} />
          </button>
          {open && p.rows.map((r, i) => line(r, i + 1))}
        </section>
      );
    });
  }
  return (
    <section className={'antrag card' + (o.minor ? ' minor' : '')} id={'ap-' + o.id}>
      <div className="antrag-head">
        <div className="ant-title"><span className="ant-kick">{o.kicker}</span><span className="ant-name">{o.title}</span>{o.sub && <span className="ant-norm">{o.sub}</span>}</div>
        {o.anc}
      </div>
      <div className="ant-body">{body}</div>
    </section>
  );
}

export function AntragView({ rows: all }: { rows: Row[] }) {
  const s = useApp(); const a = s.current;
  const { kl } = antraegeOf(a);

  // Bei Aktenwechsel Auswahl und Aufklappzustand zurücksetzen
  useEffect(() => {
    if (s.antragFor !== a.id) set({ antragFor: a.id, openRow: new Set(), openSec: new Set(), antragSel: null });
  }, [a.id]);

  const secs: Section[] = [], used = new Set<string>();
  kl.forEach(ant => {
    const rows = all.filter(r => inAntrag(ant, r)); rows.forEach(r => used.add(r.key));
    const kick = `Antrag ${ant.nr}${ant.hilfsweise ? ' · hilfsweise' : ''}`;
    secs.push({
      id: ant.id, rows, auch: r => kl.filter(o => o !== ant && inAntrag(o, r)).map(o => 'Antrag ' + o.nr),
      navKick: kick, navTitle: ant.kurz, navSub: ant.def ? ant.def.norm : '',
      kicker: kick + ' · Prüfungsschema', title: ant.kurz,
      sub: ant.def
        ? <>Anspruchsgrundlage: {ant.def.titel} · <b>{ant.def.norm}</b>{ant.def.merkmale && <> <span className="verify" title="Zuordnung der Merkmale vom Team zu verifizieren"><Icon name="flag" /></span></>}</>
        : 'Kein passender Antragstyp im Regelmodell – Merkmale unter „Weitere Merkmale“.',
      anc: ant.anchor ? <button className="anc-btn" title="Antrag im Schriftsatz anzeigen" onClick={() => openPreview(ant.dok, ant.zitat, null, ant.anchor)}><span className="anc">{ant.anchor}</span></button> : null,
      empty: 'Für diesen Antrag sind im Regelmodell keine Merkmale hinterlegt.'
    });
  });
  const rest = all.filter(r => r.merkmal !== 'SONST' && !used.has(r.key));
  if (rest.length) secs.push({ id: 'REST', rows: rest, minor: true, navTitle: 'Weitere Merkmale', navSub: `${rest.length} Punkt${rest.length === 1 ? '' : 'e'}`, kicker: 'Ergänzend', title: 'Weitere Merkmale', sub: 'keinem Antrag zugeordnet' });
  const sonst = all.filter(r => r.merkmal === 'SONST');
  if (sonst.length) secs.push({ id: 'SONST', rows: sonst, minor: true, groups: false, navTitle: 'Weitere streitige Punkte', navSub: `${sonst.length} Punkt${sonst.length === 1 ? '' : 'e'}`, kicker: 'Ergänzend', title: 'Weitere streitige Punkte', sub: 'außerhalb des Prüfprogramms, von der KI zusätzlich erfasst' });

  const sel = secs.find(o => o.id === s.antragSel) || secs[0];
  const main = secs.filter(o => !o.minor), minor = secs.filter(o => o.minor);
  return (
    <div className="ant-view"><div className="ant-split">
      <nav className="ant-nav" aria-label="Klageanträge">
        <div className="ant-nav-h">Klageanträge</div>
        {kl.some(x => x.abgeleitet) && <div className="ant-nav-note" title="Die Analyse hat keine Anträge erfasst">aus dem Regelmodell abgeleitet</div>}
        {main.map(o => <NavItem key={o.id} o={o} />)}
        {minor.length > 0 && <><div className="ant-nav-h">Ergänzend</div>{minor.map(o => <NavItem key={o.id} o={o} />)}</>}
      </nav>
      <div className="ant-main">{sel ? <AntragPanel o={sel} /> : <div className="empty"><p>Keine Prüfpunkte.</p></div>}</div>
    </div></div>
  );
}
