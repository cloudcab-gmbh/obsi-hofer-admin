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

const DEFAULT_STATE = { suche: "", lagerort: "", standortId: "", letztePruefungTage: "", sortierung: null };

describe("getGeraeteFilterState", () => {
  it("returns an all-empty default state when no cookie is set", async () => {
    get.mockReturnValue(undefined);
    await expect(getGeraeteFilterState()).resolves.toEqual(DEFAULT_STATE);
  });

  it("parses a previously stored state", async () => {
    get.mockReturnValue({
      value: JSON.stringify({
        suche: "seil",
        lagerort: "Lager A",
        standortId: "abc",
        letztePruefungTage: "7",
        sortierung: { spalte: "letztePruefung", richtung: "desc" },
      }),
    });
    await expect(getGeraeteFilterState()).resolves.toEqual({
      suche: "seil",
      lagerort: "Lager A",
      standortId: "abc",
      letztePruefungTage: "7",
      sortierung: { spalte: "letztePruefung", richtung: "desc" },
    });
  });

  it("drops an invalid or missing sortierung (e.g. a cookie from before the sorting existed)", async () => {
    get.mockReturnValue({ value: JSON.stringify({ suche: "seil", sortierung: { spalte: "foo", richtung: "asc" } }) });
    await expect(getGeraeteFilterState()).resolves.toEqual({ ...DEFAULT_STATE, suche: "seil" });

    get.mockReturnValue({ value: JSON.stringify({ suche: "seil" }) });
    await expect(getGeraeteFilterState()).resolves.toEqual({ ...DEFAULT_STATE, suche: "seil" });
  });

  it("falls back to the default state for malformed cookie content", async () => {
    get.mockReturnValue({ value: "not json" });
    await expect(getGeraeteFilterState()).resolves.toEqual(DEFAULT_STATE);
  });
});

describe("setGeraeteFilterState", () => {
  it("stores the state as JSON with httpOnly and a 30-day expiry", async () => {
    await setGeraeteFilterState({ ...DEFAULT_STATE, suche: "seil", letztePruefungTage: "7" });

    expect(set).toHaveBeenCalledWith(
      "geraete_filter",
      JSON.stringify({ suche: "seil", lagerort: "", standortId: "", letztePruefungTage: "7", sortierung: null }),
      expect.objectContaining({ httpOnly: true, path: "/", maxAge: 60 * 60 * 24 * 30 })
    );
  });
});
