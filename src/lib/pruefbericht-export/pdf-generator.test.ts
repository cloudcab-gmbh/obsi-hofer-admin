// Dieses Modul läuft ausschliesslich serverseitig und lädt pdfkit/fontkit,
// deren Font-Erkennung `instanceof Uint8Array`/`instanceof ArrayBuffer`
// prüft. Unter Vitests Standard-`jsdom`-Umgebung (siehe vitest.config.ts)
// laufen diese Prüfungen in einer ANDEREN Realm als die von node:fs
// gelesenen Buffer, wodurch `instanceof` fälschlich fehlschlägt
// (empirisch verifiziert: ein identisches Skript via reinem `node -e`
// funktionierte anstandslos) — deshalb hier explizit die echte Node-Umgebung.
// @vitest-environment node
import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import type { Table, TableCell } from "pdfmake/interfaces";
import { buildDocumentDefinition, erzeugePdf } from "./pdf-generator";
import type { ExportFeld, ExportZeile } from "./feld-mapping";

const HEADER = ["Lagerort", "Artikel", "Prüfergebnis", "Bemerkungen"];

function mapping(): Map<number, ExportFeld> {
  return new Map<number, ExportFeld>([
    [1, "lagerort"],
    [2, "artikel"],
    [3, "pruefergebnis"],
    [4, "bemerkungen"],
  ]);
}

function leereZeile(overrides: Partial<ExportZeile> = {}): ExportZeile {
  return {
    lagerort: null,
    invNr: null,
    artikel: null,
    typ: null,
    dimension: null,
    serienummer: null,
    barcode: null,
    hersteller: null,
    herstelljahr: null,
    erstgebrauch: null,
    ablegereife: null,
    zubehoer: null,
    kundenId: null,
    geprueft: null,
    pruefer: null,
    pruefergebnis: null,
    bemerkungen: null,
    ...overrides,
  };
}

function tableFromContent(doc: ReturnType<typeof buildDocumentDefinition>): Table {
  const content = doc.content as { table?: Table }[];
  const tableElement = content.find((element) => "table" in element);
  if (!tableElement?.table) throw new Error("Dokument enthält kein Tabellen-Element");
  return tableElement.table;
}

/** `TableCell` ist pdfmake-seitig eine sehr breite Union — für reine Testzwecke genügt ein gezielter, schmaler Cast. */
function zellFarbe(zeile: TableCell[], spalte: number): string | undefined {
  const zellen = zeile as unknown as { fillColor?: string }[];
  return zellen[spalte]?.fillColor;
}

describe("buildDocumentDefinition", () => {
  it("puts the header texts in the first table row, and marks it as the repeating header", () => {
    const doc = buildDocumentDefinition({
      headerZeile: HEADER,
      mapping: mapping(),
      letzteHeaderSpalte: HEADER.length,
      farbRegeln: [],
      zeilen: [leereZeile({ lagerort: "Trakt 1" })],
      firmaName: "Beispiel-Firma",
      logoDataUrl: null,
    });

    const table = tableFromContent(doc);
    expect(table.headerRows).toBe(1);
    const headerRow = table.body[0] as { text: string }[];
    expect(headerRow.map((cell) => cell.text)).toEqual(HEADER);
  });

  it("writes one row per Gerät below the header, mapped by column", () => {
    const doc = buildDocumentDefinition({
      headerZeile: HEADER,
      mapping: mapping(),
      letzteHeaderSpalte: HEADER.length,
      farbRegeln: [],
      zeilen: [
        leereZeile({ lagerort: "Trakt 1", artikel: "Anschlagpunkt", pruefergebnis: "Freigabe" }),
        leereZeile({ lagerort: "Trakt 2", artikel: "Seilsystem", pruefergebnis: "keine Freigabe" }),
      ],
      firmaName: "Beispiel-Firma",
      logoDataUrl: null,
    });

    const table = tableFromContent(doc);
    expect(table.body).toHaveLength(3); // Header + 2 Datenzeilen
    const erste = table.body[1] as { text: string }[];
    expect(erste[0].text).toBe("Trakt 1");
    expect(erste[1].text).toBe("Anschlagpunkt");
    const zweite = table.body[2] as { text: string }[];
    expect(zweite[0].text).toBe("Trakt 2");
  });

  it("applies the Prüfergebnis color found in the template as a static fillColor, matched by the exact value", () => {
    const doc = buildDocumentDefinition({
      headerZeile: HEADER,
      mapping: mapping(),
      letzteHeaderSpalte: HEADER.length,
      farbRegeln: [
        { text: "Freigabe", argb: "FF00FF00" },
        { text: "keine Freigabe", argb: "FFFF0000" },
      ],
      zeilen: [leereZeile({ pruefergebnis: "Freigabe" }), leereZeile({ pruefergebnis: "keine Freigabe" })],
      firmaName: "Beispiel-Firma",
      logoDataUrl: null,
    });

    const table = tableFromContent(doc);
    const ergebnisSpalte = 2; // 0-indiziert: Spalte 3 ("Prüfergebnis")
    expect(zellFarbe(table.body[1] as TableCell[], ergebnisSpalte)).toBe("#00FF00");
    expect(zellFarbe(table.body[2] as TableCell[], ergebnisSpalte)).toBe("#FF0000");
  });

  it("falls back to the standard Freigabe/keine-Freigabe colors when the template has no color rules of its own", () => {
    const doc = buildDocumentDefinition({
      headerZeile: HEADER,
      mapping: mapping(),
      letzteHeaderSpalte: HEADER.length,
      farbRegeln: [],
      zeilen: [leereZeile({ pruefergebnis: "Freigabe" })],
      firmaName: "Beispiel-Firma",
      logoDataUrl: null,
    });

    const table = tableFromContent(doc);
    expect(zellFarbe(table.body[1] as TableCell[], 2)).toBeTruthy();
  });

  it("leaves a Prüfergebnis value with no matching color rule uncolored instead of guessing", () => {
    const doc = buildDocumentDefinition({
      headerZeile: HEADER,
      mapping: mapping(),
      letzteHeaderSpalte: HEADER.length,
      farbRegeln: [{ text: "Freigabe", argb: "FF00FF00" }],
      zeilen: [leereZeile({ pruefergebnis: "unbekannter Wert" })],
      firmaName: "Beispiel-Firma",
      logoDataUrl: null,
    });

    const table = tableFromContent(doc);
    expect(zellFarbe(table.body[1] as TableCell[], 2)).toBeUndefined();
  });

  it("widens a column's share based on its longest actual data value, even when the header itself is short", () => {
    const doc = buildDocumentDefinition({
      headerZeile: HEADER,
      mapping: mapping(),
      letzteHeaderSpalte: HEADER.length,
      farbRegeln: [],
      zeilen: [leereZeile({ artikel: "Höhensicherungsgerät mit Rettungshub" })],
      firmaName: "Beispiel-Firma",
      logoDataUrl: null,
    });

    const table = tableFromContent(doc);
    const widths = table.widths as string[];
    const artikelAnteil = parseFloat(widths[1]);
    const lagerortAnteil = parseFloat(widths[0]);
    expect(artikelAnteil).toBeGreaterThan(lagerortAnteil);
  });

  // Live-Fund (2026-10-06): die Breite wurde früher anhand der GESAMTlänge
  // eines mehrzeiligen Werts berechnet statt anhand der längsten EINZELNEN
  // Zeile — eine Spalte mit mehreren kurzen, aber zahlreichen Zeilen wurde
  // dadurch unnötig breit.
  it("bases a column's width share on the longest individual line of a multi-line value, not the combined length", () => {
    const doc = buildDocumentDefinition({
      headerZeile: HEADER,
      mapping: mapping(),
      letzteHeaderSpalte: HEADER.length,
      farbRegeln: [],
      zeilen: [leereZeile({ bemerkungen: "Zeile1\nZeile2\nZeile3\nZeile4" })], // einzeln kurz, zusammen lang
      firmaName: "Beispiel-Firma",
      logoDataUrl: null,
    });

    const table = tableFromContent(doc);
    const widths = table.widths as string[];
    const bemerkungenAnteil = parseFloat(widths[3]);
    // "Bemerkungen" (11 Zeichen) als längste einzelne Zeile ("Zeile1" etc., 6
    // Zeichen) darf nicht so breit werden, wie es die Gesamtlänge (~24
    // Zeichen über alle Zeilen) nahelegen würde.
    expect(bemerkungenAnteil).toBeLessThan(35);
  });

  it("puts the firma name and a visual gap before the table, without requiring a logo", () => {
    const doc = buildDocumentDefinition({
      headerZeile: HEADER,
      mapping: mapping(),
      letzteHeaderSpalte: HEADER.length,
      farbRegeln: [],
      zeilen: [leereZeile()],
      firmaName: "9.81 Arbeitssicherheit AG",
      logoDataUrl: null,
    });

    expect(JSON.stringify(doc.content)).toContain("9.81 Arbeitssicherheit AG");
    const content = doc.content as { margin?: number[] }[];
    const tableElement = content.find((element) => "table" in element);
    expect(tableElement?.margin?.[1]).toBeGreaterThan(0);
  });

  it("renders the orientation as landscape, matching the previous Excel export's page setup", () => {
    const doc = buildDocumentDefinition({
      headerZeile: HEADER,
      mapping: mapping(),
      letzteHeaderSpalte: HEADER.length,
      farbRegeln: [],
      zeilen: [leereZeile()],
      firmaName: "Beispiel-Firma",
      logoDataUrl: null,
    });

    expect(doc.pageOrientation).toBe("landscape");
  });
});

describe("erzeugePdf", () => {
  async function buildVorlageBuffer(): Promise<ArrayBuffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Bericht");
    worksheet.addRow(["Titel"]);
    worksheet.addRow(HEADER);
    return (await workbook.xlsx.writeBuffer()) as ArrayBuffer;
  }

  it("produces a real PDF buffer end-to-end, including font registration and the embedded logo", async () => {
    const vorlageBuffer = await buildVorlageBuffer();

    const pdfBuffer = await erzeugePdf(vorlageBuffer, [leereZeile({ lagerort: "Trakt 1", pruefergebnis: "Freigabe" })], "Beispiel-Firma");

    expect(pdfBuffer.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  });
});
