import { SharePointError, sharePointErrorFromNetworkFailure, sharePointErrorFromResponse } from "./errors";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

interface CachedToken {
  value: string;
  expiresAt: number;
}

// Eigener Cache, getrennt vom Dataverse-Token (dataverse/client.ts) — ein
// Client-Credentials-Token ist immer an genau einen Scope/eine Audience
// gebunden, das Dataverse-Token kann also nicht für Graph wiederverwendet
// werden, obwohl dieselbe Azure-AD-App-Registrierung (PROJ-1/2) beide Rollen
// übernimmt.
let cachedToken: CachedToken | null = null;
let pendingTokenRequest: Promise<string> | null = null;

/** Nur für Tests: erzwingt eine erneute Token-Beschaffung beim nächsten Aufruf. */
export function resetGraphTokenCache(): void {
  cachedToken = null;
  pendingTokenRequest = null;
}

export async function getGraphAccessToken(): Promise<string> {
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
    scope: "https://graph.microsoft.com/.default",
  });

  let res: Response;
  try {
    res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
  } catch {
    throw sharePointErrorFromNetworkFailure();
  }

  if (!res.ok) {
    throw new SharePointError("unavailable", `Zugriffstoken für Microsoft Graph konnte nicht beschafft werden (${res.status}).`);
  }

  const json: { access_token?: string; expires_in?: number } = await res.json();
  if (!json.access_token) {
    throw new SharePointError("unavailable", "Token-Antwort enthielt kein access_token.");
  }

  cachedToken = {
    value: json.access_token,
    expiresAt: Date.now() + (json.expires_in ? json.expires_in * 1000 - 60_000 : 5 * 60_000),
  };
  return cachedToken.value;
}

/**
 * Zentraler Zugriffspunkt für alle Microsoft-Graph-Anfragen: holt/erneuert
 * das Token, setzt die Standard-Header und übersetzt Fehler in
 * SharePointError-Kategorien. `pathOrUrl` ist entweder ein Pfad ab
 * GRAPH_BASE (z.B. "/sites/...") oder eine vollständige Graph-URL.
 */
export async function graphFetch(pathOrUrl: string, init: RequestInit = {}): Promise<Response> {
  const url = pathOrUrl.startsWith("http") ? pathOrUrl : `${GRAPH_BASE}${pathOrUrl}`;
  const token = await getGraphAccessToken();

  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...init.headers,
      },
    });
  } catch {
    throw sharePointErrorFromNetworkFailure();
  }

  if (!res.ok) {
    throw await sharePointErrorFromResponse(res);
  }

  return res;
}
