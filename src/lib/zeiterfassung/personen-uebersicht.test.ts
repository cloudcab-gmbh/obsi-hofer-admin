import { describe, it, expect } from "vitest";
import { bauePersonenUebersicht } from "./personen-uebersicht";
import type { Arbeitstage } from "./soll";

const MO_DI: Arbeitstage = [true, true, false, false, false, false, false];

function person(id: string, email: string, extra: Partial<Parameters<typeof bauePersonenUebersicht>[1][number]> = {}) {
  return { id, email, name: null, nichtAuswerten: false, austrittAm: null, startsaldo: null, stichtag: null, ...extra };
}

describe("bauePersonenUebersicht", () => {
  it("lists every email once, with or without a stored person", () => {
    const liste = bauePersonenUebersicht(
      ["b@x.ch", "a@x.ch"],
      [person("p1", "a@x.ch"), person("p2", "c@x.ch")],
      [],
      "2026-10-27"
    );
    expect(liste.map((p) => p.email)).toEqual(["a@x.ch", "b@x.ch", "c@x.ch"]);
    expect(liste.every((p) => p.version === null)).toBe(true);
  });

  it("shows the name instead of the email and sorts by it", () => {
    const liste = bauePersonenUebersicht(["a@x.ch", "z@x.ch"], [person("p1", "z@x.ch", { name: "Anna" })], [], "2026-10-27");
    expect(liste.map((p) => p.anzeige)).toEqual(["a@x.ch", "Anna"]);
    expect(liste[1].hatName).toBe(true);
  });

  it("adds today's version with the Soll per working day", () => {
    const liste = bauePersonenUebersicht(
      ["a@x.ch"],
      [person("p1", "a@x.ch")],
      [
        { personId: "p1", gueltigAb: "2026-01-01", pensum: 100, arbeitstage: [true, true, true, true, true, false, false] },
        { personId: "p1", gueltigAb: "2026-10-01", pensum: 40, arbeitstage: MO_DI },
        { personId: "p2", gueltigAb: "2026-10-01", pensum: 80, arbeitstage: MO_DI },
      ],
      "2026-10-27"
    );
    expect(liste[0].version).toMatchObject({ pensum: 40, sollProArbeitstag: 8, kuenftig: false });
  });

  it("marks a version that only starts in the future", () => {
    const liste = bauePersonenUebersicht(
      ["a@x.ch"],
      [person("p1", "a@x.ch")],
      [{ personId: "p1", gueltigAb: "2026-11-01", pensum: 40, arbeitstage: MO_DI }],
      "2026-10-27"
    );
    expect(liste[0].version?.kuenftig).toBe(true);
  });

  it("marks persons whose Austritt lies in the past", () => {
    const liste = bauePersonenUebersicht(
      [],
      [person("p1", "a@x.ch", { austrittAm: "2026-10-26" }), person("p2", "b@x.ch", { austrittAm: "2026-10-27" })],
      [],
      "2026-10-27"
    );
    expect(liste.map((p) => p.ausgetreten)).toEqual([true, false]);
  });
});
