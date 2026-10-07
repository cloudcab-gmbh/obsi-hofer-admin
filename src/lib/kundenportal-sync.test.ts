import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { istSyncKonfiguriert, starteFirmaSync } from "./kundenportal-sync";

const FIRMA_ID = "37b3cb61-90c0-f111-aaaf-70a8a5061d7a";
const fetchMock = vi.fn();

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function entity(slug: string, fetched = 1, added = 0, updated = 1, deleted = 0) {
  return { slug, fetched, added, updated, deleted, skippedDueToThreshold: false };
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("KUNDENPORTAL_SYNC_URL", "https://portal.example/api/cron/sync-dataverse");
  vi.stubEnv("KUNDENPORTAL_CRON_SECRET", "geheim");
  vi.stubEnv("KUNDENPORTAL_SYNC_AKTIV", "true");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("istSyncKonfiguriert", () => {
  it("is only true when the safety switch is exactly 'true' and URL + secret are set", () => {
    expect(istSyncKonfiguriert()).toBe(true);
    vi.stubEnv("KUNDENPORTAL_SYNC_AKTIV", "");
    expect(istSyncKonfiguriert()).toBe(false);
    vi.stubEnv("KUNDENPORTAL_SYNC_AKTIV", "1");
    expect(istSyncKonfiguriert()).toBe(false);
    vi.stubEnv("KUNDENPORTAL_SYNC_AKTIV", "true");
    vi.stubEnv("KUNDENPORTAL_CRON_SECRET", "");
    expect(istSyncKonfiguriert()).toBe(false);
  });
});

describe("starteFirmaSync", () => {
  it("never calls the endpoint without a valid firmaId (it would otherwise sync ALL firms)", async () => {
    await expect(starteFirmaSync("", "Firma")).rejects.toThrow();
    await expect(starteFirmaSync("abc", "Firma")).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not call the endpoint while the safety switch is off", async () => {
    vi.stubEnv("KUNDENPORTAL_SYNC_AKTIV", "");

    const ergebnis = await starteFirmaSync(FIRMA_ID, "Firma");

    expect(ergebnis.status).toBe("fehler");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("calls the endpoint with the firmaId query parameter and the bearer secret", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { entities: [entity("firmen")], warnings: [], errors: [] }));

    await starteFirmaSync(FIRMA_ID, "Firma");

    const [url, init] = fetchMock.mock.calls[0];
    expect(new URL(url).searchParams.get("firmaId")).toBe(FIRMA_ID);
    expect(init.headers).toEqual({ Authorization: "Bearer geheim" });
  });

  it("reports success with German area labels and counts", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { entities: [entity("firmen"), entity("geraete", 12, 1, 11, 0)], warnings: [], errors: [] })
    );

    const ergebnis = await starteFirmaSync(FIRMA_ID, "Beispiel AG");

    expect(ergebnis.status).toBe("erfolg");
    expect(ergebnis.meldung).toContain("Beispiel AG");
    expect(ergebnis.bereiche).toContainEqual({ bereich: "Geräte", geladen: 12, neu: 1, aktualisiert: 11, geloescht: 0 });
  });

  it("treats a 200 response with reported errors as partial, not as success", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { entities: [entity("firmen")], warnings: ["Löschung übersprungen"], errors: ["geraete: Timeout"] })
    );

    const ergebnis = await starteFirmaSync(FIRMA_ID, "Firma");

    expect(ergebnis.status).toBe("teilweise");
    expect(ergebnis.probleme).toEqual(["geraete: Timeout", "Löschung übersprungen"]);
  });

  it("flags a response that synced more than one Firma (filter not active on the portal)", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { entities: [entity("firmen", 305)], warnings: [], errors: [] }));

    const ergebnis = await starteFirmaSync(FIRMA_ID, "Firma");

    expect(ergebnis.status).toBe("teilweise");
    expect(ergebnis.probleme[0]).toContain("305 Firmen");
  });

  it.each([
    [401, { error: "Unauthorized" }, "Zugangsschlüssel"],
    [404, { error: "nicht gefunden" }, "nicht gefunden"],
    [500, { error: "Sync failed", message: "Dataverse down" }, "Dataverse down"],
  ])("maps HTTP %i to a readable failure", async (status, body, erwartet) => {
    fetchMock.mockResolvedValue(jsonResponse(status, body));

    const ergebnis = await starteFirmaSync(FIRMA_ID, "Firma");

    expect(ergebnis.status).toBe("fehler");
    expect(ergebnis.meldung).toContain(erwartet);
  });

  it("reports 'unknown' (not failure) on timeout or network error, since the sync may still have run", async () => {
    fetchMock.mockRejectedValue(new DOMException("timeout", "TimeoutError"));

    const ergebnis = await starteFirmaSync(FIRMA_ID, "Firma");

    expect(ergebnis.status).toBe("unbekannt");
  });
});
