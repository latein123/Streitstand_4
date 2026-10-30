/**
 * Prüfungsschema je Merkmal (Grundlage: Mietrechts-Skript, in eigenen Worten – vom Team juristisch gegenzulesen).
 * Alles im Konjunktiv: Die App schlägt eine Struktur vor, die Entscheidung trifft das Gericht.
 * schritte[].rsp = Suchbegriffe für die amtliche Datenbank (kurz, alle Wörter müssen vorkommen).
 * schritte[].aktenzeichen = im Skript genannte Entscheidungen – NUR Suchauftrag, Anzeige erst nach Fund per API.
 * verify: true = nicht aus dem Skript belegt bzw. Rechtslage unsicher → vom Team zu verifizieren.
 */
import type { Verfahren, Pruefung } from '../types';
import { RULES } from './regelmodell';

export const PRUEFUNG: Record<Verfahren, Record<string, Pruefung>> = {
  minderung: {
    MV: {
      obersatz: 'Der geltend gemachte Anspruch setzte zunächst einen wirksamen Mietvertrag über Wohnraum voraus (§ 535 BGB).',
      definition: 'Durch den Mietvertrag verpflichtet sich der Vermieter, dem Mieter den Gebrauch der Sache auf Zeit gegen Entgelt zu gewähren.', quelle: 'Skript S. 42',
      schritte: [
        { id: 'S1', text: 'Einigung über Mietsache, Mietzeit und Miete', hinweis: 'Der Mietvertrag ist grundsätzlich formfrei.', quelle: 'Skript S. 42', rsp: ['Wohnraummietvertrag'] },
        { id: 'S2', text: 'Schriftform bei Laufzeit über ein Jahr (§ 550 BGB)', hinweis: 'Ein Formverstoß dürfte den Vertrag nicht unwirksam machen; er gälte dann als auf unbestimmte Zeit geschlossen.', quelle: 'Skript S. 42', rsp: ['Schriftform Mietvertrag'] },
        { id: 'S3', text: 'Wohnraum – Anwendbarkeit der §§ 549 ff. BGB', hinweis: 'Die §§ 535–548 BGB gelten für alle Mietverhältnisse, die §§ 549–577a BGB nur für Wohnraum.', quelle: 'Skript S. 42', rsp: ['Wohnraummiete'] },
        { id: 'S4', text: 'Höhe der Netto- und Bruttomiete feststellen', hinweis: 'Bedeutsam für die Bemessungsgrundlage der Minderung (siehe Zeitraum und Höhe).', quelle: 'Skript S. 43', rsp: ['Bruttomiete Minderung'] }
      ]
    },
    ZAHLUNG: {
      obersatz: 'Der Kläger könnte die zu viel gezahlte Miete zurückverlangen, soweit er sie ohne Rechtsgrund geleistet hätte.',
      definition: 'Soweit die Miete kraft Gesetzes gemindert ist, dürfte für den überschießenden Teil der Zahlung kein Rechtsgrund bestehen.', quelle: 'Skript S. 43',
      schritte: [
        { id: 'S1', text: 'Leistung: welche Beträge für welche Monate tatsächlich gezahlt wurden', quelle: 'Skript S. 43', rsp: ['Rückforderung überzahlte Miete'] },
        { id: 'S2', text: 'Ohne Rechtsgrund: Minderung im betreffenden Zeitraum', hinweis: 'Hängt vom Ergebnis zu Mangel, Anzeige sowie Zeitraum und Höhe ab.', quelle: 'Skript S. 43', rsp: ['Mietminderung Rückforderung'] },
        { id: 'S3', text: 'Anspruchsgrundlage der Rückforderung', hinweis: 'h. M.: Leistungskondiktion; a. M.: unmittelbar aus dem Minderungsrecht (siehe Streitstand).', quelle: 'Skript S. 43', rsp: ['Leistungskondiktion Miete'] }
      ],
      streit: [{ frage: 'Woraus folgt der Rückzahlungsanspruch?', ansichten: ['h. M.: § 812 Abs. 1 S. 1 Alt. 1 BGB', 'a. M.: unmittelbar § 536 Abs. 1 S. 1 BGB'], quelle: 'Skript S. 43' }]
    },
    VORBEHALT: {
      obersatz: 'Die Rückforderung könnte nach § 814 BGB ausgeschlossen sein, wenn der Kläger in Kenntnis der Nichtschuld gezahlt hätte.',
      definition: 'Die Einwendung des § 814 BGB bleibt neben dem Minderungsrecht bestehen; sie dürfte positive Kenntnis der Nichtschuld voraussetzen.', quelle: 'Skript S. 43', verify: true,
      schritte: [
        { id: 'S1', text: 'Positive Kenntnis des Mieters, die Miete in dieser Höhe nicht zu schulden', quelle: 'Skript S. 43', verify: true, rsp: ['Kenntnis Nichtschuld'] },
        { id: 'S2', text: 'Zahlung unter Vorbehalt der Rückforderung', hinweis: 'Ein Vorbehalt dürfte gegen die Anwendung des § 814 BGB sprechen.', quelle: 'Regelmodell', verify: true, rsp: ['Vorbehalt Rückforderung Miete'] }
      ]
    },
    MANGEL: {
      obersatz: 'Die Mietsache müsste einen Mangel aufweisen, der ihre Tauglichkeit zum vertragsgemäßen Gebrauch aufhebt oder mindert (§ 536 Abs. 1 S. 1 BGB).',
      definition: 'Ein Mangel liegt vor, wenn die Gebrauchstauglichkeit der Mietsache aufgehoben oder gemindert ist – gemessen am vertraglich geschuldeten Zustand.', quelle: 'Skript S. 43',
      schritte: [
        { id: 'S1', text: 'Geschuldeter Zustand (Vereinbarung, sonst üblicher Standard)', quelle: 'Regelmodell', verify: true, rsp: ['Sollbeschaffenheit Mietsache'] },
        { id: 'S2', text: 'Tatsächlicher Zustand: Symptome, Ort, Umfang, Beginn', quelle: 'Skript S. 43', rsp: ['Mietminderung Mangel'] },
        { id: 'S3', text: 'Aufhebung oder Minderung der Gebrauchstauglichkeit', quelle: 'Skript S. 43', rsp: ['Gebrauchstauglichkeit Mietminderung'] },
        { id: 'S4', text: 'Öffentlich-rechtliche Beschränkungen (falls einschlägig)', hinweis: 'Sie dürften nur dann einen Mangel begründen, wenn sie mit Lage oder Zustand der Mietsache zusammenhängen.', quelle: 'Skript S. 43', rsp: ['öffentlich-rechtliche Gebrauchsbeschränkung'] }
      ],
      hinweise: [{ wenn: /lärm|nachbar|mitmieter|ruhestörung/i, text: 'Stört ein Mitmieter, hätte der Mieter gegen diesen keine vertraglichen Ansprüche; in Betracht kämen nur §§ 823, 1004, 858 ff. BGB. Das Verhältnis zum Vermieter (Mangel) bliebe davon unberührt.', quelle: 'Skript S. 47' }]
    },
    URSACHE: {
      obersatz: 'Es wäre zu klären, ob die Ursache des Mangels im Verantwortungsbereich des Vermieters oder des Mieters liegt.',
      definition: 'Nach der Sphärentheorie der Rechtsprechung dürfte die Darlegungs- und Beweislast gestuft verteilt sein.', quelle: 'Regelmodell', verify: true,
      schritte: [
        { id: 'S1', text: 'Vermieter: Ursache liegt nicht in der Bausubstanz bzw. seinem Bereich', quelle: 'Regelmodell', verify: true, rsp: ['Schimmel Beweislast'] },
        { id: 'S2', text: 'Mieter: Ursache liegt nicht im Wohn- oder Lüftungsverhalten', quelle: 'Regelmodell', verify: true, rsp: ['Lüftungsverhalten'] }
      ]
    },
    ERHEBLICH: {
      obersatz: 'Die Minderung wäre ausgeschlossen, wenn die Beeinträchtigung nur unerheblich wäre (§ 536 Abs. 1 S. 3 BGB).',
      definition: 'Die Unerheblichkeit ist als Ausnahme formuliert; maßgeblich sind Intensität, Häufigkeit und Dauer.', quelle: 'Regelmodell', verify: true,
      schritte: [
        { id: 'S1', text: 'Auswirkungen auf die Nutzung (Intensität, Häufigkeit, Dauer)', quelle: 'Regelmodell', verify: true, rsp: ['Minderung unerheblich'] },
        { id: 'S2', text: 'Leicht und schnell zu beseitigender Mangel?', quelle: 'Regelmodell', verify: true, rsp: ['unerhebliche Minderung'] }
      ]
    },
    ANZEIGE: {
      obersatz: 'Die Rechte des Mieters könnten nach § 536c Abs. 2 BGB ausgeschlossen sein, wenn er einen Mangel nicht angezeigt hätte.',
      definition: 'Zeigt sich während der Mietzeit ein Mangel, ist der Mieter verpflichtet, ihn dem Vermieter anzuzeigen; unterbleibt die Anzeige, verliert er insoweit seine Gewährleistungsrechte.', quelle: 'Skript S. 43, 49',
      schritte: [
        { id: 'S1', text: 'Mangel hat sich während der Mietzeit gezeigt', quelle: 'Skript S. 49', rsp: ['Anzeigepflicht Mieter'] },
        { id: 'S2', text: 'Anzeige erfolgt: wann, wie, gegenüber wem', quelle: 'Skript S. 43, 49', rsp: ['Mängelanzeige Mieter'] },
        { id: 'S3', text: 'Folge einer unterlassenen Anzeige', hinweis: 'Verlust der Gewährleistungsrechte, soweit der Vermieter deshalb nicht abhelfen konnte; Beweislast laut Regelmodell beim Vermieter.', quelle: 'Skript S. 43, 49', verify: true, rsp: ['Mängelanzeige unterlassen'] }
      ]
    },
    ZEITRAUM: {
      obersatz: 'Für die Dauer der Beeinträchtigung wäre die Miete kraft Gesetzes angemessen herabgesetzt (§ 536 Abs. 1 S. 2 BGB).',
      definition: 'Die Höhe richtet sich nach dem Maß der Gebrauchsbeeinträchtigung; das Gericht kann nach § 287 ZPO schätzen.', quelle: 'Skript S. 43',
      schritte: [
        { id: 'S1', text: 'Minderung kraft Gesetzes', hinweis: 'Die Minderung tritt automatisch ein, eine Minderungserklärung ist nicht erforderlich (anders im Kaufrecht, § 441 BGB). Die Mängelanzeige bleibt Voraussetzung.', quelle: 'Skript S. 43', rsp: ['Minderung kraft Gesetzes'] },
        { id: 'S2', text: 'Zeitraum der Beeinträchtigung (Beginn, Ende, ggf. Abschnitte)', quelle: 'Skript S. 43', rsp: ['Mietminderung Zeitraum'] },
        { id: 'S3', text: 'Bemessungsgrundlage', hinweis: 'h. M.: Bruttomiete einschließlich Nebenkosten.', quelle: 'Skript S. 43', rsp: ['Bruttomiete Minderung'] },
        { id: 'S4', text: 'Angemessene Quote', hinweis: 'Bei massiven Mängeln käme eine vollständige Befreiung von der Miete in Betracht.', quelle: 'Skript S. 43', rsp: ['Minderungsquote'] }
      ],
      streit: [{ frage: 'Bemessungsgrundlage der Minderung', ansichten: ['h. M.: Bruttomiete (einschließlich Nebenkosten)', 'a. M.: Nettomiete'], quelle: 'Skript S. 43' }]
    },
    VEREITELUNG: {
      obersatz: 'Die Berufung auf die Minderung könnte treuwidrig sein (§ 242 BGB), wenn der Mieter die Mangelbeseitigung vereitelt hätte.',
      definition: 'Maßgeblich dürfte sein, ob der Mieter zumutbare Besichtigungs- oder Reparaturtermine verweigert hat.', quelle: 'Regelmodell', verify: true,
      schritte: [
        { id: 'S1', text: 'Angebot des Vermieters zur Besichtigung oder Beseitigung', quelle: 'Regelmodell', verify: true, rsp: ['Duldung Mangelbeseitigung'] },
        { id: 'S2', text: 'Verweigerung oder Absage durch den Mieter, Zumutbarkeit', quelle: 'Regelmodell', verify: true, rsp: ['Zutritt Mietwohnung'] }
      ]
    },
    BESEITIGUNG: {
      obersatz: 'Der Kläger könnte vom Beklagten die Beseitigung des Mangels verlangen (§ 535 Abs. 1 S. 2 BGB).',
      definition: 'Der Anspruch auf Mangelbeseitigung ist der ursprüngliche Erfüllungsanspruch aus dem Mietvertrag.', quelle: 'Skript S. 43–44',
      schritte: [
        { id: 'S1', text: 'Mangel besteht fort (siehe Mangel der Mietsache)', quelle: 'Skript S. 43', rsp: ['Mangelbeseitigungsanspruch Mieter'] },
        { id: 'S2', text: 'Grenze: Opfergrenze', hinweis: 'Der Anspruch endet, wo die Beseitigung dem Vermieter wirtschaftlich nicht mehr zumutbar wäre (§§ 275 Abs. 2, 313 BGB).', quelle: 'Skript S. 46', rsp: ['Opfergrenze'] },
        { id: 'S3', text: 'Zurückbehaltungsrecht an der Miete (§ 320 BGB)', hinweis: 'h. M.: in der Regel begrenzt auf etwa das Dreifache der geschätzten Beseitigungskosten; bei geringfügigen Mängeln ausgeschlossen (§ 320 Abs. 2 BGB).', quelle: 'Skript S. 44', verify: true, rsp: ['Zurückbehaltungsrecht Mangelbeseitigungskosten', 'Zurückbehaltungsrecht Miete'] }
      ],
      streit: [{ frage: 'Umfang des Zurückbehaltungsrechts', ansichten: ['h. M.: etwa das Dreifache der geschätzten Beseitigungskosten', 'Ausschluss bei Geringfügigkeit (§ 320 Abs. 2 BGB)'], quelle: 'Skript S. 44' }]
    },
    SCHADENSERSATZ: {
      obersatz: 'Der Kläger könnte Schadensersatz wegen eines Mangels verlangen (§ 536a Abs. 1 BGB).',
      definition: '§ 536a Abs. 1 BGB kennt drei Varianten: anfänglicher Mangel, nachträglicher Mangel mit Vertretenmüssen, Verzug mit der Beseitigung.', quelle: 'Skript S. 44',
      schritte: [
        { id: 'S1', text: 'Mangel im Sinne des § 536 BGB', quelle: 'Skript S. 44', rsp: ['Schadensersatz Mietmangel'] },
        { id: 'S2', text: 'Variante 1: Mangel bei Vertragsschluss', hinweis: 'Garantiehaftung – auf Verschulden käme es nicht an.', quelle: 'Skript S. 44', rsp: ['Garantiehaftung Vermieter'] },
        { id: 'S3', text: 'Variante 2: später entstandener Mangel, den der Vermieter zu vertreten hat', quelle: 'Skript S. 44', rsp: ['Vertretenmüssen Vermieter Mangel'] },
        { id: 'S4', text: 'Variante 3: Verzug des Vermieters mit der Beseitigung', quelle: 'Skript S. 44', rsp: ['Verzug Mangelbeseitigung'] },
        { id: 'S5', text: 'Schaden und Ursachenzusammenhang', quelle: 'Regelmodell', verify: true, rsp: ['Mangelfolgeschaden Mieter'] }
      ]
    },
    SELBSTVORNAHME: {
      obersatz: 'Der Kläger könnte Ersatz seiner Aufwendungen für die eigene Mangelbeseitigung verlangen (§ 536a Abs. 2 BGB).',
      definition: 'Erforderlich dürfte grundsätzlich Verzug des Vermieters mit der Beseitigung sein (oder eine Notmaßnahme).', quelle: 'Skript S. 44–45',
      schritte: [
        { id: 'S1', text: 'Verzug des Vermieters mit der Mangelbeseitigung', quelle: 'Skript S. 44–45', rsp: ['Selbstvornahme Mieter'] },
        { id: 'S2', text: 'Ohne Verzug: nur eng über §§ 539 Abs. 1, 683, 670 BGB', quelle: 'Skript S. 45', rsp: ['Aufwendungsersatz Mieter'] },
        { id: 'S3', text: 'Erforderlichkeit und Höhe der Aufwendungen', quelle: 'Regelmodell', verify: true, rsp: ['Aufwendungsersatz Mangelbeseitigung'] }
      ]
    },
    KUENDIGUNG543: {
      obersatz: 'Der Mieter könnte das Mietverhältnis fristlos gekündigt haben, weil ihm der vertragsgemäße Gebrauch nicht gewährt wurde (§ 543 Abs. 2 S. 1 Nr. 1 BGB).',
      definition: 'Grundsätzlich wären ein Abhilfeverlangen und eine Fristsetzung erforderlich (§ 543 Abs. 3 BGB), außer die Beseitigung ist unmöglich.', quelle: 'Skript S. 45',
      schritte: [
        { id: 'S1', text: 'Nichtgewährung des vertragsgemäßen Gebrauchs (Mangel)', quelle: 'Skript S. 45', rsp: ['Gebrauchsentziehung Kündigung'] },
        { id: 'S2', text: 'Abhilfeverlangen mit angemessener Frist oder Entbehrlichkeit', quelle: 'Skript S. 45', rsp: ['Abhilfefrist Kündigung'] },
        { id: 'S3', text: 'Schriftliche Kündigungserklärung', quelle: 'Regelmodell', verify: true, rsp: ['fristlose Kündigung Mieter'] }
      ]
    }
  },
  raeumung: {
    MV: {
      obersatz: 'Ein Rückgabeanspruch setzte ein beendetes Mietverhältnis über die überlassene Wohnung voraus (§ 546 Abs. 1 BGB).',
      definition: 'Zunächst wären Mietvertrag und Überlassung festzustellen; der Vertrag ist grundsätzlich formfrei.', quelle: 'Skript S. 42',
      schritte: [
        { id: 'S1', text: 'Mietvertrag über Wohnraum', quelle: 'Skript S. 42', rsp: ['Räumung Eigenbedarf'] },
        { id: 'S2', text: 'Überlassung und Dauer der Überlassung (relevant für die Kündigungsfrist)', quelle: 'Regelmodell', verify: true, rsp: ['Überlassung Wohnraum Kündigungsfrist'] }
      ]
    },
    FORM: {
      obersatz: 'Die Kündigung müsste schriftlich erklärt worden sein (§ 568 Abs. 1 BGB).',
      definition: 'Schriftform bedeutet eigenhändige Unterschrift unter der Erklärung (§ 126 BGB).', quelle: 'Skript S. 51',
      schritte: [
        { id: 'S1', text: 'Schriftliche Erklärung mit eigenhändiger Unterschrift', quelle: 'Skript S. 51', rsp: ['Kündigung Schriftform Wohnraum'] },
        { id: 'S2', text: 'Bei mehreren Vermietern oder Mietern: Erklärung von allen bzw. gegenüber allen', quelle: 'Regelmodell', verify: true, rsp: ['Kündigung mehrere Mieter'] }
      ]
    },
    ZUGANG: {
      obersatz: 'Die Kündigung müsste dem Mieter zugegangen sein (§ 130 BGB).',
      definition: 'Zugegangen ist eine Erklärung, sobald sie so in den Machtbereich des Empfängers gelangt, dass mit Kenntnisnahme zu rechnen ist.', quelle: 'Regelmodell', verify: true,
      schritte: [{ id: 'S1', text: 'Art und Zeitpunkt des Zugangs', quelle: 'Regelmodell', verify: true, rsp: ['Zugang Kündigung Mietverhältnis'] }]
    },
    BEGRUENDUNG: {
      obersatz: 'Die Gründe für das berechtigte Interesse müssten im Kündigungsschreiben angegeben sein (§ 573 Abs. 3 BGB).',
      definition: 'Berücksichtigt würden grundsätzlich nur die im Schreiben genannten Gründe.', quelle: 'Regelmodell', verify: true,
      schritte: [
        { id: 'S1', text: 'Bedarfsperson und Bedarfsgrund im Schreiben benannt', quelle: 'Regelmodell', verify: true, rsp: ['Eigenbedarf Kündigungsschreiben'] },
        { id: 'S2', text: 'Hinreichende Konkretisierung', quelle: 'Regelmodell', verify: true, rsp: ['Begründung Eigenbedarfskündigung'] }
      ]
    },
    FRIST: {
      obersatz: 'Das Mietverhältnis wäre erst mit Ablauf der gesetzlichen Kündigungsfrist beendet (§ 573c Abs. 1 BGB).',
      definition: 'Die Frist verlängert sich mit der Dauer der Überlassung; ein zu früh angegebener Termin dürfte zum nächstzulässigen Termin wirken.', quelle: 'Regelmodell', verify: true,
      schritte: [{ id: 'S1', text: 'Überlassungsdauer, Frist und Beendigungszeitpunkt', quelle: 'Regelmodell', verify: true, rsp: ['Kündigungsfrist Wohnraummiete'] }]
    },
    BEFRISTUNG: {
      obersatz: 'Bei einem befristeten Mietverhältnis müsste der Vermieter ein berechtigtes Interesse an der Beendigung haben (§ 575 Abs. 1 BGB).',
      definition: 'Fehlt es daran, könnte der Mieter die Fortsetzung des Mietverhältnisses verlangen (§ 575 Abs. 3 S. 2 BGB).', quelle: 'Skript S. 52',
      schritte: [
        { id: 'S1', text: 'Wirksame Befristung mit Angabe des Grundes bei Vertragsschluss', quelle: 'Skript S. 52', verify: true, rsp: ['Zeitmietvertrag'] },
        { id: 'S2', text: 'Befristungsgrund besteht bei Ablauf fort, sonst Fortsetzungsverlangen', quelle: 'Skript S. 52', rsp: ['Zeitmietvertrag Fortsetzung'] }
      ]
    },
    BEDARFSPERSON: {
      obersatz: 'Die Wohnung müsste für den Vermieter, seine Familienangehörigen oder Angehörige seines Haushalts benötigt werden (§ 573 Abs. 2 Nr. 2 BGB).',
      definition: 'Erforderlich ist ein konkreter Wohnbedarf einer berechtigten Person.', quelle: 'Skript S. 52',
      schritte: [{ id: 'S1', text: 'Bedarfsperson gehört zum privilegierten Personenkreis', quelle: 'Skript S. 52', rsp: ['Eigenbedarf Familienangehörige'] }]
    },
    NUTZUNGSWILLE: {
      obersatz: 'Die Bedarfsperson müsste ernsthaft beabsichtigen, die Wohnung selbst zu nutzen.',
      definition: 'Der Wohnbedarf muss konkret sein; eine bloß vorsorgliche Kündigung dürfte nicht genügen.', quelle: 'Skript S. 52',
      schritte: [
        { id: 'S1', text: 'Konkrete, ernsthafte Nutzungsabsicht (Umzugsplanung, aktueller Stand)', quelle: 'Skript S. 52', rsp: ['Eigenbedarf Nutzungswille'] },
        { id: 'S2', text: 'Anhaltspunkte für vorgeschobenen Bedarf', quelle: 'Regelmodell', verify: true, rsp: ['vorgetäuschter Eigenbedarf'] }
      ]
    },
    GRUENDE: {
      obersatz: 'Der Vermieter müsste die Wohnung im Sinne des § 573 Abs. 2 Nr. 2 BGB „benötigen“.',
      definition: 'Vernünftige, nachvollziehbare Gründe dürften genügen. Das Gericht darf die Lebensplanung des Vermieters nicht durch eigene Vorstellungen ersetzen (BGH).', quelle: 'Skript S. 52',
      schritte: [
        { id: 'S1', text: 'Vernünftige, nachvollziehbare Gründe für den Wohnbedarf', hinweis: 'Geprüft würde die Nachvollziehbarkeit, nicht die Notwendigkeit der Lebensplanung.', quelle: 'Skript S. 52', rsp: ['Eigenbedarf nachvollziehbar', 'Lebensplanung Vermieter'] },
        { id: 'S2', text: 'Grundrechtliche Ausstrahlung (mittelbare Drittwirkung)', hinweis: 'Eigentum des Vermieters und Besitzrecht des Mieters stehen beide unter dem Schutz von Art. 14 GG (BVerfG).', quelle: 'Skript S. 52', rsp: ['Besitzrecht Mieter Eigentum'] },
        { id: 'S3', text: 'Kein weit überhöhter oder missbräuchlicher Bedarf', quelle: 'Regelmodell', verify: true, rsp: ['überhöhter Wohnbedarf'] }
      ]
    },
    ALTERNATIVE: {
      obersatz: 'Die Kündigung könnte rechtsmissbräuchlich sein (§ 242 BGB), wenn der Vermieter eine geeignete Alternativwohnung nicht angeboten hätte.',
      definition: 'Gemeint sind vergleichbare Wohnungen des Vermieters, die bis zum Ende der Kündigungsfrist frei werden.', quelle: 'Regelmodell', verify: true,
      schritte: [
        { id: 'S1', text: 'Freie oder frei werdende vergleichbare Wohnung des Vermieters', quelle: 'Regelmodell', verify: true, rsp: ['Anbietpflicht Alternativwohnung'] },
        { id: 'S2', text: 'Angebot an den Mieter bis Ablauf der Kündigungsfrist', quelle: 'Regelmodell', verify: true, rsp: ['Anbietpflicht Vermieter'] }
      ]
    },
    SPERRFRIST: {
      obersatz: 'Die Kündigung könnte durch die Sperrfrist des § 577a Abs. 1 BGB ausgeschlossen sein.',
      definition: 'Die Sperre greift, wenn an der vermieteten Wohnung nach der Überlassung Wohnungseigentum begründet und dieses veräußert wurde.', quelle: 'Skript S. 52',
      schritte: [
        { id: 'S1', text: 'Umwandlung in Wohnungseigentum nach Überlassung', quelle: 'Skript S. 52', rsp: ['Kündigungssperrfrist Umwandlung'] },
        { id: 'S2', text: 'Veräußerung und Ablauf der (ggf. landesrechtlich verlängerten) Frist', quelle: 'Regelmodell', verify: true, rsp: ['Kündigungssperrfrist'] }
      ]
    },
    WIDERSPRUCH: {
      obersatz: 'Der Mieter müsste der Kündigung form- und fristgerecht widersprochen haben (§ 574b BGB).',
      definition: 'Der Widerspruch bedarf der Schriftform; zur Frist ist der Hinweis nach § 568 Abs. 2 BGB im Kündigungsschreiben zu beachten.', quelle: 'Regelmodell', verify: true,
      schritte: [
        { id: 'S1', text: 'Schriftlicher Widerspruch', quelle: 'Regelmodell', verify: true, rsp: ['Kündigungswiderspruch'] },
        { id: 'S2', text: 'Frist und Belehrung über das Widerspruchsrecht', quelle: 'Regelmodell', verify: true, rsp: ['Widerspruchsfrist Kündigung'] }
      ]
    },
    HAERTE: {
      obersatz: 'Der Mieter könnte die Fortsetzung verlangen, wenn die Beendigung für ihn eine nicht zu rechtfertigende Härte bedeutete (§ 574 Abs. 1 BGB).',
      definition: 'Erforderlich ist eine Abwägung aller Umstände des Einzelfalls zwischen den Interessen beider Seiten.', quelle: 'Skript S. 52',
      statusHinweis: 'Gesundheitliche Härtegründe gelten nicht schon deshalb als unsubstantiiert, weil kein fachärztliches Attest vorliegt; die Anforderungen an den Vortrag dürfen nicht überspannt werden.',
      schritte: [
        { id: 'S1', text: 'Vorgetragene Härtegründe (Alter, Gesundheit, Verwurzelung, Mietdauer)', quelle: 'Skript S. 52', rsp: ['Härtefall Eigenbedarf'] },
        { id: 'S2', text: 'Substantiierung gesundheitlicher Beeinträchtigungen', hinweis: 'Die Anforderungen dürfen nicht überspannt werden. Bei psychischen Beeinträchtigungen dürfte ein fachärztliches Attest nicht zwingend sein, wenn anderweitig hinreichend konkret vorgetragen wird.', quelle: 'Skript S. 52', rsp: ['Härtegründe Attest', 'Härteeinwand Gesundheit'], aktenzeichen: ['VIII ZR 270/22'] },
        { id: 'S3', text: 'Abwägung mit dem Erlangungsinteresse des Vermieters', hinweis: 'Beide Seiten sind durch Art. 14 GG geschützt (BVerfG).', quelle: 'Skript S. 52', rsp: ['Sozialklausel Abwägung'] }
      ]
    },
    ERSATZ: {
      obersatz: 'Eine Härte läge auch vor, wenn angemessener Ersatzwohnraum zu zumutbaren Bedingungen nicht beschafft werden könnte (§ 574 Abs. 2 BGB).',
      definition: 'Maßgeblich dürften die konkreten Suchbemühungen des Mieters und die Marktlage sein.', quelle: 'Regelmodell', verify: true,
      schritte: [
        { id: 'S1', text: 'Ernsthafte Suchbemühungen des Mieters', quelle: 'Regelmodell', verify: true, rsp: ['Ersatzwohnraum'] },
        { id: 'S2', text: 'Zumutbare Bedingungen (Budget, Lage, Größe)', quelle: 'Regelmodell', verify: true, rsp: ['Ersatzwohnraum zumutbare Bedingungen'] }
      ]
    }
  }
};

// Prüfungsschema an die Merkmale des Regelmodells hängen (RULES[v].groups[].merkmale[].pruefung)
for (const [vf, defs] of Object.entries(PRUEFUNG)) RULES[vf as Verfahren].groups.forEach(g => g.merkmale.forEach(m => { if (defs[m.id]) m.pruefung = defs[m.id]; }));
