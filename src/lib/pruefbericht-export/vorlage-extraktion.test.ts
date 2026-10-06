import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import { extrahiereAusVorlage, standardFarbRegeln, VorlagenFehler } from "./vorlage-extraktion";

const HEADER = [
  "Einbau- / Lagerort",
  "Artikel",
  "Typ",
  "Serien-Nr.",
  "Geprüft",
  "Prüfer",
  "Prüfergebnis",
  "Bemerkungen",
];

async function buildVorlage(
  options: {
    mitBedingterFormatierung?: boolean;
    mitHyperlinkInHeader?: boolean;
    mitVerbundenerHeaderZelle?: boolean;
    mitZusaetzlicherLeerspalte?: boolean;
    sheetName?: string;
  } = {}
): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(options.sheetName ?? "Bericht");

  worksheet.addRow(["Prüfbericht Absturzsicherungen", "", "Irgendein Titel"]);

  const headerRow = worksheet.addRow(HEADER);
  if (options.mitZusaetzlicherLeerspalte) {
    // Simuliert echte Vorlagen, bei denen worksheet.columnCount mehr Spalten
    // zählt, als die Kopfzeile tatsächlich beschriftete Spalten hat.
    worksheet.getCell(headerRow.number + 1, HEADER.length + 10).border = { top: { style: "thin" } };
  }
  if (options.mitHyperlinkInHeader) {
    headerRow.getCell(1).value = { text: "Einbau- / Lagerort", hyperlink: "https://example.com" };
  }
  if (options.mitVerbundenerHeaderZelle) {
    worksheet.mergeCells(headerRow.number, 1, headerRow.number, 2);
  }

  if (options.mitBedingterFormatierung) {
    worksheet.addConditionalFormatting({
      ref: `G3:G5`,
      rules: [
        {
          type: "containsText",
          operator: "containsText",
          text: "Freigabe",
          priority: 1,
          style: { fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF00FF00" } } },
        },
        {
          type: "containsText",
          operator: "containsText",
          text: "keine Freigabe",
          priority: 2,
          style: { fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF0000" } } },
        },
      ],
    });
  }

  return (await workbook.xlsx.writeBuffer()) as ArrayBuffer;
}

async function loadWorkbook(buffer: ArrayBuffer): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  return workbook;
}

describe("extrahiereAusVorlage", () => {
  it("finds the header row by looking for a Prüfergebnis column, and maps every recognized column", async () => {
    const workbook = await loadWorkbook(await buildVorlage());

    const { headerZeile, mapping } = extrahiereAusVorlage(workbook);

    expect(headerZeile).toEqual(HEADER);
    expect(mapping.get(1)).toBe("lagerort");
    expect(mapping.get(2)).toBe("artikel");
    expect(mapping.get(7)).toBe("pruefergebnis");
  });

  it("throws a VorlagenFehler when no header row with a Prüfergebnis column can be found", async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet("Bericht").addRow(["Nur", "Branding", "Ohne", "Kopfzeile"]);

    expect(() => extrahiereAusVorlage(workbook)).toThrow(VorlagenFehler);
  });

  it("reads the header from the worksheet named 'Bericht', not simply the first one in the workbook", async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet("Therapie").addRow(["Ganz andere Kopfzeile ohne Prüfergebnis"]);
    const bericht = workbook.addWorksheet("Bericht");
    bericht.addRow(["Branding"]);
    bericht.addRow(HEADER);

    const { headerZeile } = extrahiereAusVorlage(workbook);

    expect(headerZeile).toEqual(HEADER);
  });

  // Live-Fund (2026-10-06): `cell.text` liefert für Hyperlink-Zellen
  // buchstäblich "[object Object]" statt des sichtbaren Textes.
  it("extracts the plain text from a hyperlink cell in the header row instead of '[object Object]'", async () => {
    const workbook = await loadWorkbook(await buildVorlage({ mitHyperlinkInHeader: true }));

    const { headerZeile } = extrahiereAusVorlage(workbook);

    expect(headerZeile[0]).toBe("Einbau- / Lagerort");
  });

  // Live-Fund (2026-10-06): exceljs liefert für JEDE Zelle innerhalb eines
  // Merge-Bereichs denselben Wert (nicht nur für die Anker-Zelle).
  it("only takes a merged header cell's value from its anchor cell, not from every cell in the merge", async () => {
    const workbook = await loadWorkbook(await buildVorlage({ mitVerbundenerHeaderZelle: true }));

    const { headerZeile } = extrahiereAusVorlage(workbook);

    expect(headerZeile[0]).toBe("Einbau- / Lagerort");
    expect(headerZeile[1]).toBeNull();
  });

  // Live-Fund (2026-10-06): echte Vorlagen zählten über `worksheet.columnCount`
  // offenbar mehr Spalten, als die Kopfzeile tatsächlich beschriftet.
  it("computes letzteHeaderSpalte as the last column with real header text, ignoring stray trailing formatting", async () => {
    const workbook = await loadWorkbook(await buildVorlage({ mitZusaetzlicherLeerspalte: true }));

    const { letzteHeaderSpalte } = extrahiereAusVorlage(workbook);

    expect(letzteHeaderSpalte).toBe(HEADER.length);
  });

  it("extracts the conditional-formatting color rules found in the template as plain text+color pairs", async () => {
    const workbook = await loadWorkbook(await buildVorlage({ mitBedingterFormatierung: true }));

    const { farbRegeln } = extrahiereAusVorlage(workbook);

    expect(farbRegeln).toContainEqual({ text: "Freigabe", argb: "FF00FF00" });
    expect(farbRegeln).toContainEqual({ text: "keine Freigabe", argb: "FFFF0000" });
  });

  it("returns no color rules when the template has no conditional formatting of its own", async () => {
    const workbook = await loadWorkbook(await buildVorlage());

    const { farbRegeln } = extrahiereAusVorlage(workbook);

    expect(farbRegeln).toEqual([]);
  });
});

describe("standardFarbRegeln", () => {
  it("provides a standard Freigabe/keine-Freigabe color scheme", () => {
    const regeln = standardFarbRegeln();

    expect(regeln.find((r) => r.text === "Freigabe")?.argb).toBeTruthy();
    expect(regeln.find((r) => r.text === "keine Freigabe")?.argb).toBeTruthy();
  });
});
