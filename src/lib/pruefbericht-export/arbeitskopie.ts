import { readFileSync } from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";
import { resolveSpaltenMapping, type ExportFeld, type ExportZeile } from "./feld-mapping";

const HEADER_SUCH_BEREICH = 10;
const STANDARD_FARBE_FREIGABE = "FF92D050";
const STANDARD_FARBE_KEINE_FREIGABE = "FFFF0000";
// Firmenkonstant, in jeder bisher gesichteten echten Vorlage identisch
// vorgefunden — bewusst fest hinterlegt statt aus der Vorlage gelesen, siehe
// Live-Fund weiter unten (Titelzeile der echten Datei zeigte einen
// Projekt-/Ortsnamen statt der Firma). Vier Zeilen statt einer durchlaufenden
// Zeile, entsprechend der im Original per Screenshot bestätigten Darstellung
// (eigener Block rechts, Blocksatz, vier Zeilen).
const OBSI_HOFER_KONTAKTZEILEN = "Obsi Hofer GmbH I 4805 Brittnau\n+41 78 401 54 36\ninfo@obsi-hofer.ch\nwww.obsi-hofer.ch";

// Dasselbe Logo, das bereits im App-Header verwendet wird (src/components/
// app-header.tsx), Seitenverhältnis 386:500. Frisch in die selbst erzeugte
// Arbeitsmappe eingefügt (kein Laden→Ändern→Speichern eines bestehenden
// Bildes) — das ist exakt der Fall, der zuvor den XLSCorruptFile-Fehler
// verursachte, hier also unkritisch.
function ladeLogoBuffer(): Buffer {
  return readFileSync(path.join(process.cwd(), "public", "logo_small.png"));
}

export class VorlagenFehler extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VorlagenFehler";
  }
}

interface ExtrahierteRegel {
  text: string;
  argb: string;
}

interface ExtrahierteVorlage {
  headerZeile: (string | null)[];
  mapping: Map<number, ExportFeld>;
  spaltenAnzahl: number;
  farbRegeln: ExtrahierteRegel[];
}

// Live-Fund (2026-10-06): `cell.text` liefert für Hyperlink-Zellen (z.B. eine
// als Link formatierte E-Mail-/Website-Adresse in der Titelzeile) buchstäblich
// "[object Object]" — exceljs ruft intern `toString()` auf dem internen
// Werte-Wrapper auf, und `HyperlinkValue` überschreibt `toString()` nicht
// (empirisch verifiziert, kein dokumentiertes Verhalten). Deshalb wird hier
// direkt über `cell.value` gelesen und je nach Zelltyp (Text, Zahl, Datum,
// Hyperlink, Rich-Text, Formel) der sichtbare Text selbst ermittelt.
function zellText(cell: ExcelJS.Cell): string | null {
  // Live-Fund (2026-10-06): In der Titelzeile ist die Adress-/Kontaktzeile
  // über mehrere Spalten hinweg verbunden (merged cell). exceljs liefert für
  // JEDE Zelle innerhalb eines Merge-Bereichs denselben Wert zurück (nicht
  // nur für die Anker-Zelle oben links) — ohne diese Prüfung würde derselbe
  // Text mehrfach in benachbarte Spalten unserer neuen Kopfzeile geschrieben
  // (live beobachtet: "Obsi Hofer Gm Obsi Hofer GmbH I Obsi Hofer GmbH ...").
  if (cell.isMerged && cell.master !== cell) return null;

  const value = cell.value;
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if ("richText" in value && Array.isArray(value.richText)) {
      const text = value.richText.map((teil) => teil.text).join("");
      return text.trim() || null;
    }
    if ("text" in value && typeof value.text === "string") {
      return value.text.trim() || null; // Hyperlink-Zelle
    }
    if ("result" in value) {
      return value.result != null ? String(value.result).trim() || null : null; // Formel-Zelle
    }
  }
  return null;
}

/** Liest Zellen einer Zeile als Text (1-indiziert wie in Excel, Lücken als `null`). */
function zeilenTexte(row: ExcelJS.Row, spaltenAnzahl: number): (string | null)[] {
  const zellen: (string | null)[] = [];
  for (let col = 1; col <= spaltenAnzahl; col++) {
    zellen[col - 1] = zellText(row.getCell(col));
  }
  return zellen;
}

function waehleArbeitsblatt(workbook: ExcelJS.Workbook): ExcelJS.Worksheet {
  const benannt = workbook.worksheets.find((ws) => ws.name.toLowerCase() === "bericht");
  return benannt ?? workbook.worksheets[0];
}

/**
 * Liest aus der realen Vorlage ausschliesslich reine Inhalte (Texte, Spalten-
 * Zuordnung, Farbregeln) heraus — niemals deren Binärstruktur selbst. Die
 * Vorlage wird dafür nur gelesen, nie verändert oder wieder gespeichert (das
 * ist die eigentliche Ursache des Live-Funds: exceljs erhält komplexe echte
 * Dateien — Bilder, verbundene Zellen, u.a. — beim Laden→Ändern→Speichern
 * nicht zuverlässig; das Ergebnis bleibt für exceljs selbst lesbar, wird vom
 * strengeren Office-Online-Konvertierungsdienst aber als beschädigt
 * abgelehnt, HttpCode=UnsupportedMediaType/ErrorCode=XLSCorruptFile).
 */
function extrahiereAusVorlage(vorlageWorkbook: ExcelJS.Workbook): ExtrahierteVorlage {
  const worksheet = waehleArbeitsblatt(vorlageWorkbook);
  const spaltenAnzahl = worksheet.columnCount;

  let headerZeile: (string | null)[] | null = null;
  let mapping: Map<number, ExportFeld> | null = null;
  const grenze = Math.min(worksheet.rowCount, HEADER_SUCH_BEREICH);
  for (let rowNumber = 1; rowNumber <= grenze; rowNumber++) {
    const zellen = zeilenTexte(worksheet.getRow(rowNumber), spaltenAnzahl);
    const kandidat = resolveSpaltenMapping(zellen);
    if (Array.from(kandidat.values()).includes("pruefergebnis")) {
      headerZeile = zellen;
      mapping = kandidat;
      break;
    }
  }
  if (!headerZeile || !mapping) {
    throw new VorlagenFehler(
      "Kopfzeile der Vorlage konnte nicht erkannt werden (keine Spalte mit 'Prüfergebnis' gefunden)."
    );
  }

  const farbRegeln = extrahiereFarbRegeln(worksheet);

  return { headerZeile, mapping, spaltenAnzahl, farbRegeln };
}

/**
 * Liest die in der Vorlage bereits definierten bedingten Formatierungsregeln
 * als reine Daten aus (Textwert + Füllfarbe) — damit behält jede Firma ihre
 * eigene Farbkonvention (unterschiedlich beobachtet, siehe PROJ-7 Product
 * Decisions), ohne dass wir die Originaldatei selbst erneut speichern
 * müssten.
 */
// Nach einem echten Datei-Rundgang (schreiben → laden) übersteht `rule.text`
// selbst den Roundtrip NICHT — exceljs wandelt eine "containsText"-Regel beim
// Schreiben in eine Formel um (`NOT(ISERROR(SEARCH("Freigabe",A3)))`) und
// liest beim Parsen auch nur noch diese Formel zurück, nicht mehr das
// ursprüngliche `text`-Feld (empirisch verifiziert — nicht in der exceljs-
// Dokumentation beschrieben). Der gesuchte Text muss deshalb aus der Formel
// zurückgewonnen werden.
const SEARCH_FORMEL_MUSTER = /SEARCH\("([^"]*)"/;

function extrahiereRegelText(rule: { text?: string; formulae?: string[] }): string | null {
  if (rule.text) return rule.text;
  const formel = rule.formulae?.[0];
  const treffer = formel?.match(SEARCH_FORMEL_MUSTER);
  return treffer?.[1] ?? null;
}

function extrahiereFarbRegeln(worksheet: ExcelJS.Worksheet): ExtrahierteRegel[] {
  // `conditionalFormattings` ist zur Laufzeit vorhanden (von exceljs beim
  // Einlesen einer .xlsx-Datei gesetzt), aber nicht Teil der öffentlichen
  // Typdefinitionen — daher der gezielte Cast statt `any`.
  const worksheetMitCf = worksheet as unknown as {
    conditionalFormattings: {
      rules: { text?: string; formulae?: string[]; style?: { fill?: { fgColor?: { argb?: string } } } }[];
    }[];
  };

  const regeln: ExtrahierteRegel[] = [];
  for (const cf of worksheetMitCf.conditionalFormattings ?? []) {
    for (const rule of cf.rules ?? []) {
      const text = extrahiereRegelText(rule);
      const argb = rule.style?.fill?.fgColor?.argb;
      if (text && argb) {
        regeln.push({ text, argb });
      }
    }
  }
  return regeln;
}

function standardFarbRegeln(): ExtrahierteRegel[] {
  return [
    { text: "keine Freigabe", argb: STANDARD_FARBE_KEINE_FREIGABE },
    { text: "Freigabe", argb: STANDARD_FARBE_FREIGABE },
  ];
}

/**
 * Erstellt aus einer Vorlage (Spaltenköpfe, Farbregeln je Prüfergebnis) eine
 * komplett neue, von exceljs frisch erzeugte Arbeitsmappe mit den
 * übergebenen Zeilen — die Vorlage selbst wird dabei ausschliesslich
 * gelesen, nie verändert oder wieder gespeichert. Die Titelzeile wird NICHT
 * aus der Vorlage übernommen (Live-Fund 2026-10-06: der reale Titeltext
 * einer Firma zeigte einen Projekt-/Ortsnamen statt des eigentlichen
 * Firmennamens — die Vorlage ist dafür keine verlässliche Quelle), sondern
 * aus dem übergebenen, aus Dataverse stammenden `firmaName` gebaut.
 */
export async function erzeugeArbeitskopie(
  vorlageBuffer: ArrayBuffer,
  zeilen: ExportZeile[],
  firmaName: string
): Promise<ArrayBuffer> {
  const vorlageWorkbook = new ExcelJS.Workbook();
  await vorlageWorkbook.xlsx.load(vorlageBuffer);
  const { headerZeile, mapping, farbRegeln } = extrahiereAusVorlage(vorlageWorkbook);
  // Live-Fund (2026-10-06): `worksheet.columnCount` (Spaltenzahl) der
  // Vorlage) zählte in echten Dateien offenbar mehr Spalten, als tatsächlich
  // echte Kopfzeilen-Überschriften vorhanden sind (vermutlich leere, aber
  // irgendwie formatierte Restspalten) — für alles, was sich an der
  // "letzten echten Spalte" orientieren muss (Kontaktblock-Platzierung,
  // Spaltenbreiten), wird deshalb stattdessen die letzte Spalte mit
  // tatsächlichem Kopfzeilen-Text verwendet.
  let letzteHeaderSpalte = headerZeile.length;
  while (letzteHeaderSpalte > 0 && !headerZeile[letzteHeaderSpalte - 1]) letzteHeaderSpalte--;

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Bericht");
  // Live-Fund (2026-10-06): ohne eigene Seiteneinrichtung verwendet die PDF-
  // Konvertierung die Excel-Standardeinstellung (Hochformat, keine Skalierung)
  // — bei vielen Spalten wurde die Tabelle dadurch über mehrere schmale Seiten
  // aufgeteilt statt als eine breite Seite. "Auf 1 Seite breit" im Querformat
  // entspricht dem bisherigen, manuell erstellten Referenzformat.
  worksheet.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 };

  // Logo links in der Titelzeile (Spalte A), davor platziert — so liegt es
  // im Original laut Nutzer. Titel-/Kontakttext rückt dafür eine Spalte nach
  // rechts, damit er das Bild nicht überlagert.
  const titelRow = worksheet.addRow([null, "Prüfbericht Absturzsicherungen", null, firmaName]);
  titelRow.font = { bold: true };
  const kontaktRow = worksheet.addRow([]);
  // Live-Fund (2026-10-06): mit der Excel-Standard-Zeilenhöhe wirkte das Logo
  // gestaucht (sein Seitenverhältnis 386:500 braucht mehr Höhe, als die
  // beiden Titelzeilen zusammen standardmässig bieten). Grosszügigere, feste
  // Höhe für beide Titelzeilen, damit das Bild proportional korrekt
  // dargestellt wird.
  titelRow.height = 45;
  kontaktRow.height = 30;

  // Live-Fund (2026-10-06): die Kontaktzeile liegt im Original rechts (nicht
  // links neben dem Titel), als eigener, über beide Titelzeilen verschmolzener
  // Block mit vier Zeilen im Blocksatz, fett statt kursiv. An der rohen
  // `spaltenAnzahl` orientiert landete der Block viel zu weit rechts (siehe
  // `letzteHeaderSpalte` oben) — stattdessen an der letzten echten
  // Kopfzeilen-Spalte orientieren.
  const kontaktStartSpalte = Math.max(5, letzteHeaderSpalte - 2);
  worksheet.mergeCells(1, kontaktStartSpalte, 2, letzteHeaderSpalte);
  const kontaktZelle = titelRow.getCell(kontaktStartSpalte);
  kontaktZelle.value = OBSI_HOFER_KONTAKTZEILEN;
  kontaktZelle.font = { bold: true };
  kontaktZelle.alignment = { wrapText: true, horizontal: "justify", vertical: "middle" };

  const headerRow = worksheet.addRow(headerZeile);
  headerRow.font = { bold: true };
  headerRow.eachCell({ includeEmpty: true }, (cell) => {
    cell.border = { bottom: { style: "thin" } };
  });

  // Leerzeile als optischer Abstand zwischen Kopfzeile und Datentabelle
  // (Nutzerwunsch) — in der Vorlage selbst könnte das nicht nachgebildet
  // werden, da wir von dort ohnehin nur die Kopfzeilen-Texte übernehmen,
  // keine Zeilenstruktur darunter.
  worksheet.addRow([]);

  // Live-Fund (2026-10-06, erster/zweiter Versuch): Logo zunächst oben
  // rechts in einer eigens reservierten, schmalen Spalte platziert — in
  // beiden Fällen (positionsbasierter Anker, dann Zellbereich-Anker)
  // erschien das Bild bei der Graph-PDF-Konvertierung über die gesamte
  // Seitenbreite gestreckt, unabhängig von der Anker-Syntax. Dritter
  // Versuch: Platzierung links in Spalte A (deren Breite sich wie jede
  // andere Datenspalte aus dem tatsächlichen Inhalt ergibt, nicht aus einer
  // von uns künstlich auf 10 gesetzten Sonderbreite) — entspricht ausserdem
  // der vom Nutzer bestätigten Position im Original. Bild wird weiterhin
  // erst NACH der Kopfzeile eingefügt (siehe vorheriger Live-Fund: eine
  // untere Anker-Ecke, die auf eine noch nicht existierende Zeile zeigt,
  // lässt exceljs dort eine leere Phantom-Zeile anlegen).
  // Typ-Cast: exceljs' mitgelieferte Typdefinitionen für `Image.buffer`
  // stammen offenbar von einer älteren @types/node-Fassung und sind
  // strukturell nicht kompatibel mit dem aktuellen, generischen `Buffer`-Typ
  // — zur Laufzeit ist es derselbe Node-Buffer, nur die Typprüfung ist
  // betroffen.
  const logoImageId = workbook.addImage({ buffer: ladeLogoBuffer(), extension: "png" } as unknown as ExcelJS.Image);
  worksheet.addImage(logoImageId, {
    tl: { col: 0, row: 0 },
    br: { col: 1, row: 2 },
  } as unknown as { tl: ExcelJS.Anchor; br: ExcelJS.Anchor });

  // Live-Fund (2026-10-06): bedingte Formatierung (addConditionalFormatting,
  // intern eine SEARCH()-Formel) wurde von der Graph-PDF-Konvertierung
  // offenbar nicht ausgewertet — das Prüfergebnis blieb im exportierten PDF
  // farblos, obwohl exceljs/Excel selbst die Regel korrekt anzeigen. Deshalb
  // wird die Füllfarbe jetzt direkt und statisch pro Zelle gesetzt, sobald der
  // tatsächliche Wert bereits bekannt ist — kein Formel-Rendering mehr nötig,
  // exakter Textvergleich statt der bisherigen "enthält"-Semantik (wir kennen
  // den vollständigen Wert, eine Teilstring-Suche ist nicht mehr nötig).
  const ergebnisSpalte = Array.from(mapping.entries()).find(([, feld]) => feld === "pruefergebnis")?.[0];
  const regeln = farbRegeln.length > 0 ? farbRegeln : standardFarbRegeln();

  zeilen.forEach((zeile) => {
    const werte: (string | null)[] = new Array(letzteHeaderSpalte).fill(null);
    mapping.forEach((feld, spalte) => {
      werte[spalte - 1] = zeile[feld];
    });
    const row = worksheet.addRow(werte);
    // Live-Fund (2026-10-06): mehrzeilige Werte (z.B. Zubehör, Bemerkungen
    // mit eingebetteten Zeilenumbrüchen) erschienen ohne jede Trennung
    // aneinandergereiht ("Zubehör Zeile1Zubehör Zeile2..."), da Excel
    // eingebettete Zeilenumbrüche in einer Zelle nur anzeigt, wenn
    // `wrapText` aktiviert ist — ohne das wird der Umbruch beim Rendern
    // praktisch unsichtbar statt als Zeilenwechsel dargestellt.
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.alignment = { wrapText: true, vertical: "top" };
    });

    const treffer = ergebnisSpalte ? regeln.find((regel) => regel.text === zeile.pruefergebnis) : undefined;
    if (ergebnisSpalte && treffer) {
      row.getCell(ergebnisSpalte).fill = { type: "pattern", pattern: "solid", fgColor: { argb: treffer.argb } };
    }
  });

  // Live-Fund (2026-10-06): die Spaltenbreite allein anhand der Kopfzeilen-
  // Überschrift zu setzen reichte nicht — kurze Überschriften wie "Artikel"
  // oder "Zubehör" enthalten oft deutlich längere tatsächliche Werte
  // ("Höhensicherungsgerät mit Rettungshub", "1x Stahlkarabiner TL+"), die
  // dadurch im PDF abgeschnitten wurden. Breite richtet sich jetzt nach dem
  // längsten tatsächlich vorkommenden Inhalt je Spalte (Kopfzeile oder
  // Datenwert), mit Mindest-/Höchstmass.
  for (let spalte = 1; spalte <= letzteHeaderSpalte; spalte++) {
    const feld = mapping.get(spalte);
    const headerLaenge = headerZeile[spalte - 1]?.length ?? 10;
    // Bei mehrzeiligen Werten (wrapText, siehe oben) ist für die Breite nur
    // die längste EINZELNE Zeile relevant, nicht die Gesamtlänge über alle
    // Zeilen hinweg — sonst wird die Spalte für einen 4-zeiligen, aber pro
    // Zeile kurzen Wert unnötig breit (live beobachtet bei "Zubehör").
    const maxDatenLaenge = feld
      ? Math.max(0, ...zeilen.map((zeile) => Math.max(0, ...(zeile[feld]?.split("\n").map((z) => z.length) ?? [0]))))
      : 0;
    worksheet.getColumn(spalte).width = Math.min(50, Math.max(12, Math.max(headerLaenge, maxDatenLaenge) + 2));
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as ArrayBuffer;
}
