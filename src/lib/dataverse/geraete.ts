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
const AKTIV = 0;
const STANDORT_SELECT = ["bmvcc_organizationlocationid", "bmvcc_displayname", "_bmvcc_bexiofirma_value", "createdon"];

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
  // Live-Fund (2026-10-06): "Bemerkungen" ist bmvcc_bemerkungen (mehrzeilige
  // Notizen, wie in der Legacy-Power-App), NICHT bmvcc_notitzen — beide
  // Spalten existieren und sind befüllt, notitzen enthält kurze Kennungen
  // ("105 Akra", "A020-030") und wird im Admin-Tool nicht angezeigt.
  "bmvcc_bemerkungen",
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
  /** Erstellungszeitpunkt (ISO) — feste Reihenfolge für gleichnamige Standorte (PROJ-10). */
  erstelltAm?: string | null;
}

/**
 * PROJ-10: Eindeutige Anzeigenamen für die Standorte einer Firma. Gleichnamige
 * Standorte (laut Datenanalyse selten) erhalten " (2)", " (3)" … in fester
 * Reihenfolge nach Erstellungsdatum (dann ID), damit derselbe Standort in
 * Auswahl, Header, Dateiname und Archivordner immer gleich heisst.
 */
export function eindeutigeStandortNamen(standorte: Standort[]): Map<string, string> {
  const gruppen = new Map<string, Standort[]>();
  for (const s of standorte) {
    const schluessel = s.name.trim().toLowerCase();
    gruppen.set(schluessel, [...(gruppen.get(schluessel) ?? []), s]);
  }
  const namen = new Map<string, string>();
  for (const gruppe of gruppen.values()) {
    const sortiert = [...gruppe].sort(
      (a, b) => (a.erstelltAm ?? "").localeCompare(b.erstelltAm ?? "") || a.id.localeCompare(b.id)
    );
    sortiert.forEach((s, i) => namen.set(s.id, i === 0 ? s.name.trim() : `${s.name.trim()} (${i + 1})`));
  }
  return namen;
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
  /** Leerstring = keine Einschränkung; sonst nur Geräte, deren letzte Prüfung höchstens so viele Tage zurückliegt. */
  letztePruefungTage: string;
}

// Gemeinsame Filter-Regel für Geräte — genutzt sowohl von der Geräteliste
// (PROJ-3) als auch von der Prüfberichte-Übersicht (PROJ-4),
// damit ein auf /geraete gewählter Filter dort dieselbe Geräte-Teilmenge
// ergibt (siehe geraete-filter-session.ts, Nutzerwunsch 2026-10-05).
export function matchesGeraeteFilter(geraet: Geraet, filter: GeraeteFilter): boolean {
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

export const GERAETE_SORT_SPALTEN = [
  "name",
  "kundenId",
  "barcode",
  "lagerort",
  "letztePruefung",
  "status",
  "pbBemerkung",
] as const;
export type GeraeteSortSpalte = (typeof GERAETE_SORT_SPALTEN)[number];
export type SortRichtung = "asc" | "desc";

export interface GeraeteSortierung {
  spalte: GeraeteSortSpalte;
  richtung: SortRichtung;
}

/** Standard, solange keine andere Spalte gewählt ist (Nutzerwunsch 2026-10-08): zuletzt geprüfte Geräte zuerst. */
export const STANDARD_GERAETE_SORTIERUNG: GeraeteSortierung = { spalte: "letztePruefung", richtung: "desc" };

const textVergleich = new Intl.Collator("de-CH", { numeric: true, sensitivity: "base" });

// Spaltensortierung der Geräteliste (Nutzerwunsch 2026-10-07). Standort und
// PB_Bemerkung stehen nicht am Gerät selbst, daher kommen sie über Lookups.
// Leere Werte landen unabhängig von der Richtung immer am Ende; bei Gleichstand
// bleibt die Ausgangsreihenfolge (Gerätename aufsteigend) erhalten.
export function sortiereGeraete(
  geraete: Geraet[],
  sortierung: GeraeteSortierung,
  lookups: {
    pbBemerkung: (geraetId: string) => string | null;
  }
): Geraet[] {
  const wert = (g: Geraet): string | number | null => {
    switch (sortierung.spalte) {
      case "pbBemerkung":
        return lookups.pbBemerkung(g.id);
      case "letztePruefung": {
        const zeit = g.letztePruefung ? new Date(g.letztePruefung).getTime() : NaN;
        return Number.isNaN(zeit) ? null : zeit;
      }
      default:
        return g[sortierung.spalte];
    }
  };
  const faktor = sortierung.richtung === "asc" ? 1 : -1;

  return geraete
    .map((g) => ({ g, w: wert(g) }))
    .sort((a, b) => {
      const aLeer = a.w === null || a.w === "";
      const bLeer = b.w === null || b.w === "";
      if (aLeer || bLeer) return aLeer === bLeer ? 0 : aLeer ? 1 : -1;
      const diff =
        typeof a.w === "number" && typeof b.w === "number" ? a.w - b.w : textVergleich.compare(String(a.w), String(b.w));
      return diff * faktor;
    })
    .map(({ g }) => g);
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
    bemerkungen: asString(raw.bmvcc_bemerkungen),
    kundenId: asString(raw.bmvcc_kundenid),
  };
}

function zuFirma(r: Record<string, unknown>): Firma {
  return { id: r.bmvcc_firmaid as string, name: asString(r.bmvcc_name) ?? "(ohne Name)" };
}

function zuStandort(r: Record<string, unknown>): Standort {
  return {
    id: r.bmvcc_organizationlocationid as string,
    name: asString(r.bmvcc_displayname) ?? "(ohne Name)",
    firmaId: r._bmvcc_bexiofirma_value as string,
    erstelltAm: asString(r.createdon),
  };
}

// Nur aktive Firmen (PROJ-10, Live-Fund 2026-10-08): deaktivierte Datensätze
// erschienen bisher ebenfalls in der Auswahl, u.a. als vierte "Bilfinger".
export async function listFirmen(): Promise<Firma[]> {
  const { records } = await listRecords(FIRMEN_ENTITY, {
    select: ["bmvcc_firmaid", "bmvcc_name"],
    filter: `statecode eq ${AKTIV}`,
    orderBy: "bmvcc_name asc",
    top: 500,
  });
  return records.map(zuFirma);
}

/** Aktive Firmen mit exakt diesem Namen (für die Erkennung gleichnamiger Firmen im Header). */
export async function listAktiveFirmenMitNamen(name: string): Promise<Firma[]> {
  const { records } = await listRecords(FIRMEN_ENTITY, {
    select: ["bmvcc_firmaid", "bmvcc_name"],
    // OData-Stringliteral: einfaches Anführungszeichen wird verdoppelt.
    filter: `bmvcc_name eq '${name.replace(/'/g, "''")}' and statecode eq ${AKTIV}`,
  });
  return records.map(zuFirma);
}

/** Alle Standorte aller Firmen (für die Kennzeichnung gleichnamiger Firmen in der Auswahl, ~200 Einträge). */
export async function listAlleStandorte(): Promise<Standort[]> {
  const { records } = await listRecords(STANDORTE_ENTITY, { select: STANDORT_SELECT, top: 5000 });
  return records.map(zuStandort);
}

/** Standorte mehrerer Firmen in einer Abfrage. */
export async function listStandorteForFirmen(firmaIds: string[]): Promise<Standort[]> {
  if (firmaIds.length === 0) return [];
  firmaIds.forEach((id) => requireValidGuid(id, "firmaId"));
  const { records } = await listRecords(STANDORTE_ENTITY, {
    select: STANDORT_SELECT,
    filter: firmaIds.map((id) => `_bmvcc_bexiofirma_value eq ${id}`).join(" or "),
  });
  return records.map(zuStandort);
}

/**
 * Anzeigenamen für Firmen (PROJ-10, Nutzer-Entscheidung 2026-10-08): In
 * Dataverse gibt es bewusst gleichnamige Firmen (z.B. drei "Bilfinger …"
 * für drei Niederlassungen). Gleichnamige Firmen erhalten einen Zusatz aus
 * ihrem Standort — ohne den vorangestellten Firmennamen ("… AG - Pratteln" →
 * "Pratteln"); "ohne Standort" bzw. "n Standorte"; ein leerer Zusatz ist
 * erlaubt, solange der Name damit eindeutig bleibt. Bleiben Namen trotzdem
 * gleich, werden sie nach ID durchnummeriert. Eindeutige Namen bleiben unverändert.
 */
export function firmenAnzeigenamen(firmen: Firma[], standorte: Standort[]): Map<string, string> {
  const standorteProFirma = new Map<string, Standort[]>();
  for (const s of standorte) standorteProFirma.set(s.firmaId, [...(standorteProFirma.get(s.firmaId) ?? []), s]);

  const gruppen = new Map<string, Firma[]>();
  for (const f of firmen) {
    const schluessel = f.name.trim().toLowerCase();
    gruppen.set(schluessel, [...(gruppen.get(schluessel) ?? []), f]);
  }

  const namen = new Map<string, string>();
  for (const gruppe of gruppen.values()) {
    if (gruppe.length === 1) {
      namen.set(gruppe[0].id, gruppe[0].name);
      continue;
    }
    const kandidaten = gruppe.map((f) => {
      const eigene = standorteProFirma.get(f.id) ?? [];
      let zusatz: string;
      if (eigene.length === 0) zusatz = "ohne Standort";
      else if (eigene.length > 1) zusatz = `${eigene.length} Standorte`;
      else zusatz = standortKurzname(eigene[0].name, f.name);
      return { firma: f, name: zusatz ? `${f.name} · ${zusatz}` : f.name };
    });
    const vorkommen = new Map<string, number>();
    for (const k of kandidaten) vorkommen.set(k.name, (vorkommen.get(k.name) ?? 0) + 1);
    const zaehler = new Map<string, number>();
    for (const k of [...kandidaten].sort((a, b) => a.firma.id.localeCompare(b.firma.id))) {
      if ((vorkommen.get(k.name) ?? 0) > 1) {
        const n = (zaehler.get(k.name) ?? 0) + 1;
        zaehler.set(k.name, n);
        namen.set(k.firma.id, `${k.name} (${n})`);
      } else {
        namen.set(k.firma.id, k.name);
      }
    }
  }
  return namen;
}

/**
 * Standortname ohne vorangestellten Firmennamen ("Bilfinger … AG - Pratteln"
 * → "Pratteln"); leer, wenn der Standort genau wie die Firma heisst. Genutzt
 * für Anzeigenamen gleichnamiger Firmen und für den SharePoint-Ordner
 * "Standort <Kurzname>" (PROJ-10).
 */
export function standortKurzname(standortName: string, firmaName: string): string {
  const standort = standortName.trim();
  if (!standort.toLowerCase().startsWith(firmaName.trim().toLowerCase())) return standort;
  return standort.slice(firmaName.trim().length).replace(/^[\s,\-–—:]+/, "").trim();
}

export async function getFirma(id: string): Promise<Firma> {
  const raw = await getRecord(FIRMEN_ENTITY, id, { select: ["bmvcc_firmaid", "bmvcc_name"] });
  return { id: raw.bmvcc_firmaid as string, name: asString(raw.bmvcc_name) ?? "(ohne Name)" };
}

export async function listStandorteForFirma(firmaId: string): Promise<Standort[]> {
  requireValidGuid(firmaId, "firmaId");

  const { records } = await listRecords(STANDORTE_ENTITY, {
    select: STANDORT_SELECT,
    filter: `_bmvcc_bexiofirma_value eq ${firmaId}`,
  });
  return records.map(zuStandort);
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

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

const ARTIKEL_ID_CHUNK_SIZE = 20;

// Für PROJ-7 (PDF-Export): Artikel-Stammdaten für mehrere Geräte in einem
// gebatchten Abruf statt einer Anfrage pro Gerät — dedupliziert auf die
// tatsächlich vorkommenden, unterschiedlichen Artikel-IDs (viele Geräte
// teilen sich denselben Artikel).
export async function listArtikelByIds(artikelIds: string[]): Promise<Map<string, ArtikelInfo>> {
  const eindeutigeIds = Array.from(new Set(artikelIds));
  if (eindeutigeIds.length === 0) return new Map();
  eindeutigeIds.forEach((id) => requireValidGuid(id, "artikelId"));

  const ergebnisse = await Promise.all(
    chunk(eindeutigeIds, ARTIKEL_ID_CHUNK_SIZE).map(async (idsInChunk) => {
      const filter = idsInChunk.map((id) => `bmvcc_artikelid eq ${id}`).join(" or ");
      const { records } = await listRecords(ARTIKEL_ENTITY, {
        select: ["bmvcc_artikelid", "bmvcc_modelarticle", "bmvcc_manufacturer", "bmvcc_articletype", "bmvcc_dimensions", "bmvcc_standardnorm"],
        filter,
        top: 500,
      });
      return records.map((raw) => ({
        id: raw.bmvcc_artikelid as string,
        bezeichnung: asString(raw.bmvcc_modelarticle),
        hersteller: asString(raw.bmvcc_manufacturer),
        typ: asString(raw.bmvcc_articletype),
        dimension: asString(raw.bmvcc_dimensions),
        norm: asString(raw.bmvcc_standardnorm),
      }));
    })
  );

  const map = new Map<string, ArtikelInfo>();
  ergebnisse.flat().forEach((artikel) => map.set(artikel.id, artikel));
  return map;
}

export async function updateGeraetStammdaten(id: string, input: GeraetStammdatenInput): Promise<void> {
  await updateRecord(GERAETE_ENTITY, id, {
    bmvcc_serienummer: input.serienummer,
    bmvcc_barcode: input.barcode,
    bmvcc_lagerort: input.lagerort,
    bmvcc_bemerkungen: input.bemerkungen,
    bmvcc_zubehoer: input.zubehoer,
    bmvcc_herstelljahr: input.herstelljahr,
    bmvcc_erstgebrauch: input.erstgebrauch,
    bmvcc_ablegereife: input.ablegereife,
    bmvcc_kundenid: input.kundenId,
  });
}
