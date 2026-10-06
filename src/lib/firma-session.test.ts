import { describe, it, expect, vi, beforeEach } from "vitest";

const get = vi.fn();
const set = vi.fn();
const del = vi.fn();

vi.mock("next/headers", () => ({
  cookies: async () => ({ get, set, delete: del }),
}));

import { getCurrentFirmaId, setCurrentFirmaId } from "./firma-session";

beforeEach(() => {
  get.mockReset();
  set.mockReset();
  del.mockReset();
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
