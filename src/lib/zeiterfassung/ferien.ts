import { folgetag } from "./datum";
import { VORSCHLAGS_KALENDER, type Feiertag, type Feiertagskalender } from "./feiertage";
import { gueltigeVersion, sollAmDatum, type ArbeitsmodellVersion } from "./soll";
import type { Zeiteintrag } from "./tagesauswertung";

// PROJ-15: Ferien-Regeln (rein, ohne Datenzugriff). Ferien zählen in
// Arbeitstagen der Person; ein Ferientag ist ein Tag mit Soll laut
// Arbeitsmodell, kein Feiertag und ohne Krankheit.

/** Ferienanspruch pro Jahr bei 100 %, wenn an der Person nichts erfasst ist. */
export const STANDARD_FERIENANSPRUCH = 25;

export interface FerienModell {
  versionen: readonly ArbeitsmodellVersion[];
  austrittAm: string | null;
  /** PROJ-18: gepflegte Feiertage; ohne Angabe der Vorschlag. */
  feiertage?: Feiertagskalender;
}

export interface FerienPerson extends FerienModell {
  /** Tage pro Jahr bei 100 %; `null` = Vorgabe 25. */
  ferienanspruch: number | null;
  ferienStartsaldo: number | null;
  /** Gemeinsamer Stichtag von Gleitzeit- und Ferien-Startsaldo (PROJ-14). */
  stichtag: string | null;
}

function aufHalbeTage(wert: number): number {
  return Math.round(wert * 2) / 2;
}

function hatSoll(modell: FerienModell, datum: string): boolean {
  return sollAmDatum(modell, datum) > 0;
}

function feiertag(modell: FerienModell, datum: string): Feiertag | null {
  return (modell.feiertage ?? VORSCHLAGS_KALENDER).am(datum);
}

/** Ganzer Feiertag (Soll 0); ein halber Feiertag lässt Raum für einen halben Ferientag. */
function ganzerFeiertag(modell: FerienModell, datum: string): boolean {
  const f = feiertag(modell, datum);
  return !!f && !f.halb;
}

/** Wert eines Tages als Ferientag: 0, 0.5 oder 1. */
export function ferientagWert(modell: FerienModell, datum: string, eintraegeDesTages: readonly Zeiteintrag[]): number {
  const ferien = eintraegeDesTages.filter((e) => e.typ === "ferien");
  if (ferien.length === 0) return 0;
  // Krankheit überwiegt (Product Decision); Feiertage und Tage ohne Soll sind keine Ferientage.
  if (eintraegeDesTages.some((e) => e.typ === "krankheit")) return 0;
  if (ganzerFeiertag(modell, datum) || !hatSoll(modell, datum)) return 0;
  const wert = ferien.some((e) => !e.halberTag) ? 1 : 0.5;
  // PROJ-18: an einem halben Feiertag zählt Ferien höchstens 0.5.
  return feiertag(modell, datum)?.halb ? Math.min(wert, 0.5) : wert;
}

/** Beginn des Feriensaldos: Tag nach dem Stichtag, sonst erste Arbeitsmodell-Version. */
export function ferienBeginn(person: FerienPerson): string | null {
  if (person.stichtag) return folgetag(person.stichtag);
  return [...person.versionen].sort((a, b) => a.gueltigAb.localeCompare(b.gueltigAb))[0]?.gueltigAb ?? null;
}

/**
 * Anspruch eines Jahres ab `ab` (Beginn bzw. 1. Januar): Anspruch × Pensum,
 * anteilig nach Kalendertagen mit gültigem Arbeitsmodell, auf halbe Tage gerundet.
 */
export function anspruchImJahr(person: FerienPerson, jahr: number, ab: string): number {
  const anspruch = person.ferienanspruch ?? STANDARD_FERIENANSPRUCH;
  const tageImJahr = (Date.UTC(jahr + 1, 0, 1) - Date.UTC(jahr, 0, 1)) / 86_400_000;
  let summe = 0;
  for (let tag = `${jahr}-01-01`; tag.startsWith(String(jahr)); tag = folgetag(tag)) {
    if (tag < ab || (person.austrittAm && tag > person.austrittAm)) continue;
    const version = gueltigeVersion(person.versionen, tag);
    if (version) summe += (anspruch * version.pensum) / 100 / tageImJahr;
  }
  return aufHalbeTage(summe);
}

function gruppiereNachTag(eintraege: readonly Zeiteintrag[]): Map<string, Zeiteintrag[]> {
  const tage = new Map<string, Zeiteintrag[]>();
  for (const e of eintraege) tage.set(e.datum, [...(tage.get(e.datum) ?? []), e]);
  return tage;
}

/** Ferientage zwischen `von` und `bis` (inklusive), ab dem Beginn. */
function ferientageZwischen(person: FerienPerson, nachTag: Map<string, Zeiteintrag[]>, von: string, bis: string): number {
  let summe = 0;
  for (const [tag, eintraege] of nachTag) {
    if (tag >= von && tag <= bis) summe += ferientagWert(person, tag, eintraege);
  }
  return summe;
}

/**
 * Feriensaldo am Ende von `datum`: Startsaldo + Ansprüche (am 1. Januar ganz
 * gutgeschrieben, im Jahr des Beginns ab dem Beginn) − Ferientage bis `datum`.
 * `null`, wenn der Saldo erst später beginnt.
 */
export function feriensaldoAm(person: FerienPerson, eintraege: readonly Zeiteintrag[], datum: string): number | null {
  const beginn = ferienBeginn(person);
  if (!beginn || datum < beginn) return null;
  const startjahr = Number(beginn.slice(0, 4));
  let saldo = person.ferienStartsaldo ?? 0;
  for (let jahr = startjahr; jahr <= Number(datum.slice(0, 4)); jahr++) {
    saldo += anspruchImJahr(person, jahr, jahr === startjahr ? beginn : `${jahr}-01-01`);
  }
  return saldo - ferientageZwischen(person, gruppiereNachTag(eintraege), beginn, datum);
}

export interface FerienJahr {
  jahr: number;
  /** Jahr liegt vor dem Beginn des Feriensaldos. */
  vorBeginn: boolean;
  /** Saldo vor der Gutschrift des Jahres (Vorjahr bzw. Startsaldo im Beginnjahr). */
  saldoVorjahr: number | null;
  anspruch: number;
  /** Ferientage bis und mit heute bzw. ab morgen. */
  bezogen: number;
  geplant: number;
  saldoEnde: number | null;
}

export function ferienJahr(person: FerienPerson, eintraege: readonly Zeiteintrag[], jahr: number, heute: string): FerienJahr {
  const beginn = ferienBeginn(person);
  const jahresende = `${jahr}-12-31`;
  if (!beginn || beginn > jahresende) {
    return { jahr, vorBeginn: true, saldoVorjahr: null, anspruch: 0, bezogen: 0, geplant: 0, saldoEnde: null };
  }
  const jahresbeginn = `${jahr}-01-01`;
  const ab = beginn > jahresbeginn ? beginn : jahresbeginn;
  // Beginnt der Saldo in diesem Jahr (auch am 1. Januar), ist der Startsaldo der Vortrag.
  const saldoVorjahr = beginn >= jahresbeginn ? (person.ferienStartsaldo ?? 0) : feriensaldoAm(person, eintraege, `${jahr - 1}-12-31`);
  const anspruch = anspruchImJahr(person, jahr, ab);
  const nachTag = gruppiereNachTag(eintraege);
  const bezogen = heute >= ab ? ferientageZwischen(person, nachTag, ab, heute < jahresende ? heute : jahresende) : 0;
  const geplant = ferientageZwischen(person, nachTag, heute >= ab ? folgetag(heute) : ab, jahresende);
  return {
    jahr,
    vorBeginn: false,
    saldoVorjahr,
    anspruch,
    bezogen,
    geplant,
    saldoEnde: (saldoVorjahr ?? 0) + anspruch - bezogen - geplant,
  };
}

/** Bestehende Ferien eines Tages (für Vorschau und Umstellen ganz ↔ halb). */
export interface BestehendeFerien {
  eintragIds: string[];
  halberTag: boolean;
}

export interface FerienPlan {
  /** Tage, für die ein Ferien-Eintrag angelegt wird. */
  tage: string[];
  /** QA BUG-1: bestehende Ferientage, die auf ganz bzw. halb umgestellt werden. */
  umstellen: { datum: string; eintragIds: string[] }[];
  /** Ferientage der angelegten und umgestellten Tage (halber Tag = 0.5). */
  ferientage: number;
  uebersprungen: { feiertag: number; ohneSoll: number; ohneArbeitsmodell: number; bereitsFerien: number };
}

/**
 * Ferien-Einträge nach Tag (mehrere Einträge eines Tages zusammengefasst; ein
 * ganzer überwiegt einen halben).
 */
export function bestehendeFerienNachTag(eintraege: readonly Zeiteintrag[]): Map<string, BestehendeFerien> {
  const nachTag = new Map<string, BestehendeFerien>();
  for (const e of eintraege) {
    if (e.typ !== "ferien") continue;
    const bisher = nachTag.get(e.datum);
    nachTag.set(e.datum, {
      eintragIds: [...(bisher?.eintragIds ?? []), e.id],
      halberTag: (bisher?.halberTag ?? true) && e.halberTag,
    });
  }
  return nachTag;
}

/** Welche Tage eines Zeitraums Ferientage werden (Vorschau = Speichern). */
export function planeFerien(
  modell: FerienModell,
  von: string,
  bis: string,
  bestehendeFerien: ReadonlyMap<string, BestehendeFerien>,
  halberTag: boolean
): FerienPlan {
  const plan: FerienPlan = { tage: [], umstellen: [], ferientage: 0, uebersprungen: { feiertag: 0, ohneSoll: 0, ohneArbeitsmodell: 0, bereitsFerien: 0 } };
  for (let tag = von; tag <= bis; tag = folgetag(tag)) {
    const ohneModell = !gueltigeVersion(modell.versionen, tag) || (!!modell.austrittAm && tag > modell.austrittAm);
    if (ohneModell) plan.uebersprungen.ohneArbeitsmodell++;
    else if (!hatSoll(modell, tag)) plan.uebersprungen.ohneSoll++;
    else if (ganzerFeiertag(modell, tag)) plan.uebersprungen.feiertag++;
    else {
      const bestehend = bestehendeFerien.get(tag);
      if (!bestehend) plan.tage.push(tag);
      else if (bestehend.halberTag === halberTag) plan.uebersprungen.bereitsFerien++;
      else plan.umstellen.push({ datum: tag, eintragIds: bestehend.eintragIds });
    }
  }
  // An halben Feiertagen zählt ein Ferientag höchstens 0.5 (PROJ-18).
  const wert = (tag: string) => (halberTag || feiertag(modell, tag)?.halb ? 0.5 : 1);
  plan.ferientage = [...plan.tage, ...plan.umstellen.map((u) => u.datum)].reduce((summe, tag) => summe + wert(tag), 0);
  return plan;
}

export interface FerienZeitraum {
  von: string;
  bis: string;
  ferientage: number;
  eintragIds: string[];
}

/**
 * Fasst Ferien-Einträge zu Zeiträumen zusammen: aufeinanderfolgende Ferientage
 * gehören zusammen, auch wenn dazwischen nur Tage ohne Soll oder Feiertage liegen.
 */
export function ferienZeitraeume(modell: FerienModell, eintraege: readonly Zeiteintrag[]): FerienZeitraum[] {
  const nachTag = gruppiereNachTag(eintraege.filter((e) => e.typ === "ferien" || e.typ === "krankheit"));
  const ferienTage = [...nachTag.keys()].filter((t) => nachTag.get(t)!.some((e) => e.typ === "ferien")).sort();
  const zeitraeume: FerienZeitraum[] = [];
  for (const tag of ferienTage) {
    const ids = nachTag.get(tag)!.filter((e) => e.typ === "ferien").map((e) => e.id);
    const wert = ferientagWert(modell, tag, nachTag.get(tag)!);
    const letzter = zeitraeume.at(-1);
    let anschliessend = false;
    if (letzter) {
      anschliessend = true;
      for (let t = folgetag(letzter.bis); t < tag; t = folgetag(t)) {
        if (hatSoll(modell, t) && !ganzerFeiertag(modell, t)) {
          anschliessend = false;
          break;
        }
      }
    }
    if (letzter && anschliessend) {
      letzter.bis = tag;
      letzter.ferientage += wert;
      letzter.eintragIds.push(...ids);
    } else {
      zeitraeume.push({ von: tag, bis: tag, ferientage: wert, eintragIds: ids });
    }
  }
  return zeitraeume;
}

/** QA BUG-2: Zeiträume, die ein Jahr berühren — ein Zeitraum über den Jahreswechsel bleibt ganz. */
export function ferienZeitraeumeImJahr(modell: FerienModell, eintraege: readonly Zeiteintrag[], jahr: number): FerienZeitraum[] {
  return ferienZeitraeume(modell, eintraege).filter((z) => z.bis >= `${jahr}-01-01` && z.von <= `${jahr}-12-31`);
}
