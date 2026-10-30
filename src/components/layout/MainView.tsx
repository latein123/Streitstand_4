// Mittlere Spalte: Kopfzeile, Hinweise, Dokumente und Streitstand (nach Anträgen oder als Tabelle)
import { useApp, set, shownRows } from '../../state/store';
import { loadExample } from '../../state/actions';
import { RULES } from '../../config/regelmodell';
import { Logo } from './Logo';
import { Topbar } from './Topbar';
import { Banners } from './Banners';
import { DocsTable } from '../docs/DocsTable';
import { StreitTable } from '../streit/StreitTable';
import { AntragView } from '../streit/AntragView';
import { DiscardBlock } from '../streit/DiscardBlock';

function Welcome() {
  return (
    <div className="content"><div className="empty"><Logo /><h2>BGH Pro Max</h2>
      <p>Der Streitstand auf einen Blick: Vortrag und Gegenvortrag je Tatbestandsmerkmal – jede Angabe per Klick an der Originalstelle prüfbar.</p>
      <div className="steps">
        <div><i>1</i>Links „Neue Akte“ anlegen und den Aktenordner wählen</div>
        <div><i>2</i>„Streitstand analysieren“ starten</div>
        <div><i>3</i>Auf einen Vortrag klicken – rechts öffnet sich die Fundstelle</div>
      </div>
      <p><button className="tb primary" onClick={() => loadExample()}>Beispielakte Westring laden</button></p>
      <p className="small">Nur für synthetische Übungsakten: Inhalte werden zur Analyse an den KI-Anbieter gesendet.</p>
    </div></div>
  );
}

export function MainView() {
  const s = useApp();
  const a = s.current;
  if (!a) return <><Banners /><Welcome /></>;
  const rules = RULES[a.verfahren];
  const rows = shownRows(s, a);
  const docsOk = !!s.docs;

  return (
    <>
      <Topbar />
      {rows.length > 0 && (
        <div className="view-row"><div className="filters view-seg" title="Ansicht">
          <button className={'chip-f' + (s.viewTable ? '' : ' on')} onClick={() => set({ viewTable: false })}>Nach Anträgen</button>
          <button className={'chip-f' + (s.viewTable ? ' on' : '')} onClick={() => set({ viewTable: true })}>Gesamttabelle</button>
        </div></div>
      )}
      <div className="content">
        <Banners />
        {s.showDocs && s.docs && <DocsTable />}
        {rows.length
          ? (s.viewTable ? <StreitTable rows={rows} rules={rules} /> : <AntragView rows={rows} />)
          : (!s.busy && docsOk ? <div className="empty"><Logo /><h2>Noch keine Analyse</h2><p>{s.docs.size} Dokumente verknüpft. Starten Sie „Streitstand analysieren“.</p></div> : null)}
        {a.analysis && <DiscardBlock />}
      </div>
    </>
  );
}
