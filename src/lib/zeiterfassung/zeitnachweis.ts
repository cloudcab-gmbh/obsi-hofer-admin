import { folgetag, tageDesMonats } from "./datum";
import { feiertagAm } from "./feiertage";
import { gueltigeVersion, sollAmDatum, type ArbeitsmodellVersion } from "./soll";
import { werteTagAus, type Tagesauswertung, type Zeiteintrag } from "./tagesauswertung";
import { ferienBeginn, feriensaldoAm, ferientagWert } from "./ferien";

// PROJ-13: Zeitnachweis einer Person für einen Monat (rein, ohne Datenzugriff).
// Gerechnet wird in ganzen Minuten vom Beginn der Gleitzeit bis Monatsende,
// damit der Saldo Vormonat nicht davon abhängt, ob Vormonate geöffnet wurden.

/** Warum ein Tag kein (volles) Soll hat bzw. wie er zählt. */
export type Tagesgrund =
  | { art: "feiertag"; name: string }
  | { art: "ferien" }
  | { art: "frei" }
  | { art: "kein-arbeitsmodell" }
  | { art: "nicht-angestellt" };

export interface Tageszeile {
  datum: string;
  grund: Tagesgrund | null;
  auswertung: Tagesauswertung;
  /** Tag liegt nach heute: zählt weder Soll noch Ist. */
  zukunft: boolean;
  /** Tag liegt vor dem Beginn der Gleitzeit: angezeigt, zählt nicht zur Gleitzeit. */
  vorBeginn: boolean;
  /** Gezählte Werte in Minuten; `null` = zählt nicht (Zukunft). */
  istMinuten: number | null;
  sollMinuten: number | null;
  abweichungMinuten: number | null;
  /** Gleitzeit nach diesem Tag; `null` vor dem Beginn bzw. in der Zukunft. */
  saldoMinuten: number | null;
  /** Ist laut Flow weicht um mehr als eine Minute ab (nur vergangene Tage mit Arbeitszeit). */
  flowAbweichung: boolean;
  /** "offen – Gehen fehlt" als Warnung (vergangener Tag). */
  offenWarnung: boolean;
  /** Ferientag und Arbeitszeit am selben Tag. */
  ferienMitArbeit: boolean;
  /** PROJ-15: gezählter Ferientag (0, 0.5 oder 1). */
  ferientag: number;
  /** Ferien-Eintrag an einem Tag ohne Soll bzw. an einem Feiertag (zählt nicht). */
  ferienOhneSoll: boolean;
  /** Krankheit während der Ferien: Krankheit überwiegt. */
  krankheitInFerien: boolean;
}

export interface ZeitnachweisEingabe {
  monat: string;
  heute: string;
  eintraege: readonly Zeiteintrag[];
  versionen: readonly ArbeitsmodellVersion[];
  austrittAm: string | null;
  startsaldoStunden: number | null;
  stichtag: string | null;
  /** PROJ-15: Ferienanspruch (Tage/Jahr bei 100 %, null = Vorgabe) und Ferien-Startsaldo. */
  ferienanspruch?: number | null;
  ferienStartsaldo?: number | null;
}

export interface Zeitnachweis {
  monat: string;
  tage: Tageszeile[];
  /** Erster Tag, der zur Gleitzeit zählt; `null` = keine Gleitzeit (kein Startsaldo, kein Arbeitsmodell). */
  beginnGleitzeit: string | null;
  /** Wie die Gleitzeit beginnt (für die Beschriftung). */
  beginnArt: "startsaldo" | "arbeitsmodell" | null;
  /** Monat liegt vollständig vor dem Beginn der Gleitzeit. */
  vorBeginn: boolean;
  /** Gleitzeit am Ende des Vormonats (bzw. Startwert, wenn sie in diesem Monat beginnt). */
  saldoVormonatMinuten: number | null;
  summeIstMinuten: number;
  summeSollMinuten: number;
  abweichungMinuten: number;
  saldoEndeMinuten: number | null;
  /** Laufender Monat: Saldo ist "Stand heute". */
  laufenderMonat: boolean;
  keineEintraege: boolean;
  /** Tage ohne Arbeitsmodell (Person hat gar keine Version). */
  ohneArbeitsmodell: boolean;
  offeneTage: number;
  /** Einträge ohne Gehen an vergangenen Tagen (zum Nachtragen). */
  offeneEintraege: { eintragId: string; datum: string; kommen: string }[];
  /** Höchstes Monatstotal des Flows und eigene Summe der Arbeitszeit, für den Abgleich. */
  flowMonatstotal: number | null;
  arbeitszeitMonatMinuten: number;
  flowMonatsAbweichung: boolean;
  /** PROJ-15: Ferientage im Monat bis heute bzw. ab morgen (ab Beginn des Feriensaldos). */
  ferienBezogenMonat: number;
  ferienGeplantMonat: number;
  /** Feriensaldo am Monatsende inkl. geplanter Ferien des Monats;  vor dem Beginn. */
  feriensaldoEnde: number | null;
}

function stundenZuMinuten(stunden: number): number {
  return Math.round(stunden * 60);
}

function gruppiereNachTag(eintraege: readonly Zeiteintrag[]): Map<string, Zeiteintrag[]> {
  const tage = new Map<string, Zeiteintrag[]>();
  for (const e of eintraege) tage.set(e.datum, [...(tage.get(e.datum) ?? []), e]);
  return tage;
}

function bestimmeBeginn(e: ZeitnachweisEingabe): { tag: string | null; startMinuten: number; art: Zeitnachweis["beginnArt"] } {
  if (e.startsaldoStunden !== null && e.stichtag) {
    return { tag: folgetag(e.stichtag), startMinuten: stundenZuMinuten(e.startsaldoStunden), art: "startsaldo" };
  }
  const erste = [...e.versionen].sort((a, b) => a.gueltigAb.localeCompare(b.gueltigAb))[0];
  // Nutzer-Entscheidung 2026-10-27: ohne Startsaldo ab der ersten Version mit 0.
  return erste ? { tag: erste.gueltigAb, startMinuten: 0, art: "arbeitsmodell" } : { tag: null, startMinuten: 0, art: null };
}

function zeile(datum: string, eintraege: Zeiteintrag[], e: ZeitnachweisEingabe, beginn: string | null): Omit<Tageszeile, "saldoMinuten"> {
  const auswertung = werteTagAus(eintraege);
  const zukunft = datum > e.heute;
  const vorBeginn = beginn === null || datum < beginn;
  const feiertag = feiertagAm(datum);
  const ferientag = ferientagWert(e, datum, eintraege);
  const version = gueltigeVersion(e.versionen, datum);
  const nachAustritt = !!e.austrittAm && datum > e.austrittAm;

  const sollLautModell = sollAmDatum({ versionen: e.versionen, austrittAm: e.austrittAm }, datum);

  let grund: Tagesgrund | null = null;
  if (e.versionen.length === 0) grund = { art: "kein-arbeitsmodell" };
  else if (!version || nachAustritt) grund = { art: "nicht-angestellt" };
  else if (feiertag) grund = { art: "feiertag", name: feiertag };
  else if (ferientag === 1) grund = { art: "ferien" };
  else if (sollLautModell === 0) grund = { art: "frei" };

  // Halber Ferientag: halbes Soll, die andere Hälfte wird gestempelt.
  const sollMinuten = grund !== null ? 0 : stundenZuMinuten(ferientag === 0.5 ? sollLautModell / 2 : sollLautModell);
  // Krankheit: Soll gilt als erfüllt. Komp. GLZ: kein zusätzliches Ist, Soll bleibt.
  const istMinuten = auswertung.krankheit ? Math.max(sollMinuten, auswertung.arbeitszeitMinuten) : auswertung.arbeitszeitMinuten;

  const flowAbweichung =
    datum < e.heute &&
    auswertung.hatArbeitszeit &&
    auswertung.flowTagestotal !== null &&
    Math.abs(auswertung.flowTagestotal - auswertung.arbeitszeitMinuten) > 1;

  return {
    datum,
    grund,
    auswertung,
    zukunft,
    vorBeginn,
    istMinuten: zukunft ? null : istMinuten,
    sollMinuten: zukunft ? null : sollMinuten,
    abweichungMinuten: zukunft ? null : istMinuten - sollMinuten,
    flowAbweichung,
    offenWarnung: auswertung.offen && datum < e.heute,
    ferienMitArbeit: ferientag === 1 && auswertung.hatArbeitszeit,
    ferientag,
    ferienOhneSoll: auswertung.ferien !== null && ferientag === 0 && !auswertung.krankheit,
    krankheitInFerien: auswertung.ferien !== null && auswertung.krankheit,
  };
}

export function berechneZeitnachweis(e: ZeitnachweisEingabe): Zeitnachweis {
  const tageImMonat = tageDesMonats(e.monat);
  const monatsbeginn = tageImMonat[0];
  const nachTag = gruppiereNachTag(e.eintraege);
  const beginn = bestimmeBeginn(e);

  // Gleitzeit vom Beginn bis zum Vortag des Monats aufsummieren (Saldo Vormonat).
  let saldo: number | null = null;
  if (beginn.tag !== null && beginn.tag < monatsbeginn) {
    saldo = beginn.startMinuten;
    for (let tag = beginn.tag; tag < monatsbeginn && tag <= e.heute; tag = folgetag(tag)) {
      const z = zeile(tag, nachTag.get(tag) ?? [], e, beginn.tag);
      saldo += z.abweichungMinuten ?? 0;
    }
  }
  const saldoVormonat = beginn.tag !== null && beginn.tag <= tageImMonat.at(-1)! ? (saldo ?? beginn.startMinuten) : null;

  const tage: Tageszeile[] = [];
  let summeIst = 0;
  let summeSoll = 0;
  let laufend = saldo;
  for (const tag of tageImMonat) {
    const z = zeile(tag, nachTag.get(tag) ?? [], e, beginn.tag);
    if (beginn.tag !== null && tag === beginn.tag) laufend = beginn.startMinuten;
    const zaehlt = !z.vorBeginn && !z.zukunft;
    if (zaehlt) {
      summeIst += z.istMinuten ?? 0;
      summeSoll += z.sollMinuten ?? 0;
      laufend = (laufend ?? 0) + (z.abweichungMinuten ?? 0);
    }
    tage.push({ ...z, saldoMinuten: zaehlt ? laufend : null });
  }

  const flowWerte = e.eintraege
    .filter((x) => x.datum.startsWith(e.monat))
    .map((x) => x.monatstotal)
    .filter((t): t is number => t !== null);
  const flowMonatstotal = flowWerte.length > 0 ? Math.max(...flowWerte) : null;
  const arbeitszeitMonat = tage.filter((t) => !t.zukunft).reduce((s, t) => s + t.auswertung.arbeitszeitMinuten, 0);

  const ferienPerson = { ...e, ferienanspruch: e.ferienanspruch ?? null, ferienStartsaldo: e.ferienStartsaldo ?? null };
  const ferienAb = ferienBeginn(ferienPerson);
  const zaehltFerien = (t: Tageszeile) => ferienAb !== null && t.datum >= ferienAb;
  const laufenderMonat = e.heute.startsWith(e.monat);
  const vorBeginn = beginn.tag === null || beginn.tag > tageImMonat.at(-1)!;
  return {
    monat: e.monat,
    tage,
    beginnGleitzeit: beginn.tag,
    beginnArt: beginn.art,
    vorBeginn,
    saldoVormonatMinuten: saldoVormonat,
    summeIstMinuten: summeIst,
    summeSollMinuten: summeSoll,
    abweichungMinuten: summeIst - summeSoll,
    saldoEndeMinuten: vorBeginn ? null : laufend,
    laufenderMonat,
    keineEintraege: !e.eintraege.some((x) => x.datum.startsWith(e.monat)),
    ohneArbeitsmodell: e.versionen.length === 0,
    offeneTage: tage.filter((t) => t.offenWarnung).length,
    offeneEintraege: tage
      .filter((t) => t.offenWarnung)
      .flatMap((t) => t.auswertung.paare.filter((p) => p.gehen === null).map((p) => ({ eintragId: p.eintragId, datum: t.datum, kommen: p.kommen }))),
    flowMonatstotal,
    arbeitszeitMonatMinuten: arbeitszeitMonat,
    flowMonatsAbweichung: flowMonatstotal !== null && Math.abs(flowMonatstotal - arbeitszeitMonat) > 1,
    ferienBezogenMonat: tage.filter((t) => zaehltFerien(t) && !t.zukunft).reduce((s, t) => s + t.ferientag, 0),
    ferienGeplantMonat: tage.filter((t) => zaehltFerien(t) && t.zukunft).reduce((s, t) => s + t.ferientag, 0),
    feriensaldoEnde: feriensaldoAm(ferienPerson, e.eintraege, tageImMonat.at(-1)!),
  };
}

/** Erster Tag, ab dem Einträge geladen werden müssen (Beginn von Gleitzeit bzw. Feriensaldo, sonst Monatsbeginn). */
export function ladebeginn(
  monat: string,
  person: { startsaldoStunden: number | null; stichtag: string | null; versionen: readonly ArbeitsmodellVersion[] }
): string {
  const monatsbeginn = `${monat}-01`;
  const { tag } = bestimmeBeginn({ ...person, monat, heute: monatsbeginn, eintraege: [], austrittAm: null });
  const ferien = ferienBeginn({ ...person, austrittAm: null, ferienanspruch: null, ferienStartsaldo: null });
  return [tag, ferien, monatsbeginn].filter((t): t is string => t !== null).sort()[0];
}
