import { getRecord, listRecords, updateRecord } from "./records";
import { DataverseError } from "./errors";
import { entfernePortalzugang, erstellePortalzugang, listPortalzugaengeForKontakte } from "./portalzugaenge";

// Kontakte liegen in der eigenen Tabelle bmvcc_kontakt (nicht in der
// Standard-Tabelle contact). Die Zuordnung zur Firma läuft über die
// Bexio-Relationen bmvcc_relation — der direkte Lookup bmvcc_parent_account
// und die N:N-Beziehung Firma↔Kontakt sind in den echten Daten leer
// (verifiziert 2026-10-06, siehe PROJ-8 Spec "Datengrundlage").
const KONTAKTE_ENTITY = "bmvcc_kontakts";
const RELATIONEN_ENTITY = "bmvcc_relations";
const AKTIV = 0;

export interface KundenportalKontakt {
  id: string;
  /** "Vorname Nachname" (bmvcc_name_2 + bmvcc_name_1). */
  name: string;
  email: string | null;
  /** Rollen aus den Bexio-Relationen zu dieser Firma (Freitext, kann leer sein). */
  rollen: string[];
  /** PROJ-11: Portalzugang zum aktuellen Standort. */
  freigegeben: boolean;
  /** PROJ-11: weitere Standorte DIESER Firma, für die der Kontakt freigegeben ist (Anzeigenamen). */
  weitereStandorte: string[];
}

/** PROJ-11: Kontakt hat Portalzugang zu irgendeinem Standort der Firma (Sync-Voraussetzung, PROJ-5). */
export function hatZugangBeiFirma(kontakt: KundenportalKontakt): boolean {
  return kontakt.freigegeben || kontakt.weitereStandorte.length > 0;
}

/** Standort der aktuellen Firma mit Anzeigename (aus dem Arbeitskontext, PROJ-10). */
export interface FreigabeStandort {
  id: string;
  name: string;
}

const GUID_PATTERN = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

// IDs werden unquotiert in einen OData-$filter eingesetzt — dieselbe
// Absicherung gegen Injection wie in geraete.ts/pruefberichte.ts.
function requireValidGuid(value: string, label: string): void {
  if (!GUID_PATTERN.test(value)) {
    throw new Error(`${label} muss eine gültige GUID sein, erhalten: "${value}"`);
  }
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

// Gleiche Blockgrösse wie bei Geräten/Prüfberichten, um das Dataverse-URL-Längenlimit
// bei langen OR-Filterketten zu vermeiden.
const ID_CHUNK_SIZE = 20;

/**
 * Alle aktiven Kontakte einer Firma mit ihrer Kundenportal-Freigabe für den
 * aktuellen Standort (PROJ-11) und den übrigen freigegebenen Standorten der
 * Firma, sortiert nach Nachname, Vorname.
 */
export async function listKundenportalKontakteForFirma(
  firmaId: string,
  standorte: FreigabeStandort[],
  aktuellerStandortId: string
): Promise<KundenportalKontakt[]> {
  requireValidGuid(firmaId, "firmaId");

  const { records: relationen } = await listRecords(RELATIONEN_ENTITY, {
    select: ["_bmvcc_person_value", "bmvcc_role_description"],
    filter: `_bmvcc_firma_value eq ${firmaId} and statecode eq ${AKTIV}`,
    top: 5000,
  });

  // Mehrere Relationen derselben Person zur selben Firma (z.B. zwei Rollen)
  // werden zu einem Eintrag zusammengefasst.
  const rollenProPerson = new Map<string, string[]>();
  for (const relation of relationen) {
    const personId = asString(relation._bmvcc_person_value);
    if (!personId) continue;
    const rollen = rollenProPerson.get(personId) ?? [];
    const rolle = asString(relation.bmvcc_role_description);
    if (rolle && !rollen.includes(rolle)) rollen.push(rolle);
    rollenProPerson.set(personId, rollen);
  }

  const personIds = [...rollenProPerson.keys()];
  if (personIds.length === 0) return [];

  const blocke = chunk(personIds, ID_CHUNK_SIZE);
  const [kontaktBlocke, zugaenge] = await Promise.all([
    Promise.all(
      blocke.map(async (ids) => {
        const idFilter = ids.map((id) => `bmvcc_kontaktid eq ${id}`).join(" or ");
        const { records } = await listRecords(KONTAKTE_ENTITY, {
          select: ["bmvcc_kontaktid", "bmvcc_name_1", "bmvcc_name_2", "bmvcc_mail"],
          filter: `(${idFilter}) and statecode eq ${AKTIV}`,
          top: 5000,
        });
        return records;
      })
    ),
    listPortalzugaengeForKontakte(personIds),
  ]);

  // Nur Zugänge zu Standorten DIESER Firma zählen (Zugänge bei anderen Firmen
  // sind unabhängig und hier nicht relevant).
  const standortNamen = new Map(standorte.map((s) => [s.id, s.name]));
  const standorteProKontakt = new Map<string, Set<string>>();
  for (const z of zugaenge) {
    if (!standortNamen.has(z.standortId)) continue;
    standorteProKontakt.set(z.kontaktId, (standorteProKontakt.get(z.kontaktId) ?? new Set()).add(z.standortId));
  }

  const kontakte = kontaktBlocke.flat().map((raw) => {
    const id = raw.bmvcc_kontaktid as string;
    const vorname = asString(raw.bmvcc_name_2);
    const nachname = asString(raw.bmvcc_name_1);
    return {
      sortierName: `${nachname ?? ""} ${vorname ?? ""}`.trim(),
      kontakt: {
        id,
        name: [vorname, nachname].filter(Boolean).join(" ") || "—",
        email: asString(raw.bmvcc_mail),
        rollen: rollenProPerson.get(id) ?? [],
        freigegeben: standorteProKontakt.get(id)?.has(aktuellerStandortId) ?? false,
        weitereStandorte: [...(standorteProKontakt.get(id) ?? [])]
          .filter((standortId) => standortId !== aktuellerStandortId)
          .map((standortId) => standortNamen.get(standortId) as string)
          .sort((a, b) => a.localeCompare(b, "de")),
      } satisfies KundenportalKontakt,
    };
  });

  return kontakte
    .sort((a, b) => a.sortierName.localeCompare(b.sortierName, "de"))
    .map((k) => k.kontakt);
}

/**
 * PROJ-11: Setzt oder entzieht den Kundenportal-Zugang eines Kontakts zu
 * einem Standort.
 *
 * Serverseitig durchgesetzt (Server Actions sind direkt aufrufbar):
 * - der Kontakt gehört über eine aktive Bexio-Relation zur Firma (schliesst
 *   die PROJ-8-Lücke "beliebiger Kontakt änderbar");
 * - Freigeben nur für aktive Kontakte mit E-Mail; Entziehen immer (PROJ-8).
 * Dass der Standort zur Firma gehört, prüft der Aufrufer (Arbeitskontext).
 *
 * Übergang: Das bisherige Feld bmvcc_kundenportal wird mitgeführt —
 * gesetzt, solange der Kontakt mindestens einen Portalzugang hat (über alle
 * Firmen), damit das heutige Kundenportal unverändert weiterläuft.
 */
export async function setStandortFreigabe(params: {
  kontaktId: string;
  firmaId: string;
  standort: FreigabeStandort;
  freigegeben: boolean;
}): Promise<void> {
  const { kontaktId, firmaId, standort, freigegeben } = params;
  requireValidGuid(kontaktId, "kontaktId");
  requireValidGuid(firmaId, "firmaId");
  requireValidGuid(standort.id, "standortId");

  const { records: relationen } = await listRecords(RELATIONEN_ENTITY, {
    select: ["bmvcc_relationid"],
    filter: `_bmvcc_person_value eq ${kontaktId} and _bmvcc_firma_value eq ${firmaId} and statecode eq ${AKTIV}`,
    top: 1,
  });
  if (relationen.length === 0) {
    throw new DataverseError("validation_error", "Dieser Kontakt ist der gewählten Firma nicht zugeordnet.");
  }

  if (freigegeben) {
    const kontakt = await getRecord(KONTAKTE_ENTITY, kontaktId, {
      select: ["bmvcc_mail", "statecode", "bmvcc_name_1", "bmvcc_name_2"],
    });
    if (kontakt.statecode !== AKTIV) {
      throw new DataverseError("validation_error", "Ein inaktiver Kontakt kann nicht fürs Kundenportal freigegeben werden.");
    }
    if (!asString(kontakt.bmvcc_mail)) {
      throw new DataverseError(
        "validation_error",
        "Ein Kontakt ohne E-Mail-Adresse kann nicht fürs Kundenportal freigegeben werden."
      );
    }
    const name = [asString(kontakt.bmvcc_name_2), asString(kontakt.bmvcc_name_1)].filter(Boolean).join(" ") || "Kontakt";
    await erstellePortalzugang(kontaktId, standort.id, `${name} – ${standort.name}`);
  } else {
    await entfernePortalzugang(kontaktId, standort.id);
  }

  await aktualisiereKundenportalHaekchen(kontaktId);
}

/** Übergang (PROJ-11): bmvcc_kundenportal = "hat mindestens einen Portalzugang". */
export async function aktualisiereKundenportalHaekchen(kontaktId: string): Promise<void> {
  const hatZugang = (await listPortalzugaengeForKontakte([kontaktId])).length > 0;
  await updateRecord(KONTAKTE_ENTITY, kontaktId, { bmvcc_kundenportal: hatZugang });
}
