import { describe, it, expect, vi, beforeEach } from "vitest";

const setKundenportalFreigabe = vi.fn();
const listKundenportalKontakteForFirma = vi.fn();
const getFirma = vi.fn();
const istSyncKonfiguriert = vi.fn();
const starteFirmaSync = vi.fn();
const istFreigeberMock = vi.fn();
const revalidatePath = vi.fn();

vi.mock("@/lib/dataverse/kontakte", () => ({
  setKundenportalFreigabe: (...args: unknown[]) => setKundenportalFreigabe(...args),
  listKundenportalKontakteForFirma: (...args: unknown[]) => listKundenportalKontakteForFirma(...args),
}));
vi.mock("@/lib/dataverse/geraete", () => ({ getFirma: (...args: unknown[]) => getFirma(...args) }));
vi.mock("@/lib/kundenportal-sync", () => ({
  istSyncKonfiguriert: () => istSyncKonfiguriert(),
  starteFirmaSync: (...args: unknown[]) => starteFirmaSync(...args),
}));
vi.mock("@/lib/auth/freigeber", () => ({ aktuellerBenutzerIstFreigeber: () => istFreigeberMock() }));
vi.mock("next/cache", () => ({ revalidatePath: (...args: unknown[]) => revalidatePath(...args) }));

import { setKundenportalFreigabeAction, syncFirmaAction } from "./actions";
import { DataverseError } from "@/lib/dataverse/errors";

const KONTAKT_ID = "37b3cb61-90c0-f111-aaaf-70a8a5061d7a"; // echte Dataverse-Form (keine RFC-UUID)
const FIRMA_ID = "11111111-1111-f111-aaaa-111111111111";

beforeEach(() => {
  setKundenportalFreigabe.mockReset();
  listKundenportalKontakteForFirma.mockReset();
  getFirma.mockReset();
  istSyncKonfiguriert.mockReset();
  starteFirmaSync.mockReset();
  istFreigeberMock.mockReset();
  revalidatePath.mockReset();
});

describe("setKundenportalFreigabeAction", () => {
  it("refuses a non-Freigeber (e.g. Bearbeiter calling the action directly) without touching Dataverse", async () => {
    istFreigeberMock.mockResolvedValue(false);

    const result = await setKundenportalFreigabeAction(KONTAKT_ID, true);

    expect(result.success).toBe(false);
    expect(setKundenportalFreigabe).not.toHaveBeenCalled();
  });

  it("saves the Freigabe for a Freigeber and revalidates the page", async () => {
    istFreigeberMock.mockResolvedValue(true);
    setKundenportalFreigabe.mockResolvedValue(undefined);

    const result = await setKundenportalFreigabeAction(KONTAKT_ID, true);

    expect(result).toEqual({ success: true });
    expect(setKundenportalFreigabe).toHaveBeenCalledWith(KONTAKT_ID, true);
    expect(revalidatePath).toHaveBeenCalledWith("/sync-freigabe");
  });

  it("accepts real Dataverse GUIDs that are not RFC-version UUIDs", async () => {
    istFreigeberMock.mockResolvedValue(true);

    const result = await setKundenportalFreigabeAction(KONTAKT_ID, false);

    expect(result.success).toBe(true);
  });

  it("rejects a malformed kontaktId", async () => {
    istFreigeberMock.mockResolvedValue(true);

    const result = await setKundenportalFreigabeAction("abc", true);

    expect(result.success).toBe(false);
    expect(setKundenportalFreigabe).not.toHaveBeenCalled();
  });

  it("returns the DataverseError message (e.g. missing email) instead of throwing", async () => {
    istFreigeberMock.mockResolvedValue(true);
    setKundenportalFreigabe.mockRejectedValue(new DataverseError("validation_error", "Ein Kontakt ohne E-Mail-Adresse …"));

    const result = await setKundenportalFreigabeAction(KONTAKT_ID, true);

    expect(result).toEqual({ success: false, message: "Ein Kontakt ohne E-Mail-Adresse …" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("syncFirmaAction", () => {
  const kontakt = (o: Record<string, unknown> = {}) => ({ id: KONTAKT_ID, name: "Max", email: "max@example.ch", rollen: [], freigegeben: true, weitereFirmen: false, ...o });
  const ERFOLG = { status: "erfolg", meldung: "ok", bereiche: [], probleme: [] };

  function bereit() {
    istFreigeberMock.mockResolvedValue(true);
    istSyncKonfiguriert.mockReturnValue(true);
    getFirma.mockResolvedValue({ id: FIRMA_ID, name: "Beispiel AG" });
    listKundenportalKontakteForFirma.mockResolvedValue([kontakt()]);
    starteFirmaSync.mockResolvedValue(ERFOLG);
  }

  it("refuses a non-Freigeber without calling the Kundenportal", async () => {
    bereit();
    istFreigeberMock.mockResolvedValue(false);

    const result = await syncFirmaAction(FIRMA_ID);

    expect(result.success).toBe(false);
    expect(starteFirmaSync).not.toHaveBeenCalled();
  });

  it.each(["", "abc", "x' or 1 eq 1"])("refuses an invalid firmaId %j (would otherwise trigger a sync of all firms)", async (id) => {
    bereit();

    const result = await syncFirmaAction(id);

    expect(result.success).toBe(false);
    expect(starteFirmaSync).not.toHaveBeenCalled();
  });

  it("refuses while the sync is not activated/configured", async () => {
    bereit();
    istSyncKonfiguriert.mockReturnValue(false);

    const result = await syncFirmaAction(FIRMA_ID);

    expect(result.success).toBe(false);
    expect(starteFirmaSync).not.toHaveBeenCalled();
  });

  it("re-checks server-side that at least one active, granted contact with email exists", async () => {
    bereit();
    listKundenportalKontakteForFirma.mockResolvedValue([kontakt({ freigegeben: false }), kontakt({ email: null })]);

    const result = await syncFirmaAction(FIRMA_ID);

    expect(result).toEqual({ success: false, message: expect.stringContaining("mindestens einen Kontakt") });
    expect(starteFirmaSync).not.toHaveBeenCalled();
  });

  it("triggers the sync for exactly the confirmed Firma and returns the result", async () => {
    bereit();

    const result = await syncFirmaAction(FIRMA_ID);

    expect(starteFirmaSync).toHaveBeenCalledWith(FIRMA_ID, "Beispiel AG");
    expect(result).toEqual({ success: true, ergebnis: ERFOLG });
  });

  it("returns a readable message when the Firma data cannot be checked", async () => {
    bereit();
    getFirma.mockRejectedValue(new DataverseError("unavailable", "Dataverse ist aktuell nicht erreichbar."));

    const result = await syncFirmaAction(FIRMA_ID);

    expect(result).toEqual({ success: false, message: "Dataverse ist aktuell nicht erreichbar." });
    expect(starteFirmaSync).not.toHaveBeenCalled();
  });
});
