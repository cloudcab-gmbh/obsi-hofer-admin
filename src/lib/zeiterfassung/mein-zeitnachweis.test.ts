import { describe, expect, it } from "vitest";
import { begrenzeMonat, erlaubteMonate, ohneHerkunftsvermerk } from "./mein-zeitnachweis";

describe("erlaubteMonate", () => {
  it("vom Monat des Beginns bis zum aktuellen Monat", () => {
    expect(erlaubteMonate({ beginn: "2026-01-01", austrittAm: null, heute: "2026-11-21" })).toEqual({ von: "2026-01", bis: "2026-11" });
  });

  it("ohne Beginn nur der aktuelle Monat", () => {
    expect(erlaubteMonate({ beginn: null, austrittAm: null, heute: "2026-11-21" })).toEqual({ von: "2026-11", bis: "2026-11" });
  });

  it("bei Austritt höchstens bis zum Austrittsmonat", () => {
    expect(erlaubteMonate({ beginn: "2026-01-01", austrittAm: "2026-08-31", heute: "2026-11-21" })).toEqual({ von: "2026-01", bis: "2026-08" });
  });

  it("Austritt in der Zukunft begrenzt nicht", () => {
    expect(erlaubteMonate({ beginn: "2026-01-01", austrittAm: "2027-03-31", heute: "2026-11-21" })).toEqual({ von: "2026-01", bis: "2026-11" });
  });

  it("Beginn im aktuellen Monat: nur dieser Monat", () => {
    expect(erlaubteMonate({ beginn: "2026-11-10", austrittAm: null, heute: "2026-11-21" })).toEqual({ von: "2026-11", bis: "2026-11" });
  });

  it("Beginn in der Zukunft: nur der aktuelle Monat", () => {
    expect(erlaubteMonate({ beginn: "2027-01-01", austrittAm: null, heute: "2026-11-21" })).toEqual({ von: "2026-11", bis: "2026-11" });
  });
});

describe("begrenzeMonat", () => {
  const bereich = { von: "2026-01", bis: "2026-11" };
  it.each([
    [null, "2026-11"],
    ["2025-12", "2026-01"],
    ["2026-12", "2026-11"],
    ["2026-05", "2026-05"],
  ])("%s → %s", (monat, erwartet) => {
    expect(begrenzeMonat(monat, bereich)).toBe(erwartet);
  });
});

describe("ohneHerkunftsvermerk", () => {
  it.each([
    ["aus SharePoint", null],
    ["Kunde X · aus SharePoint", "Kunde X"],
    ["Kunde X", "Kunde X"],
    ["Arzt", "Arzt"],
    ["Notiz aus SharePoint-Liste", "Notiz aus SharePoint-Liste"],
  ])("%s → %s", (bemerkung, erwartet) => {
    expect(ohneHerkunftsvermerk(bemerkung)).toBe(erwartet);
  });
});
