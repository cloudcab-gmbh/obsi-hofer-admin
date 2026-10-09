import { createRecord, deleteRecord, listRecords } from "./records";
import { DataverseError } from "./errors";

// PROJ-11: Tabelle "Portalzugang" — ein Datensatz = ein Kontakt hat Zugang
// zu einem Standort im Kundenportal. Entziehen = Datensatz löschen
// ("vorhanden = Zugang", gleiche Regel für den Kundenportal-Sync).
// Namen am 2026-10-09 aus dem Dataverse-Schema gelesen; alternativer
// Schlüssel "bmvcc_kontaktzustandort" (Kontakt + Standort) verhindert Doppelungen.
const PORTALZUGAENGE_ENTITY = "bmvcc_portalzugangs";
const KONTAKTE_ENTITY = "bmvcc_kontakts";
const STANDORTE_ENTITY = "bmvcc_organizationlocations";
const NAME_MAX = 100;

export interface Portalzugang {
  id: string;
  kontaktId: string;
  standortId: string;
}

const GUID_PATTERN = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function requireValidGuid(value: string, label: string): void {
  if (!GUID_PATTERN.test(value)) {
    throw new Error(`${label} muss eine gültige GUID sein, erhalten: "${value}"`);
  }
}

// Gleiche Blockgrösse wie bei Kontakten/Geräten (Dataverse-URL-Längenlimit).
const ID_CHUNK_SIZE = 20;

function zuPortalzugang(r: Record<string, unknown>): Portalzugang | null {
  const kontaktId = r._bmvcc_kontakt_value;
  const standortId = r._bmvcc_standort_value;
  // Verweise sind in Dataverse nicht als Pflicht markiert und werden beim
  // Löschen von Kontakt/Standort nur entfernt — solche Waisen ignorieren.
  if (typeof kontaktId !== "string" || typeof standortId !== "string") return null;
  return { id: r.bmvcc_portalzugangid as string, kontaktId, standortId };
}

/** Alle Portalzugänge der angegebenen Kontakte (über alle Firmen/Standorte). */
export async function listPortalzugaengeForKontakte(kontaktIds: string[]): Promise<Portalzugang[]> {
  kontaktIds.forEach((id) => requireValidGuid(id, "kontaktId"));
  const bloecke: string[][] = [];
  for (let i = 0; i < kontaktIds.length; i += ID_CHUNK_SIZE) bloecke.push(kontaktIds.slice(i, i + ID_CHUNK_SIZE));

  const ergebnisse = await Promise.all(
    bloecke.map(async (ids) => {
      const { records } = await listRecords(PORTALZUGAENGE_ENTITY, {
        select: ["bmvcc_portalzugangid", "_bmvcc_kontakt_value", "_bmvcc_standort_value"],
        filter: ids.map((id) => `_bmvcc_kontakt_value eq ${id}`).join(" or "),
        top: 5000,
      });
      return records;
    })
  );
  return ergebnisse.flat().map(zuPortalzugang).filter((z): z is Portalzugang => z !== null);
}

/**
 * Legt den Portalzugang an, falls er noch nicht existiert (idempotent).
 * Gleichzeitige Klicks: Dataverse verhindert Doppelungen über den
 * alternativen Schlüssel — dann gilt der Zugang ebenfalls als vorhanden.
 */
export async function erstellePortalzugang(kontaktId: string, standortId: string, name: string): Promise<void> {
  requireValidGuid(kontaktId, "kontaktId");
  requireValidGuid(standortId, "standortId");

  const bestehende = (await listPortalzugaengeForKontakte([kontaktId])).filter((z) => z.standortId === standortId);
  if (bestehende.length > 0) return;

  try {
    await createRecord(PORTALZUGAENGE_ENTITY, {
      bmvcc_name: name.length > NAME_MAX ? `${name.slice(0, NAME_MAX - 1)}…` : name,
      "bmvcc_Kontakt@odata.bind": `/${KONTAKTE_ENTITY}(${kontaktId})`,
      "bmvcc_Standort@odata.bind": `/${STANDORTE_ENTITY}(${standortId})`,
    });
  } catch (error) {
    const jetzt = (await listPortalzugaengeForKontakte([kontaktId])).some((z) => z.standortId === standortId);
    if (!jetzt) throw error;
  }
}

/** Entzieht den Portalzugang (löscht alle passenden Datensätze, auch allfällige Doppelungen). */
export async function entfernePortalzugang(kontaktId: string, standortId: string): Promise<void> {
  requireValidGuid(kontaktId, "kontaktId");
  requireValidGuid(standortId, "standortId");

  const passende = (await listPortalzugaengeForKontakte([kontaktId])).filter((z) => z.standortId === standortId);
  for (const zugang of passende) {
    try {
      await deleteRecord(PORTALZUGAENGE_ENTITY, zugang.id);
    } catch (error) {
      // Bereits von jemand anderem entfernt → Ziel erreicht.
      if (!(error instanceof DataverseError && error.category === "not_found")) throw error;
    }
  }
}
