import { describe, it, expect } from "vitest";
import { berechneUebersichtWerte, uebersichtLadebeginn, type UebersichtPerson } from "./uebersicht";
import { berechneZeitnachweis } from "./zeitnachweis";
import { ferienJahr } from "./ferien";
import type { Zeiteintrag } from "./tagesauswertung";

const VOLLZEIT = { id: "v1", gueltigAb: "2026-01-01", pensum: 100, arbeitstage: [true, true, true, true, true, false, false] as [boolean, boolean, boolean, boolean, boolean, boolean, boolean] };

function person(extra: Partial<UebersichtPerson> = {}): UebersichtPerson {
  return {
    versionen: [VOLLZEIT],
    austrittAm: null,
    startsaldoStunden: 10,
    stichtag: "2026-09-30",
    ferienanspruch: null,
    ferienStartsaldo: 2,
    ...extra,
  };
}

function eintrag(datum: string, typ: Zeiteintrag["typ"], von = 7, bis = 16): Zeiteintrag {
  // November: Schweizer Zeit = UTC + 1 h; Oktober (bis 24.10.) UTC + 2 h — für die Tests egal, gerechnet wird die Dauer.
  return {
    id: `${typ}-${datum}-${von}`,
    datum,
    typ,
    kommen: `${datum}T${String(von).padStart(2, "0")}:00:00Z`,
    gehen: typ === "arbeitszeit" ? `${datum}T${String(bis).padStart(2, "0")}:00:00Z` : null,
    tagestotal: null,
    monatstotal: null,
    mittagessen: false,
    abendessen: false,
    bemerkung: null,
    halberTag: false,
  };
}

describe("berechneUebersichtWerte", () => {
  const eintraege = [
    eintrag("2026-10-05", "arbeitszeit"),
    eintrag("2026-11-02", "arbeitszeit"),
    eintrag("2026-11-03", "krankheit"),
    eintrag("2026-11-03", "krankheit", 8),
    eintrag("2026-10-07", "krankheit"),
    eintrag("2026-11-04", "komp-glz"),
    eintrag("2026-11-05", "ferien"),
    eintrag("2026-12-21", "ferien"),
  ];

  it("matches the Zeitnachweis and the Ferien figures", () => {
    const w = berechneUebersichtWerte(person(), eintraege, "2026-11", "2026-11-20");
    const z = berechneZeitnachweis({ ...person(), monat: "2026-11", heute: "2026-11-20", eintraege });
    expect(w.gleitzeitMinuten).toBe(z.saldoEndeMinuten);
    expect(w.veraenderungMinuten).toBe(z.saldoEndeMinuten! - z.saldoVormonatMinuten!);
    expect([w.istMinuten, w.sollMinuten, w.abweichungMinuten]).toEqual([z.summeIstMinuten, z.summeSollMinuten, z.abweichungMinuten]);
    expect(w.feriensaldo).toBe(z.feriensaldoEnde);
    const f = ferienJahr(person(), eintraege, 2026, "2026-11-20");
    expect([w.ferienBezogen, w.ferienGeplant]).toEqual([f.bezogen, f.geplant]);
    expect([w.ferienBezogen, w.ferienGeplant]).toEqual([1, 1]);
    expect(w.ferienSaldoJahresende).toBe(f.saldoEnde);
  });

  it("adds up bezogen + geplant + Rest to the available days (QA BUG-1)", () => {
    const p = person({ stichtag: "2025-12-31", ferienStartsaldo: 0, ferienanspruch: 25 });
    const w = berechneUebersichtWerte(p, [eintrag("2026-03-02", "ferien"), eintrag("2026-12-21", "ferien")], "2026-10", "2026-10-27");
    expect(w.ferienBezogen + w.ferienGeplant + w.ferienSaldoJahresende!).toBe(25);
    expect(w.feriensaldo).toBe(24); // Tabelle: Saldo am Monatsende
  });

  it("counts calendar days with Krankheit and Komp. GLZ per month and year (a day once)", () => {
    const w = berechneUebersichtWerte(person(), eintraege, "2026-11", "2026-11-20");
    expect([w.krankheitMonat, w.krankheitJahr, w.kompGlzMonat, w.kompGlzJahr]).toEqual([1, 2, 1, 1]);
  });

  it("flags warnings", () => {
    const offen = { ...eintrag("2026-11-02", "arbeitszeit"), gehen: null };
    const w = berechneUebersichtWerte(person({ ferienStartsaldo: -10, startsaldoStunden: 100 }), [offen], "2026-11", "2026-11-20");
    expect(w.warnungen).toEqual({ keinArbeitsmodell: false, offeneEintraege: true, ferienNegativ: true, gleitzeitAusserhalb: true });
  });

  it("has no Gleitzeit without an Arbeitsmodell and flags it", () => {
    const w = berechneUebersichtWerte(person({ versionen: [], startsaldoStunden: null, stichtag: null, ferienStartsaldo: null }), [], "2026-11", "2026-11-20");
    expect(w.gleitzeitMinuten).toBeNull();
    expect(w.veraenderungMinuten).toBeNull();
    expect(w.warnungen.keinArbeitsmodell).toBe(true);
  });

  it("marks persons who have left", () => {
    expect(berechneUebersichtWerte(person({ austrittAm: "2026-10-31" }), [], "2026-11", "2026-11-20").ausgetreten).toBe(true);
  });
});

describe("uebersichtLadebeginn", () => {
  it("loads from the start of the balances or 1 January, whichever is earlier", () => {
    expect(uebersichtLadebeginn("2026-11", person())).toBe("2026-01-01");
    expect(uebersichtLadebeginn("2026-11", person({ stichtag: "2025-06-30" }))).toBe("2025-07-01");
  });
});
