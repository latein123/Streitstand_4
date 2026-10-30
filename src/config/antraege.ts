/**
 * Antragstypen je Verfahrensart: Welche Merkmale sind für welchen Klageantrag zu prüfen?
 * kenn = Merkmal, an dessen Vortrag der Antrag erkannt wird, wenn die Analyse keine Anträge liefert.
 * merkmale: null = alle Merkmale. Zuordnung vom Team juristisch zu verifizieren.
 */
import type { Verfahren, AntragDef } from '../types';

export const ANTRAEGE: Record<Verfahren, AntragDef[]> = {
  minderung: [
    { typ: 'BESEITIGUNG', titel: 'Mängelbeseitigung', norm: '§ 535 Abs. 1 S. 2 BGB', kenn: 'BESEITIGUNG', merkmale: ['MV', 'MANGEL', 'URSACHE', 'VEREITELUNG', 'BESEITIGUNG'] },
    { typ: 'ZAHLUNG', titel: 'Rückzahlung überzahlter Miete', norm: '§ 812 Abs. 1 S. 1 Alt. 1 i. V. m. § 536 Abs. 1 BGB', kenn: 'ZAHLUNG', merkmale: ['MV', 'ZAHLUNG', 'VORBEHALT', 'MANGEL', 'URSACHE', 'ERHEBLICH', 'ANZEIGE', 'ZEITRAUM', 'VEREITELUNG'] },
    { typ: 'FESTSTELLUNG', titel: 'Feststellung der Minderung', norm: '§ 536 Abs. 1 BGB, § 256 ZPO', kenn: null, merkmale: ['MV', 'MANGEL', 'URSACHE', 'ERHEBLICH', 'ANZEIGE', 'ZEITRAUM', 'VEREITELUNG'] },
    { typ: 'SCHADENSERSATZ', titel: 'Schadens- bzw. Aufwendungsersatz', norm: '§ 536a BGB', kenn: 'SCHADENSERSATZ', merkmale: ['MV', 'MANGEL', 'URSACHE', 'SCHADENSERSATZ', 'SELBSTVORNAHME'] }
  ],
  raeumung: [
    { typ: 'RAEUMUNG', titel: 'Räumung und Herausgabe', norm: '§§ 546 Abs. 1, 985 BGB', kenn: 'MV', merkmale: null }
  ]
};
