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
const FIRMA_NAME = "Beispiel-Firma";

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
    mitHyperlinkInHeader?: boolean;
    mitVerbundenerHeaderZelle?: boolean;
    titelFirma?: string;
    sheetName?: string;
  } = {}
): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(options.sheetName ?? "Bericht");

  // Die Titelzeile der Vorlage selbst wird von erzeugeArbeitskopie bewusst
  // NICHT übernommen (siehe Live-Fund in arbeitskopie.ts) — hier trotzdem
  // vorhanden, um zu belegen, dass sie wirklich ignoriert wird.
  worksheet.addRow(["Prüfbericht Absturzsicherungen", "", options.titelFirma ?? "Falscher Orts-/Projektname"]);

  const headerRow = worksheet.addRow(HEADER);
  if (options.mitHyperlinkInHeader) {
    headerRow.getCell(1).value = { text: "Einbau- / Lagerort", hyperlink: "https://example.com" };
  }
  if (options.mitVerbundenerHeaderZelle) {
    worksheet.mergeCells(headerRow.number, 1, headerRow.number, 2);
  }

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

function ergebnisFarbe(worksheet: ExcelJS.Worksheet, zeile: number): string | undefined {
  const fill = worksheet.getRow(zeile).getCell(ERGEBNIS_SPALTE).fill;
  return fill?.type === "pattern" ? fill.fgColor?.argb : undefined;
}

// Feste Zeilenstruktur der Ausgabe, unabhängig vom Inhalt der Vorlage:
// Zeile 1 = Titel ("Prüfbericht Absturzsicherungen" + Firma), Zeile 2 =
// OBSI-Hofer-Kontaktzeile, Zeile 3 = Kopfzeile, ab Zeile 4 Daten.
const ERSTE_DATENZEILE = 4;

describe("erzeugeArbeitskopie", () => {
  it("writes one row per Gerät below the detected header, mapped by column header", async () => {
    const vorlage = await buildVorlage({ mitBeispielzeile: true });

    const ergebnis = await erzeugeArbeitskopie(
      vorlage,
      [
        leereZeile({ lagerort: "Trakt 1", artikel: "Anschlagpunkt", typ: "AM 211", serienummer: "SN-1", geprueft: "27.04.2026", pruefer: "sabi", pruefergebnis: "Freigabe" }),
        leereZeile({ lagerort: "Trakt 2", artikel: "Seilsystem", typ: "Lock SYS IV", serienummer: "SN-2", geprueft: "28.04.2026", pruefer: "daze", pruefergebnis: "keine Freigabe" }),
      ],
      FIRMA_NAME
    );

    const worksheet = await loadWorksheet(ergebnis);

    expect(worksheet.getRow(ERSTE_DATENZEILE).getCell(1).text).toBe("Trakt 1");
    expect(worksheet.getRow(ERSTE_DATENZEILE).getCell(7).text).toBe("Freigabe");
    expect(worksheet.getRow(ERSTE_DATENZEILE + 1).getCell(1).text).toBe("Trakt 2");
    expect(worksheet.rowCount).toBe(ERSTE_DATENZEILE + 1);
  });

  it("discards any pre-existing data rows from the real template instead of copying them over", async () => {
    const vorlage = await buildVorlage({ mitBeispielzeile: true });

    const ergebnis = await erzeugeArbeitskopie(vorlage, [leereZeile({ lagerort: "Neu" })], FIRMA_NAME);
    const worksheet = await loadWorksheet(ergebnis);

    expect(worksheet.rowCount).toBe(ERSTE_DATENZEILE);
    expect(worksheet.getRow(ERSTE_DATENZEILE).getCell(1).text).toBe("Neu");
    expect(worksheet.getRow(ERSTE_DATENZEILE).getCell(2).text).toBeFalsy(); // "Alter Artikel" darf nicht mehr vorhanden sein
  });

  // Live-Fund (2026-10-06): die Titelzeile einer echten Vorlagen-Datei zeigte
  // einen Projekt-/Ortsnamen ("Weissfluhgipfel 2 844 m ü. M.") statt des
  // tatsächlichen Firmennamens — die Vorlage selbst ist dafür keine
  // verlässliche Quelle. Der Titel wird deshalb nicht mehr aus ihr
  // übernommen, sondern aus dem server-seitig aus Dataverse bekannten
  // Firmennamen gebaut.
  it("builds the title from the given firmaName, ignoring whatever text is in the template's own title row", async () => {
    const vorlage = await buildVorlage({ mitBeispielzeile: true, titelFirma: "Weissfluhgipfel 2 844 m ü. M." });

    const ergebnis = await erzeugeArbeitskopie(vorlage, [leereZeile()], "9.81 Arbeitssicherheit AG");
    const worksheet = await loadWorksheet(ergebnis);

    expect(worksheet.getRow(1).getCell(3).text).toBe("9.81 Arbeitssicherheit AG");
    expect(worksheet.getRow(1).getCell(1).text).toBe("Prüfbericht Absturzsicherungen");
  });

  it("includes the OBSI Hofer contact line regardless of what the template's title row contained", async () => {
    const vorlage = await buildVorlage({ mitBeispielzeile: true });

    const ergebnis = await erzeugeArbeitskopie(vorlage, [leereZeile()], FIRMA_NAME);
    const worksheet = await loadWorksheet(ergebnis);

    expect(worksheet.getRow(2).getCell(1).text).toContain("Obsi Hofer GmbH");
  });

  it("makes the header row bold", async () => {
    const vorlage = await buildVorlage({ mitBeispielzeile: true });

    const ergebnis = await erzeugeArbeitskopie(vorlage, [leereZeile()], FIRMA_NAME);
    const worksheet = await loadWorksheet(ergebnis);

    expect(worksheet.getRow(3).getCell(1).font?.bold).toBe(true);
  });

  // Live-Fund (2026-10-06): bedingte Formatierung (addConditionalFormatting)
  // wurde von der Graph-PDF-Konvertierung nicht ausgewertet — das
  // Prüfergebnis blieb im exportierten PDF farblos. Die Füllfarbe wird daher
  // direkt und statisch pro Zelle gesetzt, sobald der Wert bekannt ist.
  it("applies the Prüfergebnis color found in the template as a static fill, matched by the exact value", async () => {
    const vorlage = await buildVorlage({ mitBeispielzeile: true, mitBedingterFormatierung: true });

    const ergebnis = await erzeugeArbeitskopie(
      vorlage,
      [leereZeile({ pruefergebnis: "Freigabe" }), leereZeile({ pruefergebnis: "keine Freigabe" })],
      FIRMA_NAME
    );
    const worksheet = await loadWorksheet(ergebnis);

    expect(ergebnisFarbe(worksheet, ERSTE_DATENZEILE)).toBe("FF00FF00");
    expect(ergebnisFarbe(worksheet, ERSTE_DATENZEILE + 1)).toBe("FFFF0000");
  });

  it("falls back to a standard Freigabe/keine-Freigabe color scheme when the template has no conditional formatting of its own", async () => {
    const vorlage = await buildVorlage({ mitBeispielzeile: true }); // ohne mitBedingterFormatierung

    const ergebnis = await erzeugeArbeitskopie(vorlage, [leereZeile({ pruefergebnis: "Freigabe" })], FIRMA_NAME);
    const worksheet = await loadWorksheet(ergebnis);

    expect(ergebnisFarbe(worksheet, ERSTE_DATENZEILE)).toBeTruthy();
  });

  it("leaves a Prüfergebnis value with no matching color rule uncolored instead of guessing", async () => {
    const vorlage = await buildVorlage({ mitBeispielzeile: true, mitBedingterFormatierung: true });

    const ergebnis = await erzeugeArbeitskopie(vorlage, [leereZeile({ pruefergebnis: "letzte Freigabe" })], FIRMA_NAME);
    const worksheet = await loadWorksheet(ergebnis);

    expect(ergebnisFarbe(worksheet, ERSTE_DATENZEILE)).toBeUndefined();
  });

  it("handles an empty Geräte list by leaving only the title and header rows", async () => {
    const vorlage = await buildVorlage({ mitBeispielzeile: true });

    const ergebnis = await erzeugeArbeitskopie(vorlage, [], FIRMA_NAME);
    const worksheet = await loadWorksheet(ergebnis);

    expect(worksheet.rowCount).toBe(ERSTE_DATENZEILE - 1);
  });

  it("throws a VorlagenFehler when no header row with a Prüfergebnis column can be found", async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet("Bericht").addRow(["Nur", "Branding", "Ohne", "Kopfzeile"]);
    const vorlage = (await workbook.xlsx.writeBuffer()) as ArrayBuffer;

    await expect(erzeugeArbeitskopie(vorlage, [leereZeile()], FIRMA_NAME)).rejects.toBeInstanceOf(VorlagenFehler);
  });

  it("reads the header/structure from the worksheet named 'Bericht', not simply the first one in the workbook", async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet("Therapie").addRow(["Ganz andere Kopfzeile ohne Prüfergebnis"]);
    const bericht = workbook.addWorksheet("Bericht");
    bericht.addRow(["Branding"]);
    bericht.addRow(HEADER);
    const vorlage = (await workbook.xlsx.writeBuffer()) as ArrayBuffer;

    const ergebnis = await erzeugeArbeitskopie(vorlage, [leereZeile({ lagerort: "X" })], FIRMA_NAME);

    const resultWorkbook = new ExcelJS.Workbook();
    await resultWorkbook.xlsx.load(ergebnis);

    // Die Ausgabe enthält nur das frisch erzeugte "Bericht"-Blatt — die
    // Quelldatei selbst (inkl. ihres "Therapie"-Blatts) wird nie wieder
    // gespeichert, nur zum Lesen der Struktur verwendet.
    expect(resultWorkbook.worksheets).toHaveLength(1);
    expect(resultWorkbook.worksheets[0].getRow(ERSTE_DATENZEILE).getCell(1).text).toBe("X");
  });

  // Das Logo der Vorlage selbst wird nie übernommen (Live-Fund: exceljs
  // beschädigt eingebettete Bilder beim Laden→Ändern→Speichern) — stattdessen
  // fügt erzeugeArbeitskopie sein eigenes, fest hinterlegtes Logo frisch ein
  // (derselbe Fall, der unkritisch ist, weil nie etwas Bestehendes neu
  // gespeichert wird).
  it("ignores any logo embedded in the template and inserts its own instead", async () => {
    const vorlage = await buildVorlage({ mitBeispielzeile: true, mitLogo: true });

    const ergebnis = await erzeugeArbeitskopie(vorlage, [leereZeile({ lagerort: "X" })], FIRMA_NAME);
    const worksheet = await loadWorksheet(ergebnis);

    expect(worksheet.getImages()).toHaveLength(1);
  });

  it("inserts exactly one logo image even when the template had none at all", async () => {
    const vorlage = await buildVorlage({ mitBeispielzeile: true }); // ohne mitLogo

    const ergebnis = await erzeugeArbeitskopie(vorlage, [leereZeile()], FIRMA_NAME);
    const worksheet = await loadWorksheet(ergebnis);

    expect(worksheet.getImages()).toHaveLength(1);
  });

  // Live-Fund (2026-10-06): `cell.text` liefert für Hyperlink-Zellen
  // buchstäblich "[object Object]" statt des sichtbaren Textes (exceljs ruft
  // intern toString() auf dem Wert-Wrapper auf, HyperlinkValue überschreibt
  // das nicht) — hier anhand einer (unüblichen, aber denkbaren)
  // Hyperlink-formatierten Kopfzellen-Spalte geprüft, da die Kopfzeile die
  // einzige Vorlagen-Zeile ist, die noch inhaltlich gelesen wird.
  it("extracts the plain text from a hyperlink cell in the header row instead of '[object Object]'", async () => {
    const vorlage = await buildVorlage({ mitBeispielzeile: true, mitHyperlinkInHeader: true });

    const ergebnis = await erzeugeArbeitskopie(vorlage, [leereZeile()], FIRMA_NAME);
    const worksheet = await loadWorksheet(ergebnis);

    expect(worksheet.getRow(3).getCell(1).text).toBe("Einbau- / Lagerort");
  });

  it("sets a usable column width based on the header text instead of the exceljs default", async () => {
    const vorlage = await buildVorlage({ mitBeispielzeile: true });

    const ergebnis = await erzeugeArbeitskopie(vorlage, [leereZeile()], FIRMA_NAME);
    const worksheet = await loadWorksheet(ergebnis);

    // "Einbau- / Lagerort" (19 Zeichen) muss deutlich breiter sein als die
    // exceljs-Standardbreite (8.43) — sonst wird der Inhalt beim PDF-Export
    // abgeschnitten (live beobachtet).
    expect(worksheet.getColumn(1).width).toBeGreaterThan(15);
  });

  // Live-Fund (2026-10-06): Breite allein anhand der Kopfzeile reichte nicht
  // — kurze Überschriften wie "Artikel" enthalten oft deutlich längere
  // tatsächliche Werte ("Höhensicherungsgerät mit Rettungshub"), die dadurch
  // im PDF abgeschnitten wurden.
  it("widens a column to fit its longest actual data value, even when the header itself is short", async () => {
    const vorlage = await buildVorlage({ mitBeispielzeile: true });

    const ergebnis = await erzeugeArbeitskopie(
      vorlage,
      [leereZeile({ artikel: "Höhensicherungsgerät mit Rettungshub" })],
      FIRMA_NAME
    );
    const worksheet = await loadWorksheet(ergebnis);

    expect(worksheet.getColumn(2).width).toBeGreaterThan(30); // Spalte 2 = "Artikel"
  });

  // Live-Fund (2026-10-06): die Breite wurde anhand der GESAMTlänge eines
  // mehrzeiligen Werts berechnet (alle Zeilen zusammengezählt) statt anhand
  // der längsten EINZELNEN Zeile — eine Spalte mit mehreren kurzen, aber
  // zahlreichen Zeilen wurde dadurch unnötig breit.
  it("bases column width on the longest individual line of a multi-line value, not the combined length of all lines", async () => {
    const vorlage = await buildVorlage({ mitBeispielzeile: true });

    const ergebnis = await erzeugeArbeitskopie(
      vorlage,
      [leereZeile({ bemerkungen: "Zeile1\nZeile2\nZeile3\nZeile4" })], // einzeln kurz, zusammen > 25 Zeichen
      FIRMA_NAME
    );
    const worksheet = await loadWorksheet(ergebnis);

    const bemerkungenSpalte = HEADER.indexOf("Bemerkungen") + 1; // 1-indiziert wie Excel
    expect(worksheet.getColumn(bemerkungenSpalte).width).toBeLessThan(15);
  });

  // Live-Fund (2026-10-06): exceljs liefert für JEDE Zelle innerhalb eines
  // Merge-Bereichs denselben Wert (nicht nur für die Anker-Zelle) — geprüft
  // anhand einer (unüblichen, aber denkbaren) verbundenen Kopfzeilen-Zelle,
  // da die Kopfzeile die einzige Vorlagen-Zeile ist, die noch inhaltlich
  // gelesen wird.
  it("only takes a merged header cell's value from its anchor cell, not from every cell in the merge", async () => {
    const vorlage = await buildVorlage({ mitBeispielzeile: true, mitVerbundenerHeaderZelle: true });

    const ergebnis = await erzeugeArbeitskopie(vorlage, [leereZeile({ lagerort: "X" })], FIRMA_NAME);
    const worksheet = await loadWorksheet(ergebnis);

    const headerZeile = worksheet.getRow(3);
    expect(headerZeile.getCell(1).text).toBe("Einbau- / Lagerort");
    expect(headerZeile.getCell(2).text).toBeFalsy();
  });

  it("sets up the page for landscape printing, scaled to fit one page wide", async () => {
    const vorlage = await buildVorlage({ mitBeispielzeile: true });

    const ergebnis = await erzeugeArbeitskopie(vorlage, [leereZeile()], FIRMA_NAME);
    const worksheet = await loadWorksheet(ergebnis);

    expect(worksheet.pageSetup.orientation).toBe("landscape");
    expect(worksheet.pageSetup.fitToWidth).toBe(1);
  });

  // Live-Fund (2026-10-06): mehrzeilige Werte (z.B. Zubehör mit eingebetteten
  // Zeilenumbrüchen) erschienen ohne jede Trennung aneinandergereiht
  // ("Zubehör Zeile1Zubehör Zeile2...") — Excel zeigt eingebettete
  // Zeilenumbrüche in einer Zelle nur an, wenn `wrapText` aktiviert ist.
  it("enables wrapText on data cells so embedded line breaks (e.g. in Zubehör) are actually shown", async () => {
    const vorlage = await buildVorlage({ mitBeispielzeile: true });

    const ergebnis = await erzeugeArbeitskopie(
      vorlage,
      [leereZeile({ zubehoer: "Zeile1\nZeile2" })],
      FIRMA_NAME
    );
    const worksheet = await loadWorksheet(ergebnis);

    const beliebigeSpalte = HEADER.indexOf("Bemerkungen") + 1; // 1-indiziert wie Excel; beliebige Datenzelle genügt zur Prüfung
    expect(worksheet.getRow(ERSTE_DATENZEILE).getCell(beliebigeSpalte).alignment?.wrapText).toBe(true);
  });
});
