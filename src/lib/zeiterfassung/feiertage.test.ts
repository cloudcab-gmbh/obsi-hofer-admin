import { describe, it, expect } from "vitest";
import { feiertagAm, feiertageAargau, ostersonntag } from "./feiertage";

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
