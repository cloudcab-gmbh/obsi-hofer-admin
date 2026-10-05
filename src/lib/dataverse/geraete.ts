import { getRecord, listRecords, updateRecord } from "./records";

// Dataverse-Entitäten/Feldnamen stammen aus dem bereits gegen die echte
// Umgebung verifizierten Sync-Job-Mapping im Kundenportal-Repo
// (src/lib/sync/jobs.ts, Kommentar "Verified against the real environment
// on 2026-09-16"). Ausnahme: bmvcc_erstgebrauch kommt nur aus der Legacy-
// Power-App-Quelle (docs/legacy-power-app/) und ist NICHT über jobs.ts
// gegengeprüft, da der Sync dieses Feld nicht benötigt — beim ersten
// echten Zugriff verifizieren.
const GERAETE_ENTITY = "bmvcc_equipmentrecords";
const STANDORTE_ENTITY = "bmvcc_organizationlocations";
const FIRMEN_ENTITY = "bmvcc_firmas";
const ARTIKEL_ENTITY = "bmvcc_artikels";

const GERAET_SELECT = [
  "bmvcc_equipmentrecordid",
  "bmvcc_geraetename",
  "bmvcc_serienummer",
  "bmvcc_barcode",
  "bmvcc_betriebsmittelstatus",
  "bmvcc_letztepruefung",
  "bmvcc_ablegereife",
  "bmvcc_herstelljahr",
  "bmvcc_erstgebrauch",
  "_bmvcc_standort_value",
  "_cre77_artikel_value",
  "bmvcc_lagerort",
  "bmvcc_pruefer",
  "bmvcc_zubehoer",
  "bmvcc_notitzen",
  "bmvcc_kundenid",
];

export interface Firma {
  id: string;
  name: string;
}

export interface Standort {
  id: string;
  name: string;
  firmaId: string;
}

export interface ArtikelInfo {
  id: string;
  bezeichnung: string | null;
  hersteller: string | null;
  typ: string | null;
  dimension: string | null;
  norm: string | null;
}

export interface Geraet {
  id: string;
  name: string | null;
  serienummer: string | null;
  barcode: string | null;
  status: string | null;
  letztePruefung: string | null;
  ablegereife: string | null;
  herstelljahr: string | null;
  erstgebrauch: string | null;
  standortId: string | null;
  artikelId: string | null;
  lagerort: string | null;
  pruefer: string | null;
  zubehoer: string | null;
  bemerkungen: string | null;
  // Kunden-eigene Gerätebezeichnung (siehe PROJ-7 im Kundenportal-Repo) —
  // bewusst nicht für die Firma-Zuordnung verwendet, nur ein frei editierbares
  // Label, das der Kunde intern zur Identifikation nutzt.
  kundenId: string | null;
}

export interface GeraeteFilter {
  suche: string;
  /** Leerstring = "alle Lagerorte". */
  lagerort: string;
  /** Leerstring = "alle Standorte". */
  standortId: string;
  /** Leerstring = keine Einschränkung; sonst nur Geräte, deren letzte Prüfung höchstens so viele Tage zurückliegt. */
  letztePruefungTage: string;
}

// Gemeinsame Filter-Regel für Geräte — genutzt sowohl von der Geräteliste
// (PROJ-3) als auch von der firmenweiten Prüfberichte-Übersicht (PROJ-4),
// damit ein auf /geraete gewählter Filter dort dieselbe Geräte-Teilmenge
// ergibt (siehe geraete-filter-session.ts, Nutzerwunsch 2026-10-05).
export function matchesGeraeteFilter(geraet: Geraet, filter: GeraeteFilter): boolean {
  if (filter.standortId && geraet.standortId !== filter.standortId) return false;
  if (filter.lagerort && geraet.lagerort !== filter.lagerort) return false;

  const tage = Number(filter.letztePruefungTage);
  if (filter.letztePruefungTage && Number.isFinite(tage) && tage > 0) {
    if (!geraet.letztePruefung) return false;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - tage);
    if (new Date(geraet.letztePruefung) < cutoff) return false;
  }

  const suchbegriff = filter.suche.trim().toLowerCase();
  if (!suchbegriff) return true;
  return [geraet.name, geraet.barcode, geraet.serienummer, geraet.kundenId].some((v) =>
    v?.toLowerCase().includes(suchbegriff)
  );
}

export interface GeraetStammdatenInput {
  serienummer: string | null;
  barcode: string | null;
  lagerort: string | null;
  bemerkungen: string | null;
  zubehoer: string | null;
  herstelljahr: string | null;
  erstgebrauch: string | null;
  ablegereife: string | null;
  kundenId: string | null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

const GUID_PATTERN = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

// firmaId kommt bei listStandorteForFirma direkt aus einem URL-Query-Parameter
// (siehe /geraete?firmaId=...) und wird unquotiert in einen OData-$filter
// eingesetzt — ohne diese Prüfung könnte ein präparierter Wert zusätzliche
// Filter-Bedingungen einschleusen (OData-Injection).
function requireValidGuid(value: string, label: string): void {
  if (!GUID_PATTERN.test(value)) {
    throw new Error(`${label} muss eine gültige GUID sein, erhalten: "${value}"`);
  }
}

function mapGeraet(raw: Record<string, unknown>): Geraet {
  return {
    id: raw.bmvcc_equipmentrecordid as string,
    name: asString(raw.bmvcc_geraetename),
    serienummer: asString(raw.bmvcc_serienummer),
    barcode: asString(raw.bmvcc_barcode),
    status: asString(raw.bmvcc_betriebsmittelstatus),
    letztePruefung: asString(raw.bmvcc_letztepruefung),
    ablegereife: asString(raw.bmvcc_ablegereife),
    herstelljahr: asString(raw.bmvcc_herstelljahr),
    erstgebrauch: asString(raw.bmvcc_erstgebrauch),
    standortId: asString(raw._bmvcc_standort_value),
    artikelId: asString(raw._cre77_artikel_value),
    lagerort: asString(raw.bmvcc_lagerort),
    pruefer: asString(raw.bmvcc_pruefer),
    zubehoer: asString(raw.bmvcc_zubehoer),
    bemerkungen: asString(raw.bmvcc_notitzen),
    kundenId: asString(raw.bmvcc_kundenid),
  };
}

export async function listFirmen(): Promise<Firma[]> {
  const { records } = await listRecords(FIRMEN_ENTITY, {
    select: ["bmvcc_firmaid", "bmvcc_name"],
    orderBy: "bmvcc_name asc",
    top: 500,
  });
  return records.map((r) => ({
    id: r.bmvcc_firmaid as string,
    name: asString(r.bmvcc_name) ?? "(ohne Name)",
  }));
}

export async function getFirma(id: string): Promise<Firma> {
  const raw = await getRecord(FIRMEN_ENTITY, id, { select: ["bmvcc_firmaid", "bmvcc_name"] });
  return { id: raw.bmvcc_firmaid as string, name: asString(raw.bmvcc_name) ?? "(ohne Name)" };
}

export async function listStandorteForFirma(firmaId: string): Promise<Standort[]> {
  requireValidGuid(firmaId, "firmaId");

  const { records } = await listRecords(STANDORTE_ENTITY, {
    select: ["bmvcc_organizationlocationid", "bmvcc_displayname", "_bmvcc_bexiofirma_value"],
    filter: `_bmvcc_bexiofirma_value eq ${firmaId}`,
  });
  return records.map((r) => ({
    id: r.bmvcc_organizationlocationid as string,
    name: asString(r.bmvcc_displayname) ?? "(ohne Name)",
    firmaId: r._bmvcc_bexiofirma_value as string,
  }));
}

export async function getStandort(id: string): Promise<Standort> {
  const raw = await getRecord(STANDORTE_ENTITY, id, {
    select: ["bmvcc_organizationlocationid", "bmvcc_displayname", "_bmvcc_bexiofirma_value"],
  });
  return {
    id: raw.bmvcc_organizationlocationid as string,
    name: asString(raw.bmvcc_displayname) ?? "(ohne Name)",
    firmaId: raw._bmvcc_bexiofirma_value as string,
  };
}

export async function listGeraeteForStandorte(standortIds: string[]): Promise<Geraet[]> {
  if (standortIds.length === 0) return [];
  standortIds.forEach((id) => requireValidGuid(id, "standortId"));

  // Dataverse-Lookup-Gleichheit erwartet den GUID-Wert unquotiert im
  // $filter (anders als ein String-Literal). Bei wenigen Standorten pro
  // Firma ist eine OR-Kette praktikabel.
  const filter = standortIds.map((id) => `_bmvcc_standort_value eq ${id}`).join(" or ");
  const { records } = await listRecords(GERAETE_ENTITY, {
    select: GERAET_SELECT,
    filter,
    orderBy: "bmvcc_geraetename asc",
    top: 500,
  });
  return records.map(mapGeraet);
}

export async function getGeraet(id: string): Promise<Geraet> {
  const raw = await getRecord(GERAETE_ENTITY, id, { select: GERAET_SELECT });
  return mapGeraet(raw);
}

export async function getArtikel(id: string): Promise<ArtikelInfo> {
  const raw = await getRecord(ARTIKEL_ENTITY, id, {
    select: [
      "bmvcc_artikelid",
      "bmvcc_modelarticle",
      "bmvcc_manufacturer",
      "bmvcc_articletype",
      "bmvcc_dimensions",
      "bmvcc_standardnorm",
    ],
  });
  return {
    id: raw.bmvcc_artikelid as string,
    bezeichnung: asString(raw.bmvcc_modelarticle),
    hersteller: asString(raw.bmvcc_manufacturer),
    typ: asString(raw.bmvcc_articletype),
    dimension: asString(raw.bmvcc_dimensions),
    norm: asString(raw.bmvcc_standardnorm),
  };
}

export async function updateGeraetStammdaten(id: string, input: GeraetStammdatenInput): Promise<void> {
  await updateRecord(GERAETE_ENTITY, id, {
    bmvcc_serienummer: input.serienummer,
    bmvcc_barcode: input.barcode,
    bmvcc_lagerort: input.lagerort,
    bmvcc_notitzen: input.bemerkungen,
    bmvcc_zubehoer: input.zubehoer,
    bmvcc_herstelljahr: input.herstelljahr,
    bmvcc_erstgebrauch: input.erstgebrauch,
    bmvcc_ablegereife: input.ablegereife,
    bmvcc_kundenid: input.kundenId,
  });
}
