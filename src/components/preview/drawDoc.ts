// Dokument zeichnen und Fundstelle markieren. Arbeitet bewusst direkt mit dem DOM (pdf.js-Textebene, OCR-Kästen).
import type { Doc, Variant } from '../../types';
import { findQuote, type QuoteRange } from '../../lib/quote';
import { openPdf, pdfjsLib, renderPdfPageToCanvas } from '../../lib/pdf';
import { ocr, type OcrResult } from '../../lib/ocr';
import { esc } from '../../lib/util';

export type DrawResult = 'exact' | 'approx' | 'ocr' | 'miss' | null;

function wrapRanges(textNodes: Text[], ranges: QuoteRange[]) {
  ranges.slice().sort((x, y) => (y.si - x.si) || (y.start - x.start)).forEach(r => {
    const node = textNodes[r.si]; if (!node) return;
    const mid = node.splitText(r.start); mid.splitText(r.end - r.start);
    const m = document.createElement('mark'); m.className = 'hl'; mid.parentNode.insertBefore(m, mid); m.appendChild(mid);
  });
}
function textNodesIn(root: Element, skipSel?: string): Text[] {
  const out: Text[] = [];
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => (skipSel && n.parentElement.closest(skipSel)) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
  let n: Node; while ((n = w.nextNode())) out.push(n as Text); return out;
}

export function drawMd(d: Doc, body: HTMLElement, quote: string | null): DrawResult {
  const md = d.md;
  body.innerHTML = `<div class="md-doc"><h2>${esc(md.title)}</h2><div class="fm">${Object.entries(md.fm).map(([k, v]) => esc(k) + ': ' + esc(v)).join(' · ')}</div>
    ${md.lines.map(l => `<p class="md-line">${l.anchor ? `<span class="lan">${esc(l.anchor)}</span>` : ''}<span class="lt">${esc(l.text)}</span></p>`).join('')}</div>`;
  if (!quote) return null;
  const nodes = textNodesIn(body.querySelector('.md-doc'), '.lan, h2, .fm');
  const hit = findQuote(nodes.map(n => ({ text: n.data })), quote, true);
  if (!hit) return 'miss';
  wrapRanges(nodes, hit.ranges); return hit.exact ? 'exact' : 'approx';
}

export async function drawPdf(d: Doc, body: HTMLElement, quote: string | null, alive: () => boolean): Promise<DrawResult> {
  const pdf = await openPdf(d.variants.pdf);
  body.innerHTML = '';
  const width = Math.max(320, body.clientWidth - 28);
  const textNodes: Text[] = [], ocrPages: { p: number; wrap: HTMLElement }[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    if (!alive()) return null;
    const page = await pdf.getPage(p);
    const base = page.getViewport({ scale: 1 }); const scale = width / base.width; const vp = page.getViewport({ scale });
    const wrap = document.createElement('div'); wrap.className = 'pdf-page'; wrap.style.width = vp.width + 'px'; wrap.style.height = vp.height + 'px';
    const c = document.createElement('canvas'); const dpr = window.devicePixelRatio || 1;
    c.width = Math.floor(vp.width * dpr); c.height = Math.floor(vp.height * dpr); c.style.width = vp.width + 'px'; c.style.height = vp.height + 'px';
    wrap.appendChild(c); body.appendChild(wrap);
    await page.render({ canvasContext: c.getContext('2d'), viewport: page.getViewport({ scale: scale * dpr }) }).promise;
    const tc = await page.getTextContent();
    if (tc.items.map((i: any) => i.str).join('').replace(/\s/g, '').length > 10) {
      const tl = document.createElement('div'); tl.className = 'textLayer'; tl.style.setProperty('--scale-factor', String(scale)); wrap.appendChild(tl);
      await (pdfjsLib as any).renderTextLayer({ textContentSource: tc, container: tl, viewport: vp, textDivs: [] }).promise;
      textNodes.push(...textNodesIn(tl));
    } else ocrPages.push({ p, wrap });
  }
  if (!quote) return null;
  if (textNodes.length) {
    const hit = findQuote(textNodes.map(n => ({ text: n.data })), quote, true);
    if (hit) { wrapRanges(textNodes, hit.ranges); return hit.exact ? 'exact' : 'approx'; }
  }
  for (const op of ocrPages) {
    if (!alive()) return null;
    const note = document.createElement('p'); note.className = 'pv-note'; note.textContent = `Seite ${op.p} ist ein Scan – Texterkennung läuft …`; body.insertBefore(note, body.firstChild);
    const { canvas } = await renderPdfPageToCanvas(pdf, op.p, 2);
    const r = await ocr(canvas, 'pdf|' + d.variants.pdf.sig + '|' + op.p);
    note.textContent = `Seite ${op.p} ist ein Scan – Markierung per Texterkennung.`;
    const res = overlayOcr(op.wrap, r, canvas.width, canvas.height, quote);
    if (res) return res;
  }
  return 'miss';
}

function overlayOcr(wrap: HTMLElement, r: OcrResult, w: number, h: number, quote: string): DrawResult {
  const hit = findQuote(r.words.map(x => ({ text: x.text })), quote, true);
  if (!hit) return null;
  hit.ranges.forEach(rg => {
    const b = r.words[rg.si].b; const box = document.createElement('div'); box.className = 'ocr-box';
    box.style.left = (100 * b[0] / w) + '%'; box.style.top = (100 * b[1] / h) + '%';
    box.style.width = (100 * (b[2] - b[0]) / w) + '%'; box.style.height = (100 * (b[3] - b[1]) / h) + '%';
    wrap.appendChild(box);
  });
  return hit.exact ? 'ocr' : 'approx';
}

export async function drawImg(variant: Variant, body: HTMLElement, quote: string | null, alive: () => boolean, key: string): Promise<DrawResult> {
  const url = URL.createObjectURL(variant.file);
  body.innerHTML = `<p class="pv-note">${quote ? 'Texterkennung läuft …' : ''}</p><div class="img-wrap"><img alt="Dokument"></div>`;
  const img = body.querySelector('img'); await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
  const wrap = body.querySelector<HTMLElement>('.img-wrap'); wrap.style.maxWidth = img.naturalWidth + 'px';
  if (!quote) return null;
  const r = await ocr(variant.file, key); if (!alive()) return null;
  const res = overlayOcr(wrap, r, img.naturalWidth, img.naturalHeight, quote);
  const n = body.querySelector('.pv-note'); if (n) n.textContent = 'Markierung per Texterkennung (OCR) – kann leicht abweichen.';
  return res || 'miss';
}
