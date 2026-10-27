import { dataverseFetch } from "./client";
import { createRecord, deleteRecord, getRecord, listAllRecords, listRecords, updateRecord, upsertRecordByKey } from "./records";
import { alsSchweizerMitternacht, folgetag, formatKalenderdatum, zuSchweizerDatum, zuSchweizerUhrzeit } from "@/lib/zeiterfassung/datum";
import type { Arbeitstage, ArbeitsmodellVersion } from "@/lib/zeiterfassung/soll";
import type { Eintragstyp, Zeiteintrag } from "@/lib/zeiterfassung/tagesauswertung";

// PROJ-14: Tabellen "Zeiterfassung Person" und "Arbeitsmodell" (vom Nutzer
// angelegt, Schema 2026-10-26 gelesen, siehe Spec). Die Person wird über die
// E-Mail in Kleinbuchstaben gefunden (Primärspalte bmvcc_name, alternativer
// Schlüssel) und beim ersten Speichern per Upsert angelegt. Alle Datumsfelder
// sind "Benutzer lokal" → Umrechnung in Schweizer Zeit (datum.ts).
const ZEITEINTRAEGE_ENTITY = "bmvcc_timetrackingentries";
const PERSONEN_ENTITY = "bmvcc_zeiterfassungpersons";
const ARBEITSMODELLE_ENTITY = "bmvcc_arbeitsmodells";
const NAME_MAX = 100;

const ARBEITSTAG_SPALTEN = [
  "bmvcc_arbeitstagmontag",
  "bmvcc_arbeitstagdienstag",
  "bmvcc_arbeitstagmittwoch",
  "bmvcc_arbeitstagdonnerstag",
  "bmvcc_arbeitstagfreitag",
  "bmvcc_arbeitstagsamstag",
  "bmvcc_arbeitstagsonntag",
] as const;

const PERSON_SPALTEN = [
  "bmvcc_zeiterfassungpersonid",
  "bmvcc_name",
  "bmvcc_anzeigename",
  "bmvcc_nichtauswerten",
  "bmvcc_austrittam",
  "bmvcc_gleitzeitstartsaldo",
  "bmvcc_startsaldostichtag",
];

const ARBEITSMODELL_SPALTEN = [
  "bmvcc_arbeitsmodellid",
  "_bmvcc_person_value",
  "bmvcc_gultigab",
  "bmvcc_pensum",
  ...ARBEITSTAG_SPALTEN,
];

export interface ZeiterfassungPerson {
  id: string;
  /** E-Mail in Kleinbuchstaben. */
  email: string;
  name: string | null;
  nichtAuswerten: boolean;
  austrittAm: string | null;
  startsaldo: number | null;
  stichtag: string | null;
}

export interface PersonArbeitsmodell extends ArbeitsmodellVersion {
  personId: string;
}

export interface PersonStammdaten {
  name: string | null;
  nichtAuswerten: boolean;
  austrittAm: string | null;
  startsaldo: number | null;
  stichtag: string | null;
}

export interface ArbeitsmodellEingabe {
  gueltigAb: string;
  pensum: number;
  arbeitstage: Arbeitstage;
}

export function normalisiereEmail(email: string): string {
  return email.trim().toLowerCase();
}

function zuPerson(r: Record<string, unknown>): ZeiterfassungPerson {
  const name = typeof r.bmvcc_anzeigename === "string" ? r.bmvcc_anzeigename.trim() : "";
  return {
    id: r.bmvcc_zeiterfassungpersonid as string,
    email: normalisiereEmail(String(r.bmvcc_name ?? "")),
    name: name || null,
    nichtAuswerten: r.bmvcc_nichtauswerten === true,
    austrittAm: zuSchweizerDatum(r.bmvcc_austrittam as string | null),
    startsaldo: typeof r.bmvcc_gleitzeitstartsaldo === "number" ? r.bmvcc_gleitzeitstartsaldo : null,
    stichtag: zuSchweizerDatum(r.bmvcc_startsaldostichtag as string | null),
  };
}

function zuArbeitsmodell(r: Record<string, unknown>): PersonArbeitsmodell | null {
  const personId = r._bmvcc_person_value;
  const gueltigAb = zuSchweizerDatum(r.bmvcc_gultigab as string | null);
  // Unvollständige Datensätze (z.B. direkt in Dataverse angelegt) ignorieren.
  if (typeof personId !== "string" || !gueltigAb) return null;
  return {
    id: r.bmvcc_arbeitsmodellid as string,
    personId,
    gueltigAb,
    pensum: typeof r.bmvcc_pensum === "number" ? r.bmvcc_pensum : 0,
    arbeitstage: ARBEITSTAG_SPALTEN.map((s) => r[s] === true) as Arbeitstage,
  };
}

function odataString(wert: string): string {
  return `'${wert.replace(/'/g, "''")}'`;
}

/**
 * Alle E-Mails, die in den Zeiteinträgen vorkommen — über eine
 * zusammenfassende Abfrage statt alle Einträge zu laden. Gross-/Klein-
 * schreibung wird zusammengeführt.
 */
export async function listZeiterfassungEmails(): Promise<string[]> {
  const emails = new Set<string>();
  let url: string | null = `/api/data/v9.2/${ZEITEINTRAEGE_ENTITY}?$apply=groupby((bmvcc_useremail))`;
  while (url) {
    const res = await dataverseFetch(url);
    const body = (await res.json()) as { value: { bmvcc_useremail?: string | null }[]; "@odata.nextLink"?: string };
    for (const r of body.value) {
      const email = normalisiereEmail(r.bmvcc_useremail ?? "");
      if (email) emails.add(email);
    }
    url = body["@odata.nextLink"] ?? null;
  }
  return [...emails].sort();
}

/** Datum (Schweizer Zeit) des ersten Zeiteintrags einer Person, für den Hinweis beim Startsaldo. */
export async function ersterZeiteintrag(email: string): Promise<string | null> {
  const { records } = await listRecords<{ bmvcc_activitydate?: string | null }>(ZEITEINTRAEGE_ENTITY, {
    select: ["bmvcc_activitydate"],
    // Dataverse vergleicht Text ohne Gross-/Kleinschreibung.
    filter: `bmvcc_useremail eq ${odataString(normalisiereEmail(email))} and bmvcc_activitydate ne null`,
    orderBy: "bmvcc_activitydate asc",
    top: 1,
  });
  return zuSchweizerDatum(records[0]?.bmvcc_activitydate ?? null);
}

const ZEITEINTRAG_SPALTEN = [
  "bmvcc_timetrackingentryid",
  "bmvcc_activitydate",
  "bmvcc_activitytype",
  "bmvcc_kommen",
  "bmvcc_gehen",
  "bmvcc_activitystarttime",
  "bmvcc_checkouttime",
  "bmvcc_tagestotal",
  "bmvcc_monatstotal",
  "bmvcc_mittagessen",
  "bmvcc_abendessen",
  "bmvcc_remarks",
];

// Auswahl "Aktivitätstyp": 0 = Arbeitszeit, 1 = Komp. GLZ, 2 = Krankheit.
const EINTRAGSTYPEN: Record<number, Eintragstyp> = { 0: "arbeitszeit", 1: "komp-glz", 2: "krankheit" };

function textOderNull(wert: unknown): string | null {
  return typeof wert === "string" && wert ? wert : null;
}

function zahlOderNull(wert: unknown): number | null {
  return typeof wert === "number" ? wert : null;
}

function zuZeiteintrag(r: Record<string, unknown>): Zeiteintrag | null {
  const datum = zuSchweizerDatum(r.bmvcc_activitydate as string | null);
  if (!datum) return null;
  return {
    id: r.bmvcc_timetrackingentryid as string,
    datum,
    typ: EINTRAGSTYPEN[r.bmvcc_activitytype as number] ?? "unbekannt",
    // Ältere Einträge haben nur Arbeitsbeginn/Checkout (Spec PROJ-13, Open Questions).
    kommen: textOderNull(r.bmvcc_kommen) ?? textOderNull(r.bmvcc_activitystarttime),
    gehen: textOderNull(r.bmvcc_gehen) ?? textOderNull(r.bmvcc_checkouttime),
    tagestotal: zahlOderNull(r.bmvcc_tagestotal),
    monatstotal: zahlOderNull(r.bmvcc_monatstotal),
    mittagessen: r.bmvcc_mittagessen === true,
    abendessen: r.bmvcc_abendessen === true,
    bemerkung: textOderNull(r.bmvcc_remarks),
  };
}

/** Zeiteinträge einer Person mit Aktivitätsdatum von `von` bis `bis` (Schweizer Kalendertage, inklusive). */
export async function listZeiteintraege(email: string, von: string, bis: string): Promise<Zeiteintrag[]> {
  const records = await listAllRecords(ZEITEINTRAEGE_ENTITY, {
    select: ZEITEINTRAG_SPALTEN,
    filter: [
      `bmvcc_useremail eq ${odataString(normalisiereEmail(email))}`,
      `bmvcc_activitydate ge ${alsSchweizerMitternacht(von)}`,
      `bmvcc_activitydate lt ${alsSchweizerMitternacht(folgetag(bis))}`,
    ].join(" and "),
    orderBy: "bmvcc_activitydate asc",
  });
  return records.map(zuZeiteintrag).filter((e): e is Zeiteintrag => e !== null);
}

export interface OffenerEintrag {
  email: string;
  typ: Eintragstyp;
  kommen: string | null;
  gehen: string | null;
}

/** Einzelner Zeiteintrag für das Nachtragen von "Gehen" (PROJ-13). */
export async function getZeiteintragFuerKorrektur(id: string): Promise<OffenerEintrag> {
  const r = await getRecord<Record<string, unknown>>(ZEITEINTRAEGE_ENTITY, id, {
    select: ["bmvcc_useremail", "bmvcc_activitytype", "bmvcc_kommen", "bmvcc_activitystarttime", "bmvcc_gehen", "bmvcc_checkouttime"],
  });
  return {
    email: normalisiereEmail(String(r.bmvcc_useremail ?? "")),
    typ: EINTRAGSTYPEN[r.bmvcc_activitytype as number] ?? "unbekannt",
    kommen: textOderNull(r.bmvcc_kommen) ?? textOderNull(r.bmvcc_activitystarttime),
    gehen: textOderNull(r.bmvcc_gehen) ?? textOderNull(r.bmvcc_checkouttime),
  };
}

/**
 * Trägt "Gehen" nach. Die Erfassungs-App setzt beim Gehen "Gehen" und
 * "Checkout" gleichzeitig — hier ebenso, damit beide Felder übereinstimmen.
 */
export async function setzeGehen(id: string, gehen: string): Promise<void> {
  await updateRecord(ZEITEINTRAEGE_ENTITY, id, { bmvcc_gehen: gehen, bmvcc_checkouttime: gehen });
}

export interface NeuerZeiteintrag {
  typ: Exclude<Eintragstyp, "unbekannt">;
  /** Zeitpunkte (ISO, UTC); bei Krankheit/Komp. GLZ leer. */
  kommen: string | null;
  gehen: string | null;
  mittagessen: boolean;
  abendessen: boolean;
  bemerkung: string | null;
}

const TYP_WERTE: Record<NeuerZeiteintrag["typ"], number> = { arbeitszeit: 0, "komp-glz": 1, krankheit: 2 };

/** "JJJJMMTTHHMM" in Schweizer Zeit — wie die Erfassungs-App die Primärspalte füllt. */
function aktivitaetsCode(datum: string, kommen: string | null): string {
  const zeit = kommen ? zuSchweizerUhrzeit(kommen).replace(":", "") : "0000";
  return `${datum.replace(/-/g, "")}${zeit}`;
}

/**
 * Legt einen Zeiteintrag an, mit denselben Feldern wie die Erfassungs-App
 * (Kommen/Arbeitsbeginn und Gehen/Checkout doppelt, Mittagessen doppelt,
 * eigene Kennung). Totals rechnet der Power-Automate-Flow.
 */
export async function erstelleZeiteintrag(email: string, datum: string, eintrag: NeuerZeiteintrag): Promise<string> {
  const { id } = await createRecord(ZEITEINTRAEGE_ENTITY, {
    bmvcc_activitydatetimecode: aktivitaetsCode(datum, eintrag.kommen),
    bmvcc_useremail: normalisiereEmail(email),
    bmvcc_activitydate: alsSchweizerMitternacht(datum),
    bmvcc_activitytype: TYP_WERTE[eintrag.typ],
    bmvcc_kommen: eintrag.kommen,
    bmvcc_activitystarttime: eintrag.kommen,
    bmvcc_gehen: eintrag.gehen,
    bmvcc_checkouttime: eintrag.gehen,
    bmvcc_mittagessen: eintrag.mittagessen,
    bmvcc_essen: eintrag.mittagessen,
    bmvcc_abendessen: eintrag.abendessen,
    bmvcc_remarks: eintrag.bemerkung,
    bmvcc_timerecordid: crypto.randomUUID(),
  });
  return id;
}

export async function listPersonen(): Promise<ZeiterfassungPerson[]> {
  const records = await listAllRecords(PERSONEN_ENTITY, { select: PERSON_SPALTEN });
  return records.map(zuPerson);
}

export async function getPersonByEmail(email: string): Promise<ZeiterfassungPerson | null> {
  const { records } = await listRecords(PERSONEN_ENTITY, {
    select: PERSON_SPALTEN,
    filter: `bmvcc_name eq ${odataString(normalisiereEmail(email))}`,
    top: 1,
  });
  return records[0] ? zuPerson(records[0]) : null;
}

/** Alle Arbeitsmodell-Versionen, optional nur einer Person. */
export async function listArbeitsmodelle(personId?: string): Promise<PersonArbeitsmodell[]> {
  const records = await listAllRecords(ARBEITSMODELLE_ENTITY, {
    select: ARBEITSMODELL_SPALTEN,
    filter: personId ? `_bmvcc_person_value eq ${personId}` : undefined,
  });
  return records.map(zuArbeitsmodell).filter((v): v is PersonArbeitsmodell => v !== null);
}

function datumOderNull(datum: string | null): string | null {
  return datum ? alsSchweizerMitternacht(datum) : null;
}

/**
 * Speichert Name, "nicht auswerten", Austritt und Startsaldo; legt die Person
 * an, falls es sie noch nicht gibt (Upsert über die E-Mail).
 */
export async function speicherePersonStammdaten(email: string, daten: PersonStammdaten): Promise<string> {
  const mail = normalisiereEmail(email);
  const gespeichert = await upsertRecordByKey<{ bmvcc_zeiterfassungpersonid: string }>(
    PERSONEN_ENTITY,
    "bmvcc_name",
    mail,
    {
      bmvcc_name: mail,
      bmvcc_anzeigename: daten.name?.slice(0, NAME_MAX) || null,
      bmvcc_nichtauswerten: daten.nichtAuswerten,
      bmvcc_austrittam: datumOderNull(daten.austrittAm),
      bmvcc_gleitzeitstartsaldo: daten.startsaldo,
      bmvcc_startsaldostichtag: datumOderNull(daten.stichtag),
    },
    ["bmvcc_zeiterfassungpersonid"]
  );
  return gespeichert.bmvcc_zeiterfassungpersonid;
}

/** ID der Person; legt sie ohne weitere Angaben an, falls es sie noch nicht gibt. */
export async function stellePersonSicher(email: string): Promise<string> {
  const mail = normalisiereEmail(email);
  const gespeichert = await upsertRecordByKey<{ bmvcc_zeiterfassungpersonid: string }>(
    PERSONEN_ENTITY,
    "bmvcc_name",
    mail,
    { bmvcc_name: mail },
    ["bmvcc_zeiterfassungpersonid"]
  );
  return gespeichert.bmvcc_zeiterfassungpersonid;
}

function arbeitsmodellDaten(email: string, eingabe: ArbeitsmodellEingabe): Record<string, unknown> {
  const name = `${normalisiereEmail(email)} ab ${formatKalenderdatum(eingabe.gueltigAb)}`;
  return {
    bmvcc_name: name.length > NAME_MAX ? `${name.slice(0, NAME_MAX - 1)}…` : name,
    bmvcc_gultigab: alsSchweizerMitternacht(eingabe.gueltigAb),
    bmvcc_pensum: eingabe.pensum,
    ...Object.fromEntries(ARBEITSTAG_SPALTEN.map((s, i) => [s, eingabe.arbeitstage[i]])),
  };
}

export async function erstelleArbeitsmodell(
  personId: string,
  email: string,
  eingabe: ArbeitsmodellEingabe
): Promise<string> {
  const { id } = await createRecord(ARBEITSMODELLE_ENTITY, {
    ...arbeitsmodellDaten(email, eingabe),
    "bmvcc_Person@odata.bind": `/${PERSONEN_ENTITY}(${personId})`,
  });
  return id;
}

export async function aendereArbeitsmodell(id: string, email: string, eingabe: ArbeitsmodellEingabe): Promise<void> {
  await updateRecord(ARBEITSMODELLE_ENTITY, id, arbeitsmodellDaten(email, eingabe));
}

export async function loescheArbeitsmodell(id: string): Promise<void> {
  await deleteRecord(ARBEITSMODELLE_ENTITY, id);
}
