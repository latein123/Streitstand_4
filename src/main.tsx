import { createRoot } from 'react-dom/client';
import './styles/index.css';
import { App } from './App';

createRoot(document.getElementById('root')).render(<App />);

// Testschnittstelle (nur im Entwicklungsmodus, für automatisierte Tests in der Browser-Konsole)
if (import.meta.env.DEV) {
  Promise.all([import('./state/store'), import('./state/actions'), import('./lib/db')]).then(([store, actions, db]) => {
    (window as any).__T9 = { useApp: store.useApp, actions, DB: db.DB, memFiles: db.memFiles };
  });
}
