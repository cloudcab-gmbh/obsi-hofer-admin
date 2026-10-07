// Aufruf des Dataverse-Syncs im separaten Kundenportal-Repo
// (`/api/cron/sync-dataverse`, dort PROJ-12). Läuft ausschliesslich
// serverseitig — das Secret darf nie in den Browser.
//
// Absicherung gegen einen Gesamt-Sync aller Firmen (Live-Vorfall 2026-10-07,
// siehe PROJ-5): Seit dem Kundenportal-Deploy ist `firmaId` dort Pflicht
// (fehlend → Ablehnung). Die GUID-Prüfung hier, der Schalter
// KUNDENPORTAL_SYNC_AKTIV und die Mehr-als-eine-Firma-Erkennung bleiben als
// zusätzliche Verteidigungslinie bestehen — etwa falls im Kundenportal je
// wieder ein veralteter Stand deployt wird, der den Parameter ignoriert.

const GUID_PATTERN = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

// Knapp unter der maxDuration der Seite (300 s), damit statt eines harten
// Plattform-Abbruchs eine verständliche "Ergebnis unbekannt"-Meldung kommt.
export const SYNC_TIMEOUT_MS = 285_000;

export type SyncStatus = "erfolg" | "teilweise" | "fehler" | "unbekannt";

export interface SyncBereich {
  bereich: string;
  geladen: number;
  neu: number;
  aktualisiert: number;
  geloescht: number;
}

export interface SyncErgebnis {
  status: SyncStatus;
  meldung: string;
  bereiche: SyncBereich[];
  /** Vom Kundenportal gemeldete Fehler und Warnungen. */
  probleme: string[];
}

interface EndpointEntity {
  slug: string;
  fetched: number;
  added: number;
  updated: number;
  deleted: number;
}

const BEREICH_NAMEN: Record<string, string> = {
  firmen: "Firma",
  standorte: "Standorte",
  geraete: "Geräte",
  pruefberichte: "Prüfberichte",
  kontakte: "Kontakte",
  relationen: "Kontakt-Zuordnungen",
  artikel: "Artikel",
};

/**
 * Namen (nie Werte!) der fehlenden bzw. nicht aktivierten Einstellungen —
 * leer, wenn der Sync bereit ist. Live-Fund (2026-10-07): ein einfaches
 * "nicht aktiviert" liess offen, welche Variable in Vercel fehlte.
 */
export function fehlendeSyncEinstellungen(): string[] {
  const fehlend: string[] = [];
  if (!process.env.KUNDENPORTAL_SYNC_URL?.trim()) fehlend.push("KUNDENPORTAL_SYNC_URL");
  if (!process.env.KUNDENPORTAL_CRON_SECRET?.trim()) fehlend.push("KUNDENPORTAL_CRON_SECRET");
  // Tolerant gegenüber Gross-/Kleinschreibung und Leerzeichen aus der Vercel-Oberfläche.
  if (process.env.KUNDENPORTAL_SYNC_AKTIV?.trim().toLowerCase() !== "true") fehlend.push("KUNDENPORTAL_SYNC_AKTIV=true");
  return fehlend;
}

export function istSyncKonfiguriert(): boolean {
  return fehlendeSyncEinstellungen().length === 0;
}

function fehlerText(body: unknown): string | null {
  if (body && typeof body === "object") {
    const b = body as { error?: unknown; message?: unknown };
    if (typeof b.message === "string" && b.message) return b.message;
    if (typeof b.error === "string" && b.error) return b.error;
  }
  return null;
}

export async function starteFirmaSync(firmaId: string, firmaName: string): Promise<SyncErgebnis> {
  if (!GUID_PATTERN.test(firmaId)) {
    // Nie ohne gültige Firma-ID aufrufen — sonst droht ein Gesamt-Sync.
    throw new Error(`firmaId muss eine gültige GUID sein, erhalten: "${firmaId}"`);
  }

  const basisUrl = process.env.KUNDENPORTAL_SYNC_URL?.trim();
  const secret = process.env.KUNDENPORTAL_CRON_SECRET?.trim();
  if (!istSyncKonfiguriert() || !basisUrl || !secret) {
    return { status: "fehler", meldung: "Der Sync ist nicht konfiguriert.", bereiche: [], probleme: [] };
  }

  const url = new URL(basisUrl);
  url.searchParams.set("firmaId", firmaId);

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${secret}` },
      cache: "no-store",
      signal: AbortSignal.timeout(SYNC_TIMEOUT_MS),
    });
  } catch {
    return {
      status: "unbekannt",
      meldung:
        "Keine Antwort vom Kundenportal erhalten (Zeitüberschreitung oder Verbindungsfehler). Der Sync kann trotzdem durchgelaufen sein.",
      bereiche: [],
      probleme: [],
    };
  }

  const body: unknown = await res.json().catch(() => null);

  if (res.status === 401) {
    return {
      status: "fehler",
      meldung: "Der Sync ist nicht korrekt konfiguriert: das Kundenportal hat den Zugangsschlüssel abgelehnt.",
      bereiche: [],
      probleme: [],
    };
  }
  if (res.status === 404) {
    return {
      status: "fehler",
      meldung: `Die Firma „${firmaName}“ wurde vom Kundenportal in Dataverse nicht gefunden.`,
      bereiche: [],
      probleme: [],
    };
  }
  if (!res.ok) {
    const detail = fehlerText(body);
    return {
      status: "fehler",
      meldung: `Das Kundenportal meldet einen Fehler (HTTP ${res.status})${detail ? `: ${detail}` : "."}`,
      bereiche: [],
      probleme: [],
    };
  }

  const ergebnis = (body ?? {}) as { entities?: EndpointEntity[]; warnings?: string[]; errors?: string[] };
  const entities = Array.isArray(ergebnis.entities) ? ergebnis.entities : [];
  const probleme = [...(ergebnis.errors ?? []), ...(ergebnis.warnings ?? [])];

  // Zusätzliche Absicherung: ein Endpoint ohne Firma-Filter hätte mehr als
  // eine Firma geladen. Das darf nicht still als Erfolg durchgehen.
  const firmen = entities.find((e) => e.slug === "firmen");
  if (firmen && firmen.fetched > 1) {
    probleme.unshift(
      `Achtung: Das Kundenportal hat ${firmen.fetched} Firmen statt nur einer übertragen — der Firma-Filter ist dort offenbar nicht aktiv.`
    );
  }

  const bereiche = entities.map((e) => ({
    bereich: BEREICH_NAMEN[e.slug] ?? e.slug,
    geladen: e.fetched,
    neu: e.added,
    aktualisiert: e.updated,
    geloescht: e.deleted,
  }));

  if (probleme.length > 0) {
    return {
      status: "teilweise",
      meldung: `„${firmaName}“ wurde übertragen, das Kundenportal meldet aber Probleme.`,
      bereiche,
      probleme,
    };
  }
  return { status: "erfolg", meldung: `„${firmaName}“ wurde ins Kundenportal übertragen.`, bereiche, probleme };
}
