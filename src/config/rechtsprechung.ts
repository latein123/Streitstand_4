/**
 * Rechtsprechung – amtliche Schnittstelle des Bundes (NeuRIS, rechtsinformationen.bund.de)
 * Doku: https://docs.rechtsinformationen.bund.de/guides/  ·  kein Schlüssel nötig
 * Wichtig: searchTerm verlangt, dass ALLE Wörter im Urteil vorkommen → kurze Suchanfragen.
 * Startbegriffe je Merkmal (vom Team anpassbar). Mehrere Suchen werden zusammengeführt.
 */
import type { Verfahren } from '../types';

export const RIS_DEFAULT = 'https://testphase.rechtsinformationen.bund.de';
export const RSP_TERMS: Record<Verfahren, Record<string, string[]>> = {
  minderung: {
    MV: ['Mietminderung Bruttomiete'],
    ZAHLUNG: ['Rückforderung überzahlte Miete', 'Mietminderung Rückzahlung'],
    VORBEHALT: ['Vorbehalt Rückforderung Miete'],
    MANGEL: ['Mietminderung Mangel'],
    URSACHE: ['Lüftungsverhalten', 'Schimmel Beweislast'],
    ERHEBLICH: ['Minderung unerheblich'],
    ANZEIGE: ['Mängelanzeige Mieter'],
    ZEITRAUM: ['Minderungsquote', 'Mietminderung Bruttomiete'],
    VEREITELUNG: ['Duldung Mangelbeseitigung', 'Zutritt Mietwohnung'],
    BESEITIGUNG: ['Mangelbeseitigungsanspruch Mieter']
  },
  raeumung: {
    MV: ['Räumung Eigenbedarf'],
    FORM: ['Kündigung Schriftform Wohnraum'],
    ZUGANG: ['Zugang Kündigung Mietverhältnis'],
    BEGRUENDUNG: ['Eigenbedarf Kündigungsschreiben'],
    FRIST: ['Kündigungsfrist Wohnraummiete'],
    BEDARFSPERSON: ['Eigenbedarf Familienangehörige'],
    NUTZUNGSWILLE: ['Eigenbedarf Nutzungswille', 'vorgetäuschter Eigenbedarf'],
    GRUENDE: ['Eigenbedarf nachvollziehbar'],
    ALTERNATIVE: ['Anbietpflicht Alternativwohnung'],
    SPERRFRIST: ['Kündigungssperrfrist Umwandlung'],
    WIDERSPRUCH: ['Kündigungswiderspruch'],
    HAERTE: ['Härtefall Eigenbedarf'],
    ERSATZ: ['Ersatzwohnraum']
  }
};
export const RSP_COURTS: [string, string][] = [['', 'alle Gerichte'], ['BGH', 'BGH'], ['BVerfG', 'BVerfG'], ['LG', 'Landgerichte'], ['AG', 'Amtsgerichte']];
