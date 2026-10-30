// Browser-Speicher (IndexedDB): Akten, OCR-Ergebnisse, eingelesene Dateien.
// Ohne IndexedDB (z. B. privates Fenster) wird nur im Arbeitsspeicher gehalten.
import type { Akte, FileEntry } from '../types';

type StoreName = 'akten' | 'ocr' | 'files';
let db: IDBDatabase | null = null;
const mem: Record<StoreName, Map<string, any>> = { akten: new Map(), ocr: new Map(), files: new Map() };

function open(): Promise<void> {
  return new Promise(res => {
    try {
      const r = indexedDB.open('team9-streitstand', 2);
      r.onupgradeneeded = () => {
        const d = r.result;
        (['ocr', 'files'] as const).forEach(n => { if (!d.objectStoreNames.contains(n)) d.createObjectStore(n); });
        if (!d.objectStoreNames.contains('akten')) d.createObjectStore('akten', { keyPath: 'id' });
      };
      r.onsuccess = () => { db = r.result; res(); };
      r.onerror = () => res();
    } catch { res(); }
  });
}

function tx<T = any>(store: StoreName, mode: IDBTransactionMode, fn: (s: any) => any): Promise<T> {
  if (!db) {
    const m = mem[store];
    const s = { getAll: () => ({ result: [...m.values()] }), get: (k: string) => ({ result: m.get(k) }), put: (v: any, k?: string) => { m.set(k ?? v.id, v); return {}; }, delete: (k: string) => { m.delete(k); return {}; } };
    const out = fn(s); return Promise.resolve(out && out.result);
  }
  return new Promise((res, rej) => {
    const t = db!.transaction(store, mode); const s = t.objectStore(store);
    const out = fn(s); t.oncomplete = () => res(out && out.result); t.onerror = () => rej(t.error);
  });
}

export const DB = {
  open,
  all: () => tx<Akte[]>('akten', 'readonly', s => s.getAll()),
  put: (a: Akte) => tx('akten', 'readwrite', s => s.put(a)),
  del: (id: string) => tx('akten', 'readwrite', s => s.delete(id)),
  ocrGet: (k: string) => tx('ocr', 'readonly', s => s.get(k)),
  ocrPut: (k: string, v: unknown) => tx('ocr', 'readwrite', s => s.put(v, k)),
  filesGet: (id: string) => tx<FileEntry[]>('files', 'readonly', s => s.get(id)),
  filesPut: (id: string, entries: FileEntry[]) => tx('files', 'readwrite', s => s.put(entries.map(e => ({ path: e.path, file: e.file })), id)),
  filesDel: (id: string) => tx('files', 'readwrite', s => s.delete(id))
};

// aktenId -> eingelesene Dateien (Zwischenspeicher, damit nicht jedes Mal aus IndexedDB gelesen wird)
export const memFiles = new Map<string, FileEntry[]>();
