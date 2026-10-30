// PDF lesen und rendern (pdf.js)
import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.js?url';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { Variant } from '../types';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
export { pdfjsLib };

const pdfCache = new Map<string, Promise<PDFDocumentProxy>>();

export async function openPdf(variant: Variant) {
  if (!pdfCache.has(variant.sig)) {
    const buf = new Uint8Array(await variant.file.arrayBuffer());
    pdfCache.set(variant.sig, pdfjsLib.getDocument({ data: buf }).promise);
  }
  return pdfCache.get(variant.sig);
}

export async function openPdfFile(file: File) {
  return pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
}

export async function pageText(pdf: PDFDocumentProxy, p: number) {
  return (await (await pdf.getPage(p)).getTextContent()).items.map((i: any) => i.str).join(' ');
}

export async function pdfPageTexts(variant: Variant) {
  const pdf = await openPdf(variant); const pages: string[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const tc = await (await pdf.getPage(p)).getTextContent();
    let s = ''; tc.items.forEach((it: any) => { s += it.str + (it.hasEOL ? '\n' : ' '); });
    pages.push(s);
  }
  return pages;
}

export async function renderPdfPageToCanvas(pdf: PDFDocumentProxy, p: number, scale: number) {
  const page = await pdf.getPage(p); const vp = page.getViewport({ scale });
  const c = document.createElement('canvas'); c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
  await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
  return { canvas: c, viewport: vp, page };
}
