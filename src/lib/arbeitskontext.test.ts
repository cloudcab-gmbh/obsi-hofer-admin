import { describe, it, expect, vi, beforeEach } from "vitest";

const getFirma = vi.fn();
const listStandorteForFirma = vi.fn();
const listAktiveFirmenMitNamen = vi.fn();
const listStandorteForFirmen = vi.fn();
const getCurrentFirmaId = vi.fn();
const getCurrentStandortId = vi.fn();

vi.mock("./dataverse/geraete", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./dataverse/geraete")>()),
  getFirma: (...args: unknown[]) => getFirma(...args),
  listStandorteForFirma: (...args: unknown[]) => listStandorteForFirma(...args),
  listAktiveFirmenMitNamen: (...args: unknown[]) => listAktiveFirmenMitNamen(...args),
  listStandorteForFirmen: (...args: unknown[]) => listStandorteForFirmen(...args),
}));
vi.mock("./firma-session", () => ({
  getCurrentFirmaId: () => getCurrentFirmaId(),
  getCurrentStandortId: () => getCurrentStandortId(),
}));

import { bestimmeArbeitskontext, kontextBezeichnung, ladeArbeitskontext } from "./arbeitskontext";
import { DataverseError } from "./dataverse/errors";

const FIRMA = { id: "f1", name: "Rehaklinik Bellikon", anzeigename: "Rehaklinik Bellikon" };
const standort = (id: string, name: string, erstelltAm: string | null = null) => ({ id, name, firmaId: "f1", erstelltAm });

beforeEach(() => {
  vi.clearAllMocks();
  listAktiveFirmenMitNamen.mockImplementation(async (name: string) => [{ id: "f1", name }]);
  listStandorteForFirmen.mockResolvedValue([]);
});

describe("bestimmeArbeitskontext", () => {
  it("is 'keine-firma' without a Firma", () => {
    expect(bestimmeArbeitskontext(null, [], null)).toEqual({ zustand: "keine-firma" });
  });

  it("reports a Firma without Standorte", () => {
    expect(bestimmeArbeitskontext(FIRMA, [], null)).toEqual({ zustand: "firma-ohne-standort", firma: FIRMA });
  });

  it("selects the only Standort automatically, also for old sessions without a stored Standort", () => {
    const kontext = bestimmeArbeitskontext(FIRMA, [standort("s1", "Haupthaus")], null);
    expect(kontext).toMatchObject({ zustand: "bereit", standort: { id: "s1", name: "Haupthaus" }, mehrereStandorte: false });
  });

  it("asks for a Standort when there are several and none is stored", () => {
    const kontext = bestimmeArbeitskontext(FIRMA, [standort("s2", "Werkhof"), standort("s1", "Haupthaus")], null);
    expect(kontext.zustand).toBe("standort-waehlen");
    // Auswahl alphabetisch sortiert
    expect(kontext.zustand === "standort-waehlen" && kontext.standorte.map((s) => s.name)).toEqual(["Haupthaus", "Werkhof"]);
  });

  it("uses the stored Standort when it belongs to the Firma", () => {
    const kontext = bestimmeArbeitskontext(FIRMA, [standort("s1", "Haupthaus"), standort("s2", "Werkhof")], "s2");
    expect(kontext).toMatchObject({ zustand: "bereit", standort: { id: "s2", name: "Werkhof" }, mehrereStandorte: true });
  });

  it("asks again when the stored Standort no longer belongs to the Firma (moved or deleted)", () => {
    const kontext = bestimmeArbeitskontext(FIRMA, [standort("s1", "Haupthaus"), standort("s2", "Werkhof")], "geloescht");
    expect(kontext.zustand).toBe("standort-waehlen");
  });

  it("keeps a stored Standort valid when the Firma later gets a second one", () => {
    const kontext = bestimmeArbeitskontext(FIRMA, [standort("s1", "Haupthaus"), standort("neu", "Neubau")], "s1");
    expect(kontext).toMatchObject({ zustand: "bereit", standort: { id: "s1" }, mehrereStandorte: true });
  });

  it("uses distinct names for Standorte with the same name", () => {
    const kontext = bestimmeArbeitskontext(
      FIRMA,
      [standort("b", "Kochergasse 9", "2026-02-01T00:00:00Z"), standort("a", "Kochergasse 9", "2026-01-01T00:00:00Z")],
      "b"
    );
    expect(kontext.zustand === "bereit" && kontext.standort.name).toBe("Kochergasse 9 (2)");
  });
});

describe("kontextBezeichnung", () => {
  it("shows only the Firma when it has a single Standort", () => {
    expect(kontextBezeichnung(bestimmeArbeitskontext(FIRMA, [standort("s1", "Haupthaus")], null))).toBe("Rehaklinik Bellikon");
  });

  it("shows 'Firma · Standort' when the Firma has several Standorte", () => {
    const kontext = bestimmeArbeitskontext(FIRMA, [standort("s1", "Haupthaus"), standort("s2", "Werkhof")], "s1");
    expect(kontextBezeichnung(kontext)).toBe("Rehaklinik Bellikon · Haupthaus");
  });

  it("hints at the missing choice and is empty without a Firma", () => {
    const kontext = bestimmeArbeitskontext(FIRMA, [standort("s1", "Haupthaus"), standort("s2", "Werkhof")], null);
    expect(kontextBezeichnung(kontext)).toBe("Rehaklinik Bellikon · Standort wählen");
    expect(kontextBezeichnung({ zustand: "keine-firma" })).toBeNull();
  });
});

describe("ladeArbeitskontext", () => {
  it("does not touch Dataverse without a Firma in the session", async () => {
    getCurrentFirmaId.mockResolvedValue(null);
    getCurrentStandortId.mockResolvedValue(null);

    await expect(ladeArbeitskontext()).resolves.toEqual({ zustand: "keine-firma" });
    expect(getFirma).not.toHaveBeenCalled();
  });

  it("combines session and Dataverse data", async () => {
    getCurrentFirmaId.mockResolvedValue("f1");
    getCurrentStandortId.mockResolvedValue("s2");
    getFirma.mockResolvedValue({ id: "f1", name: "Rehaklinik Bellikon" });
    listStandorteForFirma.mockResolvedValue([standort("s1", "Haupthaus"), standort("s2", "Werkhof")]);

    await expect(ladeArbeitskontext()).resolves.toMatchObject({
      zustand: "bereit",
      standort: { id: "s2" },
      firma: { name: "Rehaklinik Bellikon", anzeigename: "Rehaklinik Bellikon" },
    });
    expect(listStandorteForFirma).toHaveBeenCalledWith("f1");
    expect(listStandorteForFirmen).not.toHaveBeenCalled();
  });

  // Live-Fund 2026-10-08: bewusst getrennte, gleichnamige Firmen (Bilfinger-Niederlassungen).
  it("adds the Standort to the display name of a Firma whose name is shared by other active Firmen", async () => {
    const NAME = "Bilfinger Industrial Services Schweiz AG";
    getCurrentFirmaId.mockResolvedValue("f-pratteln");
    getCurrentStandortId.mockResolvedValue(null);
    getFirma.mockResolvedValue({ id: "f-pratteln", name: NAME });
    listStandorteForFirma.mockResolvedValue([{ id: "s-p", name: `${NAME} - Pratteln`, firmaId: "f-pratteln" }]);
    listAktiveFirmenMitNamen.mockResolvedValue([
      { id: "f-haupt", name: NAME },
      { id: "f-pratteln", name: NAME },
    ]);
    listStandorteForFirmen.mockResolvedValue([{ id: "s-h", name: NAME, firmaId: "f-haupt" }]);

    const kontext = await ladeArbeitskontext();

    expect(listAktiveFirmenMitNamen).toHaveBeenCalledWith(NAME);
    expect(listStandorteForFirmen).toHaveBeenCalledWith(["f-haupt"]);
    // `name` bleibt der echte Firmenname (PDF), nur die Anzeige bekommt den Zusatz.
    expect(kontext).toMatchObject({ zustand: "bereit", firma: { name: NAME, anzeigename: `${NAME} · Pratteln` } });
    expect(kontextBezeichnung(kontext)).toBe(`${NAME} · Pratteln`);
  });

  it("treats a Firma that no longer exists as 'keine-firma'", async () => {
    getCurrentFirmaId.mockResolvedValue("f-geloescht");
    getCurrentStandortId.mockResolvedValue(null);
    getFirma.mockRejectedValue(new DataverseError("not_found", "nicht gefunden"));

    await expect(ladeArbeitskontext()).resolves.toEqual({ zustand: "keine-firma" });
  });

  it("passes other Dataverse errors on, so pages can show their load error", async () => {
    getCurrentFirmaId.mockResolvedValue("f1");
    getCurrentStandortId.mockResolvedValue(null);
    getFirma.mockRejectedValue(new DataverseError("unavailable", "Dataverse nicht erreichbar"));

    await expect(ladeArbeitskontext()).rejects.toBeInstanceOf(DataverseError);
  });
});
