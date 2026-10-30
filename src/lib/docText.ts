// Beste Textquelle eines Dokuments für die Analyse: MD > PDF-Text > OCR. Ergebnis wird je Dokument gemerkt.
import type { Doc, DocText, TextLine } from '../types';
import { openPdf, pdfPageTexts, renderPdfPageToCanvas } from './pdf';
import { ocr } from './ocr';

export async function analysisText(d: Doc, progress?: (msg: string) => void): Promise<DocText> {
  if (d.md) return { source: 'md', lines: d.md.lines.map((l, i) => ({ anchor: l.anchor, text: l.text, n: i })) };
  if (d.variants.pdf) {
    const pdf = await openPdf(d.variants.pdf), pages = await pdfPageTexts(d.variants.pdf), lines: TextLine[] = [];
    let ocrPages = 0;
    for (let p = 1; p <= pages.length; p++) {
      let t = pages[p - 1];
      if (t.replace(/\s/g, '').length < 25) { // Seite ohne Textebene (Scan) -> Texterkennung
        progress && progress(`Texterkennung ${d.id}, Seite ${p} …`);
        const { canvas } = await renderPdfPageToCanvas(pdf, p, 2);
        t = (await ocr(canvas, 'pdf|' + d.variants.pdf.sig + '|' + p)).text; ocrPages++;
      }
      t.split('\n').map(s => s.trim()).filter(Boolean).forEach(s => lines.push({ anchor: null, page: p, text: s }));
    }
    return { source: ocrPages === pages.length ? 'ocr' : ocrPages ? 'pdf+ocr' : 'pdf', lines };
  }
  if (d.variants.img) {
    progress && progress(`Texterkennung ${d.id} (Bild) …`);
    const r = await ocr(d.variants.img.file, 'img|' + d.variants.img.sig);
    return { source: 'ocr', lines: r.text.split('\n').map(s => s.trim()).filter(Boolean).map(s => ({ anchor: null, text: s })) };
  }
  return { source: 'none', lines: [] };
}

export const textCache = new Map<string, DocText>(); // sig -> {source, lines}
export function docSig(d: Doc) { return Object.values(d.variants).map(v => v.sig).join('#'); }
export function readState(d: Doc): DocText | null { return textCache.get(docSig(d)) || null; }
export const textLength = (r: DocText) => r.lines.reduce((n, l) => n + l.text.length, 0);
