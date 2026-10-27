import { createRecord, deleteRecord, listAllRecords, updateRecord } from "./records";
import { baueFeiertagskalender, type Feiertagskalender, type GepflegterFeiertag } from "@/lib/zeiterfassung/feiertage";

// PROJ-18: Tabellen "Feiertagsjahr" und "Feiertag" (vom Nutzer angelegt,
// interne Namen mit Tippfehler "feriertag" bewusst belassen). Ein vorhandenes
// Feiertagsjahr heisst: das Jahr ist gepflegt. Das Datum ist "Nur Datum,
// zeitzonenunabhängig" — ohne Umrechnung als "YYYY-MM-DD".
const JAHRE_ENTITY = "bmvcc_feriertagsjahrs";
const FEIERTAGE_ENTITY = "bmvcc_feriertags";
const NAME_MAX = 100;

export interface GespeicherterFeiertag extends GepflegterFeiertag {
  id: string;
}

export interface Feiertagsjahr {
  id: string;
  jahr: number;
  feiertage: GespeicherterFeiertag[];
}

function zuDatum(wert: unknown): string | null {
  return typeof wert === "string" && /^\d{4}-\d{2}-\d{2}/.test(wert) ? wert.slice(0, 10) : null;
}

/** Gepflegte Jahre von `vonJahr` bis `bisJahr` mit ihren Feiertagen. */
export async function listFeiertagsjahre(vonJahr: number, bisJahr: number): Promise<Feiertagsjahr[]> {
  const jahre = (
    await listAllRecords<{ bmvcc_feriertagsjahrid: string; bmvcc_jahr: string }>(JAHRE_ENTITY, {
      select: ["bmvcc_feriertagsjahrid", "bmvcc_jahr"],
    })
  )
    .map((r) => ({ id: r.bmvcc_feriertagsjahrid, jahr: Number(r.bmvcc_jahr) }))
    .filter((j) => Number.isInteger(j.jahr) && j.jahr >= vonJahr && j.jahr <= bisJahr);
  if (jahre.length === 0) return [];

  const feiertage = await listAllRecords<Record<string, unknown>>(FEIERTAGE_ENTITY, {
    select: ["bmvcc_feriertagid", "bmvcc_name", "bmvcc_datum", "bmvcc_halbertag", "_bmvcc_feiertagsjahr_value"],
    filter: jahre.map((j) => `_bmvcc_feiertagsjahr_value eq ${j.id}`).join(" or "),
  });
  return jahre.map((j) => ({
    ...j,
    feiertage: feiertage
      .filter((f) => f._bmvcc_feiertagsjahr_value === j.id)
      .flatMap((f) => {
        const datum = zuDatum(f.bmvcc_datum);
        // Unvollständige oder fremde Daten (direkt in Dataverse erfasst) ignorieren.
        if (!datum || !datum.startsWith(String(j.jahr))) return [];
        return [{ id: f.bmvcc_feriertagid as string, datum, name: String(f.bmvcc_name ?? ""), halb: f.bmvcc_halbertag === true }];
      })
      .sort((a, b) => a.datum.localeCompare(b.datum)),
  }));
}

/** Feiertagskalender für die Jahre eines Zeitraums: gepflegte Jahre aus Dataverse, übrige als Vorschlag. */
export async function ladeFeiertagskalender(vonDatum: string, bisDatum: string): Promise<Feiertagskalender> {
  const jahre = await listFeiertagsjahre(Number(vonDatum.slice(0, 4)), Number(bisDatum.slice(0, 4)));
  return baueFeiertagskalender(new Map(jahre.map((j) => [j.jahr, j.feiertage])));
}

function feiertagDaten(f: { datum: string; name: string; halb: boolean }) {
  return {
    bmvcc_name: f.name.slice(0, NAME_MAX),
    bmvcc_datum: f.datum,
    bmvcc_halbertag: f.halb,
  };
}

export async function erstelleFeiertagsjahr(jahr: number): Promise<string> {
  const { id } = await createRecord(JAHRE_ENTITY, { bmvcc_jahr: String(jahr) });
  return id;
}

export async function erstelleFeiertag(jahrId: string, f: { datum: string; name: string; halb: boolean }): Promise<string> {
  const { id } = await createRecord(FEIERTAGE_ENTITY, {
    ...feiertagDaten(f),
    "bmvcc_Feiertagsjahr@odata.bind": `/${JAHRE_ENTITY}(${jahrId})`,
  });
  return id;
}

export async function aendereFeiertag(id: string, f: { name: string; halb: boolean }): Promise<void> {
  await updateRecord(FEIERTAGE_ENTITY, id, { bmvcc_name: f.name.slice(0, NAME_MAX), bmvcc_halbertag: f.halb });
}

export async function loescheFeiertag(id: string): Promise<void> {
  await deleteRecord(FEIERTAGE_ENTITY, id);
}

export async function loescheFeiertagsjahr(id: string): Promise<void> {
  await deleteRecord(JAHRE_ENTITY, id);
}
