import { createRecord, listRecords } from "./records";
import type { SyncBereich, SyncErgebnis, SyncStatus } from "@/lib/kundenportal-sync";

// PROJ-6: Verlauf der Kundenportal-Syncs in der eigenen Dataverse-Tabelle
// "Sync-Lauf" (vom Nutzer angelegt, Schema per Metadaten verifiziert
// 2026-10-07, siehe PROJ-6 Spec). Einträge werden nur angelegt und gelesen,
// nie geändert oder gelöscht.
const SYNC_LAEUFE_ENTITY = "bmvcc_synclaufs";
const FIRMEN_ENTITY = "bmvcc_firmas";
// PROJ-12: Spalte "Standort" (Nachschlagen, optional; leer = Lauf der ganzen
// Firma), Schema am 2026-10-09 gelesen.
const STANDORTE_ENTITY = "bmvcc_organizationlocations";

const SELECT = [
  "bmvcc_synclaufid",
  "_bmvcc_firma_value",
  "_bmvcc_standort_value",
  "bmvcc_gestartedam",
  "bmvcc_dauersekunden",
  "bmvcc_ausgelostvon",
  "bmvcc_ergebnis",
  "bmvcc_meldung",
  "bmvcc_details",
];

// Spaltengrenzen laut Dataverse-Metadaten.
const MAX_NAME = 200;
const MAX_AUSGELOEST_VON = 200;
const MAX_MELDUNG = 500;
const MAX_DETAILS = 100_000;

export const SEITEN_GROESSE = 20;

export interface SyncLauf {
  id: string;
  firmaId: string;
  /** PROJ-12: Standort des Laufs; `null` = ganze Firma (alle Läufe vor PROJ-12, Firmen ohne Standort). */
  standortId: string | null;
  /** ISO-Zeitstempel (UTC). */
  gestartetAm: string;
  dauerSekunden: number | null;
  ausgeloestVon: string | null;
  ergebnis: SyncErgebnis;
}

const STATUS_WERTE: SyncStatus[] = ["erfolg", "teilweise", "fehler", "unbekannt"];

const GUID_PATTERN = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function requireValidGuid(value: string, label: string): void {
  if (!GUID_PATTERN.test(value)) {
    throw new Error(`${label} muss eine gültige GUID sein, erhalten: "${value}"`);
  }
}

function kuerze(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

function formatZeitpunkt(datum: Date): string {
  return new Intl.DateTimeFormat("de-CH", {
    timeZone: "Europe/Zurich",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(datum);
}

/**
 * Details (Zahlen + Probleme) als JSON. Überschreitet das die Spaltengrenze,
 * werden zuerst Probleme vom Ende her entfernt (mit Vermerk), notfalls auch
 * die Zahlen — der Eintrag selbst wird nie verworfen.
 */
export function serialisiereDetails(bereiche: SyncBereich[], probleme: string[]): string {
  let behalten = [...probleme];
  let entfernt = 0;
  let json = JSON.stringify({ bereiche, probleme: behalten });
  while (json.length > MAX_DETAILS && behalten.length > 0) {
    behalten = behalten.slice(0, -1);
    entfernt++;
    json = JSON.stringify({ bereiche, probleme: [...behalten, `… ${entfernt} weitere Probleme gekürzt`] });
  }
  if (json.length > MAX_DETAILS) {
    json = JSON.stringify({ bereiche: [], probleme: ["Details zu umfangreich — gekürzt"] });
  }
  return json;
}

function parseDetails(raw: unknown): { bereiche: SyncBereich[]; probleme: string[] } {
  if (typeof raw !== "string" || !raw) return { bereiche: [], probleme: [] };
  try {
    const parsed = JSON.parse(raw) as { bereiche?: unknown; probleme?: unknown };
    return {
      bereiche: Array.isArray(parsed.bereiche) ? (parsed.bereiche as SyncBereich[]) : [],
      probleme: Array.isArray(parsed.probleme) ? parsed.probleme.filter((p): p is string => typeof p === "string") : [],
    };
  } catch {
    return { bereiche: [], probleme: ["Details konnten nicht gelesen werden."] };
  }
}

function mapSyncLauf(raw: Record<string, unknown>): SyncLauf {
  const status = STATUS_WERTE.includes(raw.bmvcc_ergebnis as SyncStatus) ? (raw.bmvcc_ergebnis as SyncStatus) : "unbekannt";
  const { bereiche, probleme } = parseDetails(raw.bmvcc_details);
  return {
    id: raw.bmvcc_synclaufid as string,
    firmaId: raw._bmvcc_firma_value as string,
    standortId: typeof raw._bmvcc_standort_value === "string" ? raw._bmvcc_standort_value : null,
    gestartetAm: raw.bmvcc_gestartedam as string,
    dauerSekunden: typeof raw.bmvcc_dauersekunden === "number" ? raw.bmvcc_dauersekunden : null,
    ausgeloestVon: typeof raw.bmvcc_ausgelostvon === "string" ? raw.bmvcc_ausgelostvon : null,
    ergebnis: {
      status,
      meldung: typeof raw.bmvcc_meldung === "string" ? raw.bmvcc_meldung : "",
      bereiche,
      probleme,
    },
  };
}

export interface NeuerSyncLauf {
  firmaId: string;
  firmaName: string;
  /** PROJ-12: übertragener Standort; fehlt = ganze Firma. */
  standort?: { id: string; name: string } | null;
  gestartetAm: Date;
  dauerSekunden: number;
  ausgeloestVon: string;
  ergebnis: SyncErgebnis;
}

export async function erstelleSyncLauf(lauf: NeuerSyncLauf): Promise<SyncLauf> {
  requireValidGuid(lauf.firmaId, "firmaId");
  if (lauf.standort) requireValidGuid(lauf.standort.id, "standortId");

  const ausgeloestVon = kuerze(lauf.ausgeloestVon, MAX_AUSGELOEST_VON);
  const meldung = kuerze(lauf.ergebnis.meldung, MAX_MELDUNG);
  const details = serialisiereDetails(lauf.ergebnis.bereiche, lauf.ergebnis.probleme);

  const { id } = await createRecord(SYNC_LAEUFE_ENTITY, {
    bmvcc_name: kuerze(
      `${lauf.firmaName}${lauf.standort ? ` · ${lauf.standort.name}` : ""} – ${formatZeitpunkt(lauf.gestartetAm)}`,
      MAX_NAME
    ),
    // Navigationseigenschaften per Metadaten verifiziert (ReferencingEntityNavigationPropertyName).
    "bmvcc_Firma@odata.bind": `/${FIRMEN_ENTITY}(${lauf.firmaId})`,
    ...(lauf.standort ? { "bmvcc_Standort@odata.bind": `/${STANDORTE_ENTITY}(${lauf.standort.id})` } : {}),
    bmvcc_gestartedam: lauf.gestartetAm.toISOString(),
    bmvcc_dauersekunden: lauf.dauerSekunden,
    bmvcc_ausgelostvon: ausgeloestVon,
    bmvcc_ergebnis: lauf.ergebnis.status,
    bmvcc_meldung: meldung,
    bmvcc_details: details,
  });

  return {
    id,
    firmaId: lauf.firmaId,
    standortId: lauf.standort?.id ?? null,
    gestartetAm: lauf.gestartetAm.toISOString(),
    dauerSekunden: lauf.dauerSekunden,
    ausgeloestVon,
    ergebnis: { ...lauf.ergebnis, meldung, ...parseDetails(details) },
  };
}

/**
 * Läufe einer Firma, neueste zuerst. `vor` (ISO-Zeitstempel des zuletzt
 * angezeigten Laufs) lädt die nächsten älteren — stabile Fortsetzung, auch
 * wenn oben inzwischen neue Läufe hinzugekommen sind.
 *
 * PROJ-12: mit `standortId` nur die Läufe dieses Standorts plus die Läufe der
 * ganzen Firma (ohne Standort) — Läufe anderer Standorte erscheinen nicht.
 */
export async function listSyncLaeufeForFirma(
  firmaId: string,
  options: { vor?: string; standortId?: string | null } = {}
): Promise<{ laeufe: SyncLauf[]; hatMehr: boolean }> {
  requireValidGuid(firmaId, "firmaId");
  if (options.standortId) requireValidGuid(options.standortId, "standortId");

  let filter = `_bmvcc_firma_value eq ${firmaId}`;
  if (options.standortId) {
    filter += ` and (_bmvcc_standort_value eq ${options.standortId} or _bmvcc_standort_value eq null)`;
  }
  if (options.vor) {
    const vor = new Date(options.vor);
    if (Number.isNaN(vor.getTime())) throw new Error(`vor muss ein gültiger Zeitstempel sein, erhalten: "${options.vor}"`);
    filter += ` and bmvcc_gestartedam lt ${vor.toISOString()}`;
  }

  // Einen mehr laden, um zu wissen, ob es weitere ältere Läufe gibt.
  const { records } = await listRecords(SYNC_LAEUFE_ENTITY, {
    select: SELECT,
    filter,
    orderBy: "bmvcc_gestartedam desc,createdon desc",
    top: SEITEN_GROESSE + 1,
  });

  return {
    laeufe: records.slice(0, SEITEN_GROESSE).map(mapSyncLauf),
    hatMehr: records.length > SEITEN_GROESSE,
  };
}
