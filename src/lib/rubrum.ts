// Rubrum (Aktenzeichen, Parteien) und Verfahrensart aus den Dokumenten erkennen
import type { FileEntry, Verfahren } from '../types';
import { fmtOf } from './files';
import { openPdfFile, pageText } from './pdf';
import { normWs } from './util';
import { ask } from '../ai/llm';
import { rubrumPrompt } from '../ai/prompts';

export function verfahrenFromText(text: string): Verfahren { return /räumung|eigenbedarf|herausgabe der wohnung/i.test(text) ? 'raeumung' : 'minderung'; }

export async function detectVerfahren(entries: FileEntry[]) {
  const parts = entries.map(e => e.path);
  for (const e of entries.filter(e => fmtOf(e.path) === 'md').slice(0, 40)) parts.push(await e.file.text());
  for (const e of entries.filter(e => fmtOf(e.path) === 'pdf').slice(0, 8)) {
    try { parts.push(await pageText(await openPdfFile(e.file), 1)); } catch { /* unlesbar */ }
  }
  return verfahrenFromText(parts.join('\n'));
}

// Text für die Rubrumserkennung: Aktendeckel und Klageschrift zuerst, sonst die ersten Dokumente
export async function rubrumText(entries: FileEntry[]) {
  const rank = (p: string) => /aktendeckel|deckblatt|rubrum/i.test(p) ? 0 : /klageschrift|klage(?!erwiderung)/i.test(p) ? 1 : 2;
  const pick = entries.filter(e => ['md', 'pdf'].includes(fmtOf(e.path))).sort((x, y) => rank(x.path) - rank(y.path) || x.path.localeCompare(y.path)).slice(0, 4);
  const parts: string[] = [];
  for (const e of pick) {
    try {
      if (fmtOf(e.path) === 'md') parts.push((await e.file.text()).slice(0, 3000));
      else {
        const pdf = await openPdfFile(e.file);
        for (let n = 1; n <= Math.min(2, pdf.numPages); n++) parts.push((await pageText(pdf, n)).slice(0, 3000));
      }
    } catch { /* unlesbar */ }
  }
  return parts.join('\n\n').slice(0, 9000);
}

// Muster-Erkennung als Rückfall, wenn die KI nicht erreichbar ist
function rubrumGuess(text: string) {
  const t = normWs(text), name = "((?:Dr\\.\\s+)?[A-ZÄÖÜ][\\wäöüß.-]*(?:\\s+(?:von\\s+|van\\s+|de\\s+)?[A-ZÄÖÜ][\\wäöüß-]*){1,3})";
  const role = "(?:(?:Vermieter|Mieter)(?:in)?\\s+|Herr\\s+|Frau\\s+)?";
  const az = (t.match(/\b\d{1,3}\s?[A-Z]{1,3}\s?\d{1,6}\/\d{2,4}\b/) || t.match(/\bSYN-[A-Z0-9-]+\b/) || [])[0] || (t.match(/(?:Aktenzeichen|Az\.)\s*:?\s*([^\s,;]+)/) || [])[1];
  const kl = (t.match(new RegExp('Kläger(?:in)?\\b[\\s:,]*' + role + name)) || [])[1];
  const bk = (t.match(new RegExp('Beklagte[rn]?\\b[\\s:,]*' + role + name)) || [])[1];
  return { az: az || '', klaeger: kl || '', beklagter: bk || '' };
}

export async function detectRubrum(text: string, folderName: string) {
  const guess = rubrumGuess(text);
  if (!normWs(text)) return guess;
  let ki: any = {};
  try { ki = await ask(rubrumPrompt(text, folderName)) || {}; } catch { /* Rückfall: Muster */ }
  // Jede KI-Angabe muss im Text stehen – sonst gilt die Muster-Erkennung
  const found = (v: string) => { v = normWs(v); return v && v.split(/\s+und\s+/).every(x => normWs(text).toLowerCase().includes(x.toLowerCase())) ? v : ''; };
  return { az: found(ki.az) || guess.az, klaeger: found(ki.klaeger) || guess.klaeger, beklagter: found(ki.beklagter) || guess.beklagter };
}
