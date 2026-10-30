// Rechtsprechung im Seitenpanel: Suche, Trefferliste, Volltext, Heften an eine Zeile
import { useEffect, useState } from 'react';
import type { Pin, RspHit, RspPreviewState } from '../../types';
import { useApp, touch } from '../../state/store';
import { runRsp, setRspDetail, suggestRsp, togglePin } from '../../state/actions';
import { RSP_COURTS } from '../../config/rechtsprechung';
import { pinsOf, rowByKey } from '../../lib/derive';
import { fmtDate } from '../../lib/util';
import { risBase, risDocHtml, risDocUrl, snipHtml } from '../../ris/api';
import { Icon, Spinner } from '../layout/Icon';
import { BackBtn, CloseBtn } from './PreviewPane';

// Ein Treffer (wird auch in der Prüfung verwendet)
export function HitMeta({ h }: { h: RspHit | Pin }) {
  return (
    <div className="rsp-meta">
      {(h as RspHit).skript && <><span className="src-badge pf-skript">im Skript zitiert</span> </>}
      <b>{h.gericht}</b>{h.spruch ? ' · ' + h.spruch : ''}{h.art ? ' · ' + h.art : ''}{h.datum ? ' vom ' + fmtDate(h.datum) : ''}{h.az ? ' · Az. ' + h.az : ''}
    </div>
  );
}
export function HitBody({ h }: { h: RspHit }) {
  const t = h.treffer && h.treffer[0];
  return <>
    {h.titel && <div className="rsp-title">{h.titel}</div>}
    {h.erweitert && <div className="rsp-meta" style={{ marginTop: 3, color: 'var(--amber)' }}>aus erweiterter Suche – Einschlägigkeit bitte prüfen</div>}
    {t && <div className="rsp-snip" dangerouslySetInnerHTML={{ __html: snipHtml(t.text) }} />}
  </>;
}
export function PerQuery({ res, onFresh, suffix = ' Treffer' }: { res: RspPreviewState['res']; onFresh: () => void; suffix?: string }) {
  return (
    <div className="rsp-qs">
      {res.perQuery.map((x, i) => <span key={i} className="rsp-q" title={x.erweitert ? 'automatisch erweiterte Suche' : undefined}>{x.erweitert ? '+ ' : ''}„{x.q}“: <b>{x.err ? 'Fehler' : x.n}</b>{suffix}</span>)}
      {res.cached && <span className="rsp-q" title="Ergebnis aus einer früheren Suche – funktioniert auch offline">aus Zwischenspeicher · <button className="note-btn" style={{ margin: 0 }} onClick={onFresh}>neu laden</button></span>}
    </div>
  );
}

function Hit({ p, h, pinned }: { p: RspPreviewState; h: RspHit; pinned: boolean }) {
  return (
    <div className={'rsp-hit' + (pinned ? ' pinned' : '')}>
      <HitMeta h={h} />
      <HitBody h={h} />
      {h.queries && h.queries.length > 1 && <div className="rsp-meta" style={{ marginTop: 5 }}>gefunden mit: {h.queries.join(' · ')}</div>}
      <div className="rsp-act">
        <button onClick={() => setRspDetail(h.nr)}>Volltext anzeigen</button>
        <a href={risDocUrl(h.nr)} target="_blank" rel="noopener">im neuen Tab ↗</a>
        {p.key && <button className={pinned ? 'pin-on' : ''} onClick={() => togglePin(h.nr)}><Icon name="pin" />{pinned ? ' an Zeile geheftet (lösen)' : ' an Zeile heften'}</button>}
        {h.ecli && <span className="small">{h.ecli}</span>}
      </div>
    </div>
  );
}

function Detail({ p }: { p: RspPreviewState }) {
  const a = useApp(s => s.current);
  const nr = p.detail;
  const pins = pinsOf(a, p.key);
  const h = (p.res && p.res.hits.find(x => x.nr === nr)) || pins.find(u => u.nr === nr) || { nr, gericht: '', datum: '', az: '', titel: '' } as Pin;
  p.detailHit = h;
  const pinned = pins.some(u => u.nr === nr);
  const [html, setHtml] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setHtml(null); setErr(null);
    risDocHtml(nr).then(x => alive && setHtml(x), e => alive && setErr(e.message));
    return () => { alive = false; };
  }, [nr]);
  return <>
    <div className="rsp-act" style={{ margin: '0 0 10px' }}>
      <button onClick={() => setRspDetail(null)}>← zurück zur Trefferliste</button>
      <a href={risDocUrl(nr)} target="_blank" rel="noopener">im neuen Tab ↗</a>
      {p.key && <button className={pinned ? 'pin-on' : ''} onClick={() => togglePin(nr)}><Icon name="pin" />{pinned ? ' geheftet (lösen)' : ' an Zeile heften'}</button>}
    </div>
    {err ? <div className="banner err">{err}</div>
      : html === null ? <div className="busy"><Spinner />Entscheidung wird geladen …</div>
      : <div className="rsp-doc" dangerouslySetInnerHTML={{ __html: html }} />}
  </>;
}

export function RspPanel({ p }: { p: RspPreviewState }) {
  const a = useApp(s => s.current);
  const r = rowByKey(a, p.key);
  const pins = pinsOf(a, p.key);
  const pinned = (nr: string) => pins.some(u => u.nr === nr);
  const go = () => { if (!p.busy) runRsp(); };

  let body: React.ReactNode;
  if (p.detail) body = <Detail p={p} />;
  else body = <>
    {pins.length > 0 && <>
      <p className="pv-note"><b>{pins.length} geheftete Entscheidung{pins.length === 1 ? '' : 'en'}</b> zu dieser Zeile:</p>
      {pins.map(u => <Hit key={u.nr} p={p} h={{ ...u, treffer: [], spruch: '', art: '' }} pinned />)}
      <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '14px 0' }} />
    </>}
    {p.busy ? <div className="busy"><Spinner />{p.note && /KI/.test(p.note) && !p.res ? p.note : 'Amtliche Datenbank wird durchsucht …'}</div>
      : p.err ? <div className="banner err">{p.err}</div>
      : p.res ? <>
        <PerQuery res={p.res} onFresh={() => runRsp(true)} /><div style={{ height: 10 }} />
        {p.res.hits.length ? p.res.hits.slice(0, 15).map(h => <Hit key={h.nr} p={p} h={h} pinned={pinned(h.nr)} />)
          : <div className="empty" style={{ margin: '30px auto' }}><p>Keine Entscheidungen gefunden. Weniger oder allgemeinere Suchbegriffe probieren, z. B. nur „Schimmel Mietminderung“.</p></div>}
        <p className="small">Quelle: Rechtsinformationssystem des Bundes ({risBase().replace(/^https?:\/\//, '')}). Die Datenbank befindet sich im Aufbau; Entscheidungen der Amts- und Landgerichte sind nur teilweise enthalten.</p>
      </> : null}
  </>;

  return (
    <>
      <div className="pv-head">
        <BackBtn back={p.back} />
        <div className="pv-title">
          <div><b>Rechtsprechung</b> <span className="src-badge">amtliche Datenbank des Bundes</span>
            <div className="meta">{r ? r.label + (r.instanz ? ' · ' + r.instanz : '') + (r.norm ? ' · ' + r.norm : '') : 'Freie Suche'}</div></div>
          <CloseBtn title="Schließen" />
        </div>
        {!p.detail && <>
          <div className="rsp-search">
            <input value={p.query} placeholder="z. B. Schimmel Lüftungsverhalten; Mietminderung Bruttomiete"
              onChange={e => { p.query = e.target.value; touch(); }} onKeyDown={e => { if (e.key === 'Enter') go(); }} />
            <select value={p.court} onChange={e => { p.court = e.target.value; touch(); if (p.query) runRsp(); }}>
              {RSP_COURTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <button className="tb primary" disabled={p.busy} onClick={go}>Suchen</button>
            {r && <button className="tb" disabled={p.busy} title="KI schlägt bessere Suchbegriffe vor" onClick={suggestRsp}><Icon name="spark" /> KI-Suchbegriffe</button>}
          </div>
          <div className="rsp-info">Mehrere Suchen mit <b>;</b> trennen. Pro Suche müssen alle Wörter im Urteil vorkommen (Wortformen zählen mit) – also kurz halten. Exakte Wortfolge mit Anführungszeichen, z. B. <b>"Lüftungsverhalten des Mieters"</b>.{p.note && <><br />{p.note}</>}</div>
        </>}
      </div>
      <div className="pv-body">{body}</div>
    </>
  );
}
