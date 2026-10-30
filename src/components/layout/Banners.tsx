// Hinweiszeilen über dem Streitstand (Fortschritt, Fehler, neue Dokumente …)
import { useApp } from '../../state/store';
import { rescan } from '../../state/actions';
import { readState, textLength } from '../../lib/docText';
import { Spinner } from './Icon';

export function Banners() {
  const s = useApp(); const a = s.current;
  const out: JSX.Element[] = [];
  const add = (cls: string, body: React.ReactNode) => out.push(<div key={out.length} className={'banner ' + cls}>{body}</div>);

  if (s.busy) add('info', <><Spinner /><div>{s.busy}</div></>);
  else if (s.reading) add('info', <><Spinner /><div>{s.reading}</div></>);
  else if (s.error) add('err', s.error);
  if (!a) return <>{out}</>;

  const docsOk = !!s.docs;
  const nNew = (a.newDocs || []).length;
  if (!docsOk) add('warn', <>Die Dokumente dieser Akte sind in diesem Browser nicht gespeichert. <button className="tb" onClick={rescan}>Aktenordner erneut wählen</button></>);
  if (nNew && docsOk) add('info', <><b>{nNew} neue{nNew === 1 ? 's' : ''} Dokument{nNew === 1 ? '' : 'e'}</b> ({a.newDocs.join(', ')}) – bitte neu analysieren.</>);
  if (a.analysis && (a.analysis.skipped || []).length) add('err', `${a.analysis.skipped.length} Dokument(e) nicht ausgewertet, weil kein Text erkannt wurde: ${a.analysis.skipped.join(', ')}. Unter „Dokumente“ prüfen, ggf. als PDF mit Textebene neu einlegen.`);
  if (a.analysis && a.analysis.errors && a.analysis.errors.length) {
    const n = a.analysis.errors.length;
    const reasons = [...new Set(a.analysis.errors.map(x => x.slice(x.indexOf(': ') + 2)))];
    add('err', `${n} Prüfpunkt${n === 1 ? '' : 'e'} konnte${n === 1 ? '' : 'n'} nicht analysiert werden (${reasons.join(' / ')}). Bitte „Neu analysieren“.`);
  }
  if (s.notice) add('info', s.notice);
  if (docsOk && !s.reading) {
    const bad = [...s.docs.values()].filter(d => { const r = readState(d); return r && textLength(r) < 40; });
    if (bad.length) add('warn', `Kein verwertbarer Text in ${bad.map(d => d.id).join(', ')} – bitte unter „Dokumente“ prüfen.`);
  }
  if (a.example) add('info', 'Beispielakte mit vorab erstellter Analyse – auf einen Vortrag klicken, um die Fundstelle zu sehen.');
  return <>{out}</>;
}
