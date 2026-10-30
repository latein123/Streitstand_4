// Texterkennung (Tesseract) mit Zwischenspeicher in IndexedDB
import { createWorker, type Worker } from 'tesseract.js';
import { DB } from './db';

export interface OcrResult { words: { text: string; b: [number, number, number, number] }[]; text: string }

let ocrWorker: Promise<Worker> | null = null;

// Optional: Sprachdaten als Base64 unter public/lang/ ablegen (offline). Sonst lädt Tesseract sie selbst aus dem Netz.
async function preloadLangData() {
  let b64: string | null = null;
  try { const r = await fetch(new URL('lang/deu.traineddata.gz.b64.txt', document.baseURI)); if (r.ok && !/html/.test(r.headers.get('content-type') || '')) b64 = await r.text(); } catch { /* optional */ }
  if (!b64) return;
  const bin = atob(b64.trim()), data = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) data[i] = bin.charCodeAt(i);
  // in den Sprachdaten-Speicher der Texterkennung legen; sie liest von dort statt aus dem Netz
  await new Promise<void>(res => {
    try {
      const r = indexedDB.open('keyval-store', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('keyval');
      r.onsuccess = () => { const tx = r.result.transaction('keyval', 'readwrite'); tx.objectStore('keyval').put(data, './deu.traineddata'); tx.oncomplete = () => res(); tx.onerror = () => res(); };
      r.onerror = () => res();
    } catch { res(); }
  });
}

export async function ocr(source: HTMLCanvasElement | File | Blob, cacheKey?: string): Promise<OcrResult> {
  if (cacheKey) { const c = await DB.ocrGet(cacheKey); if (c) return c; }
  if (!ocrWorker) ocrWorker = preloadLangData().then(() => createWorker('deu'));
  const { data } = await (await ocrWorker).recognize(source as any);
  const res: OcrResult = { words: data.words.map(w => ({ text: w.text, b: [w.bbox.x0, w.bbox.y0, w.bbox.x1, w.bbox.y1] as [number, number, number, number] })), text: data.text };
  if (cacheKey) await DB.ocrPut(cacheKey, res);
  return res;
}
