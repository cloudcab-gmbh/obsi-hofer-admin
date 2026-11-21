import { describe, it, expect, vi, beforeEach } from "vitest";

const aktuellerMitarbeiter = vi.fn();
const ladeEigenenZeitnachweis = vi.fn();
const renderePdf = vi.fn();
const bauePdfDokument = vi.fn();

vi.mock("@/lib/auth/mitarbeiter", () => ({ aktuellerMitarbeiter: () => aktuellerMitarbeiter() }));
vi.mock("@/lib/zeiterfassung/zeitnachweis-laden", () => ({
  ladeEigenenZeitnachweis: (...args: unknown[]) => ladeEigenenZeitnachweis(...args),
}));
vi.mock("@/lib/pdf/grundlage", () => ({ ladeLogoDataUrl: () => "data:", renderePdf: (...a: unknown[]) => renderePdf(...a) }));
vi.mock("@/lib/zeiterfassung/zeitnachweis-pdf", () => ({
  bauePdfDokument: (...a: unknown[]) => bauePdfDokument(...a),
  zeitnachweisDateiname: (name: string, monat: string) => `Zeitnachweis ${name} ${monat}.pdf`,
}));
vi.mock("@/app/(protected)/zeiterfassung/actions", () => ({}));

import { erzeugeEigenesZeitnachweisPdfAction } from "./actions";

const geladen = {
  person: { email: "anna@x.ch", anzeige: "Anna Muster" },
  zeitnachweis: {},
  versionen: [],
};

beforeEach(() => {
  aktuellerMitarbeiter.mockReset();
  ladeEigenenZeitnachweis.mockReset();
  renderePdf.mockReset();
  bauePdfDokument.mockReset();
  aktuellerMitarbeiter.mockResolvedValue({ email: "anna@x.ch", name: "Anna Muster" });
  renderePdf.mockResolvedValue(Buffer.from("PDF"));
});

describe("erzeugeEigenesZeitnachweisPdfAction (PROJ-20)", () => {
  it("rejects users without the mitarbeiter role without loading data", async () => {
    aktuellerMitarbeiter.mockResolvedValue(null);
    expect(await erzeugeEigenesZeitnachweisPdfAction("2026-11")).toEqual({ success: false, message: expect.stringContaining("Mitarbeiter") });
    expect(ladeEigenenZeitnachweis).not.toHaveBeenCalled();
  });

  it("rejects accounts without an e-mail", async () => {
    aktuellerMitarbeiter.mockResolvedValue({ email: null, name: "Anna" });
    expect(await erzeugeEigenesZeitnachweisPdfAction("2026-11")).toMatchObject({ success: false });
    expect(ladeEigenenZeitnachweis).not.toHaveBeenCalled();
  });

  it("rejects an invalid month", async () => {
    expect(await erzeugeEigenesZeitnachweisPdfAction("2026-13")).toEqual({ success: false, message: "Ungültige Anfrage." });
  });

  it("always loads the logged-in person's own Zeitnachweis and uses the bounded month for the file name", async () => {
    ladeEigenenZeitnachweis.mockResolvedValue({ art: "ok", monat: "2026-10", bereich: { von: "2026-01", bis: "2026-10" }, ohneBeginn: false, geladen });

    const result = await erzeugeEigenesZeitnachweisPdfAction("2026-11");

    expect(ladeEigenenZeitnachweis).toHaveBeenCalledWith("anna@x.ch", "2026-11", expect.any(String));
    expect(bauePdfDokument).toHaveBeenCalledWith(expect.objectContaining({ personName: "Anna Muster", erstelltVon: "Anna Muster" }));
    expect(result).toEqual({ success: true, pdfBase64: Buffer.from("PDF").toString("base64"), dateiname: "Zeitnachweis Anna Muster 2026-10.pdf" });
  });

  it.each([{ art: "unbekannt" }, { art: "nicht-auswerten", anzeige: "Anna" }])("returns no PDF for %o", async (eigener) => {
    ladeEigenenZeitnachweis.mockResolvedValue(eigener);
    expect(await erzeugeEigenesZeitnachweisPdfAction("2026-11")).toMatchObject({ success: false });
    expect(renderePdf).not.toHaveBeenCalled();
  });

  it("does not leak details when loading fails", async () => {
    ladeEigenenZeitnachweis.mockRejectedValue(new Error("anna@x.ch: Dataverse 500"));
    const result = await erzeugeEigenesZeitnachweisPdfAction("2026-11");
    expect(result).toEqual({ success: false, message: "Das PDF konnte nicht erzeugt werden. Bitte später erneut versuchen." });
  });
});
