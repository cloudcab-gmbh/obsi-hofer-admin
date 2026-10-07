import { describe, it, expect, vi, beforeEach } from "vitest";

const updateGeraetStammdaten = vi.fn();
const getFirma = vi.fn();
const listStandorteForFirma = vi.fn();
const listGeraeteForStandorte = vi.fn();
const revalidatePath = vi.fn();
const getCurrentFirmaId = vi.fn();
const generatePruefberichtPdf = vi.fn();

vi.mock("@/lib/dataverse/geraete", () => ({
  updateGeraetStammdaten: (...args: unknown[]) => updateGeraetStammdaten(...args),
  getFirma: (...args: unknown[]) => getFirma(...args),
  listStandorteForFirma: (...args: unknown[]) => listStandorteForFirma(...args),
  listGeraeteForStandorte: (...args: unknown[]) => listGeraeteForStandorte(...args),
}));
vi.mock("@/lib/firma-session", () => ({ getCurrentFirmaId: (...args: unknown[]) => getCurrentFirmaId(...args) }));
vi.mock("@/lib/pruefbericht-export/export", () => {
  class ExportFehler extends Error {
    constructor(message: string) {
      super(message);
      this.name = "ExportFehler";
    }
  }
  return {
    generatePruefberichtPdf: (...args: unknown[]) => generatePruefberichtPdf(...args),
    ExportFehler,
  };
});
vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePath(...args),
}));

import { saveGeraetStammdaten, generatePdfAction } from "./actions";
import { DataverseError } from "@/lib/dataverse/errors";
import { ExportFehler } from "@/lib/pruefbericht-export/export";

const GERAET_ID = "44444444-4444-4444-4444-444444444444";

function formDataWith(fields: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) formData.set(key, value);
  return formData;
}

const ALL_FIELDS = {
  serienummer: "",
  barcode: "",
  lagerort: "",
  bemerkungen: "",
  zubehoer: "",
  herstelljahr: "",
  erstgebrauch: "",
  ablegereife: "",
  kundenId: "",
};

beforeEach(() => {
  updateGeraetStammdaten.mockReset();
  revalidatePath.mockReset();
  getFirma.mockReset();
  listStandorteForFirma.mockReset();
  listGeraeteForStandorte.mockReset();
  getCurrentFirmaId.mockReset();
  generatePruefberichtPdf.mockReset();
});

describe("saveGeraetStammdaten", () => {
  it("converts blank fields to null before calling updateGeraetStammdaten", async () => {
    updateGeraetStammdaten.mockResolvedValue(undefined);

    const result = await saveGeraetStammdaten(GERAET_ID, formDataWith({ ...ALL_FIELDS, barcode: "  " }));

    expect(result).toEqual({ success: true });
    expect(updateGeraetStammdaten).toHaveBeenCalledWith(
      GERAET_ID,
      expect.objectContaining({ barcode: null, serienummer: null, kundenId: null })
    );
  });

  it("trims and forwards non-empty values", async () => {
    updateGeraetStammdaten.mockResolvedValue(undefined);

    await saveGeraetStammdaten(GERAET_ID, formDataWith({ ...ALL_FIELDS, kundenId: "  KD-42  " }));

    expect(updateGeraetStammdaten).toHaveBeenCalledWith(GERAET_ID, expect.objectContaining({ kundenId: "KD-42" }));
  });

  it("revalidates the Gerät detail path on success", async () => {
    updateGeraetStammdaten.mockResolvedValue(undefined);

    await saveGeraetStammdaten(GERAET_ID, formDataWith(ALL_FIELDS));

    expect(revalidatePath).toHaveBeenCalledWith(`/geraete/${GERAET_ID}`);
  });

  it("surfaces a DataverseError's message instead of the generic fallback", async () => {
    updateGeraetStammdaten.mockRejectedValue(new DataverseError("unavailable", "Dataverse ist nicht erreichbar."));

    const result = await saveGeraetStammdaten(GERAET_ID, formDataWith(ALL_FIELDS));

    expect(result).toEqual({ success: false, message: "Dataverse ist nicht erreichbar." });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("falls back to a generic message for a non-DataverseError failure", async () => {
    updateGeraetStammdaten.mockRejectedValue(new Error("boom"));

    const result = await saveGeraetStammdaten(GERAET_ID, formDataWith(ALL_FIELDS));

    expect(result).toEqual({ success: false, message: "Unbekannter Fehler beim Speichern." });
  });

  it("preserves the submitted values in the error path (no data loss)", async () => {
    updateGeraetStammdaten.mockRejectedValue(new Error("boom"));

    // saveGeraetStammdaten itself doesn't mutate/clear the FormData it was
    // given — the caller (GeraetForm) keeps whatever the user typed as long
    // as it doesn't reset the form on a failed result.
    const formData = formDataWith({ ...ALL_FIELDS, lagerort: "Lager A" });
    await saveGeraetStammdaten(GERAET_ID, formData);

    expect(formData.get("lagerort")).toBe("Lager A");
  });
});

const FIRMA_ID = "55555555-5555-5555-5555-555555555555";

function geraet(id: string) {
  return { id, name: id, serienummer: null, barcode: null, status: null, letztePruefung: null, ablegereife: null, herstelljahr: null, erstgebrauch: null, standortId: null, artikelId: null, lagerort: null, pruefer: null, zubehoer: null, bemerkungen: null, kundenId: null };
}

describe("generatePdfAction", () => {
  it("returns an error without touching Dataverse/SharePoint when no Firma is selected", async () => {
    getCurrentFirmaId.mockResolvedValue(null);

    const result = await generatePdfAction(["g1"], null);

    expect(result).toEqual({ success: false, message: "Keine Firma ausgewählt." });
    expect(generatePruefberichtPdf).not.toHaveBeenCalled();
  });

  // QA BUG-1 (Fix): die eigentlichen Gerätedaten müssen immer aus der
  // serverseitig neu geladenen, Firma-gescopten Liste kommen, nicht aus den
  // vom Client übergebenen IDs direkt übernommen werden.
  it("loads the Geräte freshly from Dataverse, scoped to the current session's Firma, using the ids only as a selection", async () => {
    getCurrentFirmaId.mockResolvedValue(FIRMA_ID);
    getFirma.mockResolvedValue({ id: FIRMA_ID, name: "Rehaklinik Bellikon" });
    listStandorteForFirma.mockResolvedValue([{ id: "s1", name: "Standort 1", firmaId: FIRMA_ID }]);
    listGeraeteForStandorte.mockResolvedValue([geraet("g1"), geraet("g2"), geraet("g3")]);
    generatePruefberichtPdf.mockResolvedValue({ pdfBuffer: new Uint8Array([1, 2, 3]).buffer, dateiname: "bericht.pdf" });

    await generatePdfAction(["g1", "g3", "unbekannte-id-vom-client"], null);

    expect(listStandorteForFirma).toHaveBeenCalledWith(FIRMA_ID);
    const [{ geraete: uebergebeneGeraete, firmaName }] = generatePruefberichtPdf.mock.calls[0];
    expect(firmaName).toBe("Rehaklinik Bellikon");
    expect(uebergebeneGeraete.map((g: { id: string }) => g.id).sort()).toEqual(["g1", "g3"]);
  });

  it("keeps the order of the ids passed by the client (the list's column sorting)", async () => {
    getCurrentFirmaId.mockResolvedValue(FIRMA_ID);
    getFirma.mockResolvedValue({ id: FIRMA_ID, name: "Rehaklinik Bellikon" });
    listStandorteForFirma.mockResolvedValue([{ id: "s1", name: "Standort 1", firmaId: FIRMA_ID }]);
    listGeraeteForStandorte.mockResolvedValue([geraet("g1"), geraet("g2"), geraet("g3")]);
    generatePruefberichtPdf.mockResolvedValue({ pdfBuffer: new Uint8Array([1, 2, 3]).buffer, dateiname: "bericht.pdf" });

    await generatePdfAction(["g3", "g1", "g2", "g3"], null);

    const [{ geraete: uebergebeneGeraete }] = generatePruefberichtPdf.mock.calls[0];
    expect(uebergebeneGeraete.map((g: { id: string }) => g.id)).toEqual(["g3", "g1", "g2"]);
  });

  it("silently drops a requested id that doesn't belong to the current Firma's Geräte", async () => {
    getCurrentFirmaId.mockResolvedValue(FIRMA_ID);
    getFirma.mockResolvedValue({ id: FIRMA_ID, name: "Firma A" });
    listStandorteForFirma.mockResolvedValue([{ id: "s1", name: "Standort 1", firmaId: FIRMA_ID }]);
    listGeraeteForStandorte.mockResolvedValue([geraet("g1")]); // "g-fremde-firma" gehört NICHT dazu
    generatePruefberichtPdf.mockResolvedValue({ pdfBuffer: new ArrayBuffer(0), dateiname: "x.pdf" });

    await generatePdfAction(["g1", "g-fremde-firma"], null);

    const [{ geraete: uebergebeneGeraete }] = generatePruefberichtPdf.mock.calls[0];
    expect(uebergebeneGeraete).toHaveLength(1);
    expect(uebergebeneGeraete[0].id).toBe("g1");
  });

  it("returns the PDF Base64-encoded on success", async () => {
    getCurrentFirmaId.mockResolvedValue(FIRMA_ID);
    getFirma.mockResolvedValue({ id: FIRMA_ID, name: "Firma A" });
    listStandorteForFirma.mockResolvedValue([]);
    listGeraeteForStandorte.mockResolvedValue([]);
    generatePruefberichtPdf.mockResolvedValue({ pdfBuffer: new Uint8Array([72, 73]).buffer, dateiname: "bericht.pdf" });

    const result = await generatePdfAction([], null);

    expect(result).toEqual({ success: true, pdfBase64: Buffer.from([72, 73]).toString("base64"), dateiname: "bericht.pdf" });
  });

  it("surfaces an ExportFehler's message instead of the generic fallback", async () => {
    getCurrentFirmaId.mockResolvedValue(FIRMA_ID);
    getFirma.mockResolvedValue({ id: FIRMA_ID, name: "Firma A" });
    listStandorteForFirma.mockResolvedValue([]);
    listGeraeteForStandorte.mockResolvedValue([]);
    generatePruefberichtPdf.mockRejectedValue(new ExportFehler("Keine Geräte für diesen Export gefunden."));

    const result = await generatePdfAction([], null);

    expect(result).toEqual({ success: false, message: "Keine Geräte für diesen Export gefunden." });
  });

  it("includes the underlying error message for an unexpected failure instead of a bare generic message", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    getCurrentFirmaId.mockResolvedValue(FIRMA_ID);
    getFirma.mockResolvedValue({ id: FIRMA_ID, name: "Firma A" });
    listStandorteForFirma.mockResolvedValue([]);
    listGeraeteForStandorte.mockResolvedValue([]);
    generatePruefberichtPdf.mockRejectedValue(new Error("boom"));

    const result = await generatePdfAction([], null);

    expect(result).toEqual({ success: false, message: "Unbekannter Fehler beim Generieren des PDFs: boom" });
  });
});
