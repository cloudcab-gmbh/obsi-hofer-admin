import ExcelJS from "exceljs";
import { resolveSpaltenMapping, type ExportFeld } from "./feld-mapping";

const HEADER_SUCH_BEREICH = 10;
const STANDARD_FARBE_FREIGABE = "FF92D050";
const STANDARD_FARBE_KEINE_FREIGABE = "FFFF0000";

export class VorlagenFehler extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VorlagenFehler";
  }
}

export interface ExtrahierteRegel {
  text: string;
  argb: string;
}

export interface ExtrahierteVorlage {
  headerZeile: (string | null)[];
  mapping: Map<number, ExportFeld>;
  farbRegeln: ExtrahierteRegel[];
  // Live-Fund (2026-10-06): `worksheet.columnCount` der Vorlage zählte in
  // echten Dateien offenbar mehr Spalten, als tatsächlich echte Kopfzeilen-
  // Überschriften vorhanden sind (vermutlich leere, aber irgendwie
  // formatierte Restspalten). Für alles, was sich an der "letzten echten
  // Spalte" orientieren muss (Layout, Spaltenbreiten), wird deshalb statt
  // `spaltenAnzahl` dieser Wert verwendet: die letzte Spalte mit
  // tatsächlichem Kopfzeilen-Text.
  letzteHeaderSpalte: number;
}

// Live-Fund (2026-10-06): `cell.text` liefert für Hyperlink-Zellen (z.B. eine
// als Link formatierte E-Mail-/Website-Adresse in der Titelzeile) buchstäblich
// "[object Object]" — exceljs ruft intern `toString()` auf dem internen
// Werte-Wrapper auf, und `HyperlinkValue` überschreibt `toString()` nicht
// (empirisch verifiziert, kein dokumentiertes Verhalten). Deshalb wird hier
// direkt über `cell.value` gelesen und je nach Zelltyp (Text, Zahl, Datum,
// Hyperlink, Rich-Text, Formel) der sichtbare Text selbst ermittelt.
export function zellText(cell: ExcelJS.Cell): string | null {
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
export function zeilenTexte(row: ExcelJS.Row, spaltenAnzahl: number): (string | null)[] {
  const zellen: (string | null)[] = [];
  for (let col = 1; col <= spaltenAnzahl; col++) {
    zellen[col - 1] = zellText(row.getCell(col));
  }
  return zellen;
}

export function waehleArbeitsblatt(workbook: ExcelJS.Workbook): ExcelJS.Worksheet {
  const benannt = workbook.worksheets.find((ws) => ws.name.toLowerCase() === "bericht");
  return benannt ?? workbook.worksheets[0];
}

/**
 * Liest aus der realen Vorlage ausschliesslich reine Inhalte (Texte, Spalten-
 * Zuordnung, Farbregeln) heraus — niemals deren Binärstruktur selbst. Die
 * Vorlage wird dafür nur gelesen, nie verändert oder wieder gespeichert (das
 * ist die eigentliche Ursache des ursprünglichen XLSCorruptFile-Live-Funds:
 * exceljs erhält komplexe echte Dateien — Bilder, verbundene Zellen, u.a. —
 * beim Laden→Ändern→Speichern nicht zuverlässig).
 */
export function extrahiereAusVorlage(vorlageWorkbook: ExcelJS.Workbook): ExtrahierteVorlage {
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

  let letzteHeaderSpalte = headerZeile.length;
  while (letzteHeaderSpalte > 0 && !headerZeile[letzteHeaderSpalte - 1]) letzteHeaderSpalte--;

  const farbRegeln = extrahiereFarbRegeln(worksheet);

  return { headerZeile, mapping, farbRegeln, letzteHeaderSpalte };
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

export function standardFarbRegeln(): ExtrahierteRegel[] {
  return [
    { text: "keine Freigabe", argb: STANDARD_FARBE_KEINE_FREIGABE },
    { text: "Freigabe", argb: STANDARD_FARBE_FREIGABE },
  ];
}
