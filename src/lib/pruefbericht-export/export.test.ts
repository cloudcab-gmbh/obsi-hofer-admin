import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Geraet } from "@/lib/dataverse/geraete";
import type { Pruefbericht } from "@/lib/dataverse/pruefberichte";

const listArtikelByIdsMock = vi.fn();
vi.mock("@/lib/dataverse/geraete", () => ({ listArtikelByIds: (...args: unknown[]) => listArtikelByIdsMock(...args) }));

const getAktuellstePruefberichteForGeraeteMock = vi.fn();
vi.mock("@/lib/dataverse/pruefberichte", () => ({
  getAktuellstePruefberichteForGeraete: (...args: unknown[]) => getAktuellstePruefberichteForGeraeteMock(...args),
}));

const downloadKundenDateiMock = vi.fn();
const uploadKundenDateiMock = vi.fn();
vi.mock("@/lib/sharepoint/kunden-drive", () => ({
  downloadKundenDatei: (...args: unknown[]) => downloadKundenDateiMock(...args),
  uploadKundenDatei: (...args: unknown[]) => uploadKundenDateiMock(...args),
}));

const erzeugePdfMock = vi.fn();
vi.mock("./pdf-generator", () => ({ erzeugePdf: (...args: unknown[]) => erzeugePdfMock(...args) }));

import { generatePruefberichtPdf, ExportFehler } from "./export";
import { SharePointError } from "@/lib/sharepoint/errors";

function geraet(overrides: Partial<Geraet> = {}): Geraet {
  return {
    id: "g1",
    name: "13229",
    serienummer: null,
    barcode: null,
    status: null,
    letztePruefung: null,
    ablegereife: null,
    herstelljahr: null,
    erstgebrauch: null,
    standortId: null,
    artikelId: null,
    lagerort: "Trakt 1",
    pruefer: null,
    zubehoer: null,
    bemerkungen: null,
    kundenId: null,
    ...overrides,
  };
}

function pruefbericht(overrides: Partial<Pruefbericht> = {}): Pruefbericht {
  return {
    id: "pb1",
    geraetId: "g1",
    pruefdatum: "2026-04-27",
    ergebnis: "Freigabe",
    pruefer: "sabi",
    bemerkungen: null,
    storniert: false,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("SHAREPOINT_STANDARD_VORLAGE_PFAD", "_Standardvorlage/Pruefberichtraport.xlsx");
  listArtikelByIdsMock.mockResolvedValue(new Map());
  erzeugePdfMock.mockResolvedValue(Buffer.from([1, 2, 3]));
  uploadKundenDateiMock.mockResolvedValue("item-id");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("generatePruefberichtPdf", () => {
  it("throws an ExportFehler and makes no SharePoint calls when the Geräte list is empty", async () => {
    await expect(generatePruefberichtPdf({ firmaName: "Firma", geraete: [], lagerortFilter: null })).rejects.toBeInstanceOf(
      ExportFehler
    );
    expect(downloadKundenDateiMock).not.toHaveBeenCalled();
  });

  it("excludes a Gerät without an active Prüfbericht and throws when none remain", async () => {
    getAktuellstePruefberichteForGeraeteMock.mockResolvedValue(new Map());

    await expect(
      generatePruefberichtPdf({ firmaName: "Firma", geraete: [geraet()], lagerortFilter: null })
    ).rejects.toBeInstanceOf(ExportFehler);
  });

  it("uses the firma's vorlage_pruefberichtraport.xlsx directly in its Prüfberichte folder (no year folder)", async () => {
    getAktuellstePruefberichteForGeraeteMock.mockResolvedValue(new Map([["g1", pruefbericht()]]));
    const firmaVorlage = new ArrayBuffer(3);
    downloadKundenDateiMock.mockResolvedValue(firmaVorlage);

    await generatePruefberichtPdf({ firmaName: "Rehaklinik Bellikon", geraete: [geraet()], lagerortFilter: null });

    expect(downloadKundenDateiMock).toHaveBeenCalledTimes(1);
    expect(downloadKundenDateiMock).toHaveBeenCalledWith("Rehaklinik Bellikon/Prüfberichte/vorlage_pruefberichtraport.xlsx");
    expect(erzeugePdfMock).toHaveBeenCalledWith(firmaVorlage, expect.any(Array), "Rehaklinik Bellikon");
  });

  it("falls back to the central Standard-Vorlage when the firma has no vorlage_pruefberichtraport.xlsx", async () => {
    getAktuellstePruefberichteForGeraeteMock.mockResolvedValue(new Map([["g1", pruefbericht()]]));
    const standardVorlage = new ArrayBuffer(5);
    downloadKundenDateiMock
      .mockRejectedValueOnce(new SharePointError("not_found", "nicht gefunden"))
      .mockResolvedValueOnce(standardVorlage);

    await generatePruefberichtPdf({ firmaName: "Neue Firma", geraete: [geraet()], lagerortFilter: null });

    expect(downloadKundenDateiMock).toHaveBeenLastCalledWith("_Standardvorlage/Pruefberichtraport.xlsx");
    expect(erzeugePdfMock).toHaveBeenCalledWith(standardVorlage, expect.any(Array), "Neue Firma");
  });

  it("does not silently fall back to the Standard-Vorlage on other SharePoint errors (e.g. missing permission)", async () => {
    getAktuellstePruefberichteForGeraeteMock.mockResolvedValue(new Map([["g1", pruefbericht()]]));
    downloadKundenDateiMock.mockRejectedValueOnce(new SharePointError("permission_denied", "kein Zugriff"));

    await expect(
      generatePruefberichtPdf({ firmaName: "Firma", geraete: [geraet()], lagerortFilter: null })
    ).rejects.toBeInstanceOf(SharePointError);
    expect(downloadKundenDateiMock).toHaveBeenCalledTimes(1);
  });

  it("generates the PDF directly from the template buffer and archives it in SharePoint", async () => {
    getAktuellstePruefberichteForGeraeteMock.mockResolvedValue(new Map([["g1", pruefbericht()]]));
    const vorlageBuffer = new ArrayBuffer(3);
    downloadKundenDateiMock.mockResolvedValue(vorlageBuffer);

    const jahr = new Date().getFullYear();
    const result = await generatePruefberichtPdf({ firmaName: "Firma", geraete: [geraet()], lagerortFilter: null });

    expect(erzeugePdfMock).toHaveBeenCalledWith(vorlageBuffer, expect.any(Array), "Firma");
    expect(uploadKundenDateiMock).toHaveBeenCalledTimes(1);
    const [archivPfad, archivInhalt] = uploadKundenDateiMock.mock.calls[0];
    expect(archivPfad).toBe(`Firma/Prüfberichte/${jahr}/${result.dateiname}`);
    expect(new Uint8Array(archivInhalt)).toEqual(new Uint8Array(result.pdfBuffer));
  });

  it("propagates an error from PDF generation without archiving anything", async () => {
    getAktuellstePruefberichteForGeraeteMock.mockResolvedValue(new Map([["g1", pruefbericht()]]));
    downloadKundenDateiMock.mockResolvedValue(new ArrayBuffer(3));
    erzeugePdfMock.mockRejectedValue(new Error("PDF-Generierung fehlgeschlagen"));

    await expect(generatePruefberichtPdf({ firmaName: "Firma", geraete: [geraet()], lagerortFilter: null })).rejects.toThrow();

    expect(uploadKundenDateiMock).not.toHaveBeenCalled();
  });

  // QA BUG-3: ein Fehler bei der zusätzlichen Archiv-Ablage darf den Download nicht verhindern.
  it("still returns the generated PDF when archiving the final file in SharePoint fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    getAktuellstePruefberichteForGeraeteMock.mockResolvedValue(new Map([["g1", pruefbericht()]]));
    downloadKundenDateiMock.mockResolvedValue(new ArrayBuffer(3));
    uploadKundenDateiMock.mockRejectedValue(new Error("Archiv-Upload fehlgeschlagen"));

    const result = await generatePruefberichtPdf({ firmaName: "Firma", geraete: [geraet()], lagerortFilter: null });

    expect(result.pdfBuffer).toBeInstanceOf(Buffer);
  });

  it("includes the active Lagerort filter in the final filename, and saves it in the year folder", async () => {
    getAktuellstePruefberichteForGeraeteMock.mockResolvedValue(new Map([["g1", pruefbericht()]]));
    downloadKundenDateiMock.mockResolvedValue(new ArrayBuffer(3));

    const result = await generatePruefberichtPdf({ firmaName: "Firma", geraete: [geraet()], lagerortFilter: "Trakt 4" });

    expect(result.dateiname).toContain(" - Trakt 4.pdf");
    const [finalPfad] = uploadKundenDateiMock.mock.calls[0];
    expect(finalPfad).toContain(result.dateiname);
  });

  it("omits the filename suffix entirely when no Lagerort filter is active", async () => {
    getAktuellstePruefberichteForGeraeteMock.mockResolvedValue(new Map([["g1", pruefbericht()]]));
    downloadKundenDateiMock.mockResolvedValue(new ArrayBuffer(3));

    const result = await generatePruefberichtPdf({ firmaName: "Firma", geraete: [geraet()], lagerortFilter: null });

    expect(result.dateiname.endsWith(" - Firma.pdf")).toBe(true);
  });

  // Live-Fund (2026-10-06): Dataverse liefert Datumsfelder als volle ISO-
  // Zeitstempel ("2014-10-31T00:00:00Z"), die unformatiert roh im PDF
  // erschienen statt als lesbares Datum.
  it("formats ISO date fields (device dates as MM.YYYY, Prüfdatum as DD.MM.YYYY) before handing rows to the PDF generator", async () => {
    getAktuellstePruefberichteForGeraeteMock.mockResolvedValue(
      new Map([["g1", pruefbericht({ pruefdatum: "2026-03-03T00:00:00Z" })]])
    );
    downloadKundenDateiMock.mockResolvedValue(new ArrayBuffer(3));

    await generatePruefberichtPdf({
      firmaName: "Firma",
      geraete: [geraet({ herstelljahr: "2014-10-31T00:00:00Z", erstgebrauch: "2014-10-31T00:00:00Z", ablegereife: "2024-10-31T00:00:00Z" })],
      lagerortFilter: null,
    });

    const [, zeilen] = erzeugePdfMock.mock.calls[0];
    expect(zeilen[0]).toMatchObject({
      herstelljahr: "10.2014",
      erstgebrauch: "10.2014",
      ablegereife: "10.2024",
      geprueft: "03.03.2026",
    });
  });

  it("leaves a non-ISO legacy date value (e.g. 'month.year' only) unchanged instead of discarding it", async () => {
    getAktuellstePruefberichteForGeraeteMock.mockResolvedValue(new Map([["g1", pruefbericht()]]));
    downloadKundenDateiMock.mockResolvedValue(new ArrayBuffer(3));

    await generatePruefberichtPdf({
      firmaName: "Firma",
      geraete: [geraet({ herstelljahr: "01.2017" })],
      lagerortFilter: null,
    });

    const [, zeilen] = erzeugePdfMock.mock.calls[0];
    expect(zeilen[0]).toMatchObject({ herstelljahr: "01.2017" });
  });
});
