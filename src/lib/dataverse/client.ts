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

/** Nur für Tests: erzwingt eine erneute Token-Beschaffung beim nächsten Aufruf. */
export function resetDataverseTokenCache(): void {
  cachedToken = null;
}

export async function getDataverseAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.value;
  }

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
  return pathOrUrl.startsWith("http") ? pathOrUrl : `${dataverseUrl()}${pathOrUrl}`;
}

/**
 * Zentraler Zugriffspunkt für alle Dataverse-Anfragen: holt/erneuert das Token,
 * setzt die Standard-Header und übersetzt Fehler in DataverseError-Kategorien.
 * `pathOrUrl` ist entweder ein Pfad ab der Dataverse-Basis-URL (z.B. "/api/data/v9.2/...")
 * oder eine vollständige URL (z.B. ein "@odata.nextLink" aus einer vorherigen Listenabfrage).
 */
export async function dataverseFetch(pathOrUrl: string, init: RequestInit = {}): Promise<Response> {
  const token = await getDataverseAccessToken();

  let res: Response;
  try {
    res = await fetch(resolveUrl(pathOrUrl), {
      ...init,
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
