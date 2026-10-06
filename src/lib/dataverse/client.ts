import { DataverseError, dataverseErrorFromNetworkFailure, dataverseErrorFromResponse } from "./errors";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function dataverseUrl(): string {
  return requireEnv("DATAVERSE_URL").replace(/\/$/, "");
}

interface CachedToken {
  value: string;
  expiresAt: number;
}

let cachedToken: CachedToken | null = null;
// Dedupliziert gleichzeitige Token-Anfragen (z.B. direkt nach einem Kaltstart, bevor
// der Cache gefüllt ist) — alle Aufrufer teilen sich dieselbe laufende Anfrage, statt
// jeweils eine eigene redundante Anfrage an den Microsoft-Token-Endpoint zu stellen.
let pendingTokenRequest: Promise<string> | null = null;

/** Nur für Tests: erzwingt eine erneute Token-Beschaffung beim nächsten Aufruf. */
export function resetDataverseTokenCache(): void {
  cachedToken = null;
  pendingTokenRequest = null;
}

export async function getDataverseAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.value;
  }
  if (pendingTokenRequest) {
    return pendingTokenRequest;
  }

  pendingTokenRequest = requestNewToken().finally(() => {
    pendingTokenRequest = null;
  });
  return pendingTokenRequest;
}

async function requestNewToken(): Promise<string> {
  const tenantId = requireEnv("AZURE_TENANT_ID");
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: requireEnv("AZURE_CLIENT_ID"),
    client_secret: requireEnv("AZURE_CLIENT_SECRET"),
    scope: `${dataverseUrl()}/.default`,
  });

  let res: Response;
  try {
    res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
  } catch {
    throw dataverseErrorFromNetworkFailure();
  }

  if (!res.ok) {
    throw new DataverseError(
      "unavailable",
      `Zugriffstoken für Dataverse konnte nicht beschafft werden (${res.status}).`
    );
  }

  const json: { access_token?: string; expires_in?: number } = await res.json();
  if (!json.access_token) {
    throw new DataverseError("unavailable", "Token-Antwort enthielt kein access_token.");
  }

  cachedToken = {
    value: json.access_token,
    // Etwas vor dem tatsächlichen Ablauf erneuern, um knappe Rennen zu vermeiden.
    expiresAt: Date.now() + (json.expires_in ? json.expires_in * 1000 - 60_000 : 5 * 60_000),
  };
  return cachedToken.value;
}

function resolveUrl(pathOrUrl: string): string {
  if (!pathOrUrl.startsWith("http")) {
    return `${dataverseUrl()}${pathOrUrl}`;
  }

  const base = dataverseUrl();
  if (pathOrUrl !== base && !pathOrUrl.startsWith(`${base}/`)) {
    // Verhindert, dass das echte Dataverse-Bearer-Token an eine fremde URL geschickt wird
    // (z.B. ein nicht erneut geprüfter @odata.nextLink/pageCursor aus unsicherer Quelle).
    throw new Error(`Refusing to send the Dataverse access token to an unexpected host: ${pathOrUrl}`);
  }
  return pathOrUrl;
}

/**
 * Zentraler Zugriffspunkt für alle Dataverse-Anfragen: holt/erneuert das Token,
 * setzt die Standard-Header und übersetzt Fehler in DataverseError-Kategorien.
 * `pathOrUrl` ist entweder ein Pfad ab der Dataverse-Basis-URL (z.B. "/api/data/v9.2/...")
 * oder eine vollständige URL (z.B. ein "@odata.nextLink" aus einer vorherigen Listenabfrage).
 */
export async function dataverseFetch(pathOrUrl: string, init: RequestInit = {}): Promise<Response> {
  // Ausserhalb des try/catch: ein Origin-Verstoss ist ein Programmfehler/Sicherheitsproblem,
  // kein Netzwerkfehler, und soll nicht in eine generische "unavailable"-Meldung verwandelt werden.
  const url = resolveUrl(pathOrUrl);
  const token = await getDataverseAccessToken();

  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      // Next.js patcht den globalen fetch für sein eigenes Data-/Request-
      // Caching, was bei Antworten ohne Body (z.B. 204 No Content) zu einem
      // Absturz beim internen Response-Klonen führen kann ("Cannot read
      // properties of null (reading 'locked')", siehe PROJ-7 Implementation
      // Notes für den Fund). Dataverse-Antworten sollen ohnehin nie gecacht
      // werden, daher hier vorsorglich dieselbe Absicherung.
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw dataverseErrorFromNetworkFailure();
  }

  if (!res.ok) {
    throw await dataverseErrorFromResponse(res);
  }

  return res;
}
