import { describe, it, expect, vi, beforeEach } from "vitest";

const get = vi.fn();
const set = vi.fn();

vi.mock("next/headers", () => ({
  cookies: async () => ({ get, set }),
}));

import { getGeraeteFilterState, setGeraeteFilterState } from "./geraete-filter-session";

beforeEach(() => {
  get.mockReset();
  set.mockReset();
});

const DEFAULT_STATE = { suche: "", lagerort: "", standortId: "", letztePruefungTage: "" };

describe("getGeraeteFilterState", () => {
  it("returns an all-empty default state when no cookie is set", async () => {
    get.mockReturnValue(undefined);
    await expect(getGeraeteFilterState()).resolves.toEqual(DEFAULT_STATE);
  });

  it("parses a previously stored state", async () => {
    get.mockReturnValue({
      value: JSON.stringify({ suche: "seil", lagerort: "Lager A", standortId: "abc", letztePruefungTage: "7" }),
    });
    await expect(getGeraeteFilterState()).resolves.toEqual({
      suche: "seil",
      lagerort: "Lager A",
      standortId: "abc",
      letztePruefungTage: "7",
    });
  });

  it("falls back to the default state for malformed cookie content", async () => {
    get.mockReturnValue({ value: "not json" });
    await expect(getGeraeteFilterState()).resolves.toEqual(DEFAULT_STATE);
  });
});

describe("setGeraeteFilterState", () => {
  it("stores the state as JSON with httpOnly and a 30-day expiry", async () => {
    await setGeraeteFilterState({ suche: "seil", lagerort: "", standortId: "", letztePruefungTage: "7" });

    expect(set).toHaveBeenCalledWith(
      "geraete_filter",
      JSON.stringify({ suche: "seil", lagerort: "", standortId: "", letztePruefungTage: "7" }),
      expect.objectContaining({ httpOnly: true, path: "/", maxAge: 60 * 60 * 24 * 30 })
    );
  });
});
