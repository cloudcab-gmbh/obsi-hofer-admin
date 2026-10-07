import { readFileSync } from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";
import pdfMake from "pdfmake";
import LineBreaker from "linebreak";
import PDFDocument from "pdfkit";
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
let fontBuffer: Map<string, Buffer> | null = null;

function ladeFontBuffer(): Map<string, Buffer> {
  if (!fontBuffer) {
    fontBuffer = new Map();
    for (const dateiname of new Set(Object.values(ROBOTO_DATEIEN))) {
      fontBuffer.set(dateiname, readFileSync(path.join(process.cwd(), "public", "fonts", "Roboto", dateiname)));
    }
  }
  return fontBuffer;
}

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

  for (const [dateiname, buffer] of ladeFontBuffer()) {
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

/** Breite eines Texts in pt bei gegebener Schriftgrösse (fett = Kopfzeile). */
export type TextMesser = (text: string, fett: boolean, schriftgroesse: number) => number;

/**
 * Grobe Schätzung ohne Font-Datei (für reine Unit-Tests der Dokumentstruktur).
 * Im echten Export ersetzt durch `erstelleTextMesser()`, das mit der
 * tatsächlichen Roboto-Schrift misst.
 */
const geschaetzteTextBreite: TextMesser = (text, fett, schriftgroesse) =>
  text.length * schriftgroesse * (fett ? 0.56 : 0.52);

/** Misst Texte mit den echten Roboto-Fonts über pdfkit (dieselbe Engine, die pdfmake intern zum Rendern nutzt). */
function erstelleTextMesser(): TextMesser {
  const fonts = ladeFontBuffer();
  // Live-Fund (2026-10-06): ohne `font`-Option lädt pdfkit im Konstruktor
  // seine Standardschrift Helvetica aus node_modules/pdfkit/js/data/
  // Helvetica.afm — eine Datei, die Next.js' Build-Tracer nicht in die
  // Vercel-Funktion übernimmt (ENOENT in Produktion, lokal unauffällig).
  // Stattdessen direkt Roboto als Startschrift: zur Laufzeit akzeptiert
  // pdfkit dafür jede PDFFontSource (auch einen Buffer), die @types/pdfkit
  // deklarieren nur `string` — daher der Cast.
  const doc = new PDFDocument({
    autoFirstPage: false,
    font: fonts.get(ROBOTO_DATEIEN.normal) as unknown as string,
  });
  doc.registerFont("normal", fonts.get(ROBOTO_DATEIEN.normal)!);
  doc.registerFont("fett", fonts.get(ROBOTO_DATEIEN.bold)!);
  return (text, fett, schriftgroesse) => doc.font(fett ? "fett" : "normal").fontSize(schriftgroesse).widthOfString(text);
}

const SEITENBREITE_QUER = 841.89; // A4 quer, pt
const SEITENRAND = 24;
const ZELLEN_PADDING = 3;
const LINIENBREITE = 0.5;
const MAX_TABELLEN_SCHRIFT = 9;
const MIN_TABELLEN_SCHRIFT = 7;
/**
 * Tabellen-Optik nach dem Vorbild der Excel-Vorlagen (Screenshot Nutzer,
 * 2026-10-06): graue Kopfzeile mit weisser fetter Schrift, gebänderte
 * Zeilen, nur waagrechte Trennlinien, Inhalte vertikal mittig. Bewusst fest
 * hinterlegt (wie der Kontaktblock) statt aus der Vorlage gelesen: die
 * Vorlage bleibt nur Quelle für Spalten und Prüfergebnis-Farben.
 */
const TABELLE = {
  kopfHintergrund: "#A6A6A6",
  kopfText: "#FFFFFF",
  bandHintergrund: "#EDEDED",
  trennlinie: "#D9D9D9",
  paddingVertikal: 5,
} as const;

/** Anzahl Spalten, die mehrzeilig umbrechen dürfen, bevor die Schrift verkleinert wird. */
const FREITEXT_SPALTEN = 2;

/**
 * Zerlegt einen Text in die Stücke, zwischen denen pdfmake eine Zeile
 * umbrechen darf. Ist eine Spalte schmaler als ihr längstes solches Stück,
 * bricht pdfmake es zeichenweise mitten drin um ("Stahlkarabine/r",
 * "Scanc/ode") — genau das soll die Breitenberechnung verhindern.
 *
 * Live-Fund (2026-10-06): eine eigene Regel "Umbruch nach jedem Bindestrich"
 * stimmte nicht mit pdfmake überein — nach Unicode-Regel UAX #14 ist z.B.
 * zwischen "-" und einer Ziffer KEIN Umbruch erlaubt, "1802147-0205" ist für
 * pdfmake ein einziges Wort und wurde deshalb zu "1802147-0/205" zerschnitten.
 * Deshalb dieselbe Bibliothek wie pdfmakes TextBreaker (`linebreak`).
 */
export function woerter(text: string): string[] {
  const stuecke: string[] = [];
  const breaker = new LineBreaker(text);
  let start = 0;
  for (let umbruch = breaker.nextBreak(); umbruch; umbruch = breaker.nextBreak()) {
    // Abschliessende Leerzeichen/Zeilenumbrüche hängen am Stück, belegen beim
    // Umbruch aber keine Breite.
    const stueck = text.slice(start, umbruch.position).trimEnd();
    if (stueck.length > 0) stuecke.push(stueck);
    start = umbruch.position;
  }
  return stuecke;
}

/**
 * Spaltenbreiten in pt, auf Basis der gemessenen Textbreiten (Live-Fund
 * 2026-10-06: die frühere Zeichenzahl-proportionale Verteilung gab langen
 * Spalten wie "Bemerkungen" zu viel und kurzen wie "Scancode", "Serien-Nr."
 * oder "Zubehör" zu wenig Platz, sodass Wörter mitten im Wort umbrachen):
 *  1. Mindestbreite je Spalte = längstes nicht umbrechbares Wort (Kopfzeile
 *     fett, Daten normal) — darunter würde ein Wort zerschnitten.
 *  2. Wunschbreite je Spalte = längste Datenzeile (bei Mehrzeilern die
 *     längste EINZELNE Zeile, nicht die Gesamtlänge).
 *  3. Der Platz über den Minima geht zuerst an die Spalten mit dem kleinsten
 *     Fehlbetrag (siehe `verteileRestplatz`).
 *  4. Die Tabellenschrift wird (9pt → 7pt) nur so weit verkleinert, bis
 *     höchstens FREITEXT_SPALTEN Spalten noch umbrechen müssen.
 */
function berechneSpaltenbreiten(
  headerZeile: (string | null)[],
  mapping: Map<number, ExportFeld>,
  letzteHeaderSpalte: number,
  zeilen: ExportZeile[],
  messen: TextMesser
): { widths: number[]; schriftgroesse: number } {
  const verfuegbar =
    SEITENBREITE_QUER - 2 * SEITENRAND - letzteHeaderSpalte * (2 * ZELLEN_PADDING + LINIENBREITE) - LINIENBREITE;

  // Gemessen wird einmal bei MAX_TABELLEN_SCHRIFT; Textbreiten skalieren
  // linear mit der Schriftgrösse.
  const minimumBasis: number[] = [];
  const wunschBasis: number[] = [];
  for (let spalte = 1; spalte <= letzteHeaderSpalte; spalte++) {
    const feld = mapping.get(spalte);
    // Kopfzeile: darf an Leerzeichen/Bindestrich umbrechen ("Herstell-/jahr"),
    // zählt also nur für die Mindest-, nicht für die Wunschbreite.
    let min = Math.max(0, ...woerter(headerZeile[spalte - 1] ?? "").map((w) => messen(w, true, MAX_TABELLEN_SCHRIFT)));
    let pref = 0;
    if (feld) {
      for (const zeile of zeilen) {
        const wert = zeile[feld];
        if (!wert) continue;
        for (const textZeile of wert.split("\n")) pref = Math.max(pref, messen(textZeile, false, MAX_TABELLEN_SCHRIFT));
        for (const wort of woerter(wert)) min = Math.max(min, messen(wort, false, MAX_TABELLEN_SCHRIFT));
      }
    }
    minimumBasis.push(min);
    wunschBasis.push(Math.max(pref, min));
  }

  const summe = (werte: number[]) => werte.reduce((a, b) => a + b, 0);
  // +1pt Reserve je Spalte gegen Rundungsunterschiede zwischen Messung und Rendering.
  const skaliere = (werte: number[], groesse: number) =>
    werte.map((w) => Math.max(12, (w * groesse) / MAX_TABELLEN_SCHRIFT + 1));

  // Grösste Schrift, bei der jede Spalte ihr Minimum bekommt und höchstens
  // die FREITEXT_SPALTEN Spalten mit dem grössten Fehlbetrag (typisch
  // Artikel/Bemerkungen) noch umbrechen müssen.
  let letzterVersuch: { widths: number[]; schriftgroesse: number } | null = null;
  for (let groesse = MAX_TABELLEN_SCHRIFT; groesse >= MIN_TABELLEN_SCHRIFT; groesse -= 0.5) {
    const minimum = skaliere(minimumBasis, groesse);
    const wunsch = skaliere(wunschBasis, groesse);
    if (summe(minimum) > verfuegbar) continue;
    const { widths, unerfuellt } = verteileRestplatz(minimum, wunsch, verfuegbar);
    letzterVersuch = { widths, schriftgroesse: groesse };
    if (unerfuellt <= FREITEXT_SPALTEN) return letzterVersuch;
  }
  if (letzterVersuch) return letzterVersuch;

  // Notfall (extrem viele/breite Spalten): kleinste Schrift, Minima
  // proportional auf die Seite gestaucht — Wörter können dann umbrechen.
  const minimum = skaliere(minimumBasis, MIN_TABELLEN_SCHRIFT);
  const summeMin = summe(minimum);
  return { widths: minimum.map((m) => (m * verfuegbar) / summeMin), schriftgroesse: MIN_TABELLEN_SCHRIFT };
}

/**
 * Verteilt den Platz über den Mindestbreiten: zuerst an die Spalten, denen
 * am wenigsten zur Wunschbreite fehlt (z.B. Zubehör "1x Stahlkarabiner TL"
 * einzeilig), sodass möglichst viele Spalten gar nicht umbrechen; die
 * langen Freitext-Spalten erhalten, was übrig bleibt. Passen alle
 * Wunschbreiten, wird der Überschuss proportional verteilt.
 */
function verteileRestplatz(
  minimum: number[],
  wunsch: number[],
  verfuegbar: number
): { widths: number[]; unerfuellt: number } {
  const widths = [...minimum];
  let rest = verfuegbar - minimum.reduce((a, b) => a + b, 0);
  const nachFehlbetrag = widths.map((_, i) => i).sort((a, b) => wunsch[a] - minimum[a] - (wunsch[b] - minimum[b]));
  let unerfuellt = 0;
  for (const i of nachFehlbetrag) {
    const zuwachs = Math.min(rest, wunsch[i] - widths[i]);
    widths[i] += zuwachs;
    rest -= zuwachs;
    if (wunsch[i] - widths[i] > 0.01) unerfuellt++;
  }
  if (rest > 0.01) {
    const gesamt = widths.reduce((a, b) => a + b, 0);
    return { widths: widths.map((w) => w + (rest * w) / gesamt), unerfuellt };
  }
  return { widths, unerfuellt };
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
    headerRow.push({
      text: headerZeile[spalte - 1] ?? "",
      bold: true,
      color: TABELLE.kopfText,
      fillColor: TABELLE.kopfHintergrund,
      verticalAlignment: "middle",
    });
  }

  const regeln = farbRegeln.length > 0 ? farbRegeln : standardFarbRegeln();
  const ergebnisSpalte = Array.from(mapping.entries()).find(([, feld]) => feld === "pruefergebnis")?.[0];

  const datenZeilen: TableCell[][] = zeilen.map((zeile, index) => {
    const row: TableCell[] = [];
    // Erste Datenzeile gebändert (grau), dann abwechselnd — wie in der Excel-Vorlage.
    const zeilenHintergrund = index % 2 === 0 ? TABELLE.bandHintergrund : undefined;
    for (let spalte = 1; spalte <= letzteHeaderSpalte; spalte++) {
      const feld = mapping.get(spalte);
      const wert = feld ? (zeile[feld] ?? "") : "";
      const cell: TableCell = { text: wert, verticalAlignment: "middle" };
      if (zeilenHintergrund) cell.fillColor = zeilenHintergrund;
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
      { text: firmaName, bold: true, fontSize: 14, margin: [0, 6, 0, 0] },
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
  /** Standard: grobe Zeichen-Schätzung; `erzeugePdf` übergibt die echte Font-Messung. */
  textMesser?: TextMesser;
  /** PROJ-9: sichtbarer Signaturvermerk in der Fusszeile jeder Seite; fehlt → keine Fusszeile (unsigniert). */
  signaturVermerk?: string;
}

/**
 * Reine, unit-testbare Funktion: baut aus den aus der Vorlage extrahierten
 * Daten + den Export-Zeilen die pdfmake-Dokumentstruktur. Enthält keinerlei
 * I/O (keine Dateizugriffe, kein Rendering) — testbar durch einfache
 * Objektprüfung der zurückgegebenen `TDocumentDefinitions`.
 */
export function buildDocumentDefinition(input: PdfBuildInput): TDocumentDefinitions {
  const { headerZeile, mapping, letzteHeaderSpalte, farbRegeln, zeilen, firmaName, logoDataUrl } = input;

  const { widths, schriftgroesse } = berechneSpaltenbreiten(
    headerZeile,
    mapping,
    letzteHeaderSpalte,
    zeilen,
    input.textMesser ?? geschaetzteTextBreite
  );
  const body = buildTableBody(headerZeile, mapping, letzteHeaderSpalte, farbRegeln, zeilen);

  return {
    pageSize: "A4",
    pageOrientation: "landscape",
    pageMargins: [SEITENRAND, SEITENRAND, SEITENRAND, SEITENRAND],
    defaultStyle: { font: "Roboto", fontSize: 9 },
    // PROJ-9: dezent unten auf jeder Seite, innerhalb des unteren Seitenrands —
    // ändert damit weder Spaltenbreiten noch Seitenumbrüche des Berichts.
    ...(input.signaturVermerk
      ? {
          footer: {
            text: input.signaturVermerk,
            alignment: "center" as const,
            fontSize: 7,
            color: "#808080",
            margin: [SEITENRAND, SEITENRAND / 3, SEITENRAND, 0] as [number, number, number, number],
          },
        }
      : {}),
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
        fontSize: schriftgroesse,
        // dontBreakRows: Live-Fund (2026-10-06) — eine Zeile, die über den
        // Seitenumbruch geteilt wurde, zerfiel (Rest auf der Folgeseite ohne
        // Bezug, mit verticalAlignment teils falsch positioniert). Eine
        // Zeile wandert jetzt als Ganzes auf die nächste Seite.
        table: { headerRows: 1, dontBreakRows: true, widths, body },
        layout: {
          hLineWidth: () => LINIENBREITE,
          vLineWidth: () => 0,
          hLineColor: () => TABELLE.trennlinie,
          paddingLeft: () => ZELLEN_PADDING,
          paddingRight: () => ZELLEN_PADDING,
          paddingTop: () => TABELLE.paddingVertikal,
          paddingBottom: () => TABELLE.paddingVertikal,
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
export async function erzeugePdf(
  vorlageBuffer: ArrayBuffer,
  zeilen: ExportZeile[],
  firmaName: string,
  optionen: { signaturVermerk?: string } = {}
): Promise<Buffer> {
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
    textMesser: erstelleTextMesser(),
    signaturVermerk: optionen.signaturVermerk,
  });

  return pdfMake.createPdf(docDefinition).getBuffer();
}
