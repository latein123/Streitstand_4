// Grundgerüst für Dialoge
import { set } from '../../state/store';

export function Modal({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="modal-bg"><div className="modal" role="dialog" aria-label={title}>
      <h3>{title}</h3>
      {children}
    </div></div>
  );
}
export const closeModal = () => set({ modal: null });
