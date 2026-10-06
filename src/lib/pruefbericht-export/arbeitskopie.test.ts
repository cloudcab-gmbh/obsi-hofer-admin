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
const ERGEBNIS_SPALTE = 7; // "G" — 1-indiziert wie HEADER oben

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

const EIN_PIXEL_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

async function buildVorlage(
  options: {
    mitBeispielzeile?: boolean;
    mitBedingterFormatierung?: boolean;
    mitLogo?: boolean;
    mitHyperlinkInTitel?: boolean;
    sheetName?: string;
  } = {}
): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(options.sheetName ?? "Bericht");

  const titelRow = worksheet.addRow(["Prüfbericht Absturzsicherungen", "", "Beispiel-Firma"]);
  if (options.mitHyperlinkInTitel) {
    titelRow.getCell(4).value = { text: "info@obsi-hofer.ch", hyperlink: "mailto:info@obsi-hofer.ch" };
  }
  worksheet.addRow(HEADER);

  if (options.mitLogo) {
    const imageId = workbook.addImage({ base64: `data:image/png;base64,${EIN_PIXEL_PNG_BASE64}`, extension: "png" });
    worksheet.addImage(imageId, "A1:B1");
  }

  if (options.mitBeispielzeile) {
    const row = worksheet.addRow(["Alter Lagerort", "Alter Artikel", "Alter Typ", "ALT-001", "01.01.2020", "xx", "Freigabe", "alte Bemerkung"]);
    row.getCell(ERGEBNIS_SPALTE).font = { bold: true };
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

async function loadWorksheet(buffer: ArrayBuffer, name = "Bericht") {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  return workbook.getWorksheet(name) ?? workbook.worksheets[0];
}

function conditionalFormattings(worksheet: ExcelJS.Worksheet) {
  return (worksheet as unknown as { conditionalFormattings: { ref: string; rules: { text?: string; style?: { fill?: { fgColor?: { argb?: string } } } }[] }[] })
    .conditionalFormattings;
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

  it("discards any pre-existing data rows from the real template instead of copying them over", async () => {
    const vorlage = await buildVorlage({ mitBeispielzeile: true });

    const ergebnis = await erzeugeArbeitskopie(vorlage, [leereZeile({ lagerort: "Neu" })]);
    const worksheet = await loadWorksheet(ergebnis);

    expect(worksheet.rowCount).toBe(3);
    expect(worksheet.getRow(3).getCell(1).text).toBe("Neu");
    expect(worksheet.getRow(3).getCell(2).text).toBeFalsy(); // "Alter Artikel" darf nicht mehr vorhanden sein
  });

  it("makes the header row bold", async () => {
    const vorlage = await buildVorlage({ mitBeispielzeile: true });

    const ergebnis = await erzeugeArbeitskopie(vorlage, [leereZeile()]);
    const worksheet = await loadWorksheet(ergebnis);

    expect(worksheet.getRow(2).getCell(1).font?.bold).toBe(true);
  });

  it("re-creates the Prüfergebnis color rules found in the template, scoped to just that column and the written rows", async () => {
    const vorlage = await buildVorlage({ mitBeispielzeile: true, mitBedingterFormatierung: true });

    const zeilen = Array.from({ length: 10 }, (_, i) => leereZeile({ lagerort: `Zeile ${i}` }));
    const ergebnis = await erzeugeArbeitskopie(vorlage, zeilen);
    const worksheet = await loadWorksheet(ergebnis);

    const cfs = conditionalFormattings(worksheet);
    expect(cfs).toHaveLength(2);
    expect(cfs.map((cf) => cf.ref)).toEqual(["G3:G12", "G3:G12"]);
    expect(cfs.map((cf) => cf.rules[0].style?.fill?.fgColor?.argb).sort()).toEqual(["FF00FF00", "FFFF0000"].sort());
  });

  it("falls back to a standard Freigabe/keine-Freigabe color scheme when the template has no conditional formatting of its own", async () => {
    const vorlage = await buildVorlage({ mitBeispielzeile: true }); // ohne mitBedingterFormatierung

    const ergebnis = await erzeugeArbeitskopie(vorlage, [leereZeile({ pruefergebnis: "Freigabe" })]);
    const worksheet = await loadWorksheet(ergebnis);

    const cfs = conditionalFormattings(worksheet);
    expect(cfs.length).toBeGreaterThan(0);
    expect(cfs.every((cf) => cf.ref === "G3:G3")).toBe(true);
  });

  it("adds no conditional formatting at all when there are no rows to color", async () => {
    const vorlage = await buildVorlage({ mitBeispielzeile: true, mitBedingterFormatierung: true });

    const ergebnis = await erzeugeArbeitskopie(vorlage, []);
    const worksheet = await loadWorksheet(ergebnis);

    expect(conditionalFormattings(worksheet)).toHaveLength(0);
  });

  it("handles an empty Geräte list by leaving only the title and header rows", async () => {
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

  it("reads the header/structure from the worksheet named 'Bericht', not simply the first one in the workbook", async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet("Therapie").addRow(["Ganz andere Kopfzeile ohne Prüfergebnis"]);
    const bericht = workbook.addWorksheet("Bericht");
    bericht.addRow(["Branding"]);
    bericht.addRow(HEADER);
    const vorlage = (await workbook.xlsx.writeBuffer()) as ArrayBuffer;

    const ergebnis = await erzeugeArbeitskopie(vorlage, [leereZeile({ lagerort: "X" })]);

    const resultWorkbook = new ExcelJS.Workbook();
    await resultWorkbook.xlsx.load(ergebnis);

    // Die Ausgabe enthält nur das frisch erzeugte "Bericht"-Blatt — die
    // Quelldatei selbst (inkl. ihres "Therapie"-Blatts) wird nie wieder
    // gespeichert, nur zum Lesen der Struktur verwendet.
    expect(resultWorkbook.worksheets).toHaveLength(1);
    expect(resultWorkbook.worksheets[0].getRow(3).getCell(1).text).toBe("X");
  });

  it("never carries embedded images from the template into the result (new workbook, built from scratch)", async () => {
    const vorlage = await buildVorlage({ mitBeispielzeile: true, mitLogo: true });

    const ergebnis = await erzeugeArbeitskopie(vorlage, [leereZeile({ lagerort: "X" })]);
    const worksheet = await loadWorksheet(ergebnis);

    expect(worksheet.getImages()).toHaveLength(0);
  });

  // Live-Fund (2026-10-06): eine Hyperlink-Zelle (z.B. eine als Link
  // formatierte E-Mail-Adresse) in der Titelzeile erschien im Export als
  // buchstäblich "[object Object]" statt als Text.
  it("extracts the plain text from a hyperlink cell in a title row instead of '[object Object]'", async () => {
    const vorlage = await buildVorlage({ mitBeispielzeile: true, mitHyperlinkInTitel: true });

    const ergebnis = await erzeugeArbeitskopie(vorlage, [leereZeile()]);
    const worksheet = await loadWorksheet(ergebnis);

    expect(worksheet.getRow(1).getCell(4).text).toBe("info@obsi-hofer.ch");
  });

  it("sets a usable column width based on the header text instead of the exceljs default", async () => {
    const vorlage = await buildVorlage({ mitBeispielzeile: true });

    const ergebnis = await erzeugeArbeitskopie(vorlage, [leereZeile()]);
    const worksheet = await loadWorksheet(ergebnis);

    // "Einbau- / Lagerort" (19 Zeichen) muss deutlich breiter sein als die
    // exceljs-Standardbreite (8.43) — sonst wird der Inhalt beim PDF-Export
    // abgeschnitten (live beobachtet).
    expect(worksheet.getColumn(1).width).toBeGreaterThan(15);
  });
});
