import { useApp } from '../../state/store';
import { printGeruest, saveGeruest } from '../../lib/geruest';
import { Modal, closeModal } from './Modal';

export function GeruestModal() {
  const a = useApp(s => s.current);
  return (
    <Modal title="Begründungsgerüst">
      <p className="small">Gliederung je Merkmal in der Reihenfolge des Regelmodells: Obersatz, Prüfschritte mit den vom Gericht gesetzten Status, Platzhalter für die Würdigung, Tatsachen mit Fundstellen (unstreitig / streitig) und nur die angehefteten, über die amtliche Datenbank verifizierten Entscheidungen. Es wird keine Würdigung formuliert.</p>
      <div className="actions">
        <button className="tb" onClick={closeModal}>Abbrechen</button>
        <button className="tb" onClick={() => { saveGeruest(a); closeModal(); }}>Als HTML speichern</button>
        <button className="tb primary" onClick={() => { printGeruest(a); closeModal(); }}>Druckansicht öffnen</button>
      </div>
    </Modal>
  );
}
