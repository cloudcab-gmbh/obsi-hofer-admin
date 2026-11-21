import { describe, expect, it } from "vitest";
import { anfragenProTag, anfrageZeitraum, bisherigeZeiten, darfAnfragen, monatAnfragbar, pruefeNachricht } from "./korrektur";
import { berechneZeitnachweis } from "./zeitnachweis";
import type { Zeiteintrag } from "./tagesauswertung";

const bereich = { von: "2026-01", bis: "2026-11" };

describe("anfrageZeitraum", () => {
  it("aktueller und vorheriger Monat bis heute", () => {
    expect(anfrageZeitraum("2026-11-21", bereich)).toEqual({ von: "2026-10-01", bis: "2026-11-21" });
  });

  it("über den Jahreswechsel", () => {
    expect(anfrageZeitraum("2027-01-05", { von: "2026-01", bis: "2027-01" })).toEqual({ von: "2026-12-01", bis: "2027-01-05" });
  });

  it("Beginn der Auswertung im aktuellen Monat begrenzt nach unten", () => {
    expect(anfrageZeitraum("2026-11-21", { von: "2026-11", bis: "2026-11" })).toEqual({ von: "2026-11-01", bis: "2026-11-21" });
  });

  it("Austritt im Vormonat begrenzt nach oben", () => {
    expect(anfrageZeitraum("2026-11-21", { von: "2026-01", bis: "2026-10" })).toEqual({ von: "2026-10-01", bis: "2026-10-31" });
  });

  it("Austritt vor dem Vormonat: keine Anfragen", () => {
    expect(anfrageZeitraum("2026-11-21", { von: "2026-01", bis: "2026-08" })).toBeNull();
  });
});

describe("darfAnfragen / monatAnfragbar", () => {
  const zeitraum = { von: "2026-10-01", bis: "2026-11-21" };
  it.each([
    ["2026-10-01", true],
    ["2026-11-21", true],
    ["2026-09-30", false],
    ["2026-11-22", false],
  ])("%s → %s", (datum, erwartet) => {
    expect(darfAnfragen(datum, zeitraum)).toBe(erwartet);
  });

  it("ohne Zeitraum nie", () => {
    expect(darfAnfragen("2026-11-21", null)).toBe(false);
    expect(monatAnfragbar("2026-11", null)).toBe(false);
  });

  it.each([
    ["2026-09", false],
    ["2026-10", true],
    ["2026-11", true],
  ])("Monat %s → %s", (monat, erwartet) => {
    expect(monatAnfragbar(monat, zeitraum)).toBe(erwartet);
  });
});

describe("bisherigeZeiten", () => {
  function eintrag(datum: string, kommen: string, gehen: string | null, typ: Zeiteintrag["typ"] = "arbeitszeit"): Zeiteintrag {
    return {
      id: `${datum}-${kommen}`,
      datum,
      typ,
      kommen: `${datum}T${kommen}:00Z`,
      gehen: gehen && `${datum}T${gehen}:00Z`,
      tagestotal: null,
      monatstotal: null,
      mittagessen: false,
      abendessen: false,
      bemerkung: null,
      halberTag: false,
    };
  }
  function tag(datum: string, eintraege: Zeiteintrag[]) {
    const z = berechneZeitnachweis({
      monat: "2026-11",
      heute: "2026-11-21",
      eintraege,
      versionen: [{ id: "v", gueltigAb: "2026-01-01", pensum: 100, arbeitstage: [true, true, true, true, true, false, false] }],
      austrittAm: null,
      startsaldoStunden: 0,
      stichtag: "2025-12-31",
    });
    return z.tage.find((t) => t.datum === datum)!;
  }

  it("listet die Paare in Schweizer Zeit", () => {
    expect(bisherigeZeiten(tag("2026-11-02", [eintrag("2026-11-02", "06:30", "11:00"), eintrag("2026-11-02", "11:30", null)]))).toBe(
      "07:30–12:00, 12:30–offen"
    );
  });

  it("ohne Einträge", () => {
    expect(bisherigeZeiten(tag("2026-11-03", []))).toBe("keine Einträge");
  });

  it("nennt die Art des Tages", () => {
    expect(bisherigeZeiten(tag("2026-11-04", [{ ...eintrag("2026-11-04", "00:00", null), typ: "ferien" }]))).toBe("keine Einträge · Ferien");
  });
});

describe("anfragenProTag", () => {
  it("gruppiert pro Tag, neueste zuerst", () => {
    const a = (id: string, datum: string, erstelltAm: string) => ({ id, datum, nachricht: id, status: "offen" as const, erstelltAm });
    expect(
      anfragenProTag([a("1", "2026-11-02", "2026-11-03T08:00:00Z"), a("2", "2026-11-02", "2026-11-05T08:00:00Z"), a("3", "2026-11-04", "2026-11-04T08:00:00Z")])
    ).toEqual({
      "2026-11-02": [expect.objectContaining({ id: "2" }), expect.objectContaining({ id: "1" })],
      "2026-11-04": [expect.objectContaining({ id: "3" })],
    });
  });
});

describe("pruefeNachricht", () => {
  it.each([
    ["", "Bitte eine Nachricht eingeben."],
    ["   ", "Bitte eine Nachricht eingeben."],
    [42, "Bitte eine Nachricht eingeben."],
    ["x".repeat(1001), "Die Nachricht darf höchstens 1000 Zeichen lang sein."],
    ["x".repeat(1000), null],
    ["Gehen war 17:30", null],
  ])("%s", (nachricht, erwartet) => {
    expect(pruefeNachricht(nachricht)).toBe(erwartet);
  });
});
