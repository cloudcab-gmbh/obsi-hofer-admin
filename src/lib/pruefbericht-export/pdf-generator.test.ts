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
    // Live-Fund (2026-10-06): eine über den Seitenumbruch geteilte Zeile zerfiel.
    expect(table.dontBreakRows).toBe(true);
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
    const farbe = zellFarbe(table.body[1] as TableCell[], 2);
    expect(farbe).toBeTruthy();
    expect(farbe).not.toBe("#EDEDED"); // nicht bloss die Zeilen-Bänderung
  });

  it("leaves a Prüfergebnis value with no matching color rule in the plain row color instead of guessing", () => {
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
    // Erste Datenzeile ist gebändert — die Ergebnis-Zelle behält nur diese Zeilenfarbe.
    expect(zellFarbe(table.body[1] as TableCell[], 2)).toBe(zellFarbe(table.body[1] as TableCell[], 0));
  });

  it("styles the table like the Excel templates: grey header with white bold text, banded rows, no vertical lines", () => {
    const doc = buildDocumentDefinition({
      headerZeile: HEADER,
      mapping: mapping(),
      letzteHeaderSpalte: HEADER.length,
      farbRegeln: [],
      zeilen: [leereZeile({ lagerort: "A" }), leereZeile({ lagerort: "B" }), leereZeile({ lagerort: "C" })],
      firmaName: "Beispiel-Firma",
      logoDataUrl: null,
    });

    const table = tableFromContent(doc);
    const kopf = table.body[0] as unknown as { fillColor?: string; color?: string; bold?: boolean }[];
    expect(kopf[0]).toMatchObject({ fillColor: "#A6A6A6", color: "#FFFFFF", bold: true });
    expect(zellFarbe(table.body[1] as TableCell[], 0)).toBe("#EDEDED");
    expect(zellFarbe(table.body[2] as TableCell[], 0)).toBeUndefined();
    expect(zellFarbe(table.body[3] as TableCell[], 0)).toBe("#EDEDED");

    const content = doc.content as { layout?: { vLineWidth?: () => number } }[];
    const tableElement = content.find((element) => "table" in element);
    expect(tableElement?.layout?.vLineWidth?.()).toBe(0);
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

    const widths = tableFromContent(doc).widths as number[];
    expect(widths[1]).toBeGreaterThan(widths[0]);
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

    const einzeilig = buildDocumentDefinition({
      headerZeile: HEADER,
      mapping: mapping(),
      letzteHeaderSpalte: HEADER.length,
      farbRegeln: [],
      zeilen: [leereZeile({ bemerkungen: "Zeile1 Zeile2 Zeile3 Zeile4" })],
      firmaName: "Beispiel-Firma",
      logoDataUrl: null,
    });

    const mehrzeiligBreite = (tableFromContent(doc).widths as number[])[3];
    const einzeiligBreite = (tableFromContent(einzeilig).widths as number[])[3];
    expect(mehrzeiligBreite).toBeLessThan(einzeiligBreite);
  });

  // Live-Fund (2026-10-06): "Stahlkarabine/r", "Scanc/ode", "Serie/n-Nr." —
  // kurze Spalten wurden schmaler als ihr längstes Wort und Wörter brachen
  // mitten drin um, während lange Spalten (Bemerkungen) zu viel Platz bekamen.
  it("never makes a column narrower than its longest unbreakable word, even when other columns are long", () => {
    const header = ["Scancode", "Zubehör", "Bemerkungen"];
    const map = new Map<number, ExportFeld>([
      [1, "barcode"],
      [2, "zubehoer"],
      [3, "bemerkungen"],
    ]);
    // Messung: 1pt pro Zeichen, unabhängig von Schrift/Fettdruck — macht die Erwartung exakt.
    const messer = (text: string) => text.length;
    const doc = buildDocumentDefinition({
      headerZeile: header,
      mapping: map,
      letzteHeaderSpalte: header.length,
      farbRegeln: [],
      zeilen: [
        leereZeile({
          zubehoer: "1x Stahlkarabiner TL",
          bemerkungen: "sehr ".repeat(400),
        }),
      ],
      firmaName: "Beispiel-Firma",
      logoDataUrl: null,
      textMesser: messer,
    });

    const widths = tableFromContent(doc).widths as number[];
    expect(widths[0]).toBeGreaterThanOrEqual("Scancode".length);
    expect(widths[1]).toBeGreaterThanOrEqual("Stahlkarabiner".length);
  });

  it("keeps the total table width within the landscape page and shrinks the font when even the minimum widths don't fit", () => {
    const header = Array.from({ length: 16 }, (_, i) => `Spalte${i}`);
    const map = new Map<number, ExportFeld>([[1, "bemerkungen"]]);
    const doc = buildDocumentDefinition({
      headerZeile: header,
      mapping: map,
      letzteHeaderSpalte: header.length,
      farbRegeln: [],
      zeilen: [leereZeile({ bemerkungen: "x".repeat(200) })],
      firmaName: "Beispiel-Firma",
      logoDataUrl: null,
    });

    const content = doc.content as { table?: Table; fontSize?: number }[];
    const tableElement = content.find((element) => "table" in element)!;
    const widths = tableElement.table!.widths as number[];
    const gesamt = widths.reduce((a, b) => a + b, 0) + widths.length * 6.5 + 0.5;
    expect(gesamt).toBeLessThanOrEqual(841.89 - 48 + 0.01);
    expect(tableElement.fontSize).toBeLessThan(9);
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
