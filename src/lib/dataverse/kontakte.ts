import { getRecord, listRecords, updateRecord } from "./records";
import { DataverseError } from "./errors";

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
  freigegeben: boolean;
  /** Kontakt ist zusätzlich weiteren Firmen zugeordnet — das Häkchen gilt dann auch dort. */
  weitereFirmen: boolean;
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
 * Alle aktiven Kontakte einer Firma mit ihrem Kundenportal-Freigabestatus,
 * sortiert nach Nachname, Vorname.
 */
export async function listKundenportalKontakteForFirma(firmaId: string): Promise<KundenportalKontakt[]> {
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
  const [kontaktBlocke, weitereBlocke] = await Promise.all([
    Promise.all(
      blocke.map(async (ids) => {
        const idFilter = ids.map((id) => `bmvcc_kontaktid eq ${id}`).join(" or ");
        const { records } = await listRecords(KONTAKTE_ENTITY, {
          select: ["bmvcc_kontaktid", "bmvcc_name_1", "bmvcc_name_2", "bmvcc_mail", "bmvcc_kundenportal"],
          filter: `(${idFilter}) and statecode eq ${AKTIV}`,
          top: 5000,
        });
        return records;
      })
    ),
    Promise.all(
      blocke.map(async (ids) => {
        const idFilter = ids.map((id) => `_bmvcc_person_value eq ${id}`).join(" or ");
        const { records } = await listRecords(RELATIONEN_ENTITY, {
          select: ["_bmvcc_person_value"],
          filter: `(${idFilter}) and _bmvcc_firma_value ne ${firmaId} and statecode eq ${AKTIV}`,
          top: 5000,
        });
        return records;
      })
    ),
  ]);

  const mitWeiterenFirmen = new Set(
    weitereBlocke.flat().map((r) => asString(r._bmvcc_person_value)).filter((id): id is string => !!id)
  );

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
        freigegeben: raw.bmvcc_kundenportal === true,
        weitereFirmen: mitWeiterenFirmen.has(id),
      } satisfies KundenportalKontakt,
    };
  });

  return kontakte
    .sort((a, b) => a.sortierName.localeCompare(b.sortierName, "de"))
    .map((k) => k.kontakt);
}

/**
 * Setzt oder entzieht die Kundenportal-Freigabe eines Kontakts. Schreibt
 * ausschliesslich das Feld bmvcc_kundenportal.
 *
 * Die Regeln der Oberfläche werden hier serverseitig erneut durchgesetzt
 * (gleiche Lehre wie QA BUG-1 in PROJ-4): Freigeben ist nur für aktive
 * Kontakte mit E-Mail-Adresse möglich. Entziehen ist immer erlaubt — auch
 * wenn die E-Mail inzwischen fehlt (PROJ-8 Edge Case).
 */
export async function setKundenportalFreigabe(kontaktId: string, freigegeben: boolean): Promise<void> {
  requireValidGuid(kontaktId, "kontaktId");

  if (freigegeben) {
    const kontakt = await getRecord(KONTAKTE_ENTITY, kontaktId, { select: ["bmvcc_mail", "statecode"] });
    if (kontakt.statecode !== AKTIV) {
      throw new DataverseError("validation_error", "Ein inaktiver Kontakt kann nicht fürs Kundenportal freigegeben werden.");
    }
    if (!asString(kontakt.bmvcc_mail)) {
      throw new DataverseError(
        "validation_error",
        "Ein Kontakt ohne E-Mail-Adresse kann nicht fürs Kundenportal freigegeben werden."
      );
    }
  }

  await updateRecord(KONTAKTE_ENTITY, kontaktId, { bmvcc_kundenportal: freigegeben });
}
