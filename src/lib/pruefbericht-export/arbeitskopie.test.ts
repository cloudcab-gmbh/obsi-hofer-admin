import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import { erzeugeArbeitskopie, VorlagenFehler } from "./arbeitskopie";
import type { ExportZeile } from "./feld-mapping";

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

async function buildVorlage(options: { mitBeispielzeile?: boolean; mitBedingterFormatierung?: boolean } = {}): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Bericht");

  worksheet.addRow(["Prüfbericht Absturzsicherungen", "", "Beispiel-Firma"]);
  worksheet.addRow(HEADER);

  if (options.mitBeispielzeile) {
    const row = worksheet.addRow(["Alter Lagerort", "Alter Artikel", "Alter Typ", "ALT-001", "01.01.2020", "xx", "Freigabe", "alte Bemerkung"]);
    row.getCell(7).font = { bold: true };
    row.getCell(7).border = { top: { style: "thin" } };
  }

  if (options.mitBedingterFormatierung) {
    worksheet.addConditionalFormatting({
      ref: "A3:H5",
      rules: [
        {
          type: "containsText",
          operator: "containsText",
          text: "Freigabe",
          priority: 1,
          style: { fill: { type: "pattern", pattern: "solid", bgColor: { argb: "FF00FF00" } } },
        },
      ],
    });
  }

  return (await workbook.xlsx.writeBuffer()) as ArrayBuffer;
}

async function loadWorksheet(buffer: ArrayBuffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  return workbook.worksheets[0];
}

describe("erzeugeArbeitskopie", () => {
  it("writes one row per Gerät below the detected header, mapped by column header", async () => {
    const vorlage = await buildVorlage({ mitBeispielzeile: true });

    const ergebnis = await erzeugeArbeitskopie(vorlage, [
      leereZeile({ lagerort: "Trakt 1", artikel: "Anschlagpunkt", typ: "AM 211", serienummer: "SN-1", geprueft: "27.04.2026", pruefer: "sabi", pruefergebnis: "Freigabe" }),
      leereZeile({ lagerort: "Trakt 2", artikel: "Seilsystem", typ: "Lock SYS IV", serienummer: "SN-2", geprueft: "28.04.2026", pruefer: "daze", pruefergebnis: "keine Freigabe" }),
    ]);

    const worksheet = await loadWorksheet(ergebnis);

    // Zeile 1 = Branding, Zeile 2 = Kopfzeile, ab Zeile 3 unsere Daten.
    expect(worksheet.getRow(3).getCell(1).text).toBe("Trakt 1");
    expect(worksheet.getRow(3).getCell(7).text).toBe("Freigabe");
    expect(worksheet.getRow(4).getCell(1).text).toBe("Trakt 2");
    expect(worksheet.rowCount).toBe(4);
  });

  it("discards any pre-existing data rows from the real template instead of appending after them", async () => {
    const vorlage = await buildVorlage({ mitBeispielzeile: true });

    const ergebnis = await erzeugeArbeitskopie(vorlage, [leereZeile({ lagerort: "Neu" })]);
    const worksheet = await loadWorksheet(ergebnis);

    expect(worksheet.rowCount).toBe(3);
    expect(worksheet.getRow(3).getCell(1).text).toBe("Neu");
    expect(worksheet.getRow(3).getCell(2).text).toBeFalsy(); // "Alter Artikel" darf nicht mehr vorhanden sein
  });

  it("copies the original data row's cell style (e.g. bold font) onto the newly written rows", async () => {
    const vorlage = await buildVorlage({ mitBeispielzeile: true });

    const ergebnis = await erzeugeArbeitskopie(vorlage, [leereZeile({ pruefergebnis: "Freigabe" })]);
    const worksheet = await loadWorksheet(ergebnis);

    expect(worksheet.getRow(3).getCell(7).font?.bold).toBe(true);
  });

  it("extends a conditional formatting range that would otherwise not cover the new rows", async () => {
    const vorlage = await buildVorlage({ mitBeispielzeile: true, mitBedingterFormatierung: true });

    const zeilen = Array.from({ length: 10 }, (_, i) => leereZeile({ lagerort: `Zeile ${i}` }));
    const ergebnis = await erzeugeArbeitskopie(vorlage, zeilen);
    const worksheet = await loadWorksheet(ergebnis);

    const cfModel = (worksheet as unknown as { conditionalFormattings: { ref: string }[] }).conditionalFormattings;
    expect(cfModel[0].ref).toBe("A3:H12");
  });

  it("does not shrink a conditional formatting range that already covers enough rows", async () => {
    const vorlage = await buildVorlage({ mitBeispielzeile: true, mitBedingterFormatierung: true });

    const ergebnis = await erzeugeArbeitskopie(vorlage, [leereZeile()]);
    const worksheet = await loadWorksheet(ergebnis);

    const cfModel = (worksheet as unknown as { conditionalFormattings: { ref: string }[] }).conditionalFormattings;
    expect(cfModel[0].ref).toBe("A3:H5");
  });

  it("handles an empty Geräte list by leaving only the header row", async () => {
    const vorlage = await buildVorlage({ mitBeispielzeile: true });

    const ergebnis = await erzeugeArbeitskopie(vorlage, []);
    const worksheet = await loadWorksheet(ergebnis);

    expect(worksheet.rowCount).toBe(2);
  });

  it("throws a VorlagenFehler when no header row with a Prüfergebnis column can be found", async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet("Bericht").addRow(["Nur", "Branding", "Ohne", "Kopfzeile"]);
    const vorlage = (await workbook.xlsx.writeBuffer()) as ArrayBuffer;

    await expect(erzeugeArbeitskopie(vorlage, [leereZeile()])).rejects.toBeInstanceOf(VorlagenFehler);
  });

  it("prefers a worksheet named 'Bericht' over other worksheets in the same workbook", async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet("Therapie").addRow(["sollte nicht verwendet werden"]);
    const bericht = workbook.addWorksheet("Bericht");
    bericht.addRow(["Branding"]);
    bericht.addRow(HEADER);
    const vorlage = (await workbook.xlsx.writeBuffer()) as ArrayBuffer;

    const ergebnis = await erzeugeArbeitskopie(vorlage, [leereZeile({ lagerort: "X" })]);

    const resultWorkbook = new ExcelJS.Workbook();
    await resultWorkbook.xlsx.load(ergebnis);
    const berichtResult = resultWorkbook.getWorksheet("Bericht")!;
    const therapieResult = resultWorkbook.getWorksheet("Therapie")!;

    expect(berichtResult.getRow(3).getCell(1).text).toBe("X");
    expect(therapieResult.getRow(1).getCell(1).text).toBe("sollte nicht verwendet werden"); // unverändert
  });
});
