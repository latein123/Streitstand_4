// Seitenpanel rechts: zeigt je nach Zustand Dokument, Rechtsprechung oder Prüfung
import { useApp } from '../../state/store';
import { closePreview, showPruef } from '../../state/actions';
import { DocPreview } from './DocPreview';
import { RspPanel } from './RspPanel';
import { PruefPanel } from '../pruefung/PruefPanel';

export function PreviewPane() {
  const p = useApp(s => s.preview);
  useApp(s => s.rev); // Akte/Preview werden direkt verändert → bei jedem touch() neu zeichnen
  if (!p) return null;
  if (p.kind === 'doc') return <DocPreview p={p} />;
  if (p.kind === 'rsp') return <RspPanel p={p} />;
  return <PruefPanel p={p} />;
}

export const CloseBtn = ({ title }: { title: string }) => <button className="pv-close" title={title} aria-label={title} onClick={closePreview}>✕</button>;
export const BackBtn = ({ back }: { back: string | null }) => back ? <button className="note-btn pv-back" onClick={() => showPruef(back)}>← zurück zur Prüfung</button> : null;
