import { tageDesMonats } from "./datum";
import { ferienJahr } from "./ferien";
import type { ArbeitsmodellVersion } from "./soll";
import type { Zeiteintrag } from "./tagesauswertung";
import { berechneZeitnachweis, ladebeginn } from "./zeitnachweis";

// PROJ-17: eine Zeile der Übersicht pro Person. Rechnet nichts neu, sondern
// nutzt Zeitnachweis (PROJ-13) und Ferienstand (PROJ-15) — so stimmen die
// Zahlen mit diesen Seiten überein.

/** Gleitzeit über +40 h bzw. unter −40 h wird hervorgehoben (Open Question: Schwelle). */
export const GLEITZEIT_SCHWELLE_MINUTEN = 40 * 60;

export interface UebersichtPerson {
  versionen: readonly ArbeitsmodellVersion[];
  austrittAm: string | null;
  startsaldoStunden: number | null;
  stichtag: string | null;
  ferienanspruch: number | null;
  ferienStartsaldo: number | null;
}

export interface UebersichtWerte {
  /** Gleitzeit am Monatsende bzw. heute; `null` ohne Gleitzeit (vor Beginn, kein Arbeitsmodell). */
  gleitzeitMinuten: number | null;
  /** Veränderung im Monat (Ende − Vormonat); `null`, wenn eines fehlt. */
  veraenderungMinuten: number | null;
  istMinuten: number;
  sollMinuten: number;
  abweichungMinuten: number;
  offeneTage: number;
  krankheitMonat: number;
  krankheitJahr: number;
  kompGlzMonat: number;
  kompGlzJahr: number;
  /** Feriensaldo am Monatsende; `null` vor dem Beginn. */
  feriensaldo: number | null;
  ferienBezogen: number;
  ferienGeplant: number;
  ausgetreten: boolean;
  warnungen: {
    keinArbeitsmodell: boolean;
    offeneEintraege: boolean;
    ferienNegativ: boolean;
    gleitzeitAusserhalb: boolean;
  };
}

/** Erster Tag, ab dem die Einträge einer Person geladen werden: Beginn bzw. 1. Januar des Jahres. */
export function uebersichtLadebeginn(monat: string, person: UebersichtPerson): string {
  const jahresbeginn = `${monat.slice(0, 4)}-01-01`;
  const beginn = ladebeginn(monat, person);
  return beginn < jahresbeginn ? beginn : jahresbeginn;
}

/** Anzahl Kalendertage zwischen `von` und `bis` mit mindestens einem Eintrag des Typs. */
function tageMitTyp(eintraege: readonly Zeiteintrag[], typ: Zeiteintrag["typ"], von: string, bis: string): number {
  return new Set(eintraege.filter((e) => e.typ === typ && e.datum >= von && e.datum <= bis).map((e) => e.datum)).size;
}

export function berechneUebersichtWerte(
  person: UebersichtPerson,
  eintraege: readonly Zeiteintrag[],
  monat: string,
  heute: string
): UebersichtWerte {
  const z = berechneZeitnachweis({ ...person, monat, heute, eintraege });
  const jahr = Number(monat.slice(0, 4));
  const ferien = ferienJahr(person, eintraege, jahr, heute);
  const monatsende = tageDesMonats(monat).at(-1)!;
  const monatsbeginn = `${monat}-01`;
  const jahresbeginn = `${jahr}-01-01`;

  const gleitzeit = z.saldoEndeMinuten;
  return {
    gleitzeitMinuten: gleitzeit,
    veraenderungMinuten: gleitzeit !== null && z.saldoVormonatMinuten !== null ? gleitzeit - z.saldoVormonatMinuten : null,
    istMinuten: z.summeIstMinuten,
    sollMinuten: z.summeSollMinuten,
    abweichungMinuten: z.abweichungMinuten,
    offeneTage: z.offeneTage,
    krankheitMonat: tageMitTyp(eintraege, "krankheit", monatsbeginn, monatsende),
    krankheitJahr: tageMitTyp(eintraege, "krankheit", jahresbeginn, monatsende),
    kompGlzMonat: tageMitTyp(eintraege, "komp-glz", monatsbeginn, monatsende),
    kompGlzJahr: tageMitTyp(eintraege, "komp-glz", jahresbeginn, monatsende),
    feriensaldo: z.feriensaldoEnde,
    ferienBezogen: ferien.bezogen,
    ferienGeplant: ferien.geplant,
    ausgetreten: !!person.austrittAm && person.austrittAm < heute,
    warnungen: {
      keinArbeitsmodell: person.versionen.length === 0,
      offeneEintraege: z.offeneTage > 0,
      ferienNegativ: z.feriensaldoEnde !== null && z.feriensaldoEnde < 0,
      gleitzeitAusserhalb: gleitzeit !== null && Math.abs(gleitzeit) > GLEITZEIT_SCHWELLE_MINUTEN,
    },
  };
}
