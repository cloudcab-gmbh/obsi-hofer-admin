import ExcelJS from "exceljs";
import { resolveSpaltenMapping, type ExportFeld, type ExportZeile } from "./feld-mapping";

const HEADER_SUCH_BEREICH = 10;

export class VorlagenFehler extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VorlagenFehler";
  }
}

/** Liest Zellen einer Zeile als Text (1-indiziert wie in Excel, Lücken als `null`). */
function zeilenTexte(row: ExcelJS.Row): (string | null)[] {
  const zellen: (string | null)[] = [];
  row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const text = cell.text?.trim();
    zellen[colNumber - 1] = text ? text : null;
  });
  return zellen;
}

/**
 * Sucht innerhalb der ersten Zeilen des Arbeitsblatts die Kopfzeile — erkannt
 * am Vorhandensein einer "Prüfergebnis"-Spalte, die in jeder bekannten
 * Vorlagen-Variante vorkommt (siehe PROJ-7-Spec, Open Questions).
 */
function findeKopfzeile(worksheet: ExcelJS.Worksheet): { rowNumber: number; mapping: Map<number, ExportFeld> } {
  const grenze = Math.min(worksheet.rowCount, HEADER_SUCH_BEREICH);
  for (let rowNumber = 1; rowNumber <= grenze; rowNumber++) {
    const mapping = resolveSpaltenMapping(zeilenTexte(worksheet.getRow(rowNumber)));
    if (Array.from(mapping.values()).includes("pruefergebnis")) {
      return { rowNumber, mapping };
    }
  }
  throw new VorlagenFehler(
    "Kopfzeile der Vorlage konnte nicht erkannt werden (keine Spalte mit 'Prüfergebnis' gefunden)."
  );
}

function waehleArbeitsblatt(workbook: ExcelJS.Workbook): ExcelJS.Worksheet {
  const benannt = workbook.worksheets.find((ws) => ws.name.toLowerCase() === "bericht");
  return benannt ?? workbook.worksheets[0];
}

function spalteZuBuchstabe(spalte: number): string {
  let rest = spalte;
  let ergebnis = "";
  while (rest > 0) {
    const mod = (rest - 1) % 26;
    ergebnis = String.fromCharCode(65 + mod) + ergebnis;
    rest = Math.floor((rest - 1) / 26);
  }
  return ergebnis;
}

/** Erweitert eine bestehende bedingte-Formatierungs-Referenz (z.B. "A2:P50"), falls sie nicht bis `letzteZeile` reicht — behält Spaltenbereich und Startzeile bei. */
function erweitereRefFallsNoetig(ref: string, letzteZeile: number): string {
  const match = ref.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
  if (!match) return ref;
  const [, startSpalte, startZeileStr, endSpalte, endZeileStr] = match;
  const endZeile = Number(endZeileStr);
  if (endZeile >= letzteZeile) return ref;
  return `${startSpalte}${startZeileStr}:${endSpalte}${letzteZeile}`;
}

/**
 * Erstellt aus einer Vorlage (Spaltenköpfe, Formatierung, bedingte
 * Formatierung, Branding-Zeilen oberhalb der Kopfzeile) eine neue
 * Arbeitskopie, die ausschliesslich die übergebenen Zeilen enthält — alle
 * bereits in der Vorlage vorhandenen Datenzeilen werden verworfen, die
 * Vorlage selbst bleibt dabei unverändert (sie wird nur gelesen).
 */
export async function erzeugeArbeitskopie(vorlageBuffer: ArrayBuffer, zeilen: ExportZeile[]): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(vorlageBuffer);

  // Live-Fund (2026-10-06): exceljs erhält eingebettete Bilder/Zeichnungen
  // beim Laden→Ändern→Speichern einer echten Vorlage nicht zuverlässig —
  // das Ergebnis bleibt für exceljs selbst lesbar, wird von Microsofts
  // Office-Online-Konvertierungsdienst aber als beschädigt abgelehnt
  // (HttpCode=UnsupportedMediaType, ErrorCode=XLSCorruptFile). Bilder werden
  // deshalb vorerst verworfen, statt ein kaputtes Ergebnis zu riskieren —
  // Text-Branding (Firmenname, Titel) bleibt erhalten. `_media` ist intern,
  // aber die einzige verfügbare Stelle, um vorhandene Bilder zu entfernen
  // (keine öffentliche removeImage-API in exceljs).
  workbook.worksheets.forEach((ws) => {
    (ws as unknown as { _media: unknown[] })._media = [];
  });

  const worksheet = waehleArbeitsblatt(workbook);
  const { rowNumber: kopfzeile, mapping } = findeKopfzeile(worksheet);
  const ersteDatenzeile = kopfzeile + 1;

  // Stil der ersten (ursprünglichen) Datenzeile je gemappter Spalte sichern,
  // bevor die vorhandenen Datenzeilen entfernt werden — neue Zeilen
  // übernehmen so dieselbe Formatierung (Rahmen, Schriftart etc.).
  const vorlagenStil = new Map<number, Partial<ExcelJS.Style>>();
  const stilZeile = worksheet.getRow(ersteDatenzeile);
  mapping.forEach((_feld, spalte) => {
    vorlagenStil.set(spalte, { ...stilZeile.getCell(spalte).style });
  });

  const vorhandeneDatenzeilen = worksheet.rowCount - kopfzeile;
  if (vorhandeneDatenzeilen > 0) {
    worksheet.spliceRows(ersteDatenzeile, vorhandeneDatenzeilen);
  }

  zeilen.forEach((zeile, index) => {
    const row = worksheet.getRow(ersteDatenzeile + index);
    mapping.forEach((feld, spalte) => {
      const cell = row.getCell(spalte);
      cell.value = zeile[feld];
      const stil = vorlagenStil.get(spalte);
      if (stil) cell.style = stil;
    });
    row.commit();
  });

  // `conditionalFormattings` ist zur Laufzeit vorhanden (von exceljs beim
  // Einlesen einer .xlsx-Datei gesetzt), aber nicht Teil der öffentlichen
  // Typdefinitionen — daher der gezielte Cast statt `any`.
  const worksheetMitCf = worksheet as unknown as { conditionalFormattings: { ref: string }[] };
  const letzteZeile = ersteDatenzeile + zeilen.length - 1;
  if (zeilen.length > 0) {
    worksheetMitCf.conditionalFormattings.forEach((cf) => {
      cf.ref = erweitereRefFallsNoetig(cf.ref, letzteZeile);
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as ArrayBuffer;
}

export { spalteZuBuchstabe };
