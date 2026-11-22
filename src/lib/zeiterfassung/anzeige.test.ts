import { describe, it, expect } from "vitest";
import { korrekturTexte } from "./anzeige";
import type { Tagesauswertung } from "./tagesauswertung";

const paar = (korrektur: Tagesauswertung["paare"][number]["korrektur"]) =>
  ({ eintragId: "e", kommen: "07:00", gehen: "16:00", folgetag: false, unplausibel: false, bemerkung: null, korrektur }) as const;

describe("korrekturTexte (PROJ-22)", () => {
  const korrigiert = { am: "2026-11-21T09:00:00Z", von: "Robert Bienz", vorher: "07:30–16:30" };
  const geloescht = [{ eintragId: "g", text: "17:00–19:00", am: "2026-11-21T23:30:00Z", von: "Robert Bienz" }];

  it("shows Freigeber date (Swiss time), name and previous times", () => {
    expect(korrekturTexte({ paare: [paar(korrigiert), paar(null)], geloeschte: geloescht }, false)).toEqual([
      "korrigiert 21.11. von Robert Bienz (vorher 07:30–16:30)",
      "17:00–19:00 gelöscht 22.11. von Robert Bienz",
    ]);
  });

  it("leaves out missing parts", () => {
    expect(korrekturTexte({ paare: [paar({ am: "", von: null, vorher: null })], geloeschte: [] }, false)).toEqual(["korrigiert"]);
  });

  it("shows employees only one 'korrigiert' and nothing about deletions", () => {
    expect(korrekturTexte({ paare: [paar(korrigiert), paar(korrigiert)], geloeschte: geloescht }, true)).toEqual(["korrigiert"]);
    expect(korrekturTexte({ paare: [paar(null)], geloeschte: geloescht }, true)).toEqual([]);
  });
});
