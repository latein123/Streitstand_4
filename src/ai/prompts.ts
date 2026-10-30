// Alle Prompts an die KI an einer Stelle. Inhaltliche Änderungen hier vom Team juristisch gegenlesen lassen.
import type { Akte, Doc, DocText, Gruppe, Merkmal, Partei, Row, RuleSet } from '../types';
import { ANTRAEGE } from '../config/antraege';

export const SYSTEM_PROMPT = `Du bist ein Assistenzsystem für Richterinnen und Richter am Amtsgericht in Wohnraummietsachen. Du erfasst den Streitstand strukturiert (Relationstechnik). Du entscheidest NICHT, wer Recht hat, und würdigst keine Beweise.

Strikte Regeln:
1. Verwende ausschließlich Informationen aus den mitgelieferten Dokumenten. Erfinde nichts: keine Tatsachen, Urteile, Prozentquoten oder Normen.
2. Jede Angabe braucht die Dokument-ID ("dok") und ein WÖRTLICHES Zitat ("zitat"): zusammenhängend, 4 bis 30 Wörter, buchstabengetreu aus genau EINEM Dokument kopiert, ohne Zeilenmarker wie [M01:L02].
3. "kurz" ist eine sachliche Zusammenfassung des Vortrags in höchstens 14 Wörtern.
4. Parteivortrag kommt aus den SCHRIFTSÄTZEN: Vortrag der Klagepartei aus Klageschrift und Replik, Vortrag der beklagten Partei aus Klageerwiderung und Duplik. Anlagen (Verträge, E-Mails, Chats, Notizen, Erklärungen Dritter, Befunde, Listen) sind KEIN Vortrag, sondern Beweismittel der Partei, die sie vorlegt oder sich auf sie beruft – sie gehören unter "beweisangebote". Nur wenn eine Partei noch keinen Schriftsatz zu einem Punkt hat, darf ihre eigene Äußerung in einer Anlage (z. B. ihr eigenes Schreiben) als Vortrag dienen.
5. Status je Zeile (ZPO):
   - "unstreitig": von der Gegenseite ausdrücklich zugestanden (§ 288 ZPO)
   - "nicht_bestritten": Gegenseite hat sich eingelassen, äußert sich aber zu diesem Punkt nicht (§ 138 Abs. 3 ZPO)
   - "bestritten": substantiiert bestritten
   - "nichtwissen": mit Nichtwissen bestritten (§ 138 Abs. 4 ZPO)
   - "pauschal": nur pauschal/unsubstantiiert bestritten (z. B. nur fehlende Beweismittel gerügt)
   - "rechtsfrage": Tatsachen unstreitig, nur die rechtliche Bewertung ist streitig
   - "offen": NUR wenn im gesamten Material noch KEINE Klageerwiderung / Einlassung der Gegenseite existiert
   - "nicht_vorgetragen": keine Partei trägt hierzu etwas vor
   "begruendung": ein Satz, warum dieser Status (mit Bezug auf den Vortrag).
6. Parteidisziplin: Unter "klaeger" steht nur Vortrag der Klagepartei, unter "beklagter" nur Vortrag der beklagten Partei. Ein Zitat aus einem Dokument der Klagepartei darf nie unter "beklagter" stehen (und umgekehrt). Liegt keine Einlassung vor, bleibt die Liste leer.
7. Beweisangebote: nur ausdrückliche Beweisantritte (z. B. "Beweis:", "Zeugnis", Sachverständigengutachten, vorgelegte Urkunden/Anlagen). "mittel" ist eines von: zeuge, urkunde, sachverstaendiger, augenschein, partei. "Zeugnis <Name>" oder "Zeugin/Zeuge <Name>" ist IMMER "zeuge" (eigener Eintrag je Zeuge, zitat = die Stelle mit dem Namen). "Beweis: M04" bzw. eine vorgelegte Anlage ist "urkunde". Eine private schriftliche Erklärung einer Person ist eine Urkunde, kein Zeugenbeweis – außer die Person wird als Zeuge benannt. "partei" ist "klaeger" oder "beklagter".
8. Jede Aussage nur einmal pro Zeile; keine Dubletten.
9. Antworte ausschließlich im vorgegebenen Format (JSON bzw. JSON Lines), ohne Erläuterungen davor oder danach.`;

// side = Schriftsatz-Seite des Dokuments (oder null bei Anlagen)
export function docBlock(d: Doc, at: DocText, side: Partei | null) {
  const head = `### Dokument ${d.id} | ${d.title}${d.date ? ' | Datum ' + d.date : ''}${d.release ? ' | Release ' + d.release : ''}${side ? ' | SCHRIFTSATZ der ' + (side === 'klaeger' ? 'Klagepartei' : 'beklagten Partei') : ''}`;
  const body = at.lines.map(l => (l.anchor ? `[${l.anchor}] ` : (l.page ? `[S.${l.page}] ` : '')) + l.text).join('\n');
  return head + '\n' + body;
}
const ROW_SCHEMA = `{"merkmal":"ID","instanz":"","klaeger":[{"kurz":"","dok":"","zitat":""}],"beklagter":[{"kurz":"","dok":"","zitat":""}],"status":"","begruendung":"","beweisangebote":[{"partei":"klaeger|beklagter","mittel":"","kurz":"","dok":"","zitat":""}]}`;
const SCHEMA = `{"zeilen":[${ROW_SCHEMA}]}`;
export function promptHead(akte: Akte, rules: RuleSet) {
  return `Akte ${akte.az}: Klagepartei ${akte.klaeger} (${rules.klaegerRolle}), beklagte Partei ${akte.beklagter} (${rules.beklagterRolle}). Verfahren: ${rules.label}.`;
}
export function merkmalPrompt(akte: Akte, rules: RuleSet, m: Merkmal, docs: string, instanzen?: string[] | null) {
  const multi = m.multi
    ? (instanzen && instanzen.length
        ? `Lege für JEDEN der folgenden Mängel genau eine Zeile an und übernimm die Bezeichnung wörtlich in "instanz": ${instanzen.map(i => '"' + i + '"').join(', ')}.`
        : `Lege für jeden gerügten Mangel genau eine eigene Zeile an; "instanz" = kurze, neutrale Bezeichnung des Mangels (z. B. "Feuchtigkeit/Schimmel Schlafzimmer", "Lärm aus Nachbarwohnung").`)
    : `Lege genau EINE Zeile an ("instanz": "").`;
  return `${promptHead(akte, rules)}

Erfasse den Streitstand zu genau diesem Tatbestandsmerkmal:
${m.id}: ${m.label} (${m.norm}). Gemeint: ${m.hint}.
${m.pruefung && m.pruefung.statusHinweis ? 'Hinweis zur Statusbewertung: ' + m.pruefung.statusHinweis + '\n' : ''}${multi}
Verwende in "merkmal" die Kennung "${m.id}". Ist zu dem Merkmal nichts vorgetragen: Status "nicht_vorgetragen" und leere Listen.

JSON-Schema:
${SCHEMA}

DOKUMENTE:

${docs}`;
}
// Gestellte Anträge beider Parteien – nur Erfassung, keine Bewertung
function antraegeAnleitung(akte: Akte) {
  const typen = (ANTRAEGE[akte.verfahren] || []).map(t => `- ${t.typ}: ${t.titel} (${t.norm})`).join('\n');
  return `Erfasse alle ANTRÄGE, die die Parteien in den Schriftsätzen stellen (Klageanträge, Klageabweisungsantrag, Hilfsanträge, Klageänderungen). Bewerte nichts.
Ordne jeden Antrag der Klagepartei genau einem Typ zu:
${typen}
- SONST: passt zu keinem dieser Typen
Anträge der beklagten Partei erhalten den Typ "ABWEISUNG" (Klageabweisung) oder "SONST".
Wird derselbe Antrag in einem späteren Schriftsatz nur wiederholt, erfasse ihn nur einmal (an der Stelle, an der er zuerst gestellt wird).
"nr" = Nummer des Antrags laut Schriftsatz (sonst fortlaufend), "kurz" = knappe neutrale Bezeichnung (z. B. "Zahlung von 400,00 EUR"), "hilfsweise" = true bei Hilfsanträgen.
"dok" = Dokument-ID, "zitat" = wörtliche, zusammenhängende Passage (höchstens 25 Wörter), in der der Antrag gestellt wird.`;
}
export function antraegePrompt(akte: Akte, rules: RuleSet, docs: string) {
  return `${promptHead(akte, rules)}

${antraegeAnleitung(akte)}

Antworte nur mit JSON: {"antraege":[{"nr":"1","partei":"klaeger","typ":"…","kurz":"…","hilfsweise":false,"dok":"…","zitat":"…"}]}

DOKUMENTE:

${docs}`;
}
// Ein Aufruf je Prüfungsgruppe statt je Merkmal: weniger Aufrufe, Mängel innerhalb der Gruppe einheitlich benannt
function merkmalListe(g: Gruppe) {
  return g.merkmale.map(m => `- ${m.id}: ${m.label} (${m.norm}). Gemeint: ${m.hint}. ` + (m.pruefung && m.pruefung.statusHinweis ? `Hinweis zur Statusbewertung: ${m.pruefung.statusHinweis} ` : '') + (m.multi
    ? 'JE GERÜGTEM MANGEL eine eigene Zeile; "instanz" = kurze, neutrale Bezeichnung des Mangels (z. B. "Feuchtigkeit/Schimmel Schlafzimmer", "Lärm aus Nachbarwohnung") – für alle Merkmale dieser Gruppe je Mangel GENAU DIESELBE Bezeichnung.'
    : 'Genau EINE Zeile ("instanz": "").')).join('\n');
}
function zusatzAnleitung(rules: RuleSet) {
  const alle = rules.groups.flatMap(x => x.merkmale.map(m => `- ${m.label} (${m.norm})`)).join('\n');
  return `

ZUSÄTZLICH: Erfasse höchstens 4 WEITERE streitige Tatsachen, die keinem Tatbestandsmerkmal des gesamten Prüfprogramms zuzuordnen, aber für die Entscheidung erheblich sind. Das gesamte Prüfprogramm:
${alle}
Verwende für diese zusätzlichen Zeilen in "merkmal" eine kurze Überschrift (z. B. "Terminabsprache Fachbetrieb"), keine der obigen Kennungen.`;
}
export function gruppePrompt(akte: Akte, rules: RuleSet, g: Gruppe, docs: string, mitZusatz: boolean) {
  const zusatz = mitZusatz ? zusatzAnleitung(rules) : '';
  return `${promptHead(akte, rules)}

Erfasse den Streitstand zu ALLEN folgenden Tatbestandsmerkmalen der Prüfungsgruppe „${g.titel}“:
${merkmalListe(g)}
Verwende in "merkmal" jeweils die Kennung (z. B. "${g.merkmale[0].id}"). Ist zu einem Merkmal nichts vorgetragen: eine Zeile mit Status "nicht_vorgetragen" und leeren Listen.${zusatz}

JSON-Schema:
${SCHEMA}

DOKUMENTE:

${docs}`;
}
// Claude: mehrere Prüfungsgruppen (und ggf. die Anträge) in EINEM Aufruf, Ausgabe zeilenweise zum Mitlesen
export function paketPrompt(akte: Akte, rules: RuleSet, gs: Gruppe[], docs: string, mitZusatz: boolean, mitAntraegen: boolean) {
  const listen = gs.map(g => `Prüfungsgruppe „${g.titel}“:\n${merkmalListe(g)}`).join('\n\n');
  return `${promptHead(akte, rules)}

Erfasse den Streitstand zu ALLEN folgenden Tatbestandsmerkmalen:
${listen}
Verwende in "merkmal" jeweils die Kennung (z. B. "${gs[0].merkmale[0].id}"). Ist zu einem Merkmal nichts vorgetragen: eine Zeile mit Status "nicht_vorgetragen" und leeren Listen.${mitZusatz ? zusatzAnleitung(rules) : ''}${mitAntraegen ? '\n\nAUSSERDEM – ANTRÄGE: ' + antraegeAnleitung(akte) : ''}

AUSGABEFORMAT – JSON Lines: Schreibe jedes Ergebnis als EIN kompaktes JSON-Objekt auf EINE eigene Textzeile (kein umschließendes Array, keine Zeilenumbrüche innerhalb eines Objekts, kein Code-Block, kein sonstiger Text).
Je Tatbestandsmerkmal bzw. Mangel eine Zeile nach diesem Schema:
${ROW_SCHEMA}${mitAntraegen ? `
${gs.length ? 'Danach ' : ''}je Antrag eine Zeile nach diesem Schema:
{"antrag":true,"nr":"1","partei":"klaeger","typ":"…","kurz":"…","hilfsweise":false,"dok":"…","zitat":"…"}` : ''}

DOKUMENTE:

${docs}`;
}
export function zusatzPrompt(akte: Akte, rules: RuleSet, docs: string) {
  const all = rules.groups.flatMap(g => g.merkmale.map(m => `- ${m.label} (${m.norm})`)).join('\n');
  return `${promptHead(akte, rules)}

Folgende Tatbestandsmerkmale werden bereits gesondert erfasst:
${all}

Erfasse höchstens 4 WEITERE streitige Tatsachen, die keinem dieser Merkmale zuzuordnen, aber für die Entscheidung erheblich sind. Verwende in "merkmal" eine kurze Überschrift für den Punkt (z. B. "Terminabsprache Fachbetrieb"). Gibt es keine, antworte {"zeilen":[]}.

JSON-Schema:
${SCHEMA}

DOKUMENTE:

${docs}`;
}

// Rechtsprechung: KI schlägt nur SUCHBEGRIFFE vor – angezeigt werden ausschließlich echte API-Treffer
export function rspQueryPrompt(a: Akte, rules: RuleSet, r: Row) {
  const vortrag = [...r.klaeger, ...r.beklagter].map(i => '- ' + i.kurz).join('\n') || '- (kein Vortrag erfasst)';
  return `${promptHead(a, rules)}
Aufgabe: Schlage Suchanfragen für die amtliche Rechtsprechungsdatenbank des Bundes vor, um einschlägige Entscheidungen zu folgendem Streitpunkt zu finden. Suche NICHT selbst nach Urteilen und nenne keine Urteile.
Streitpunkt: ${r.label}${r.instanz ? ' – ' + r.instanz : ''} (${r.norm || 'ohne Norm'})
Vortrag:
${vortrag}
Regeln: genau 3 Suchanfragen; jede aus 1 bis 3 deutschen Fachbegriffen, die alle wörtlich im Urteilstext vorkommen müssen; keine Paragraphenzeichen, keine Aktenzeichen.
Antworte nur mit JSON: {"suchbegriffe":["…","…","…"]}`;
}

// Rubrum aus den ersten Seiten der Akte
export function rubrumPrompt(text: string, folderName: string) {
  return `Ermittle aus den folgenden Auszügen einer Gerichtsakte das Rubrum. Antworte nur mit JSON: {"az":"…","klaeger":"…","beklagter":"…"}.
Regeln: Nur Angaben, die wörtlich im Text stehen. Aktenzeichen genau wie geschrieben. Bei den Parteien nur den Namen – ohne Anschrift, ohne Rollen wie "Vermieter", "Mieterin", "Herr", "Frau". Mehrere Personen einer Seite mit " und " verbinden. Unbekanntes als "".
Ordnername: ${folderName}

${text}`;
}
