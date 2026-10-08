import { describe, it, expect, vi, beforeEach } from "vitest";

const get = vi.fn();
const set = vi.fn();
const del = vi.fn();

vi.mock("next/headers", () => ({
  cookies: async () => ({ get, set, delete: del }),
}));

const listStandorteForFirma = vi.fn();
vi.mock("./dataverse/geraete", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./dataverse/geraete")>()),
  listStandorteForFirma: (...args: unknown[]) => listStandorteForFirma(...args),
}));

import { getCurrentFirmaId, getCurrentStandortId, setCurrentFirmaId, setCurrentStandortId } from "./firma-session";

/** Cookie-Store mit festen Werten pro Name. */
function cookiesMit(werte: Record<string, string>) {
  get.mockImplementation((name: string) => (name in werte ? { value: werte[name] } : undefined));
}
const standort = (id: string) => ({ id, name: id, firmaId: "firma-1" });

beforeEach(() => {
  get.mockReset();
  set.mockReset();
  del.mockReset();
  listStandorteForFirma.mockReset();
  listStandorteForFirma.mockResolvedValue([standort("s1"), standort("s2")]);
});

describe("getCurrentFirmaId", () => {
  it("returns the cookie value when present", async () => {
    get.mockReturnValue({ value: "firma-1" });

    await expect(getCurrentFirmaId()).resolves.toBe("firma-1");
    expect(get).toHaveBeenCalledWith("aktuelle_firma_id");
  });

  it("returns null when no cookie is set", async () => {
    get.mockReturnValue(undefined);

    await expect(getCurrentFirmaId()).resolves.toBeNull();
  });
});

describe("setCurrentFirmaId", () => {
  it("sets the cookie with httpOnly and a 30-day expiry", async () => {
    await setCurrentFirmaId("firma-1");

    expect(set).toHaveBeenCalledWith(
      "aktuelle_firma_id",
      "firma-1",
      expect.objectContaining({ httpOnly: true, path: "/", maxAge: 60 * 60 * 24 * 30 })
    );
  });
});

// Nutzerwunsch 2026-10-06: Filter der Geräteliste gelten nur für die Firma, für die sie gesetzt wurden.
describe("setCurrentFirmaId — Geräte-Filter", () => {
  it("clears the Geräte filter when switching to a different Firma", async () => {
    get.mockReturnValue({ value: "firma-1" });

    await setCurrentFirmaId("firma-2");

    expect(del).toHaveBeenCalledWith("geraete_filter");
  });

  it("clears the Geräte filter when no Firma was selected before", async () => {
    get.mockReturnValue(undefined);

    await setCurrentFirmaId("firma-1");

    expect(del).toHaveBeenCalledWith("geraete_filter");
  });

  it("keeps the Geräte filter when the same Firma is selected again", async () => {
    get.mockReturnValue({ value: "firma-1" });

    await setCurrentFirmaId("firma-1");

    expect(del).not.toHaveBeenCalled();
  });
});

// PROJ-10: aktueller Standort neben der Firma.
describe("getCurrentStandortId", () => {
  it("reads its own cookie", async () => {
    cookiesMit({ aktueller_standort_id: "s1" });
    await expect(getCurrentStandortId()).resolves.toBe("s1");
  });
});

describe("setCurrentFirmaId — Standort (PROJ-10)", () => {
  it("drops the stored Standort when switching to a different Firma", async () => {
    cookiesMit({ aktuelle_firma_id: "firma-1", aktueller_standort_id: "s1" });

    await setCurrentFirmaId("firma-2");

    expect(del).toHaveBeenCalledWith("aktueller_standort_id");
  });

  it("stores the only Standort right away and needs no further choice", async () => {
    listStandorteForFirma.mockResolvedValue([standort("einziger")]);

    const ergebnis = await setCurrentFirmaId("firma-1");

    expect(ergebnis).toEqual({ standortWaehlen: false });
    expect(set).toHaveBeenCalledWith("aktueller_standort_id", "einziger", expect.objectContaining({ httpOnly: true }));
  });

  it("asks for a Standort when the Firma has several and none is chosen", async () => {
    cookiesMit({});
    await expect(setCurrentFirmaId("firma-1")).resolves.toEqual({ standortWaehlen: true });
    expect(set).not.toHaveBeenCalledWith("aktueller_standort_id", expect.anything(), expect.anything());
  });

  it("keeps a valid Standort when the same Firma is selected again", async () => {
    cookiesMit({ aktuelle_firma_id: "firma-1", aktueller_standort_id: "s2" });
    await expect(setCurrentFirmaId("firma-1")).resolves.toEqual({ standortWaehlen: false });
    expect(del).not.toHaveBeenCalled();
  });

  it("still stores the Firma and asks for a Standort when the Standorte cannot be loaded", async () => {
    listStandorteForFirma.mockRejectedValue(new Error("Dataverse down"));
    await expect(setCurrentFirmaId("firma-1")).resolves.toEqual({ standortWaehlen: true });
    expect(set).toHaveBeenCalledWith("aktuelle_firma_id", "firma-1", expect.anything());
  });
});

describe("setCurrentStandortId (PROJ-10)", () => {
  it("stores a Standort of the current Firma", async () => {
    cookiesMit({ aktuelle_firma_id: "firma-1" });

    await expect(setCurrentStandortId("s2")).resolves.toEqual({ ok: true });

    expect(listStandorteForFirma).toHaveBeenCalledWith("firma-1");
    expect(set).toHaveBeenCalledWith("aktueller_standort_id", "s2", expect.objectContaining({ httpOnly: true }));
  });

  it("rejects a Standort that does not belong to the current Firma (direct Server Action call)", async () => {
    cookiesMit({ aktuelle_firma_id: "firma-1" });

    await expect(setCurrentStandortId("fremder-standort")).resolves.toEqual({ ok: false });
    expect(set).not.toHaveBeenCalled();
  });

  it("rejects any Standort while no Firma is selected", async () => {
    cookiesMit({});
    await expect(setCurrentStandortId("s1")).resolves.toEqual({ ok: false });
    expect(listStandorteForFirma).not.toHaveBeenCalled();
  });

  it("clears the Geräte filter only when the Standort actually changes", async () => {
    cookiesMit({ aktuelle_firma_id: "firma-1", aktueller_standort_id: "s1" });
    await setCurrentStandortId("s1");
    expect(del).not.toHaveBeenCalled();

    await setCurrentStandortId("s2");
    expect(del).toHaveBeenCalledWith("geraete_filter");
  });
});
