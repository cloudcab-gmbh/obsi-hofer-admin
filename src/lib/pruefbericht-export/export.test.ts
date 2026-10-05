import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Geraet } from "@/lib/dataverse/geraete";
import type { Pruefbericht } from "@/lib/dataverse/pruefberichte";

const listArtikelByIdsMock = vi.fn();
vi.mock("@/lib/dataverse/geraete", () => ({ listArtikelByIds: (...args: unknown[]) => listArtikelByIdsMock(...args) }));

const getAktuellstePruefberichteForGeraeteMock = vi.fn();
vi.mock("@/lib/dataverse/pruefberichte", () => ({
  getAktuellstePruefberichteForGeraete: (...args: unknown[]) => getAktuellstePruefberichteForGeraeteMock(...args),
}));

const findeNeuesteExcelDateiMock = vi.fn();
const downloadKundenDateiMock = vi.fn();
const uploadKundenDateiMock = vi.fn();
const konvertiereZuPdfMock = vi.fn();
const loescheKundenDateiMock = vi.fn();
vi.mock("@/lib/sharepoint/kunden-drive", () => ({
  findeNeuesteExcelDatei: (...args: unknown[]) => findeNeuesteExcelDateiMock(...args),
  downloadKundenDatei: (...args: unknown[]) => downloadKundenDateiMock(...args),
  uploadKundenDatei: (...args: unknown[]) => uploadKundenDateiMock(...args),
  konvertiereZuPdf: (...args: unknown[]) => konvertiereZuPdfMock(...args),
  loescheKundenDatei: (...args: unknown[]) => loescheKundenDateiMock(...args),
}));

const erzeugeArbeitskopieMock = vi.fn();
vi.mock("./arbeitskopie", () => ({ erzeugeArbeitskopie: (...args: unknown[]) => erzeugeArbeitskopieMock(...args) }));

import { generatePruefberichtPdf, ExportFehler } from "./export";

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
  erzeugeArbeitskopieMock.mockResolvedValue(new ArrayBuffer(1));
  uploadKundenDateiMock.mockResolvedValue("temp-item-id");
  konvertiereZuPdfMock.mockResolvedValue(new ArrayBuffer(2));
  loescheKundenDateiMock.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("generatePruefberichtPdf", () => {
  it("throws an ExportFehler and makes no SharePoint calls when the Geräte list is empty", async () => {
    await expect(generatePruefberichtPdf({ firmaName: "Firma", geraete: [], lagerortFilter: null })).rejects.toBeInstanceOf(
      ExportFehler
    );
    expect(findeNeuesteExcelDateiMock).not.toHaveBeenCalled();
  });

  it("excludes a Gerät without an active Prüfbericht and throws when none remain", async () => {
    getAktuellstePruefberichteForGeraeteMock.mockResolvedValue(new Map());

    await expect(
      generatePruefberichtPdf({ firmaName: "Firma", geraete: [geraet()], lagerortFilter: null })
    ).rejects.toBeInstanceOf(ExportFehler);
  });

  it("uses the firma-specific template found in the current year's folder", async () => {
    getAktuellstePruefberichteForGeraeteMock.mockResolvedValue(new Map([["g1", pruefbericht()]]));
    findeNeuesteExcelDateiMock.mockResolvedValue({ id: "v1", name: "Pruefberichtraport.xlsx", lastModifiedDateTime: "2026-01-01" });
    downloadKundenDateiMock.mockResolvedValue(new ArrayBuffer(3));

    const jahr = new Date().getFullYear();
    await generatePruefberichtPdf({ firmaName: "Rehaklinik Bellikon", geraete: [geraet()], lagerortFilter: null });

    expect(findeNeuesteExcelDateiMock).toHaveBeenCalledWith(`Rehaklinik Bellikon/Prüfberichte/${jahr}`);
    expect(downloadKundenDateiMock).toHaveBeenCalledWith(`Rehaklinik Bellikon/Prüfberichte/${jahr}/Pruefberichtraport.xlsx`);
  });

  it("falls back to the central Standard-Vorlage when the firma has no template in the current year's folder", async () => {
    getAktuellstePruefberichteForGeraeteMock.mockResolvedValue(new Map([["g1", pruefbericht()]]));
    findeNeuesteExcelDateiMock.mockResolvedValue(null);
    downloadKundenDateiMock.mockResolvedValue(new ArrayBuffer(3));

    await generatePruefberichtPdf({ firmaName: "Neue Firma", geraete: [geraet()], lagerortFilter: null });

    expect(downloadKundenDateiMock).toHaveBeenCalledWith("_Standardvorlage/Pruefberichtraport.xlsx");
  });

  it("uploads a temporary working copy, converts it to PDF, then deletes the temporary file", async () => {
    getAktuellstePruefberichteForGeraeteMock.mockResolvedValue(new Map([["g1", pruefbericht()]]));
    findeNeuesteExcelDateiMock.mockResolvedValue(null);
    downloadKundenDateiMock.mockResolvedValue(new ArrayBuffer(3));

    await generatePruefberichtPdf({ firmaName: "Firma", geraete: [geraet()], lagerortFilter: null });

    expect(uploadKundenDateiMock).toHaveBeenCalledTimes(2); // 1x temp .xlsx, 1x finales PDF
    const [tempPfad] = uploadKundenDateiMock.mock.calls[0];
    expect(tempPfad).toMatch(/_temp-.*\.xlsx$/);
    expect(konvertiereZuPdfMock).toHaveBeenCalledWith("temp-item-id");
    expect(loescheKundenDateiMock).toHaveBeenCalledWith("temp-item-id");
  });

  it("still deletes the temporary working copy when the PDF conversion itself fails", async () => {
    getAktuellstePruefberichteForGeraeteMock.mockResolvedValue(new Map([["g1", pruefbericht()]]));
    findeNeuesteExcelDateiMock.mockResolvedValue(null);
    downloadKundenDateiMock.mockResolvedValue(new ArrayBuffer(3));
    konvertiereZuPdfMock.mockRejectedValue(new Error("Konvertierung fehlgeschlagen"));

    await expect(generatePruefberichtPdf({ firmaName: "Firma", geraete: [geraet()], lagerortFilter: null })).rejects.toThrow();

    expect(loescheKundenDateiMock).toHaveBeenCalledWith("temp-item-id");
  });

  it("includes the active Lagerort filter in the final filename, and saves it in the year folder", async () => {
    getAktuellstePruefberichteForGeraeteMock.mockResolvedValue(new Map([["g1", pruefbericht()]]));
    findeNeuesteExcelDateiMock.mockResolvedValue(null);
    downloadKundenDateiMock.mockResolvedValue(new ArrayBuffer(3));

    const result = await generatePruefberichtPdf({ firmaName: "Firma", geraete: [geraet()], lagerortFilter: "Trakt 4" });

    expect(result.dateiname).toContain(" - Trakt 4.pdf");
    const [finalPfad] = uploadKundenDateiMock.mock.calls[1];
    expect(finalPfad).toContain(result.dateiname);
  });

  it("omits the filename suffix entirely when no Lagerort filter is active", async () => {
    getAktuellstePruefberichteForGeraeteMock.mockResolvedValue(new Map([["g1", pruefbericht()]]));
    findeNeuesteExcelDateiMock.mockResolvedValue(null);
    downloadKundenDateiMock.mockResolvedValue(new ArrayBuffer(3));

    const result = await generatePruefberichtPdf({ firmaName: "Firma", geraete: [geraet()], lagerortFilter: null });

    expect(result.dateiname.endsWith(" - Firma.pdf")).toBe(true);
  });
});
