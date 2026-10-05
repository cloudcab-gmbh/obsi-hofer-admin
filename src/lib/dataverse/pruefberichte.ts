import { getRecord, listRecords, createRecord, updateRecord } from "./records";
import { DataverseError } from "./errors";

// Dataverse-Entität/Feldnamen stammen aus dem bereits gegen die echte Umgebung
// verifizierten Sync-Job-Mapping im Kundenportal-Repo (src/lib/sync/jobs.ts,
// Kommentar "Verified against the real environment on 2026-09-16").
const PRUEFBERICHTE_ENTITY = "bmvcc_pruefberichts";

const PRUEFBERICHT_SELECT = [
  "bmvcc_pruefberichtid",
  "_bmvcc_gearaet_value",
  "bmvcc_inspectiondate",
  "bmvcc_inspectionresult",
  "bmvcc_inspector",
  "bmvcc_isarchived",
  "bmvcc_remark",
];

export const ERGEBNIS_OPTIONEN = ["Freigabe", "keine Freigabe", "letzte Freigabe"] as const;
export type Ergebnis = (typeof ERGEBNIS_OPTIONEN)[number];

export interface Pruefbericht {
  id: string;
  geraetId: string;
  pruefdatum: string | null;
  ergebnis: string | null;
  pruefer: string | null;
  bemerkungen: string | null;
  storniert: boolean;
}

export interface PruefberichtInput {
  pruefdatum: string;
  ergebnis: string;
  bemerkungen: string | null;
}

const GUID_PATTERN = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

// geraetId kann aus einem URL-Parameter stammen und wird unquotiert in einen
// OData-$filter eingesetzt — dieselbe Absicherung wie in geraete.ts.
function requireValidGuid(value: string, label: string): void {
  if (!GUID_PATTERN.test(value)) {
    throw new Error(`${label} muss eine gültige GUID sein, erhalten: "${value}"`);
  }
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function mapPruefbericht(raw: Record<string, unknown>): Pruefbericht {
  return {
    id: raw.bmvcc_pruefberichtid as string,
    geraetId: raw._bmvcc_gearaet_value as string,
    pruefdatum: asString(raw.bmvcc_inspectiondate),
    ergebnis: asString(raw.bmvcc_inspectionresult),
    pruefer: asString(raw.bmvcc_inspector),
    bemerkungen: asString(raw.bmvcc_remark),
    storniert: raw.bmvcc_isarchived === true,
  };
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

// Für die firmenweite Übersicht (bis zu ~200 Geräte, siehe PROJ-3) wird die
// Gerät-Liste in Blöcken abgefragt statt einer einzigen sehr langen
// OR-Filterkette — sonst droht ein Dataverse-URL-Längenlimit. Gleiches
// Chunking-Muster wie `chunk()` im Kundenportal-Repo (src/lib/sync/batch.ts).
const GERAET_ID_CHUNK_SIZE = 20;

export async function listPruefberichteForGeraet(
  geraetId: string,
  options: { includeStorniert?: boolean } = {}
): Promise<Pruefbericht[]> {
  requireValidGuid(geraetId, "geraetId");

  const filter = options.includeStorniert
    ? `_bmvcc_gearaet_value eq ${geraetId}`
    : `_bmvcc_gearaet_value eq ${geraetId} and bmvcc_isarchived eq false`;

  const { records } = await listRecords(PRUEFBERICHTE_ENTITY, {
    select: PRUEFBERICHT_SELECT,
    filter,
    orderBy: "bmvcc_inspectiondate desc",
    top: 500,
  });
  return records.map(mapPruefbericht);
}

export async function listPruefberichteForGeraete(
  geraetIds: string[],
  options: { includeStorniert?: boolean } = {}
): Promise<Pruefbericht[]> {
  if (geraetIds.length === 0) return [];
  geraetIds.forEach((id) => requireValidGuid(id, "geraetId"));

  const results = await Promise.all(
    chunk(geraetIds, GERAET_ID_CHUNK_SIZE).map(async (idsInChunk) => {
      const geraetFilter = idsInChunk.map((id) => `_bmvcc_gearaet_value eq ${id}`).join(" or ");
      const filter = options.includeStorniert
        ? `(${geraetFilter})`
        : `(${geraetFilter}) and bmvcc_isarchived eq false`;
      const { records } = await listRecords(PRUEFBERICHTE_ENTITY, {
        select: PRUEFBERICHT_SELECT,
        filter,
        orderBy: "bmvcc_inspectiondate desc",
        top: 500,
      });
      return records.map(mapPruefbericht);
    })
  );

  return results.flat().sort((a, b) => (b.pruefdatum ?? "").localeCompare(a.pruefdatum ?? ""));
}

export async function getPruefbericht(id: string): Promise<Pruefbericht> {
  const raw = await getRecord(PRUEFBERICHTE_ENTITY, id, { select: PRUEFBERICHT_SELECT });
  return mapPruefbericht(raw);
}

// Für die Geräteliste (PROJ-3): Bemerkung des jeweils aktuellsten aktiven
// Prüfberichts pro Gerät, in einem gebatchten Abruf statt einer Anfrage pro
// Gerät. `listPruefberichteForGeraete` liefert bereits nach Prüfdatum
// absteigend sortiert — der erste Treffer pro geraetId ist daher der
// aktuellste (bei exakt gleichem Prüfdatum hier ohne das createdon-
// Tie-Breaking aus `getAktuellsterAktiverPruefbericht`, da das für eine
// reine Anzeige-Spalte keinen praktischen Unterschied macht).
export async function getAktuelleBemerkungenForGeraete(geraetIds: string[]): Promise<Map<string, string | null>> {
  const berichte = await listPruefberichteForGeraete(geraetIds, { includeStorniert: false });

  const bemerkungen = new Map<string, string | null>();
  for (const bericht of berichte) {
    if (!bemerkungen.has(bericht.geraetId)) {
      bemerkungen.set(bericht.geraetId, bericht.bemerkungen);
    }
  }
  return bemerkungen;
}

// Für PROJ-7 (PDF-Export): vollständiger aktuellster aktiver Prüfbericht pro
// Gerät, gebatcht wie `getAktuelleBemerkungenForGeraete`. Geräte ohne aktiven
// Prüfbericht fehlen bewusst in der Map (siehe PROJ-7 Product Decisions:
// werden aus dem PDF ausgeschlossen, nicht mit leeren Feldern angezeigt).
export async function getAktuellstePruefberichteForGeraete(geraetIds: string[]): Promise<Map<string, Pruefbericht>> {
  const berichte = await listPruefberichteForGeraete(geraetIds, { includeStorniert: false });

  const aktuellste = new Map<string, Pruefbericht>();
  for (const bericht of berichte) {
    if (!aktuellste.has(bericht.geraetId)) {
      aktuellste.set(bericht.geraetId, bericht);
    }
  }
  return aktuellste;
}

// "Aktuellster aktiver Bericht": höchstes Prüfdatum, bei Gleichstand der
// zuletzt erstellte (Dataverse-Systemfeld `createdon`) — löst die in der
// Spec offene Tie-Breaking-Frage ohne ein neues Feld (siehe Tech Design).
export async function getAktuellsterAktiverPruefbericht(geraetId: string): Promise<Pruefbericht | null> {
  requireValidGuid(geraetId, "geraetId");

  const { records } = await listRecords(PRUEFBERICHTE_ENTITY, {
    select: PRUEFBERICHT_SELECT,
    filter: `_bmvcc_gearaet_value eq ${geraetId} and bmvcc_isarchived eq false`,
    orderBy: "bmvcc_inspectiondate desc,createdon desc",
    top: 1,
  });
  return records.length > 0 ? mapPruefbericht(records[0]) : null;
}

// Gleicht die Status-Felder des Geräts (letzte Prüfung, Betriebsmittelstatus,
// Prüfer) immer auf den tatsächlich aktuellsten aktiven Prüfbericht ab, statt
// sich darauf zu verlassen, dass eine Neuanlage automatisch der neueste ist
// (das Prüfdatum ist frei wählbar, auch rückwirkend — siehe PROJ-4 Spec).
// Wird nach jeder Prüfbericht-Änderung (Anlegen/Bearbeiten/Stornieren)
// aufgerufen; existiert kein aktiver Bericht mehr, werden die Felder geleert.
export async function syncGeraetStatusFromPruefberichte(geraetId: string): Promise<void> {
  const aktuellster = await getAktuellsterAktiverPruefbericht(geraetId);
  await updateRecord("bmvcc_equipmentrecords", geraetId, {
    bmvcc_letztepruefung: aktuellster?.pruefdatum ?? null,
    bmvcc_betriebsmittelstatus: aktuellster?.ergebnis ?? null,
    bmvcc_pruefer: aktuellster?.pruefer ?? null,
  });
}

export async function createPruefbericht(
  geraetId: string,
  input: PruefberichtInput & { pruefer: string }
): Promise<{ id: string }> {
  requireValidGuid(geraetId, "geraetId");

  const result = await createRecord(PRUEFBERICHTE_ENTITY, {
    // ACHTUNG (unverifiziert): Der Navigationseigenschafts-Name für den
    // @odata.bind-Lookup ist üblicherweise die Schema-Namens-Schreibweise
    // (erster Buchstabe nach dem Publisher-Präfix gross) statt der
    // lowercase-LogicalName-Schreibweise, die beim Lesen verwendet wird
    // (`_bmvcc_gearaet_value`). Beim ersten echten Anlegen eines
    // Prüfberichts verifizieren — falls Dataverse mit einem Fehler zur
    // Navigationseigenschaft antwortet, hier die exakte Schema-Namens-
    // Schreibweise aus dem Power-Platform-Customizer nachtragen.
    "bmvcc_Gearaet@odata.bind": `/bmvcc_equipmentrecords(${geraetId})`,
    bmvcc_inspectiondate: input.pruefdatum,
    bmvcc_inspectionresult: input.ergebnis,
    bmvcc_inspector: input.pruefer,
    bmvcc_remark: input.bemerkungen,
    bmvcc_isarchived: false,
  });
  await syncGeraetStatusFromPruefberichte(geraetId);
  return result;
}

// geraetId wird bewusst NICHT vom Aufrufer übernommen, sondern aus dem
// bestehenden Datensatz selbst gelesen — verhindert, dass ein falscher
// Parameter das falsche Gerät (nicht) synchronisiert (siehe QA BUG-3).
// Dieselbe Abfrage dient gleich als serverseitige Durchsetzung, dass ein
// bereits stornierter Prüfbericht nicht mehr verändert werden kann (siehe
// QA BUG-1) — die UI blendet das zwar schon aus, aber ohne diese Prüfung
// liesse sich die Regel über einen direkten Server-Action-Aufruf umgehen.
export async function updatePruefbericht(id: string, input: PruefberichtInput): Promise<{ geraetId: string }> {
  requireValidGuid(id, "id");

  const bestehender = await getPruefbericht(id);
  if (bestehender.storniert) {
    throw new DataverseError("validation_error", "Ein stornierter Prüfbericht kann nicht mehr bearbeitet werden.");
  }

  await updateRecord(PRUEFBERICHTE_ENTITY, id, {
    bmvcc_inspectiondate: input.pruefdatum,
    bmvcc_inspectionresult: input.ergebnis,
    bmvcc_remark: input.bemerkungen,
  });
  await syncGeraetStatusFromPruefberichte(bestehender.geraetId);
  return { geraetId: bestehender.geraetId };
}

export async function stornierePruefbericht(id: string): Promise<{ geraetId: string }> {
  requireValidGuid(id, "id");

  const bestehender = await getPruefbericht(id);
  if (bestehender.storniert) {
    throw new DataverseError("validation_error", "Dieser Prüfbericht ist bereits storniert.");
  }

  await updateRecord(PRUEFBERICHTE_ENTITY, id, { bmvcc_isarchived: true });
  await syncGeraetStatusFromPruefberichte(bestehender.geraetId);
  return { geraetId: bestehender.geraetId };
}
