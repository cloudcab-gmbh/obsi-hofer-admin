import { describe, it, expect } from "vitest";
import {
  anspruchImJahr,
  ferienBeginn,
  ferienJahr,
  feriensaldoAm,
  ferientagWert,
  ferienZeitraeume,
  planeFerien,
  type FerienPerson,
} from "./ferien";
import type { Arbeitstage, ArbeitsmodellVersion } from "./soll";
import type { Zeiteintrag } from "./tagesauswertung";

const MO_FR: Arbeitstage = [true, true, true, true, true, false, false];
const MO_DI: Arbeitstage = [true, true, false, false, false, false, false];
const VOLLZEIT: ArbeitsmodellVersion = { id: "v1", gueltigAb: "2025-01-01", pensum: 100, arbeitstage: MO_FR };

function person(extra: Partial<FerienPerson> = {}): FerienPerson {
  return { versionen: [VOLLZEIT], austrittAm: null, ferienanspruch: null, ferienStartsaldo: null, stichtag: null, ...extra };
}

function eintrag(datum: string, typ: Zeiteintrag["typ"] = "ferien", halberTag = false): Zeiteintrag {
  return {
    id: `${typ}-${datum}`,
    datum,
    typ,
    kommen: `${datum}T00:00:00Z`,
    gehen: null,
    tagestotal: null,
    monatstotal: null,
    mittagessen: false,
    abendessen: false,
    bemerkung: null,
    halberTag,
  };
}

describe("ferientagWert", () => {
  it("counts a full, a half and no Ferientag", () => {
    expect(ferientagWert(person(), "2026-11-02", [eintrag("2026-11-02")])).toBe(1);
    expect(ferientagWert(person(), "2026-11-02", [eintrag("2026-11-02", "ferien", true)])).toBe(0.5);
    expect(ferientagWert(person(), "2026-11-02", [])).toBe(0);
  });

  it("does not count weekends, holidays or days with Krankheit", () => {
    expect(ferientagWert(person(), "2026-11-07", [eintrag("2026-11-07")])).toBe(0); // Samstag
    expect(ferientagWert(person(), "2026-12-25", [eintrag("2026-12-25")])).toBe(0); // Weihnachten
    expect(ferientagWert(person(), "2026-11-02", [eintrag("2026-11-02"), eintrag("2026-11-02", "krankheit")])).toBe(0);
  });
});

describe("anspruchImJahr", () => {
  it("is the full Anspruch at 100 % and scales with Pensum", () => {
    expect(anspruchImJahr(person(), 2026, "2026-01-01")).toBe(25);
    expect(anspruchImJahr(person({ versionen: [{ ...VOLLZEIT, pensum: 40, arbeitstage: MO_DI }] }), 2026, "2026-01-01")).toBe(10);
    expect(anspruchImJahr(person({ ferienanspruch: 30 }), 2026, "2026-01-01")).toBe(30);
  });

  it("is pro rata for Eintritt, Austritt, Pensumswechsel and Stichtag, rounded to half days", () => {
    // Eintritt 1.7.: 184/365 × 25 = 12.6 → 12.5
    expect(anspruchImJahr(person({ versionen: [{ ...VOLLZEIT, gueltigAb: "2026-07-01" }] }), 2026, "2026-01-01")).toBe(12.5);
    // Austritt 30.6.: 181/365 × 25 = 12.4 → 12.5
    expect(anspruchImJahr(person({ austrittAm: "2026-06-30" }), 2026, "2026-01-01")).toBe(12.5);
    // 100 % bis 30.6., dann 50 %: 181/365 × 25 + 184/365 × 12.5 = 18.7 → 18.5
    expect(
      anspruchImJahr(person({ versionen: [VOLLZEIT, { ...VOLLZEIT, id: "v2", gueltigAb: "2026-07-01", pensum: 50 }] }), 2026, "2026-01-01")
    ).toBe(18.5);
    // ab 1.11.: 61/365 × 25 = 4.2 → 4
    expect(anspruchImJahr(person(), 2026, "2026-11-01")).toBe(4);
  });

  it("handles leap years", () => {
    expect(anspruchImJahr(person(), 2028, "2028-01-01")).toBe(25);
  });
});

describe("feriensaldoAm", () => {
  const p = person({ stichtag: "2026-10-31", ferienStartsaldo: 3 });

  it("starts the day after the Stichtag", () => {
    expect(ferienBeginn(p)).toBe("2026-11-01");
    expect(feriensaldoAm(p, [], "2026-10-31")).toBeNull();
  });

  it("adds the yearly Anspruch on 1 January and subtracts Ferientage, carrying the rest over", () => {
    const eintraege = [eintrag("2026-11-02"), eintrag("2026-11-03", "ferien", true), eintrag("2027-03-01")];
    expect(feriensaldoAm(p, eintraege, "2026-12-31")).toBe(3 + 4 - 1.5);
    expect(feriensaldoAm(p, eintraege, "2027-01-01")).toBe(3 + 4 - 1.5 + 25);
    expect(feriensaldoAm(p, eintraege, "2027-12-31")).toBe(3 + 4 - 1.5 + 25 - 1);
  });

  it("starts at 0 at the first version without Startsaldo and ignores earlier Ferien", () => {
    const ohne = person({ versionen: [{ ...VOLLZEIT, gueltigAb: "2026-11-01" }] });
    expect(feriensaldoAm(ohne, [eintrag("2026-10-30")], "2026-12-31")).toBe(4);
  });

  it("can become negative", () => {
    const viel = Array.from({ length: 10 }, (_, i) => eintrag(`2026-11-${String(2 + i + Math.floor(i / 5) * 2).padStart(2, "0")}`));
    expect(feriensaldoAm(person({ stichtag: "2026-10-31" }), viel, "2026-12-31")).toBe(4 - 10);
  });
});

describe("ferienJahr", () => {
  it("splits the year into Saldo Vorjahr, Anspruch, bezogen, geplant and Saldo Ende", () => {
    const p = person({ stichtag: "2025-12-31", ferienStartsaldo: 5 });
    const stand = ferienJahr(p, [eintrag("2026-03-02"), eintrag("2026-03-03"), eintrag("2026-12-21")], 2026, "2026-10-27");
    expect(stand).toEqual({ jahr: 2026, vorBeginn: false, saldoVorjahr: 5, anspruch: 25, bezogen: 2, geplant: 1, saldoEnde: 27 });
  });

  it("uses the end balance of the previous year", () => {
    const p = person({ stichtag: "2025-12-31", ferienStartsaldo: 5 });
    expect(ferienJahr(p, [eintrag("2026-03-02")], 2027, "2026-10-27").saldoVorjahr).toBe(29);
  });

  it("marks years before the start", () => {
    expect(ferienJahr(person({ stichtag: "2026-10-31" }), [], 2025, "2026-10-27").vorBeginn).toBe(true);
  });
});

describe("planeFerien", () => {
  it("creates only days with Soll and reports what was skipped", () => {
    // 21.12.2026 (Mo) – 03.01.2027 (So): Weihnachten, Stephanstag (Sa), Neujahr, Berchtoldstag (Sa)
    const plan = planeFerien(person(), "2026-12-21", "2027-01-03", new Set(["2026-12-22"]), false);
    expect(plan.tage).toEqual(["2026-12-21", "2026-12-23", "2026-12-24", "2026-12-28", "2026-12-29", "2026-12-30", "2026-12-31"]);
    expect(plan.ferientage).toBe(7);
    expect(plan.uebersprungen).toEqual({ feiertag: 2, ohneSoll: 4, ohneArbeitsmodell: 0, bereitsFerien: 1 });
  });

  it("respects part-time working days and missing models", () => {
    const teilzeit = person({ versionen: [{ ...VOLLZEIT, gueltigAb: "2026-11-04", pensum: 40, arbeitstage: MO_DI }] });
    const plan = planeFerien(teilzeit, "2026-11-02", "2026-11-10", new Set(), false);
    expect(plan.tage).toEqual(["2026-11-09", "2026-11-10"]);
    expect(plan.uebersprungen.ohneArbeitsmodell).toBe(2);
  });

  it("counts a half day as 0.5", () => {
    expect(planeFerien(person(), "2026-11-02", "2026-11-02", new Set(), true).ferientage).toBe(0.5);
  });
});

describe("ferienZeitraeume", () => {
  it("merges Ferientage across weekends and holidays", () => {
    const eintraege = ["2026-12-21", "2026-12-22", "2026-12-23", "2026-12-24", "2026-12-28", "2027-01-04", "2027-02-01"].map((d) => eintrag(d));
    const z = ferienZeitraeume(person(), eintraege);
    expect(z.map((x) => [x.von, x.bis, x.ferientage])).toEqual([
      ["2026-12-21", "2026-12-28", 5],
      ["2027-01-04", "2027-01-04", 1],
      ["2027-02-01", "2027-02-01", 1],
    ]);
    expect(z[0].eintragIds).toHaveLength(5);
  });

  it("splits at a working day without Ferien", () => {
    const z = ferienZeitraeume(person(), [eintrag("2026-11-02"), eintrag("2026-11-04")]);
    expect(z).toHaveLength(2);
  });
});
