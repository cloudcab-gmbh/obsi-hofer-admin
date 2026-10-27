import { describe, it, expect } from "vitest";
import { baueFeiertagskalender, feiertagAm, feiertageAargau, ostersonntag, vorschlagListe, VORSCHLAGS_KALENDER } from "./feiertage";

describe("ostersonntag", () => {
  it.each([
    [2024, "2024-03-31"],
    [2025, "2025-04-20"],
    [2026, "2026-04-05"],
    [2027, "2027-03-28"],
    [2038, "2038-04-25"],
  ])("computes Easter %i", (jahr, erwartet) => {
    expect(ostersonntag(jahr)).toBe(erwartet);
  });
});

describe("feiertageAargau", () => {
  it("lists the nine holidays of the Excel list for 2026", () => {
    expect([...feiertageAargau(2026).entries()]).toEqual([
      ["2026-01-01", "Neujahr"],
      ["2026-01-02", "Berchtoldstag"],
      ["2026-04-03", "Karfreitag"],
      ["2026-04-06", "Ostermontag"],
      ["2026-05-14", "Auffahrt"],
      ["2026-05-25", "Pfingstmontag"],
      ["2026-08-01", "Bundesfeiertag"],
      ["2026-12-25", "Weihnachten"],
      ["2026-12-26", "Stephanstag"],
    ]);
  });

  it("moves the Easter-based holidays with the year", () => {
    expect(feiertagAm("2027-05-06")).toBe("Auffahrt");
    expect(feiertagAm("2027-05-17")).toBe("Pfingstmontag");
  });

  it("does not include 1. Mai or Fronleichnam (open question)", () => {
    expect(feiertagAm("2026-05-01")).toBeNull();
    expect(feiertagAm("2026-06-04")).toBeNull();
  });
});

describe("Feiertagskalender (PROJ-18)", () => {
  const kalender = baueFeiertagskalender(
    new Map([
      [2027, [{ datum: "2027-12-24", name: "Heiligabend", halb: true }, { datum: "2027-12-25", name: "Weihnachten", halb: false }]],
      [2028, []],
    ])
  );

  it("uses the maintained list for maintained years", () => {
    expect(kalender.am("2027-12-24")).toEqual({ name: "Heiligabend", halb: true });
    expect(kalender.am("2027-01-01")).toBeNull(); // nicht in der gepflegten Liste
    expect(kalender.gepflegt(2027)).toBe(true);
  });

  it("treats a maintained empty year as without holidays", () => {
    expect(kalender.am("2028-01-01")).toBeNull();
  });

  it("falls back to the suggestion for other years", () => {
    expect(kalender.am("2026-05-14")).toEqual({ name: "Auffahrt", halb: false });
    expect(kalender.gepflegt(2026)).toBe(false);
    expect(VORSCHLAGS_KALENDER.am("2026-12-25")?.name).toBe("Weihnachten");
  });

  it("lists the suggestion of a year", () => {
    expect(vorschlagListe(2026)).toHaveLength(9);
    expect(vorschlagListe(2026)[0]).toEqual({ datum: "2026-01-01", name: "Neujahr", halb: false });
  });
});
