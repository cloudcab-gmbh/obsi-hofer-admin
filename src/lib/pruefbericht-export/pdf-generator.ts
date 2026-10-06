import { readFileSync } from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";
import pdfMake from "pdfmake";
import type { Column, Content, TableCell, TDocumentDefinitions } from "pdfmake/interfaces";
import type { ExportFeld, ExportZeile } from "./feld-mapping";
import {
  extrahiereAusVorlage,
  standardFarbRegeln,
  type ExtrahierteRegel,
} from "./vorlage-extraktion";

// Firmenkonstante, in jeder bisher gesichteten echten Vorlage identisch
// vorgefunden — bewusst fest hinterlegt statt aus der Vorlage gelesen (der
// reale Titeltext einer Firma zeigte einmal einen Projekt-/Ortsnamen statt
// des Firmennamens, die Vorlage ist dafür also keine verlässliche Quelle).
// Vier Zeilen statt einer durchlaufenden Zeile, entsprechend der vom Nutzer
// per Screenshot bestätigten Darstellung (eigener Block rechts, Blocksatz).
const OBSI_HOFER_KONTAKTZEILEN = "Obsi Hofer GmbH I 4805 Brittnau\n+41 78 401 54 36\ninfo@obsi-hofer.ch\nwww.obsi-hofer.ch";

const ROBOTO_DATEIEN = {
  normal: "Roboto-Regular.ttf",
  bold: "Roboto-Medium.ttf",
  italics: "Roboto-Italic.ttf",
  bolditalics: "Roboto-MediumItalic.ttf",
} as const;

// pdfmakes öffentliche TypeScript-Typen (@types/pdfmake) bilden nur die
// browserseitige VFS-API ab (`addVirtualFileSystem`, als "nur im Browser
// unterstützt" dokumentiert). Zur Laufzeit besitzt die Node-Instanz jedoch
// zusätzlich eine eigene, undokumentierte `virtualfs`-Property mit
// `writeFileSync`/`existsSync`/`readFileSync` (verifiziert durch Lesen von
// node_modules/pdfmake/js/virtual-fs.js und PDFDocument.js) — darüber werden
// Font-Dateien referenziert, OHNE dass pdfmake dafür selbst echte
// Festplattenpfade zur Laufzeit lesen muss.
interface NodeVirtualFileSystem {
  writeFileSync(filename: string, content: Buffer): void;
}
const pdfMakeMitVirtualFs = pdfMake as unknown as { virtualfs: NodeVirtualFileSystem };

let fontsRegistriert = false;

/**
 * Live-Fund (2026-10-06, bei der Architektur-Umstellung): ein Font-
 * Dateipfad darf NICHT direkt (als String) an `setFonts()` übergeben werden,
 * obwohl die PDFKit-Typen das erlauben würden — pdfmakes eigener
 * `Printer`-Wrapper normalisiert jeden Font-Eintrag über eine
 * `getExtendedUrl()`-Hilfsfunktion, die testet `typeof wert === "object"` und
 * in diesem Fall `{ url: wert.url, ... }` erwartet. Ein Node-`Buffer` ist
 * aber selbst `typeof "object"`, besitzt jedoch keine `.url`-Property — das
 * Ergebnis wäre `undefined` statt der echten Bytes (empirisch durch Lesen
 * von node_modules/pdfmake/js/Printer.js verifiziert, nicht dokumentiert).
 * Ausserdem würde ein direkter Dateipfad-String von Next.js' Build-Tracer
 * (@vercel/nft) nicht erkannt, da der eigentliche `fs`-Zugriff tief in
 * pdfmakes eigenem Code erfolgt (dynamischer Pfad, keine statisch
 * auflösbare `readFileSync(...)`-Stelle in UNSEREM Code). Deshalb: Bytes
 * selbst einlesen (derselbe bereits bewährte Pfad wie für das Logo,
 * `readFileSync(path.join(process.cwd(), "public", ...))`, von Next.js'
 * Tracer nachweislich korrekt erkannt) und über `virtualfs.writeFileSync()`
 * unter einem virtuellen Dateinamen hinterlegen — `setFonts()` referenziert
 * anschliessend nur noch diesen Namen (ein reiner String, kein Objekt).
 */
function registriereFontsFallsNoetig(): void {
  if (fontsRegistriert) return;

  for (const dateiname of new Set(Object.values(ROBOTO_DATEIEN))) {
    const buffer = readFileSync(path.join(process.cwd(), "public", "fonts", "Roboto", dateiname));
    pdfMakeMitVirtualFs.virtualfs.writeFileSync(dateiname, buffer);
  }

  pdfMake.setFonts({ Roboto: { ...ROBOTO_DATEIEN } });
  // Wir laden ausschliesslich Fonts/Bilder aus der VFS bzw. als Data-URL —
  // echter Zugriff auf lokale Dateien oder entfernte URLs durch pdfmake
  // selbst wird deshalb hart unterbunden (auch als Schutz gegen SSRF/
  // beliebiges Auslesen lokaler Dateien, falls künftig einmal versehentlich
  // ein Pfad/eine URL aus Nutzereingaben in ein Content-Element gelangt).
  pdfMake.setUrlAccessPolicy(() => false);
  pdfMake.setLocalAccessPolicy(() => false);
  fontsRegistriert = true;
}

// Dasselbe Logo, das bereits im App-Header verwendet wird (src/components/
// app-header.tsx), Seitenverhältnis 386:500. Als Data-URL eingebettet statt
// über einen Dateipfad referenziert — pdfmake unterstützt Data-URLs für
// Bilder direkt, ohne den oben beschriebenen Font-spezifischen Umweg über
// die virtuelle Dateisystem-API.
function ladeLogoDataUrl(): string {
  const buffer = readFileSync(path.join(process.cwd(), "public", "logo_small.png"));
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

/** Wandelt eine ARGB-Farbe (Excel-Konvention, z.B. "FF92D050") in eine für pdfmake/CSS gültige "#RRGGBB"-Farbe um. */
function argbZuCssFarbe(argb: string): string {
  return `#${argb.slice(2)}`;
}

/**
 * Spaltenbreiten als Prozentsätze (Summe 100%), proportional zum längsten
 * tatsächlich vorkommenden Inhalt je Spalte (Kopfzeile oder Datenwert) —
 * dieselbe Heuristik, die zuvor für die Excel-Spaltenbreiten verwendet wurde.
 * Bei mehrzeiligen Werten (wrapText-Fälle wie "Zubehör") ist nur die
 * längste EINZELNE Zeile relevant, nicht die Gesamtlänge über alle Zeilen
 * hinweg, sonst würde die Spalte unnötig breit.
 */
function berechneSpaltenbreiten(
  headerZeile: (string | null)[],
  mapping: Map<number, ExportFeld>,
  letzteHeaderSpalte: number,
  zeilen: ExportZeile[]
): string[] {
  const gewichte: number[] = [];
  for (let spalte = 1; spalte <= letzteHeaderSpalte; spalte++) {
    const feld = mapping.get(spalte);
    const headerLaenge = headerZeile[spalte - 1]?.length ?? 10;
    const maxDatenLaenge = feld
      ? Math.max(0, ...zeilen.map((zeile) => Math.max(0, ...(zeile[feld]?.split("\n").map((z) => z.length) ?? [0]))))
      : 0;
    gewichte.push(Math.max(12, Math.max(headerLaenge, maxDatenLaenge) + 2));
  }
  const summe = gewichte.reduce((a, b) => a + b, 0);
  return gewichte.map((gewicht) => `${((gewicht / summe) * 100).toFixed(2)}%`);
}

function buildTableBody(
  headerZeile: (string | null)[],
  mapping: Map<number, ExportFeld>,
  letzteHeaderSpalte: number,
  farbRegeln: ExtrahierteRegel[],
  zeilen: ExportZeile[]
): TableCell[][] {
  const headerRow: TableCell[] = [];
  for (let spalte = 1; spalte <= letzteHeaderSpalte; spalte++) {
    headerRow.push({ text: headerZeile[spalte - 1] ?? "", bold: true });
  }

  const regeln = farbRegeln.length > 0 ? farbRegeln : standardFarbRegeln();
  const ergebnisSpalte = Array.from(mapping.entries()).find(([, feld]) => feld === "pruefergebnis")?.[0];

  const datenZeilen: TableCell[][] = zeilen.map((zeile) => {
    const row: TableCell[] = [];
    for (let spalte = 1; spalte <= letzteHeaderSpalte; spalte++) {
      const feld = mapping.get(spalte);
      const wert = feld ? (zeile[feld] ?? "") : "";
      const cell: TableCell = { text: wert };
      if (ergebnisSpalte === spalte) {
        const treffer = regeln.find((regel) => regel.text === zeile.pruefergebnis);
        if (treffer) cell.fillColor = argbZuCssFarbe(treffer.argb);
      }
      row.push(cell);
    }
    return row;
  });

  return [headerRow, ...datenZeilen];
}

function buildKopfbereich(firmaName: string, logoDataUrl: string | null): Content {
  const spalten: Column[] = [];
  if (logoDataUrl) {
    spalten.push({ image: logoDataUrl, width: 70 });
  }
  spalten.push({
    stack: [
      { text: "Prüfbericht Absturzsicherungen", bold: true, fontSize: 14 },
      { text: firmaName, bold: true, fontSize: 12 },
    ],
    width: "*",
  });
  spalten.push({
    text: OBSI_HOFER_KONTAKTZEILEN,
    bold: true,
    alignment: "justify",
    width: 170,
  });
  return { columns: spalten, columnGap: 10 };
}

export interface PdfBuildInput {
  headerZeile: (string | null)[];
  mapping: Map<number, ExportFeld>;
  letzteHeaderSpalte: number;
  farbRegeln: ExtrahierteRegel[];
  zeilen: ExportZeile[];
  firmaName: string;
  logoDataUrl: string | null;
}

/**
 * Reine, unit-testbare Funktion: baut aus den aus der Vorlage extrahierten
 * Daten + den Export-Zeilen die pdfmake-Dokumentstruktur. Enthält keinerlei
 * I/O (keine Dateizugriffe, kein Rendering) — testbar durch einfache
 * Objektprüfung der zurückgegebenen `TDocumentDefinitions`.
 */
export function buildDocumentDefinition(input: PdfBuildInput): TDocumentDefinitions {
  const { headerZeile, mapping, letzteHeaderSpalte, farbRegeln, zeilen, firmaName, logoDataUrl } = input;

  const widths = berechneSpaltenbreiten(headerZeile, mapping, letzteHeaderSpalte, zeilen);
  const body = buildTableBody(headerZeile, mapping, letzteHeaderSpalte, farbRegeln, zeilen);

  return {
    pageSize: "A4",
    pageOrientation: "landscape",
    pageMargins: [24, 24, 24, 24],
    defaultStyle: { font: "Roboto", fontSize: 9 },
    content: [
      buildKopfbereich(firmaName, logoDataUrl),
      {
        // `margin` (oben 20pt) erzeugt den vom Nutzer gewünschten optischen
        // Abstand zwischen Kopfbereich und Tabelle — anders als die vorherige
        // "Leerzeile"-Idee im Excel+Graph-Ansatz (vier Versuche, alle ohne
        // sichtbaren Effekt: Graphs PDF-Konvertierung scheint eine inhaltlich
        // "leer wirkende" Zeile beim Rendern zu verwerfen, unabhängig von
        // deklarierter Höhe) wirkt dieses pdfmake-eigene Layout-Attribut
        // direkt auf das tatsächliche Rendering, ohne Konvertierungsschritt
        // dazwischen.
        margin: [0, 20, 0, 0] as [number, number, number, number],
        table: { headerRows: 1, widths, body },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => "#cccccc",
          vLineColor: () => "#cccccc",
          paddingLeft: () => 4,
          paddingRight: () => 4,
          paddingTop: () => 3,
          paddingBottom: () => 3,
        },
      },
    ],
  };
}

/**
 * Erstellt direkt ein PDF (keine Excel-Zwischendatei, keine Microsoft-Graph-
 * Konvertierung mehr) — Architektur-Korrektur (2026-10-06): der vorherige
 * Weg (Excel-Arbeitsmappe via exceljs bauen → nach SharePoint hochladen →
 * über Microsoft Graph in PDF konvertieren) scheiterte wiederholt an
 * Einschränkungen der Graph-Konvertierung selbst (bedingte Formatierung wird
 * nicht ausgewertet, Bild-Anker verhalten sich inkonsistent, eine "leere"
 * Abstandszeile wird beim Rendern verworfen — drei verschiedene
 * Symptome derselben grundsätzlichen Einschränkung). Direktes Rendern über
 * pdfmake gibt volle Kontrolle über das Ergebnis zurück.
 */
export async function erzeugePdf(vorlageBuffer: ArrayBuffer, zeilen: ExportZeile[], firmaName: string): Promise<Buffer> {
  registriereFontsFallsNoetig();

  const vorlageWorkbook = new ExcelJS.Workbook();
  await vorlageWorkbook.xlsx.load(vorlageBuffer);
  const { headerZeile, mapping, farbRegeln, letzteHeaderSpalte } = extrahiereAusVorlage(vorlageWorkbook);

  const docDefinition = buildDocumentDefinition({
    headerZeile,
    mapping,
    letzteHeaderSpalte,
    farbRegeln,
    zeilen,
    firmaName,
    logoDataUrl: ladeLogoDataUrl(),
  });

  return pdfMake.createPdf(docDefinition).getBuffer();
}
