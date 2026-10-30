// Grundlayout: Aktenliste links · Streitstand Mitte · Seitenpanel rechts (Dokument, Prüfung, Rechtsprechung)
import { useEffect } from 'react';
import { useApp, set } from './state/store';
import { closePreview, init } from './state/actions';
import { Sidebar } from './components/layout/Sidebar';
import { MainView } from './components/layout/MainView';
import { PreviewPane } from './components/preview/PreviewPane';
import { SettingsModal } from './components/modals/SettingsModal';
import { RubrumModal } from './components/modals/RubrumModal';
import { GeruestModal } from './components/modals/GeruestModal';

export function App() {
  const preview = useApp(s => s.preview);
  const modal = useApp(s => s.modal);

  useEffect(() => { init(); }, []);

  // Esc schließt erst das Menü, dann das Seitenpanel
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const s = useApp.getState();
      if (s.menu) set({ menu: false }); else if (s.preview) closePreview();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <div className={'app' + (preview ? ' with-preview' : '')} lang="de">
        <Sidebar />
        <main className="main"><MainView /></main>
        {preview && <section className="preview"><PreviewPane /></section>}
      </div>
      {modal === 'settings' && <SettingsModal />}
      {modal === 'rubrum' && <RubrumModal />}
      {modal === 'geruest' && <GeruestModal />}
    </>
  );
}
