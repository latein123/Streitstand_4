// Begründungsgerüst: druckbare Gliederung (reine Struktur, keine KI-Würdigung)
import type { Akte, Pin } from '../types';
import { RULES } from '../config/regelmodell';
import { MITTEL, SSTAT, STATUS } from '../config/status';
import { esc as H, fmtDate } from './util';
import { antraegeOf, effStatus, inAntrag, isRowPin, pruefOf, virtualRows } from './derive';

const zitierUrteil = (u: Pin) => `${u.gericht || 'Gericht'}, ${u.art || 'Entscheidung'} v. ${fmtDate(u.datum)} – ${u.az || u.nr}`;

export function geruestHtml(a: Akte) {
  const rules = RULES[a.verfahren]; const judge = a.judge || {};
  const rows = [...a.analysis.rows, ...virtualRows(a).filter(v => judge[v.key])];
  let body = '';
  // Gliederung nach Anträgen; ein Merkmal, das mehrere Anträge betrifft, wird beim ersten ausgeführt
  const { kl } = antraegeOf(a);
  const parts = kl.map(ant => ({ titel: `Antrag ${ant.nr}: ${ant.kurz}${ant.hilfsweise ? ' (hilfsweise)' : ''}`, sub: [ant.def ? `${ant.def.titel} (${ant.def.norm})` : '', ant.anchor ? 'Fundstelle ' + ant.anchor : ''].filter(Boolean).join(' · '), rows: rows.filter(r => inAntrag(ant, r)) }));
  const rest = rows.filter(r => !parts.some(p => p.rows.includes(r)));
  if (rest.length) parts.push({ titel: 'Weitere Punkte', sub: '', rows: rest });
  const done = new Map<string, string>();
  parts.forEach((part, pi) => {
    const L = String.fromCharCode(65 + pi);
    body += `<h2>${L}. ${H(part.titel)}</h2>${part.sub ? `<p class="muted">${H(part.sub)}</p>` : ''}`;
    for (const r of part.rows) {
      if (done.has(r.key)) { body += `<section><h3>${H(r.label)}${r.instanz ? ' – ' + H(r.instanz) : ''}</h3><p class="muted">Siehe oben unter ${done.get(r.key)}.</p></section>`; continue; }
      done.set(r.key, L);
      const j = judge[r.key] || {}; const pr = pruefOf(a, r); const st = effStatus(a, r);
      const pins = (j.urteile || []).filter(u => u.nr);
      body += `<section><h3>${H(r.label)}${r.instanz ? ' – ' + H(r.instanz) : ''}${r.norm ? ` <small>(${H(r.norm)})</small>` : ''}</h3>`;
      if (!j.checked) body += '<p class="tag">noch nicht geprüft</p>';
      body += pr ? `<p><b>Obersatz:</b> ${H(pr.obersatz)}</p>` : '<p class="muted">Kein Prüfungsschema hinterlegt.</p>';
      if (pr) body += '<ol>' + pr.schritte.map(s => {
        const ss = (j.schritte || {})[s.id] || {}; const sp = pins.filter(u => (u.schritte || []).includes(s.id));
        return `<li>${H(s.text)} – <b>${ss.status && ss.status !== 'offen' ? H(SSTAT[ss.status]) + ' (Gericht)' : 'offen'}</b>${ss.note ? `<div class="note">Notiz: ${H(ss.note)}</div>` : ''}${sp.length ? `<div class="rsp">Rspr.: ${sp.map(u => H(zitierUrteil(u))).join('; ')}</div>` : ''}</li>`;
      }).join('') + '</ol>';
      body += '<p class="ph">[… Würdigung durch das Gericht …]</p>';
      const facts: [string, any][] = [...r.klaeger.map(i => ['Kläger', i] as [string, any]), ...r.beklagter.map(i => ['Beklagter', i] as [string, any])];
      const factLi = facts.map(([w, i]) => `<li>${w}: ${H(i.kurz)} <span class="anc">(${H(i.anchor)})</span></li>`).join('');
      if (facts.length) {
        if (STATUS[st].needsProof) body += `<h4>Streitig <small>(${H(STATUS[st].short)})</small></h4><ul>${factLi}</ul>` + (r.beweis.length ? `<p class="muted">Beweisangebote:</p><ul>${r.beweis.map(b => `<li>${b.partei === 'klaeger' ? 'Kläger' : 'Beklagter'}: ${H(MITTEL[b.mittel] || b.mittel)} – ${H(b.kurz)} <span class="anc">(${H(b.anchor)})</span></li>`).join('')}</ul>` : '');
        else if (st === 'offen') body += `<h4>Vortrag (Einlassung steht aus)</h4><ul>${factLi}</ul>`;
        else body += `<h4>Unstreitig <small>(${H(STATUS[st].short)})</small></h4><ul>${factLi}</ul>`;
      }
      const rowPins = pins.filter(isRowPin);
      if (rowPins.length) body += `<h4>Rechtsprechung</h4><ul>${rowPins.map(u => `<li>${H(zitierUrteil(u))}${u.titel ? ` <span class="muted">– ${H(u.titel)}</span>` : ''}</li>`).join('')}</ul>`;
      if (j.note) body += `<p class="note">Notiz des Gerichts: ${H(j.note)}</p>`;
      body += '</section>';
    }
  });
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Begründungsgerüst ${H(a.az)}</title><style>
    body{font-family:Georgia,"Times New Roman",serif;max-width:820px;margin:30px auto;padding:0 20px;color:#1f2933;line-height:1.5}
    h1{font-size:20px;color:#00426f} h2{font-size:16px;color:#00426f;border-bottom:1px solid #d9e2ec;margin-top:28px} h3{font-size:14.5px;margin:18px 0 6px} h4{font-size:13px;margin:10px 0 4px}
    small,.muted{color:#5f6b7a} .tag{display:inline-block;font:600 11px Arial,sans-serif;color:#9a5b00;background:#fff4dc;border-radius:3px;padding:1px 6px;margin:0}
    .ph{font-style:italic;color:#5f6b7a;background:#f5f7fa;padding:6px 10px;border-left:3px solid #d9e2ec} .anc{font:11px monospace;color:#005f9f}
    .note{font-size:13px;color:#3e4c59} .rsp{font-size:13px;color:#4a2c94} .hint{font:12px Arial,sans-serif;color:#5f6b7a;background:#eef5fb;padding:8px 10px;border-radius:6px}
    .bar{margin-bottom:16px} .bar button{font:13px Arial,sans-serif;padding:6px 12px} @media print{.bar{display:none}} section{page-break-inside:avoid}
  </style></head><body><div class="bar"><button onclick="window.print()">Drucken</button></div>
  <h1>Begründungsgerüst – ${H(a.az)}</h1><p>${H(a.klaeger)} ./. ${H(a.beklagter)} · ${H(rules.label)} · Stand ${H(new Date().toLocaleString('de-DE'))} · erstellt mit BGH Pro Max</p>
  <p class="hint">Reine Gliederung entlang des Regelmodells. Obersätze und Hinweise sind Vorschläge im Konjunktiv; Status der Prüfschritte wie vom Gericht gesetzt. Zitiert werden nur angeheftete Entscheidungen aus der amtlichen Datenbank des Bundes. Die Würdigung nimmt das Gericht vor.</p>
  ${body}</body></html>`;
}

export function saveGeruest(a: Akte) {
  const blob = new Blob([geruestHtml(a)], { type: 'text/html' });
  const l = document.createElement('a'); l.href = URL.createObjectURL(blob); l.download = `Begruendungsgeruest_${a.az.replace(/[^\w-]+/g, '_')}.html`; l.click();
}
export function printGeruest(a: Akte) {
  const w = window.open('', '_blank');
  if (!w) { saveGeruest(a); return; }
  w.document.open(); w.document.write(geruestHtml(a)); w.document.close();
}
