import { describe, it, expect } from "vitest";
import {
  alsSchweizerMitternacht,
  formatKalenderdatum,
  heuteSchweiz,
  istGueltigesDatum,
  vortag,
  wochentagIndex,
  zuSchweizerDatum,
} from "./datum";

describe("alsSchweizerMitternacht", () => {
  it("writes winter dates as 23:00 UTC of the previous day", () => {
    expect(alsSchweizerMitternacht("2026-11-01")).toBe("2026-10-31T23:00:00Z");
  });

  it("writes summer dates as 22:00 UTC of the previous day", () => {
    expect(alsSchweizerMitternacht("2026-07-01")).toBe("2026-06-30T22:00:00Z");
  });

  it("handles the days of the clock change", () => {
    expect(alsSchweizerMitternacht("2026-03-29")).toBe("2026-03-28T23:00:00Z");
    expect(alsSchweizerMitternacht("2026-10-25")).toBe("2026-10-24T22:00:00Z");
  });

  it("rejects invalid dates", () => {
    expect(() => alsSchweizerMitternacht("2026-02-30")).toThrow();
    expect(() => alsSchweizerMitternacht("01.11.2026")).toThrow();
  });
});

describe("zuSchweizerDatum", () => {
  it("reads the Swiss calendar date back", () => {
    expect(zuSchweizerDatum("2026-10-31T23:00:00Z")).toBe("2026-11-01");
    expect(zuSchweizerDatum("2026-06-30T22:00:00Z")).toBe("2026-07-01");
  });

  it("round-trips across the whole year", () => {
    for (let tag = 0; tag < 366; tag++) {
      const datum = new Date(Date.UTC(2028, 0, 1 + tag)).toISOString().slice(0, 10);
      expect(zuSchweizerDatum(alsSchweizerMitternacht(datum))).toBe(datum);
    }
  });

  it("returns null for empty or invalid values", () => {
    expect(zuSchweizerDatum(null)).toBeNull();
    expect(zuSchweizerDatum("kein datum")).toBeNull();
  });
});

describe("helpers", () => {
  it("validates calendar dates", () => {
    expect(istGueltigesDatum("2028-02-29")).toBe(true);
    expect(istGueltigesDatum("2026-02-29")).toBe(false);
    expect(istGueltigesDatum("")).toBe(false);
  });

  it("uses Swiss time for today", () => {
    expect(heuteSchweiz(new Date("2026-10-26T23:30:00Z"))).toBe("2026-10-27");
  });

  it("computes the weekday Monday-first", () => {
    expect(wochentagIndex("2026-10-26")).toBe(0); // Montag
    expect(wochentagIndex("2026-11-01")).toBe(6); // Sonntag
  });

  it("computes the previous day across month and year ends", () => {
    expect(vortag("2026-03-01")).toBe("2026-02-28");
    expect(vortag("2027-01-01")).toBe("2026-12-31");
  });

  it("formats dates Swiss style", () => {
    expect(formatKalenderdatum("2026-11-01")).toBe("01.11.2026");
    expect(formatKalenderdatum(null)).toBe("—");
  });
});
