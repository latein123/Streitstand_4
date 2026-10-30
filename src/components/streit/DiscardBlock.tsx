// KI-Angaben, deren Zitat nicht wörtlich gefunden wurde (Transparenz für das Gericht)
import { useApp } from '../../state/store';

export function DiscardBlock() {
  const a = useApp(s => s.current);
  const d = a.analysis.discarded || [];
  return (
    <details className="discard card"><summary>Verworfene KI-Angaben ({d.length})</summary>
      {d.length ? <ul>{d.map((x, i) => (
        <li key={i}><b>{x.merkmal}</b>{x.instanz ? ' (' + x.instanz + ')' : ''} · {x.partei}: {x.kurz || ''} – angeblich {x.dok}: <span className="q">„{x.zitat}“</span></li>
      ))}</ul> : <p className="small">Alle Zitate der KI wurden wörtlich in den Dokumenten gefunden.</p>}
      <p className="small">Jede Angabe in der Tabelle wurde automatisch gegen den Originaltext geprüft. Angaben, deren Zitat nicht gefunden wurde, erscheinen nur hier.</p>
    </details>
  );
}
