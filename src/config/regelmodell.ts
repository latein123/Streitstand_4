// Regelmodell (vom Team zu verifizieren) – Beweislast kommt NUR von hier.
// last: 'mieter' | 'vermieter' | 'gestuft'
import type { Verfahren, RuleSet } from '../types';

export const RULES: Record<Verfahren, RuleSet> = {
  minderung: {
    label: 'Mietminderung / Rückzahlung / Mängelbeseitigung',
    klaegerRolle: 'Mieter', beklagterRolle: 'Vermieter',
    groups: [
      { id: 'G1', titel: 'Mietverhältnis und Zahlung', merkmale: [
        { id: 'MV', label: 'Mietvertrag und Miethöhe', norm: '§ 535 BGB', last: 'mieter', hint: 'Bestehen des Mietvertrags, Mietobjekt, Höhe der Netto- und Bruttomiete' },
        { id: 'ZAHLUNG', label: 'Zahlung der ungeminderten Miete', norm: '§ 812 Abs. 1 S. 1 Alt. 1 BGB', last: 'mieter', hint: 'Welche Beträge für welche Monate tatsächlich gezahlt wurden' },
        { id: 'VORBEHALT', label: 'Vorbehalt / Kenntnis der Nichtschuld', norm: '§ 814 BGB', last: 'vermieter', lastText: 'Einwendung des Vermieters; ein Zahlungsvorbehalt spricht dagegen', hint: 'Zahlung unter Vorbehalt der Rückforderung, Kenntnis der Nichtschuld' }
      ]},
      { id: 'G2', titel: 'Mangel (je Mangel eigene Zeile)', merkmale: [
        { id: 'MANGEL', label: 'Mangel der Mietsache', norm: '§ 536 Abs. 1 BGB (nach Annahme, § 363 BGB)', last: 'mieter', multi: true, hint: 'Mangelsymptome, Ort, Umfang, Beginn – je Mangel (z. B. Feuchtigkeit/Schimmel, Lärm) eine eigene Zeile' },
        { id: 'URSACHE', label: 'Ursache / Verantwortungsbereich', norm: 'Sphärentheorie (Rspr.)', last: 'gestuft', lastText: 'Gestuft: zuerst Vermieter (Ursache nicht in Bausubstanz), dann Mieter (nicht im Wohnverhalten)', verify: true, multi: true, hint: 'Behauptete Ursachen, z. B. Bauzustand vs. Lüftungsverhalten, Messwerte, Befunde' },
        { id: 'ERHEBLICH', label: 'Erheblichkeit der Beeinträchtigung', norm: '§ 536 Abs. 1 S. 3 BGB', last: 'vermieter', lastText: 'Vermieter (Unerheblichkeit ist als Ausnahme formuliert)', multi: true, hint: 'Auswirkungen auf die Nutzung, Häufigkeit, Intensität, Dauer' },
        { id: 'ANZEIGE', label: 'Mängelanzeige', norm: '§ 536c BGB', last: 'vermieter', lastText: 'Vermieter für Unterlassen der Anzeige und Kausalität', verify: true, multi: true, hint: 'Wann und wie der Mangel dem Vermieter angezeigt wurde' }
      ]},
      { id: 'G3', titel: 'Umfang der Minderung, Einwendungen, Beseitigung', merkmale: [
        { id: 'ZEITRAUM', label: 'Zeitraum und Höhe der Minderung', norm: '§ 536 Abs. 1 BGB; Schätzung § 287 ZPO', last: 'mieter', hint: 'Zeiträume, Quote, Berechnungsbasis, Periodisierung' },
        { id: 'VEREITELUNG', label: 'Vereitelung der Mangelbeseitigung (Zutritt)', norm: '§ 242 BGB', last: 'vermieter', hint: 'Behauptete Verweigerung oder Absage von Besichtigungs- oder Reparaturterminen' },
        { id: 'BESEITIGUNG', label: 'Anspruch auf Mangelbeseitigung', norm: '§ 535 Abs. 1 S. 2 BGB', last: 'mieter', hint: 'Antrag auf Beseitigung, bisherige Maßnahmen, Sanierungsstand' }
      ]},
      // Optional: wird nur analysiert, wenn das Gericht die Gruppe für die Akte einschaltet
      { id: 'G4', titel: 'Weitere Anspruchsgrundlagen', optional: true,
        info: 'Konkurrenzen: Nach Überlassung der Mietsache dürften die §§ 536 ff. BGB das allgemeine Leistungsstörungsrecht verdrängen. Ausnahmen kämen bei arglistigem Verschweigen eines Mangels und beim Untergang der Mietsache durch Verschulden des Mieters (§ 326 Abs. 2 BGB) in Betracht.', infoQuelle: 'Skript S. 45–46',
        merkmale: [
        { id: 'SCHADENSERSATZ', label: 'Schadensersatz wegen Mangels', norm: '§ 536a Abs. 1 BGB', last: 'mieter', verify: true, hint: 'Geltend gemachte Schäden, Zeitpunkt des Mangels (bei Vertragsschluss oder später), Verschulden, Verzug mit der Beseitigung' },
        { id: 'SELBSTVORNAHME', label: 'Aufwendungsersatz nach Selbstvornahme', norm: '§ 536a Abs. 2 BGB', last: 'mieter', verify: true, hint: 'Eigene Reparatur durch den Mieter, Kosten, vorherige Mahnung oder Fristsetzung' },
        { id: 'KUENDIGUNG543', label: 'Fristlose Kündigung durch den Mieter', norm: '§ 543 Abs. 2 S. 1 Nr. 1, Abs. 3 BGB', last: 'mieter', verify: true, hint: 'Kündigungserklärung des Mieters, vorheriges Abhilfeverlangen mit Frist' }
      ]}
    ]
  },
  raeumung: {
    label: 'Räumung nach Eigenbedarfskündigung',
    klaegerRolle: 'Vermieter', beklagterRolle: 'Mieter',
    groups: [
      { id: 'G1', titel: 'Wirksame Kündigung', merkmale: [
        { id: 'MV', label: 'Mietverhältnis, Überlassung', norm: '§§ 535, 546 Abs. 1 BGB', last: 'vermieter', hint: 'Mietvertrag, Mietobjekt, Beginn der Überlassung, Eigentum' },
        { id: 'FORM', label: 'Schriftform der Kündigung', norm: '§§ 568 Abs. 1, 126 BGB', last: 'vermieter', hint: 'Eigenhändige Unterschrift, Form des Kündigungsschreibens' },
        { id: 'ZUGANG', label: 'Zugang der Kündigung', norm: '§ 130 BGB', last: 'vermieter', hint: 'Wann und wie die Kündigung zuging' },
        { id: 'BEGRUENDUNG', label: 'Angabe der Gründe im Schreiben', norm: '§ 573 Abs. 3 BGB', last: 'vermieter', hint: 'Welche Gründe im Kündigungsschreiben genannt sind' },
        { id: 'FRIST', label: 'Kündigungsfrist / Beendigungszeitpunkt', norm: '§ 573c Abs. 1 BGB', last: 'vermieter', hint: 'Genannter Endtermin, Dauer der Überlassung, nächstzulässiger Termin' },
        // Nur analysiert, wenn die Akte eine Befristung erwähnt
        { id: 'BEFRISTUNG', label: 'Befristetes Mietverhältnis', norm: '§ 575 BGB', last: 'vermieter', verify: true, nurWenn: /(?<!un)befristet|zeitmietvertrag|§\s*575(?!a)/i, hint: 'Vereinbarte Befristung, angegebener Befristungsgrund, Fortsetzungsverlangen des Mieters' }
      ]},
      { id: 'G2', titel: 'Eigenbedarf',
        info: 'Grundrechte: Bei unbestimmten Rechtsbegriffen („berechtigtes Interesse“, „Härte“) wirken die Grundrechte mittelbar. Geschützt sind beide Seiten – das Eigentum des Vermieters ebenso wie das Besitzrecht des Mieters (Art. 14 GG, BVerfG).', infoQuelle: 'Skript S. 52',
        merkmale: [
        { id: 'BEDARFSPERSON', label: 'Bedarfsperson (Angehörige)', norm: '§ 573 Abs. 2 Nr. 2 BGB', last: 'vermieter', hint: 'Wer die Wohnung nutzen soll, Verwandtschaftsverhältnis' },
        { id: 'NUTZUNGSWILLE', label: 'Ernsthafter Nutzungswille', norm: '§ 573 Abs. 2 Nr. 2 BGB', last: 'vermieter', hint: 'Konkrete Umzugsplanung, aktueller Stand, Verschiebungen' },
        { id: 'GRUENDE', label: 'Vernünftige, nachvollziehbare Gründe', norm: '§ 573 Abs. 2 Nr. 2 BGB', last: 'vermieter', hint: 'Arbeitsplatz, Raumbedarf, Homeoffice, Pendelstrecke' },
        { id: 'ALTERNATIVE', label: 'Alternativwohnung / Anbietpflicht', norm: '§ 242 BGB (Rechtsmissbrauch)', last: 'mieter', lastText: 'Mieter; sekundäre Darlegungslast des Vermieters zu seinem Wohnungsbestand', verify: true, hint: 'Freie oder frei werdende Wohnungen des Vermieters, Angebot an Mieter, Eignung' },
        { id: 'SPERRFRIST', label: 'Kündigungssperre nach Umwandlung', norm: '§ 577a BGB', last: 'mieter', hint: 'Umwandlung in Wohnungseigentum und Veräußerung nach Überlassung' }
      ]},
      { id: 'G3', titel: 'Widerspruch und Härte', merkmale: [
        { id: 'WIDERSPRUCH', label: 'Widerspruch: Form und Frist', norm: '§ 574b BGB (Hinweis § 568 Abs. 2)', last: 'mieter', hint: 'Form, Zeitpunkt und Zugang des Widerspruchs, Belehrung im Kündigungsschreiben' },
        { id: 'HAERTE', label: 'Härtegründe', norm: '§ 574 Abs. 1 BGB', last: 'mieter', hint: 'Alter, Gesundheit, Mobilität, soziale Einbindung, Mietdauer' },
        { id: 'ERSATZ', label: 'Kein zumutbarer Ersatzwohnraum', norm: '§ 574 Abs. 2 BGB', last: 'mieter', hint: 'Suchbemühungen, Budget, Absagen, Marktlage' }
      ]}
    ]
  }
};
