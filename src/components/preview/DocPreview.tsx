// Originaldokument mit markierter Fundstelle (Text, PDF mit Textebene, Scan/Bild per OCR)
import { useEffect, useRef, useState } from 'react';
import type { DocPreviewState } from '../../types';
import { useApp, set } from '../../state/store';
import { openPreview } from '../../state/actions';
import { drawImg, drawMd, drawPdf, type DrawResult } from './drawDoc';
import { BackBtn, CloseBtn } from './PreviewPane';
import { Spinner } from '../layout/Icon';

const FMT_LABEL = { pdf: 'PDF', md: 'Text', img: 'Bild' };
const STATE: Record<string, [string, string]> = {
  exact: ['ok', '✓ Fundstelle markiert'],
  ocr: ['ok', '✓ markiert (Texterkennung)'],
  approx: ['approx', '≈ ungefähre Stelle – bitte prüfen'],
  miss: ['miss', '✗ nicht sicher gefunden']
};

export function DocPreview({ p }: { p: DocPreviewState }) {
  const docs = useApp(s => s.docs);
  const d = docs && docs.get(p.docId);
  const bodyRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [result, setResult] = useState<DrawResult | 'loading' | 'error'>('loading');
  const [err, setErr] = useState('');

  useEffect(() => {
    const body = bodyRef.current; if (!body || !d) return;
    let alive = true; const isAlive = () => alive;
    setResult('loading'); setErr('');
    (async () => {
      try {
        const r = p.fmt === 'md' ? drawMd(d, body, p.quote)
          : p.fmt === 'pdf' ? await drawPdf(d, body, p.quote, isAlive)
          : await drawImg(d.variants.img, body, p.quote, isAlive, 'img|' + d.variants.img.sig);
        if (!alive) return;
        setResult(r);
        // Nur innerhalb der Vorschau scrollen – nie die Seite verschieben
        const first = body.querySelector('mark.hl, .ocr-box'), sc = scrollRef.current;
        if (first && sc) { const br = sc.getBoundingClientRect(), fr = first.getBoundingClientRect(); sc.scrollTop += fr.top - br.top - (sc.clientHeight - fr.height) / 2; }
      } catch (e) { if (alive) { setResult('error'); setErr(e.message); } }
    })();
    return () => { alive = false; };
  }, [d, p.fmt, p.quote]);

  if (!d) return null;
  const st = p.quote && result !== 'loading' && result !== 'error' ? STATE[result || 'miss'] : null;
  const setFmt = (fmt: DocPreviewState['fmt']) => set({ preview: { ...p, fmt } });
  return (
    <>
      <div className="pv-head">
        <BackBtn back={p.back} />
        <div className="pv-title">
          <div><b><span className="mono">{d.id}</span> · {d.title}</b>
            <div className="meta">{[d.date, d.release ? 'Release ' + d.release : ''].filter(Boolean).join(' · ')}
              {p.anchor && <>{d.date || d.release ? ' · ' : ''}Fundstelle <span className="mono">{p.anchor}</span></>}</div></div>
          <CloseBtn title="Vorschau schließen (Esc)" />
        </div>
        {p.quote && <div className="pv-quote">„{p.quote}“</div>}
        {p.via && <div className="pv-quote">Als Beweismittel angeboten in <button className="pv-via" title="Fundstelle im Schriftsatz anzeigen" onClick={() => openPreview(p.via.dok, p.via.zitat, p.ref, p.via.anchor, null, p.back)}>{p.via.anchor}</button>: „{p.via.zitat}“</div>}
        <div className="pv-tabs">
          <div className="seg">{p.fmts.map(f => <button key={f} className={'pv-tab' + (f === p.fmt ? ' on' : '')} title={d.variants[f].path} onClick={() => setFmt(f)}>{FMT_LABEL[f]}</button>)}</div>
          <span className={'pv-state' + (st ? ' ' + st[0] : '')}>{st ? st[1] : ''}</span>
        </div>
      </div>
      <div className="pv-body" ref={scrollRef}>
        {result === 'loading' && <div className="loading"><Spinner />Dokument wird geladen …</div>}
        {result === 'error' && <div className="banner err">Vorschau fehlgeschlagen: {err}</div>}
        {/* wird direkt per DOM gezeichnet (pdf.js, Markierungen) – React fasst den Inhalt nicht an */}
        <div ref={bodyRef} key={p.docId + p.fmt} />
      </div>
    </>
  );
}
