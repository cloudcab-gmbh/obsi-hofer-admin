import { describe, it, expect } from "vitest";
import { berechneZeitnachweis, ladebeginn, type ZeitnachweisEingabe } from "./zeitnachweis";
import type { Arbeitstage, ArbeitsmodellVersion } from "./soll";
import type { Zeiteintrag } from "./tagesauswertung";
import { baueFeiertagskalender } from "./feiertage";

const MO_FR: Arbeitstage = [true, true, true, true, true, false, false];
const VOLLZEIT: ArbeitsmodellVersion = { id: "v1", gueltigAb: "2026-01-01", pensum: 100, arbeitstage: MO_FR };

/** Arbeitszeit-Eintrag in Schweizer Winterzeit (UTC+1), von–bis in Stunden. */
function arbeit(datum: string, von: number, bis: number, extra: Partial<Zeiteintrag> = {}): Zeiteintrag {
  const zeit = (h: number) => `${datum}T${String(h - 1).padStart(2, "0")}:00:00Z`;
  return {
    id: `${datum}-${von}`,
    datum,
    typ: "arbeitszeit",
    kommen: zeit(von),
    gehen: zeit(bis),
    tagestotal: null,
    monatstotal: null,
    mittagessen: false,
    abendessen: false,
    bemerkung: null,
    halberTag: false,
    ...extra,
  };
}

function ferien(datum: string, halberTag = false): Zeiteintrag {
  return { ...arbeit(datum, 0, 0), typ: "ferien", kommen: `${datum}T00:00:00Z`, gehen: null, halberTag };
}

function eingabe(extra: Partial<ZeitnachweisEingabe> = {}): ZeitnachweisEingabe {
  return {
    monat: "2026-11",
    heute: "2026-12-15",
    eintraege: [],
    versionen: [VOLLZEIT],
    austrittAm: null,
    startsaldoStunden: 10,
    stichtag: "2026-10-31",
    ...extra,
  };
}

function tag(z: ReturnType<typeof berechneZeitnachweis>, datum: string) {
  return z.tage.find((t) => t.datum === datum)!;
}

describe("berechneZeitnachweis", () => {
  it("lists every calendar day with Soll from the model and the running balance", () => {
    const z = berechneZeitnachweis(eingabe({ eintraege: [arbeit("2026-11-02", 8, 17)] }));

    expect(z.tage).toHaveLength(30);
    expect(tag(z, "2026-11-02")).toMatchObject({ istMinuten: 540, sollMinuten: 480, abweichungMinuten: 60, saldoMinuten: 660 });
    expect(tag(z, "2026-11-01").grund).toEqual({ art: "frei" }); // Sonntag
    expect(z.saldoVormonatMinuten).toBe(600);
    // 21 Arbeitstage × 8 h Soll, 9 h Ist
    expect(z.summeSollMinuten).toBe(21 * 480);
    expect(z.summeIstMinuten).toBe(540);
    expect(z.saldoEndeMinuten).toBe(600 + 540 - 21 * 480);
  });

  it("sets Soll 0 on holidays and names them", () => {
    const z = berechneZeitnachweis(eingabe({ monat: "2026-05", stichtag: "2026-04-30" }));
    expect(tag(z, "2026-05-14")).toMatchObject({ sollMinuten: 0, grund: { art: "feiertag", name: "Auffahrt" } });
  });

  it("treats Krankheit as fulfilled Soll and Komp. GLZ as a Gleitzeit withdrawal", () => {
    const z = berechneZeitnachweis(
      eingabe({
        eintraege: [
          { ...arbeit("2026-11-02", 8, 9), typ: "krankheit" },
          { ...arbeit("2026-11-03", 8, 9), typ: "komp-glz" },
          { ...arbeit("2026-11-07", 8, 9), typ: "krankheit" }, // Samstag
        ],
      })
    );

    expect(tag(z, "2026-11-02")).toMatchObject({ istMinuten: 480, abweichungMinuten: 0 });
    expect(tag(z, "2026-11-03")).toMatchObject({ istMinuten: 0, abweichungMinuten: -480 });
    expect(tag(z, "2026-11-07")).toMatchObject({ istMinuten: 0, abweichungMinuten: 0 });
  });

  it("keeps the full Soll when Komp. GLZ and work share a day", () => {
    const z = berechneZeitnachweis(
      eingabe({ eintraege: [arbeit("2026-11-02", 8, 12), { ...arbeit("2026-11-02", 13, 14), typ: "komp-glz" }] })
    );
    expect(tag(z, "2026-11-02")).toMatchObject({ istMinuten: 240, sollMinuten: 480, abweichungMinuten: -240 });
  });

  it("counts work on a day without Soll fully", () => {
    const z = berechneZeitnachweis(eingabe({ eintraege: [arbeit("2026-11-07", 8, 10)] }));
    expect(tag(z, "2026-11-07")).toMatchObject({ sollMinuten: 0, abweichungMinuten: 120 });
  });

  it("uses the model valid on each day when it changes mid-month", () => {
    const z = berechneZeitnachweis(
      eingabe({
        versionen: [VOLLZEIT, { id: "v2", gueltigAb: "2026-11-16", pensum: 40, arbeitstage: [true, true, false, false, false, false, false] }],
      })
    );
    expect(tag(z, "2026-11-11").sollMinuten).toBe(480); // Mi, 100 %
    expect(tag(z, "2026-11-18")).toMatchObject({ sollMinuten: 0, grund: { art: "frei" } }); // Mi, 40 % Mo/Di
  });

  it("marks days before the Eintritt and after the Austritt as 'nicht angestellt'", () => {
    const z = berechneZeitnachweis(
      eingabe({
        versionen: [{ ...VOLLZEIT, gueltigAb: "2026-11-09" }],
        austrittAm: "2026-11-20",
        startsaldoStunden: null,
        stichtag: null,
      })
    );
    expect(tag(z, "2026-11-04").grund).toEqual({ art: "nicht-angestellt" });
    expect(tag(z, "2026-11-04").saldoMinuten).toBeNull(); // vor Beginn der Gleitzeit
    expect(tag(z, "2026-11-23").grund).toEqual({ art: "nicht-angestellt" });
    expect(z.beginnGleitzeit).toBe("2026-11-09");
    expect(z.saldoVormonatMinuten).toBe(0);
  });

  it("starts without Startsaldo at the first version with 0; earlier entries are shown but do not count", () => {
    const z = berechneZeitnachweis(
      eingabe({
        versionen: [{ ...VOLLZEIT, gueltigAb: "2026-11-09" }],
        startsaldoStunden: null,
        stichtag: null,
        eintraege: [arbeit("2026-11-02", 8, 12), arbeit("2026-11-09", 8, 16)],
      })
    );
    expect(tag(z, "2026-11-02")).toMatchObject({ vorBeginn: true, saldoMinuten: null, istMinuten: 240 });
    expect(tag(z, "2026-11-09").saldoMinuten).toBe(0);
    expect(z.summeIstMinuten).toBe(480);
  });

  it("carries the balance over several months and a year end", () => {
    const z = berechneZeitnachweis(
      eingabe({
        monat: "2027-01",
        heute: "2027-02-15",
        startsaldoStunden: 0,
        stichtag: "2026-11-30",
        eintraege: [arbeit("2026-12-01", 8, 18)], // +2 h
      })
    );
    // Dezember 2026: 23 Werktage, davon Weihnachten (Fr) Feiertag → 22 Soll-Tage; 1 Tag gearbeitet
    expect(z.saldoVormonatMinuten).toBe(600 - 22 * 480);
    expect(tag(z, "2027-01-01").grund).toEqual({ art: "feiertag", name: "Neujahr" });
  });

  it("flags a month completely before the Stichtag", () => {
    const z = berechneZeitnachweis(eingabe({ monat: "2026-09" }));
    expect(z.vorBeginn).toBe(true);
    expect(z.saldoVormonatMinuten).toBeNull();
    expect(z.saldoEndeMinuten).toBeNull();
  });

  it("does not count days after today in the current month", () => {
    const z = berechneZeitnachweis(eingabe({ heute: "2026-11-03", eintraege: [arbeit("2026-11-02", 8, 16)] }));

    expect(z.laufenderMonat).toBe(true);
    expect(tag(z, "2026-11-04")).toMatchObject({ zukunft: true, istMinuten: null, saldoMinuten: null });
    expect(z.summeSollMinuten).toBe(2 * 480);
    expect(z.saldoEndeMinuten).toBe(600 - 480);
  });

  it("warns about open entries only on past days", () => {
    const offen = (datum: string) => ({ ...arbeit(datum, 8, 9), gehen: null });
    const z = berechneZeitnachweis(eingabe({ heute: "2026-11-03", eintraege: [offen("2026-11-02"), offen("2026-11-03")] }));

    expect(tag(z, "2026-11-02").offenWarnung).toBe(true);
    expect(tag(z, "2026-11-03").offenWarnung).toBe(false);
    expect(z.offeneTage).toBe(1);
  });

  it("compares with the Flow day and month totals", () => {
    const z = berechneZeitnachweis(
      eingabe({
        eintraege: [
          arbeit("2026-11-02", 8, 12, { tagestotal: 240, monatstotal: 240 }),
          arbeit("2026-11-03", 8, 12, { tagestotal: 200, monatstotal: 440 }),
        ],
      })
    );
    expect(tag(z, "2026-11-02").flowAbweichung).toBe(false);
    expect(tag(z, "2026-11-03").flowAbweichung).toBe(true);
    expect(z.flowMonatstotal).toBe(440);
    expect(z.flowMonatsAbweichung).toBe(true);
  });

  it("shows 'kein Arbeitsmodell' without versions, still counting Ist", () => {
    const z = berechneZeitnachweis(
      eingabe({ versionen: [], startsaldoStunden: null, stichtag: null, eintraege: [arbeit("2026-11-02", 8, 12)] })
    );
    expect(z.ohneArbeitsmodell).toBe(true);
    expect(tag(z, "2026-11-02")).toMatchObject({ grund: { art: "kein-arbeitsmodell" }, istMinuten: 240 });
    expect(z.saldoEndeMinuten).toBeNull();
  });

  it("reports months without entries", () => {
    expect(berechneZeitnachweis(eingabe()).keineEintraege).toBe(true);
  });

  it("marks Ferien days with work", () => {
    const z = berechneZeitnachweis(eingabe({ eintraege: [ferien("2026-11-02"), arbeit("2026-11-02", 8, 10)] }));
    expect(tag(z, "2026-11-02")).toMatchObject({ grund: { art: "ferien" }, sollMinuten: 0, ferientag: 1, ferienMitArbeit: true });
  });

  it("halves the Soll on a half Ferientag", () => {
    const z = berechneZeitnachweis(eingabe({ eintraege: [ferien("2026-11-02", true), arbeit("2026-11-02", 13, 17)] }));
    expect(tag(z, "2026-11-02")).toMatchObject({ grund: null, sollMinuten: 240, istMinuten: 240, ferientag: 0.5 });
  });

  it("lets Krankheit win over Ferien and flags Ferien on days without Soll", () => {
    const z = berechneZeitnachweis(
      eingabe({ eintraege: [ferien("2026-11-02"), { ...ferien("2026-11-02"), typ: "krankheit" }, ferien("2026-11-07")] })
    );
    expect(tag(z, "2026-11-02")).toMatchObject({ ferientag: 0, krankheitInFerien: true, istMinuten: 480, abweichungMinuten: 0 });
    expect(tag(z, "2026-11-07")).toMatchObject({ ferientag: 0, ferienOhneSoll: true }); // Samstag
  });

  it("reports Ferien of the month and the Feriensaldo", () => {
    // Stichtag 31.10.2026, Startsaldo 3 Tage; Anspruch 25 bei 100 %, Nov/Dez anteilig = 61/365 × 25 ≈ 4.0
    const z = berechneZeitnachweis(
      eingabe({ heute: "2026-11-03", ferienStartsaldo: 3, eintraege: [ferien("2026-11-02"), ferien("2026-11-04"), ferien("2026-11-05", true)] })
    );
    expect(z.ferienBezogenMonat).toBe(1);
    expect(z.ferienGeplantMonat).toBe(1.5);
    expect(z.feriensaldoEnde).toBe(3 + 4 - 2.5);
  });
});

describe("gepflegte Feiertage (PROJ-18)", () => {
  // 2026 gepflegt: Mo 02.11. halber Feiertag, Di 03.11. ganzer Feiertag
  const feiertage = baueFeiertagskalender(
    new Map([[2026, [{ datum: "2026-11-02", name: "Firmenanlass", halb: true }, { datum: "2026-11-03", name: "Betriebsferientag", halb: false }]]])
  );

  it("halves the Soll on a half holiday and sets it to 0 on a full one", () => {
    const z = berechneZeitnachweis(eingabe({ feiertage }));
    expect(tag(z, "2026-11-02")).toMatchObject({ sollMinuten: 240, halberFeiertag: "Firmenanlass", grund: null });
    expect(tag(z, "2026-11-03")).toMatchObject({ sollMinuten: 0, grund: { art: "feiertag", name: "Betriebsferientag" } });
  });

  it("counts Ferien on a half holiday as 0.5 and leaves no Soll", () => {
    const z = berechneZeitnachweis(eingabe({ feiertage, eintraege: [ferien("2026-11-02")] }));
    expect(tag(z, "2026-11-02")).toMatchObject({ ferientag: 0.5, sollMinuten: 0 });
  });

  it("no longer counts Ferien on a newly maintained full holiday", () => {
    const z = berechneZeitnachweis(eingabe({ feiertage, eintraege: [ferien("2026-11-03")] }));
    expect(tag(z, "2026-11-03")).toMatchObject({ ferientag: 0, ferienOhneSoll: true });
  });

  it("treats Krankheit on a half holiday as fulfilling the halved Soll", () => {
    const z = berechneZeitnachweis(eingabe({ feiertage, eintraege: [{ ...ferien("2026-11-02"), typ: "krankheit" }] }));
    expect(tag(z, "2026-11-02")).toMatchObject({ sollMinuten: 240, istMinuten: 240, abweichungMinuten: 0 });
  });

  it("ignores the suggested holidays in a maintained year", () => {
    const leer = baueFeiertagskalender(new Map([[2026, []]]));
    const z = berechneZeitnachweis(eingabe({ monat: "2026-12", heute: "2027-01-15", stichtag: "2026-11-30", feiertage: leer }));
    expect(tag(z, "2026-12-25")).toMatchObject({ sollMinuten: 480, grund: null });
  });
});

describe("ladebeginn", () => {
  it("loads from the start of the Gleitzeit or the month, whichever is earlier", () => {
    expect(ladebeginn("2027-01", { startsaldoStunden: 5, stichtag: "2026-10-31", versionen: [] })).toBe("2026-11-01");
    expect(ladebeginn("2026-10", { startsaldoStunden: 5, stichtag: "2026-10-31", versionen: [] })).toBe("2026-10-01");
    expect(ladebeginn("2027-01", { startsaldoStunden: null, stichtag: null, versionen: [VOLLZEIT] })).toBe("2026-01-01");
    expect(ladebeginn("2027-01", { startsaldoStunden: null, stichtag: null, versionen: [] })).toBe("2027-01-01");
  });
});
