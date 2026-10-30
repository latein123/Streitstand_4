// Dokumentenliste der Akte: Fassungen, Lesbarkeit, Rolle (Schriftsatz Kläger/Beklagter oder Anlage)
import type { Doc } from '../../types';
import { useApp } from '../../state/store';
import { openPreview, setDocSide } from '../../state/actions';
import { readState, textLength } from '../../lib/docText';
import { docSideAuto } from '../../lib/docSide';
import { Icon } from '../layout/Icon';

const SL = { klaeger: 'Schriftsatz Kläger', beklagter: 'Schriftsatz Beklagter' };
const SRC = { md: 'Text', pdf: 'Text', ocr: 'OCR', 'pdf+ocr': 'Text + OCR' };

function Lesbarkeit({ d }: { d: Doc }) {
  const r = readState(d); if (!r) return <span className="small">wird gelesen …</span>;
  const n = textLength(r);
  if (r.source === 'error' || n < 40) return <span className="read bad" title={r.error || 'Kaum Text erkannt'}><Icon name="warn" /> kaum Text</span>;
  return <><span className="read ok">{SRC[r.source] || 'Text'} <Icon name="check" /></span> <span className="small">{n.toLocaleString('de-DE')} Zeichen</span></>;
}

export function DocsTable() {
  const s = useApp(); const a = s.current;
  const nd = a.newDocs || [];
  const sides = a.docSides || {};
  return (
    <div className="docs-panel card">
      <table><tbody>
        <tr><th>ID</th><th>Dokument</th><th>Datum</th><th>Release</th><th>Fassungen</th><th>Lesbarkeit</th><th>Rolle</th></tr>
        {[...s.docs.values()].map(d => {
          const auto = docSideAuto(d);
          return (
            <tr key={d.id}>
              <td className="mono">{d.id}{nd.includes(d.id) && <span className="new-tag">NEU</span>}</td>
              <td><button className="open" onClick={() => openPreview(d.id, null, null, null)}>{d.title}</button></td>
              <td>{d.date}</td><td>{d.release}</td>
              <td>{Object.keys(d.variants).map(f => <span key={f} className="fmt">{f.toUpperCase()}</span>)}</td>
              <td><Lesbarkeit d={d} /></td>
              <td>
                <select value={sides[d.id] || ''} title="Rolle des Dokuments" onChange={e => setDocSide(d.id, e.target.value)}>
                  <option value="">Auto: {auto ? SL[auto] : 'Anlage/Sonstiges'}</option>
                  <option value="klaeger">{SL.klaeger}</option>
                  <option value="beklagter">{SL.beklagter}</option>
                  <option value="keine">Anlage/Sonstiges</option>
                </select>
              </td>
            </tr>
          );
        })}
      </tbody></table>
      {(a.ignoredFiles || []).length > 0 && <p className="small">Nicht eingelesen (Format nicht unterstützt): {a.ignoredFiles.join(', ')}</p>}
    </div>
  );
}
