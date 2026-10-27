import { describe, it, expect } from "vitest";
import {
  aktuelleVersion,
  formatSollBeschreibung,
  gueltigBis,
  gueltigeVersion,
  sollAmDatum,
  sollProArbeitstag,
  sortiereVersionen,
  type Arbeitstage,
  type ArbeitsmodellVersion,
} from "./soll";

const MO_DI: Arbeitstage = [true, true, false, false, false, false, false];
const MO_FR: Arbeitstage = [true, true, true, true, true, false, false];
const KEINE: Arbeitstage = [false, false, false, false, false, false, false];

function version(gueltigAb: string, pensum: number, arbeitstage: Arbeitstage): ArbeitsmodellVersion {
  return { id: gueltigAb, gueltigAb, pensum, arbeitstage };
}

describe("sollProArbeitstag", () => {
  it("distributes 40 h × Pensum evenly over the working days", () => {
    expect(sollProArbeitstag(40, MO_DI)).toBe(8);
    expect(sollProArbeitstag(100, MO_FR)).toBe(8);
    expect(sollProArbeitstag(45, [true, true, true, false, false, false, false])).toBe(6);
    expect(sollProArbeitstag(30, [true, true, true, true, false, false, false])).toBe(3);
  });

  it("rounds to two decimals", () => {
    expect(sollProArbeitstag(50, [true, true, true, false, false, false, false])).toBe(6.67);
  });

  it("is 0 for Pensum 0 or without working days", () => {
    expect(sollProArbeitstag(0, MO_DI)).toBe(0);
    expect(sollProArbeitstag(0, KEINE)).toBe(0);
    expect(sollProArbeitstag(80, KEINE)).toBe(0);
  });
});

describe("formatSollBeschreibung", () => {
  it("names hours and days", () => {
    expect(formatSollBeschreibung(40, MO_DI)).toBe("8.00 h an Mo, Di");
    expect(formatSollBeschreibung(0, KEINE)).toBe("kein Soll");
  });
});

describe("versions", () => {
  const versionen = [version("2026-01-01", 100, MO_FR), version("2026-11-01", 40, MO_DI)];

  it("sorts newest first", () => {
    expect(sortiereVersionen(versionen).map((v) => v.gueltigAb)).toEqual(["2026-11-01", "2026-01-01"]);
  });

  it("finds the version valid on a date", () => {
    expect(gueltigeVersion(versionen, "2025-12-31")).toBeNull();
    expect(gueltigeVersion(versionen, "2026-10-31")?.pensum).toBe(100);
    expect(gueltigeVersion(versionen, "2026-11-01")?.pensum).toBe(40);
  });

  it("derives 'gültig bis' from the next version or the Austritt", () => {
    expect(gueltigBis(versionen, versionen[0], null)).toBe("2026-10-31");
    expect(gueltigBis(versionen, versionen[1], null)).toBeNull();
    expect(gueltigBis(versionen, versionen[1], "2027-03-31")).toBe("2027-03-31");
  });

  it("picks today's version for the list, else the next future one", () => {
    expect(aktuelleVersion(versionen, "2026-10-27")?.pensum).toBe(100);
    expect(aktuelleVersion(versionen, "2025-06-01")?.gueltigAb).toBe("2026-01-01");
    expect(aktuelleVersion([], "2026-10-27")).toBeNull();
  });
});

describe("sollAmDatum", () => {
  const person = {
    versionen: [version("2026-10-01", 100, MO_FR), version("2026-10-19", 40, MO_DI)],
    austrittAm: null as string | null,
  };

  it("is 0 before the first version", () => {
    expect(sollAmDatum(person, "2026-09-30")).toBe(0);
  });

  it("switches versions in the middle of a month", () => {
    expect(sollAmDatum(person, "2026-10-14")).toBe(8); // Mi, 100 %
    expect(sollAmDatum(person, "2026-10-21")).toBe(0); // Mi, kein Arbeitstag mehr
    expect(sollAmDatum(person, "2026-10-20")).toBe(8); // Di, 40 % an 2 Tagen
  });

  it("is 0 on non-working days", () => {
    expect(sollAmDatum(person, "2026-10-17")).toBe(0); // Sa
  });

  it("counts weekend working days", () => {
    const wochenende = { versionen: [version("2026-10-01", 20, [false, false, false, false, false, true, false])], austrittAm: null };
    expect(sollAmDatum(wochenende, "2026-10-17")).toBe(8);
  });

  it("is 0 after the Austritt, but not on the Austritt itself", () => {
    const ausgetreten = { ...person, austrittAm: "2026-10-27" };
    expect(sollAmDatum(ausgetreten, "2026-10-27")).toBe(8); // Di
    expect(sollAmDatum(ausgetreten, "2026-11-02")).toBe(0); // Mo
  });

  it("is 0 for Pensum 0", () => {
    expect(sollAmDatum({ versionen: [version("2026-10-01", 0, KEINE)], austrittAm: null }, "2026-10-05")).toBe(0);
  });
});
