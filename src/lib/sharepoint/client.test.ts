import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { graphFetch, getGraphAccessToken, resetGraphTokenCache } from "./client";
import { SharePointError } from "./errors";

function jsonResponse(body: unknown, init: { status?: number } = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  resetGraphTokenCache();
  vi.stubEnv("AZURE_TENANT_ID", "tenant-id");
  vi.stubEnv("AZURE_CLIENT_ID", "client-id");
  vi.stubEnv("AZURE_CLIENT_SECRET", "client-secret");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("getGraphAccessToken", () => {
  it("requests a token with the Microsoft Graph scope", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ access_token: "token-1", expires_in: 3600 }));
    vi.stubGlobal("fetch", fetchMock);

    const token = await getGraphAccessToken();

    expect(token).toBe("token-1");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://login.microsoftonline.com/tenant-id/oauth2/v2.0/token");
    const body = init.body as URLSearchParams;
    expect(body.get("scope")).toBe("https://graph.microsoft.com/.default");
  });

  it("reuses a cached token instead of requesting a new one", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ access_token: "token-1", expires_in: 3600 }));
    vi.stubGlobal("fetch", fetchMock);

    await getGraphAccessToken();
    await getGraphAccessToken();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("keeps its own cache separate from the Dataverse token cache", async () => {
    // Beide Token-Caches sind unabhängige Module-Level-Variablen — ein hier
    // ausgestelltes Graph-Token darf das (gemockte) Dataverse-Token nicht
    // überschreiben oder umgekehrt beeinflussen. Hier nur sichergestellt,
    // dass ein Reset dieses Caches tatsächlich zu einer neuen Anfrage führt.
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: "token-1", expires_in: 3600 }))
      .mockResolvedValueOnce(jsonResponse({ access_token: "token-2", expires_in: 3600 }));
    vi.stubGlobal("fetch", fetchMock);

    await getGraphAccessToken();
    resetGraphTokenCache();
    const second = await getGraphAccessToken();

    expect(second).toBe("token-2");
  });

  it("throws an unavailable SharePointError when the token endpoint fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 500 })));

    await expect(getGraphAccessToken()).rejects.toMatchObject({ category: "unavailable" });
  });
});

describe("graphFetch", () => {
  function stubToken(fetchMock: ReturnType<typeof vi.fn>) {
    fetchMock.mockResolvedValueOnce(jsonResponse({ access_token: "token-1", expires_in: 3600 }));
  }

  it("resolves a relative path against the Graph base URL and sets the bearer token", async () => {
    const fetchMock = vi.fn();
    stubToken(fetchMock);
    fetchMock.mockResolvedValueOnce(jsonResponse({ value: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await graphFetch("/sites/obsihofer.sharepoint.com");

    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe("https://graph.microsoft.com/v1.0/sites/obsihofer.sharepoint.com");
    expect(init.headers.Authorization).toBe("Bearer token-1");
  });

  // Next.js' gepatchter fetch stürzte bei Antworten ohne Body (z.B. das 204
  // No Content der DELETE-Anfrage beim Aufräumen der temporären Arbeitskopie)
  // mit "Cannot read properties of null (reading 'locked')" ab — live im
  // produktiven PDF-Export gefunden.
  it("opts out of Next.js' fetch caching to avoid a crash on bodyless responses", async () => {
    const fetchMock = vi.fn();
    stubToken(fetchMock);
    fetchMock.mockResolvedValueOnce(jsonResponse({ value: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await graphFetch("/sites/obsihofer.sharepoint.com");

    expect(fetchMock.mock.calls[1][1].cache).toBe("no-store");
  });

  it("maps a 404 response to a not_found SharePointError", async () => {
    const fetchMock = vi.fn();
    stubToken(fetchMock);
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: { message: "not found" } }, { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(graphFetch("/drives/x/root:/missing:/children")).rejects.toMatchObject({ category: "not_found" });
  });

  it("maps a network failure to an unavailable SharePointError", async () => {
    const fetchMock = vi.fn();
    stubToken(fetchMock);
    fetchMock.mockRejectedValueOnce(new Error("fetch failed"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(graphFetch("/sites/obsihofer.sharepoint.com")).rejects.toBeInstanceOf(SharePointError);
  });
});
