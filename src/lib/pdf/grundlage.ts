import { readFileSync } from "node:fs";
import path from "node:path";
import pdfMake from "pdfmake";
import type { TDocumentDefinitions } from "pdfmake/interfaces";

// Gemeinsame PDF-Grundlage (Schriften, Logo, Rendern) für den Prüfbericht-
// Export (PROJ-7) und den Zeitnachweis (PROJ-16) — aus pdf-generator.ts
// herausgelöst, unverändert.

export const ROBOTO_DATEIEN = {
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

export function ladeFontBuffer(): Map<string, Buffer> {
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
export function registriereFontsFallsNoetig(): void {
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
export function ladeLogoDataUrl(): string {
  const buffer = readFileSync(path.join(process.cwd(), "public", "logo_small.png"));
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

/** Rendert eine pdfmake-Dokumentdefinition zu einem PDF (Schriften werden bei Bedarf registriert). */
export async function renderePdf(docDefinition: TDocumentDefinitions): Promise<Buffer> {
  registriereFontsFallsNoetig();
  return pdfMake.createPdf(docDefinition).getBuffer();
}
