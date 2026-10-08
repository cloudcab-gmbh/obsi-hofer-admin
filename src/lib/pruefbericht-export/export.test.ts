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

const ermittleSignaturKonfigurationMock = vi.fn();
vi.mock("@/lib/pdf-signatur/konfiguration", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/pdf-signatur/konfiguration")>()),
  ermittleSignaturKonfiguration: () => ermittleSignaturKonfigurationMock(),
}));
const signierePdfMock = vi.fn();
vi.mock("@/lib/pdf-signatur/signiere-pdf", () => ({ signierePdf: (...args: unknown[]) => signierePdfMock(...args) }));
const holeZeitstempelMock = vi.fn();
vi.mock("@/lib/pdf-signatur/zeitstempel", () => ({ holeZeitstempel: (...args: unknown[]) => holeZeitstempelMock(...args) }));

import { generatePruefberichtPdf, ExportFehler } from "./export";
import { SignaturFehler } from "@/lib/pdf-signatur/konfiguration";
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
  ermittleSignaturKonfigurationMock.mockReturnValue({ modus: "aus" });
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

  describe("PROJ-9 Signatur", () => {
    const testSchluessel = { zertifikatDer: Buffer.from([0]), unterschreibe: vi.fn() };

    function testmodus() {
      ermittleSignaturKonfigurationMock.mockReturnValue({
        modus: "test",
        schluessel: testSchluessel,
        zeitstempelUrl: "https://tsa.example/tsr",
      });
      getAktuellstePruefberichteForGeraeteMock.mockResolvedValue(new Map([["g1", pruefbericht()]]));
      downloadKundenDateiMock.mockResolvedValue(new ArrayBuffer(3));
    }

    it("leaves the export unsigned, without footer note, when the signature is off", async () => {
      getAktuellstePruefberichteForGeraeteMock.mockResolvedValue(new Map([["g1", pruefbericht()]]));
      downloadKundenDateiMock.mockResolvedValue(new ArrayBuffer(3));

      const { pdfBuffer } = await generatePruefberichtPdf({ firmaName: "Firma", geraete: [geraet()], lagerortFilter: null });

      expect(erzeugePdfMock.mock.calls[0]).toHaveLength(3);
      expect(signierePdfMock).not.toHaveBeenCalled();
      expect(uploadKundenDateiMock).toHaveBeenCalledTimes(1);
      expect(pdfBuffer).toEqual(Buffer.from([1, 2, 3]));
    });

    it("in test mode: adds the TEST note, signs with the test key and returns the signed PDF", async () => {
      testmodus();
      signierePdfMock.mockResolvedValue(Buffer.from("signiert"));

      const { pdfBuffer, dateiname } = await generatePruefberichtPdf({
        firmaName: "Firma",
        geraete: [geraet()],
        lagerortFilter: null,
      });

      const [, , , optionen] = erzeugePdfMock.mock.calls[0];
      expect(optionen.signaturVermerk).toMatch(/^TEST-Signatur – nicht gültig – OBSI Hofer GmbH, \d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/);
      const [unsigniert, signierOptionen] = signierePdfMock.mock.calls[0];
      expect(unsigniert).toEqual(Buffer.from([1, 2, 3]));
      expect(signierOptionen.schluessel).toBe(testSchluessel);
      expect(pdfBuffer).toEqual(Buffer.from("signiert"));
      // Dateiname unverändert gegenüber PROJ-7.
      expect(dateiname).toMatch(/Prüfbericht Absturzsicherungen - Firma\.pdf$/);
    });

    it("in test mode: requests the timestamp from the configured service", async () => {
      testmodus();
      signierePdfMock.mockResolvedValue(Buffer.from("signiert"));
      await generatePruefberichtPdf({ firmaName: "Firma", geraete: [geraet()], lagerortFilter: null });

      const [, { zeitstempel }] = signierePdfMock.mock.calls[0];
      await zeitstempel(Buffer.from("sig"));
      expect(holeZeitstempelMock).toHaveBeenCalledWith(Buffer.from("sig"), "https://tsa.example/tsr");
    });

    it("in test mode: never archives the PDF in SharePoint", async () => {
      testmodus();
      signierePdfMock.mockResolvedValue(Buffer.from("signiert"));
      await generatePruefberichtPdf({ firmaName: "Firma", geraete: [geraet()], lagerortFilter: null });

      expect(uploadKundenDateiMock).not.toHaveBeenCalled();
    });

    it("in test mode: a signing failure aborts the export — no unsigned fallback", async () => {
      testmodus();
      signierePdfMock.mockRejectedValue(new SignaturFehler("Zeitstempeldienst nicht erreichbar", "dienst"));

      await expect(
        generatePruefberichtPdf({ firmaName: "Firma", geraete: [geraet()], lagerortFilter: null })
      ).rejects.toBeInstanceOf(SignaturFehler);
      expect(uploadKundenDateiMock).not.toHaveBeenCalled();
    });

    it("aborts before any Dataverse/SharePoint call when the signature configuration is broken", async () => {
      ermittleSignaturKonfigurationMock.mockImplementation(() => {
        throw new SignaturFehler("PDF_SIGNATUR_TEST_SCHLUESSEL fehlt", "konfiguration");
      });

      await expect(
        generatePruefberichtPdf({ firmaName: "Firma", geraete: [geraet()], lagerortFilter: null })
      ).rejects.toBeInstanceOf(SignaturFehler);
      expect(getAktuellstePruefberichteForGeraeteMock).not.toHaveBeenCalled();
      expect(downloadKundenDateiMock).not.toHaveBeenCalled();
    });
  });

  // PROJ-10: Standort nur bei Firmen mit mehreren Standorten.
  describe("PROJ-10 Standort", () => {
    beforeEach(() => {
      getAktuellstePruefberichteForGeraeteMock.mockResolvedValue(new Map([["g1", pruefbericht()]]));
      downloadKundenDateiMock.mockResolvedValue(new ArrayBuffer(3));
    });

    it("adds the Standort to the file name, header and archive folder '<Firma>/Standort <Name>/Prüfberichte/<Jahr>'", async () => {
      const { dateiname } = await generatePruefberichtPdf({
        firmaName: "Rehaklinik Bellikon",
        standortName: "Haupthaus",
        geraete: [geraet()],
        lagerortFilter: "Trakt 1",
      });

      expect(dateiname).toMatch(/^\d{4}-\d{2}-\d{2} Prüfbericht Absturzsicherungen - Rehaklinik Bellikon - Haupthaus - Trakt 1\.pdf$/);
      const [archivPfad] = uploadKundenDateiMock.mock.calls[0];
      expect(archivPfad).toBe(`Rehaklinik Bellikon/Standort Haupthaus/Prüfberichte/${new Date().getFullYear()}/${dateiname}`);
      const [, , , optionen] = erzeugePdfMock.mock.calls[0];
      expect(optionen).toEqual({ standortName: "Haupthaus" });
    });

    it("keeps looking for the template per Firma", async () => {
      await generatePruefberichtPdf({ firmaName: "Rehaklinik Bellikon", standortName: "Haupthaus", geraete: [geraet()], lagerortFilter: null });
      expect(downloadKundenDateiMock).toHaveBeenCalledWith("Rehaklinik Bellikon/Prüfberichte/vorlage_pruefberichtraport.xlsx");
    });

    it("replaces characters SharePoint forbids in the Standort name", async () => {
      const { dateiname } = await generatePruefberichtPdf({
        firmaName: "Firma",
        standortName: "Halle 3/4: Nord",
        geraete: [geraet()],
        lagerortFilter: null,
      });
      expect(dateiname).toContain("- Firma - Halle 3-4- Nord.pdf");
      const [archivPfad] = uploadKundenDateiMock.mock.calls[0];
      expect(archivPfad).toContain("Firma/Standort Halle 3-4- Nord/Prüfberichte/");
    });

    it("changes nothing when there is no Standort name (Firma with a single Standort)", async () => {
      const { dateiname } = await generatePruefberichtPdf({ firmaName: "Firma", standortName: null, geraete: [geraet()], lagerortFilter: null });

      expect(dateiname).toMatch(/ - Firma\.pdf$/);
      const [archivPfad] = uploadKundenDateiMock.mock.calls[0];
      expect(archivPfad).toBe(`Firma/Prüfberichte/${new Date().getFullYear()}/${dateiname}`);
      expect(erzeugePdfMock.mock.calls[0]).toHaveLength(3);
    });
  });
});
