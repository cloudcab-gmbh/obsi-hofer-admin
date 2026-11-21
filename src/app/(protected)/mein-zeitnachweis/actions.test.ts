import { describe, it, expect, vi, beforeEach } from "vitest";

const aktuellerMitarbeiter = vi.fn();
const ladeEigenenZeitnachweis = vi.fn();
const renderePdf = vi.fn();
const bauePdfDokument = vi.fn();
const erstelleKorrekturAnfrage = vi.fn();
const revalidatePath = vi.fn();

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
vi.mock("@/lib/dataverse/korrekturanfragen", () => ({
  erstelleKorrekturAnfrage: (...a: unknown[]) => erstelleKorrekturAnfrage(...a),
}));
vi.mock("next/cache", () => ({ revalidatePath: (...a: unknown[]) => revalidatePath(...a) }));
// Fester "heute" für die Frist (aktueller und vorheriger Monat bis heute).
vi.mock("@/lib/zeiterfassung/datum", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/zeiterfassung/datum")>()),
  heuteSchweiz: () => "2026-11-21",
}));

import { erzeugeEigenesZeitnachweisPdfAction, sendeKorrekturAnfrageAction } from "./actions";
import { berechneZeitnachweis } from "@/lib/zeiterfassung/zeitnachweis";

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
  erstelleKorrekturAnfrage.mockReset();
  erstelleKorrekturAnfrage.mockResolvedValue("neue-id");
  revalidatePath.mockReset();
  delete process.env.AUTH_URL;
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

describe("sendeKorrekturAnfrageAction (PROJ-21)", () => {
  /** Zeitnachweis von Anna für einen Monat mit einem Eintrag am 02.11.2026 (07:30–12:00). */
  function eigener(monat: string, bereich = { von: "2026-01", bis: "2026-11" }) {
    const zeitnachweis = berechneZeitnachweis({
      monat,
      heute: "2026-11-21",
      eintraege: [
        {
          id: "e1",
          datum: "2026-11-02",
          typ: "arbeitszeit",
          kommen: "2026-11-02T06:30:00Z",
          gehen: "2026-11-02T11:00:00Z",
          tagestotal: null,
          monatstotal: null,
          mittagessen: false,
          abendessen: false,
          bemerkung: null,
          halberTag: false,
        },
      ],
      versionen: [{ id: "v", gueltigAb: "2026-01-01", pensum: 100, arbeitstage: [true, true, true, true, true, false, false] }],
      austrittAm: null,
      startsaldoStunden: 0,
      stichtag: "2025-12-31",
    });
    return { art: "ok", monat, bereich, ohneBeginn: false, geladen: { ...geladen, zeitnachweis } };
  }

  it("stores the request with server-side times and link, person from the login", async () => {
    process.env.AUTH_URL = "https://tool.example/";
    ladeEigenenZeitnachweis.mockResolvedValue(eigener("2026-11"));

    const result = await sendeKorrekturAnfrageAction("2026-11-02", "  Gehen war 17:30  ");

    expect(result).toEqual({ success: true });
    expect(ladeEigenenZeitnachweis).toHaveBeenCalledWith("anna@x.ch", "2026-11", "2026-11-21");
    expect(erstelleKorrekturAnfrage).toHaveBeenCalledWith({
      email: "anna@x.ch",
      name: "Anna Muster",
      datum: "2026-11-02",
      nachricht: "Gehen war 17:30",
      bisherigeZeiten: "07:30–12:00",
      link: "https://tool.example/zeiterfassung/zeitnachweis?person=anna%40x.ch&monat=2026-11",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/mein-zeitnachweis");
  });

  it("allows days of the previous month", async () => {
    ladeEigenenZeitnachweis.mockResolvedValue(eigener("2026-10"));
    expect(await sendeKorrekturAnfrageAction("2026-10-01", "x")).toEqual({ success: true });
    expect(erstelleKorrekturAnfrage).toHaveBeenCalledWith(expect.objectContaining({ datum: "2026-10-01", bisherigeZeiten: "keine Einträge" }));
  });

  it.each([
    ["older than the previous month", "2026-09-30", "2026-09"],
    ["in the future", "2026-11-22", "2026-11"],
  ])("rejects a day %s", async (_, datum, monat) => {
    ladeEigenenZeitnachweis.mockResolvedValue(eigener(monat));
    expect(await sendeKorrekturAnfrageAction(datum, "x")).toEqual({
      success: false,
      message: "Für diesen Tag kann keine Korrektur mehr angefragt werden.",
    });
    expect(erstelleKorrekturAnfrage).not.toHaveBeenCalled();
  });

  it("rejects a month outside the visible months (loader moved it)", async () => {
    // Austritt im Oktober: angefragt November, geladen wird Oktober
    ladeEigenenZeitnachweis.mockResolvedValue(eigener("2026-10", { von: "2026-01", bis: "2026-10" }));
    expect(await sendeKorrekturAnfrageAction("2026-11-02", "x")).toMatchObject({ success: false });
    expect(erstelleKorrekturAnfrage).not.toHaveBeenCalled();
  });

  it("rejects users without the mitarbeiter role or without e-mail", async () => {
    aktuellerMitarbeiter.mockResolvedValueOnce(null);
    expect(await sendeKorrekturAnfrageAction("2026-11-02", "x")).toMatchObject({ success: false, message: expect.stringContaining("Mitarbeiter") });
    aktuellerMitarbeiter.mockResolvedValueOnce({ email: null, name: "Anna" });
    expect(await sendeKorrekturAnfrageAction("2026-11-02", "x")).toMatchObject({ success: false });
    expect(ladeEigenenZeitnachweis).not.toHaveBeenCalled();
    expect(erstelleKorrekturAnfrage).not.toHaveBeenCalled();
  });

  it.each([
    ["empty message", "2026-11-02", "   ", "Bitte eine Nachricht eingeben."],
    ["too long message", "2026-11-02", "x".repeat(1001), "Die Nachricht darf höchstens 1000 Zeichen lang sein."],
    ["invalid date", "2026-02-30", "x", "Ungültiges Datum."],
    ["date with injection", "2026-11-02' or 1 eq 1", "x", "Ungültiges Datum."],
  ])("validates input: %s", async (_, datum, nachricht, message) => {
    expect(await sendeKorrekturAnfrageAction(datum, nachricht)).toEqual({ success: false, message });
    expect(erstelleKorrekturAnfrage).not.toHaveBeenCalled();
  });

  it("returns no request for persons without a Zeitnachweis", async () => {
    ladeEigenenZeitnachweis.mockResolvedValue({ art: "nicht-auswerten", anzeige: "Anna" });
    expect(await sendeKorrekturAnfrageAction("2026-11-02", "x")).toMatchObject({ success: false });
    expect(erstelleKorrekturAnfrage).not.toHaveBeenCalled();
  });

  it("does not leak details when saving fails", async () => {
    ladeEigenenZeitnachweis.mockResolvedValue(eigener("2026-11"));
    erstelleKorrekturAnfrage.mockRejectedValue(new Error("anna@x.ch 403"));
    expect(await sendeKorrekturAnfrageAction("2026-11-02", "x")).toEqual({
      success: false,
      message: "Die Anfrage konnte nicht gesendet werden. Bitte später erneut versuchen.",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
