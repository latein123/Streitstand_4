import { useState } from 'react';
import { useApp } from '../../state/store';
import { saveRubrum } from '../../state/actions';
import { Modal, closeModal } from './Modal';

export function RubrumModal() {
  const a = useApp(s => s.current);
  const [az, setAz] = useState(a.az), [kl, setKl] = useState(a.klaeger), [bk, setBk] = useState(a.beklagter);
  return (
    <Modal title="Rubrum">
      <label htmlFor="rAz">Aktenzeichen</label><input id="rAz" value={az} onChange={e => setAz(e.target.value)} />
      <label htmlFor="rKl">Kläger</label><input id="rKl" value={kl} onChange={e => setKl(e.target.value)} />
      <label htmlFor="rBk">Beklagter</label><input id="rBk" value={bk} onChange={e => setBk(e.target.value)} />
      {a.rubrumAuto && <p className="small">Automatisch aus den Schriftsätzen erkannt – bitte prüfen.</p>}
      <div className="actions"><span style={{ flex: 1 }} />
        <button className="tb" onClick={closeModal}>Abbrechen</button>
        <button className="tb primary" onClick={() => saveRubrum(az, kl, bk)}>Speichern</button>
      </div>
    </Modal>
  );
}
