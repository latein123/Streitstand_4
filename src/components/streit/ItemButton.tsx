// Eine Angabe (Vortrag oder Beweisangebot) mit Fundstelle – Klick öffnet die Originalstelle rechts
import type { Beweis, Item, Pin, Row } from '../../types';
import { useApp } from '../../state/store';
import { openItem, openPinned } from '../../state/actions';
import { MITTEL } from '../../config/status';
import { proofTarget } from '../../lib/docSide';
import { fmtDate } from '../../lib/util';
import { Icon } from '../layout/Icon';

type Kind = 'klaeger' | 'beklagter' | 'beweis';

export function ItemButton({ row, kind, i, compact }: { row: Row; kind: Kind; i: number; compact?: boolean }) {
  const s = useApp();
  const it: Item = kind === 'beweis' ? row.beweis[i] : row[kind][i];
  const b = it as Beweis;
  const ref = `${row.key}|${kind}|${i}`;
  const active = s.preview && s.preview.kind === 'doc' && s.preview.ref === ref;
  const ziel = kind === 'beweis' ? proofTarget(s.docs, s.current, b) : null;
  const onClick = () => openItem(row, kind, i);
  const mittel = MITTEL[b.mittel] || b.mittel;

  // Kompakt (im Dropdown): nur Beweismittel und Dokument, Inhalt als Tooltip; Zeugen behalten den Namen
  if (compact) return (
    <button className={'proof-mini' + (active ? ' active' : '')} title={it.kurz} onClick={onClick}>
      <span className="pm">{mittel}</span>{b.mittel === 'zeuge' && <span className="pmk">{it.kurz}</span>}<span className="anc">{ziel || it.anchor}</span>
    </button>
  );
  if (ziel) return (
    <div className="item"><button className={'say' + (active ? ' active' : '')} title="Vorgelegtes Dokument öffnen" onClick={onClick}>
      <span className="pm">{mittel}</span>{it.kurz}
      <span className="anc" title={`Vorgelegtes Dokument ${ziel} – Beweisantritt in ${it.anchor}`}>{ziel}</span>
    </button></div>
  );
  const isNew = (s.current.newDocs || []).includes(it.dok);
  return (
    <div className="item"><button className={'say' + (active ? ' active' : '')} title="Fundstelle anzeigen" onClick={onClick}>
      {kind === 'beweis' && <span className="pm">{mittel}</span>}{it.kurz}
      <span className={'anc' + (it.fixed ? ' fixed' : '')} title={it.fixed ? 'Fundstelle automatisch korrigiert (KI nannte ' + it.fixed + ')' : 'Zitat wörtlich im Dokument gefunden'}>{it.anchor}</span>
      {isNew && <span className="new-tag">NEU</span>}
    </button></div>
  );
}

export function ItemList({ row, kind }: { row: Row; kind: 'klaeger' | 'beklagter' }) {
  return row[kind].length ? <>{row[kind].map((_, i) => <ItemButton key={i} row={row} kind={kind} i={i} />)}</> : <span className="none">–</span>;
}

// Geheftete Entscheidung als Chip
export function PinChip({ rowKey, u }: { rowKey: string; u: Pin }) {
  return (
    <button className="rsp-pin" title={u.titel || ''} onClick={() => openPinned(rowKey, u.nr)}>
      <Icon name="pin" /> {u.gericht}{u.datum ? ', ' + fmtDate(u.datum) : ''}{u.az ? ' – ' + u.az : ''}
    </button>
  );
}
