import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { dataverseFetch, dataverseUrl, getDataverseAccessToken, resetDataverseTokenCache } from "./client";
import { DataverseError } from "./errors";

function jsonResponse(body: unknown, init: { status?: number; headers?: Record<string, string> } = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "Content-Type": "application/json", ...init.headers },
  });
}

beforeEach(() => {
  resetDataverseTokenCache();
  vi.stubEnv("DATAVERSE_URL", "https://obsi-hofer.crm4.dynamics.com/");
  vi.stubEnv("AZURE_TENANT_ID", "tenant-id");
  vi.stubEnv("AZURE_CLIENT_ID", "client-id");
  vi.stubEnv("AZURE_CLIENT_SECRET", "client-secret");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("dataverseUrl", () => {
  it("strips a trailing slash from DATAVERSE_URL", () => {
    expect(dataverseUrl()).toBe("https://obsi-hofer.crm4.dynamics.com");
  });

  it("throws a clear error when DATAVERSE_URL is missing", () => {
    vi.stubEnv("DATAVERSE_URL", "");
    expect(() => dataverseUrl()).toThrow(/DATAVERSE_URL/);
  });
});

describe("getDataverseAccessToken", () => {
  it("requests and returns a token on first call", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ access_token: "token-1", expires_in: 3600 }));
    vi.stubGlobal("fetch", fetchMock);

    const token = await getDataverseAccessToken();

    expect(token).toBe("token-1");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://login.microsoftonline.com/tenant-id/oauth2/v2.0/token");
    expect(init.method).toBe("POST");
  });

  it("reuses a cached token instead of requesting a new one", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ access_token: "token-1", expires_in: 3600 }));
    vi.stubGlobal("fetch", fetchMock);

    await getDataverseAccessToken();
    await getDataverseAccessToken();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("requests a fresh token once the cached one is treated as expired", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: "token-1", expires_in: 1 }))
      .mockResolvedValueOnce(jsonResponse({ access_token: "token-2", expires_in: 3600 }));
    vi.stubGlobal("fetch", fetchMock);

    await getDataverseAccessToken();
    // expires_in=1s minus the 60s safety margin means the cached token is
    // already considered expired immediately — no need for a real sleep.
    const second = await getDataverseAccessToken();

    expect(second).toBe("token-2");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws an unavailable DataverseError when the token endpoint fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 500 })));

    await expect(getDataverseAccessToken()).rejects.toMatchObject({ category: "unavailable" });
  });

  it("throws an unavailable DataverseError on a network failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("fetch failed"))
    );

    await expect(getDataverseAccessToken()).rejects.toBeInstanceOf(DataverseError);
  });

  it("deduplicates concurrent requests into a single token request", async () => {
    let resolveFetch: (value: Response) => void;
    const fetchMock = vi.fn().mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const first = getDataverseAccessToken();
    const second = getDataverseAccessToken();

    resolveFetch!(jsonResponse({ access_token: "token-1", expires_in: 3600 }));
    const [a, b] = await Promise.all([first, second]);

    expect(a).toBe("token-1");
    expect(b).toBe("token-1");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("dataverseFetch", () => {
  function stubToken(fetchMock: ReturnType<typeof vi.fn>) {
    fetchMock.mockResolvedValueOnce(jsonResponse({ access_token: "token-1", expires_in: 3600 }));
  }

  it("resolves a relative path against the Dataverse base URL and sets standard headers", async () => {
    const fetchMock = vi.fn();
    stubToken(fetchMock);
    fetchMock.mockResolvedValueOnce(jsonResponse({ value: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await dataverseFetch("/api/data/v9.2/bmvcc_equipmentrecords");

    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe("https://obsi-hofer.crm4.dynamics.com/api/data/v9.2/bmvcc_equipmentrecords");
    expect(init.headers.Authorization).toBe("Bearer token-1");
    expect(init.headers["OData-Version"]).toBe("4.0");
  });

  // Next.js' gepatchter fetch löste bei Antworten ohne Body (z.B. 204 No
  // Content) einen internen Absturz beim Response-Klonen aus ("Cannot read
  // properties of null (reading 'locked')") — siehe PROJ-7 Implementation
  // Notes für den ursprünglichen Fund in graphFetch.
  it("opts out of Next.js' fetch caching to avoid a crash on bodyless responses", async () => {
    const fetchMock = vi.fn();
    stubToken(fetchMock);
    fetchMock.mockResolvedValueOnce(jsonResponse({ value: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await dataverseFetch("/api/data/v9.2/bmvcc_equipmentrecords");

    expect(fetchMock.mock.calls[1][1].cache).toBe("no-store");
  });

  it("calls an absolute URL (e.g. an @odata.nextLink) as-is", async () => {
    const fetchMock = vi.fn();
    stubToken(fetchMock);
    fetchMock.mockResolvedValueOnce(jsonResponse({ value: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const absoluteUrl = "https://obsi-hofer.crm4.dynamics.com/api/data/v9.2/bmvcc_equipmentrecords?$skiptoken=abc";
    await dataverseFetch(absoluteUrl);

    expect(fetchMock.mock.calls[1][0]).toBe(absoluteUrl);
  });

  it("maps a 404 response to a not_found DataverseError", async () => {
    const fetchMock = vi.fn();
    stubToken(fetchMock);
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: { message: "Does not exist" } }, { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(dataverseFetch("/api/data/v9.2/bmvcc_equipmentrecords(missing)")).rejects.toMatchObject({
      category: "not_found",
    });
  });

  it("maps a network failure to an unavailable DataverseError", async () => {
    const fetchMock = vi.fn();
    stubToken(fetchMock);
    fetchMock.mockRejectedValueOnce(new Error("fetch failed"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(dataverseFetch("/api/data/v9.2/bmvcc_equipmentrecords")).rejects.toMatchObject({
      category: "unavailable",
    });
  });

  it("refuses an absolute URL on a different host, without sending the token there", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(dataverseFetch("https://evil.example/steal-token")).rejects.toThrow(/unexpected host/);
    // Die Host-Prüfung schlägt fehl, bevor überhaupt ein Token geholt oder eine Anfrage gestellt wird.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("allows an absolute URL on the configured Dataverse host", async () => {
    const fetchMock = vi.fn();
    stubToken(fetchMock);
    fetchMock.mockResolvedValueOnce(jsonResponse({ value: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const sameHostUrl = "https://obsi-hofer.crm4.dynamics.com/api/data/v9.2/bmvcc_equipmentrecords?$skiptoken=abc";
    await expect(dataverseFetch(sameHostUrl)).resolves.toBeInstanceOf(Response);
  });
});
