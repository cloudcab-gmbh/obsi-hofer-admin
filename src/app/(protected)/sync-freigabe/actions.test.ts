import { describe, it, expect, vi, beforeEach } from "vitest";

const setStandortFreigabe = vi.fn();
const listKundenportalKontakteForFirma = vi.fn();
const getFirma = vi.fn();
const listStandorteForFirma = vi.fn();
const ladeArbeitskontext = vi.fn();
const istSyncKonfiguriert = vi.fn();
const starteFirmaSync = vi.fn();
const istFreigeberMock = vi.fn();
const revalidatePath = vi.fn();
const erstelleSyncLauf = vi.fn();
const listSyncLaeufeForFirma = vi.fn();

vi.mock("@/lib/dataverse/kontakte", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/dataverse/kontakte")>()),
  setStandortFreigabe: (...args: unknown[]) => setStandortFreigabe(...args),
  listKundenportalKontakteForFirma: (...args: unknown[]) => listKundenportalKontakteForFirma(...args),
}));
vi.mock("@/lib/dataverse/geraete", () => ({
  getFirma: (...args: unknown[]) => getFirma(...args),
  listStandorteForFirma: (...args: unknown[]) => listStandorteForFirma(...args),
}));
vi.mock("@/lib/arbeitskontext", () => ({ ladeArbeitskontext: () => ladeArbeitskontext() }));
const istStandortSyncAktiv = vi.fn();
vi.mock("@/lib/kundenportal-sync", () => ({
  istSyncKonfiguriert: () => istSyncKonfiguriert(),
  istStandortSyncAktiv: () => istStandortSyncAktiv(),
  starteFirmaSync: (...args: unknown[]) => starteFirmaSync(...args),
}));
vi.mock("@/lib/auth/freigeber", () => ({
  aktuellerBenutzerIstFreigeber: () => istFreigeberMock(),
  aktuellerFreigeberName: async () => ((await istFreigeberMock()) ? "Robert Bienz" : null),
}));
vi.mock("@/lib/dataverse/sync-laeufe", () => ({
  erstelleSyncLauf: (...args: unknown[]) => erstelleSyncLauf(...args),
  listSyncLaeufeForFirma: (...args: unknown[]) => listSyncLaeufeForFirma(...args),
}));
vi.mock("next/cache", () => ({ revalidatePath: (...args: unknown[]) => revalidatePath(...args) }));

import { ladeSyncLaeufeAction, setKundenportalFreigabeAction, syncFirmaAction } from "./actions";
import { DataverseError } from "@/lib/dataverse/errors";

const KONTAKT_ID = "37b3cb61-90c0-f111-aaaf-70a8a5061d7a"; // echte Dataverse-Form (keine RFC-UUID)
const FIRMA_ID = "11111111-1111-f111-aaaa-111111111111";
const STANDORT_ID = "22222222-2222-f111-bbbb-222222222222";
const STANDORT = { id: STANDORT_ID, name: "Pratteln" };

beforeEach(() => {
  setStandortFreigabe.mockReset();
  listKundenportalKontakteForFirma.mockReset();
  getFirma.mockReset();
  listStandorteForFirma.mockReset();
  listStandorteForFirma.mockResolvedValue([]);
  ladeArbeitskontext.mockReset();
  ladeArbeitskontext.mockResolvedValue({
    zustand: "bereit",
    firma: { id: FIRMA_ID, name: "Firma", anzeigename: "Firma" },
    standort: STANDORT,
    standorte: [STANDORT],
    mehrereStandorte: false,
  });
  istSyncKonfiguriert.mockReset();
  istStandortSyncAktiv.mockReset();
  istStandortSyncAktiv.mockReturnValue(false);
  starteFirmaSync.mockReset();
  istFreigeberMock.mockReset();
  erstelleSyncLauf.mockReset();
  listSyncLaeufeForFirma.mockReset();
  revalidatePath.mockReset();
});

describe("setKundenportalFreigabeAction", () => {
  it("refuses a non-Freigeber (e.g. Bearbeiter calling the action directly) without touching Dataverse", async () => {
    istFreigeberMock.mockResolvedValue(false);

    const result = await setKundenportalFreigabeAction(KONTAKT_ID, STANDORT_ID, true);

    expect(result.success).toBe(false);
    expect(setStandortFreigabe).not.toHaveBeenCalled();
  });

  it("saves the Freigabe for a Freigeber and revalidates the page", async () => {
    istFreigeberMock.mockResolvedValue(true);
    setStandortFreigabe.mockResolvedValue(undefined);

    const result = await setKundenportalFreigabeAction(KONTAKT_ID, STANDORT_ID, true);

    expect(result).toEqual({ success: true });
    expect(setStandortFreigabe).toHaveBeenCalledWith({
      kontaktId: KONTAKT_ID,
      firmaId: FIRMA_ID,
      standort: STANDORT,
      freigegeben: true,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/sync-freigabe");
  });

  it("accepts real Dataverse GUIDs that are not RFC-version UUIDs", async () => {
    istFreigeberMock.mockResolvedValue(true);

    const result = await setKundenportalFreigabeAction(KONTAKT_ID, STANDORT_ID, false);

    expect(result.success).toBe(true);
  });

  it("rejects a malformed kontaktId", async () => {
    istFreigeberMock.mockResolvedValue(true);

    const result = await setKundenportalFreigabeAction("abc", STANDORT_ID, true);

    expect(result.success).toBe(false);
    expect(setStandortFreigabe).not.toHaveBeenCalled();
  });

  // PROJ-11: Liste wurde für einen anderen Standort angezeigt (z.B. Wechsel in einem anderen Tab).
  it("refuses when the shown Standort is no longer the session's current Standort", async () => {
    istFreigeberMock.mockResolvedValue(true);

    const result = await setKundenportalFreigabeAction(KONTAKT_ID, "33333333-3333-f111-cccc-333333333333", true);

    expect(result).toEqual({
      success: false,
      message: "Firma oder Standort wurden inzwischen gewechselt. Bitte die Seite neu laden.",
    });
    expect(setStandortFreigabe).not.toHaveBeenCalled();
  });

  it("refuses when no Standort is chosen in the session", async () => {
    istFreigeberMock.mockResolvedValue(true);
    ladeArbeitskontext.mockResolvedValue({ zustand: "standort-waehlen", firma: { id: FIRMA_ID, name: "F", anzeigename: "F" }, standorte: [] });

    const result = await setKundenportalFreigabeAction(KONTAKT_ID, STANDORT_ID, true);

    expect(result.success).toBe(false);
    expect(setStandortFreigabe).not.toHaveBeenCalled();
  });

  it("rejects a malformed standortId", async () => {
    istFreigeberMock.mockResolvedValue(true);

    const result = await setKundenportalFreigabeAction(KONTAKT_ID, "x' or 1 eq 1", true);

    expect(result.success).toBe(false);
    expect(setStandortFreigabe).not.toHaveBeenCalled();
  });

  it("returns the DataverseError message (e.g. missing email) instead of throwing", async () => {
    istFreigeberMock.mockResolvedValue(true);
    setStandortFreigabe.mockRejectedValue(new DataverseError("validation_error", "Ein Kontakt ohne E-Mail-Adresse …"));

    const result = await setKundenportalFreigabeAction(KONTAKT_ID, STANDORT_ID, true);

    expect(result).toEqual({ success: false, message: "Ein Kontakt ohne E-Mail-Adresse …" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("syncFirmaAction", () => {
  const kontakt = (o: Record<string, unknown> = {}) => ({ id: KONTAKT_ID, name: "Max", email: "max@example.ch", rollen: [], freigegeben: true, weitereStandorte: [], ...o });
  const ERFOLG = { status: "erfolg", meldung: "ok", bereiche: [], probleme: [] };

  function bereit() {
    istFreigeberMock.mockResolvedValue(true);
    istSyncKonfiguriert.mockReturnValue(true);
    getFirma.mockResolvedValue({ id: FIRMA_ID, name: "Beispiel AG" });
    listKundenportalKontakteForFirma.mockResolvedValue([kontakt()]);
    starteFirmaSync.mockResolvedValue(ERFOLG);
    erstelleSyncLauf.mockImplementation(async (l: { ergebnis: unknown }) => ({ id: "lauf-1", ergebnis: l.ergebnis }));
    listSyncLaeufeForFirma.mockResolvedValue({ laeufe: [], hatMehr: false });
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

  // PROJ-11 (QA): Zugang zu irgendeinem Standort der Firma genügt — der Sync bleibt pro Firma.
  it("allows the sync when a contact is released only for another Standort of the Firma", async () => {
    bereit();
    const standorte = [{ id: "s1", name: "Pratteln", firmaId: FIRMA_ID }];
    listStandorteForFirma.mockResolvedValue(standorte);
    listKundenportalKontakteForFirma.mockResolvedValue([kontakt({ freigegeben: false, weitereStandorte: ["Pratteln"] })]);

    const result = await syncFirmaAction(FIRMA_ID);

    expect(result.success).toBe(true);
    expect(listKundenportalKontakteForFirma).toHaveBeenCalledWith(FIRMA_ID, standorte, "");
    expect(starteFirmaSync).toHaveBeenCalledWith(FIRMA_ID, "Beispiel AG", null);
  });

  it("triggers the sync for exactly the confirmed Firma and returns the result", async () => {
    bereit();

    const result = await syncFirmaAction(FIRMA_ID);

    expect(starteFirmaSync).toHaveBeenCalledWith(FIRMA_ID, "Beispiel AG", null);
    expect(result).toEqual({ success: true, ergebnis: ERFOLG, lauf: { id: "lauf-1", ergebnis: ERFOLG } });
  });

  it("returns a readable message when the Firma data cannot be checked", async () => {
    bereit();
    getFirma.mockRejectedValue(new DataverseError("unavailable", "Dataverse ist aktuell nicht erreichbar."));

    const result = await syncFirmaAction(FIRMA_ID);

    expect(result).toEqual({ success: false, message: "Dataverse ist aktuell nicht erreichbar." });
    expect(starteFirmaSync).not.toHaveBeenCalled();
  });

  // PROJ-6: Sync-Verlauf
  it("logs every actual call to the Kundenportal with Firma, Freigeber name, start time, duration and result", async () => {
    bereit();

    await syncFirmaAction(FIRMA_ID);

    expect(erstelleSyncLauf).toHaveBeenCalledTimes(1);
    const [eintrag] = erstelleSyncLauf.mock.calls[0];
    expect(eintrag).toMatchObject({ firmaId: FIRMA_ID, firmaName: "Beispiel AG", ausgeloestVon: "Robert Bienz", ergebnis: ERFOLG });
    expect(eintrag.gestartetAm).toBeInstanceOf(Date);
    expect(typeof eintrag.dauerSekunden).toBe("number");
  });

  it("also logs failed and unknown results", async () => {
    bereit();
    const UNBEKANNT = { status: "unbekannt", meldung: "Keine Antwort", bereiche: [], probleme: [] };
    starteFirmaSync.mockResolvedValue(UNBEKANNT);

    await syncFirmaAction(FIRMA_ID);

    expect(erstelleSyncLauf.mock.calls[0][0].ergebnis).toEqual(UNBEKANNT);
  });

  it("does not log refusals that happen before calling the Kundenportal", async () => {
    bereit();
    listKundenportalKontakteForFirma.mockResolvedValue([kontakt({ freigegeben: false })]);

    await syncFirmaAction(FIRMA_ID);

    expect(erstelleSyncLauf).not.toHaveBeenCalled();
  });


  // Nutzer-Entscheidung 2026-10-07: Entzug des letzten Kontakts muss ins Portal gelangen können.
  it("allows a sync without granted contacts when the Firma was already transferred before", async () => {
    bereit();
    listKundenportalKontakteForFirma.mockResolvedValue([kontakt({ freigegeben: false })]);
    listSyncLaeufeForFirma.mockResolvedValue({ laeufe: [{ ergebnis: { status: "erfolg" } }], hatMehr: false });

    const result = await syncFirmaAction(FIRMA_ID);

    expect(result.success).toBe(true);
    expect(starteFirmaSync).toHaveBeenCalledWith(FIRMA_ID, "Beispiel AG", null);
  });

  it("still refuses a sync without granted contacts when earlier runs all failed (nothing reached the portal)", async () => {
    bereit();
    listKundenportalKontakteForFirma.mockResolvedValue([kontakt({ freigegeben: false })]);
    listSyncLaeufeForFirma.mockResolvedValue({ laeufe: [{ ergebnis: { status: "fehler" } }], hatMehr: false });

    const result = await syncFirmaAction(FIRMA_ID);

    expect(result.success).toBe(false);
    expect(starteFirmaSync).not.toHaveBeenCalled();
  });
  it("still returns the sync result when saving the history entry fails (lauf: null)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    bereit();
    erstelleSyncLauf.mockRejectedValue(new DataverseError("permission_denied", "missing prvAppendbmvcc_SyncLauf"));

    const result = await syncFirmaAction(FIRMA_ID);

    expect(result).toEqual({ success: true, ergebnis: ERFOLG, lauf: null });
  });
});

describe("ladeSyncLaeufeAction", () => {
  const VOR = "2026-10-07T12:00:00.000Z";

  it("refuses a non-Freigeber", async () => {
    istFreigeberMock.mockResolvedValue(false);

    const result = await ladeSyncLaeufeAction(FIRMA_ID, VOR);

    expect(result.success).toBe(false);
    expect(listSyncLaeufeForFirma).not.toHaveBeenCalled();
  });

  it.each([["abc", VOR], [FIRMA_ID, "kein-datum"]])("rejects invalid input %j / %j", async (firmaId, vor) => {
    istFreigeberMock.mockResolvedValue(true);

    const result = await ladeSyncLaeufeAction(firmaId, vor);

    expect(result.success).toBe(false);
    expect(listSyncLaeufeForFirma).not.toHaveBeenCalled();
  });

  it("loads the next older runs before the given timestamp", async () => {
    istFreigeberMock.mockResolvedValue(true);
    listSyncLaeufeForFirma.mockResolvedValue({ laeufe: [], hatMehr: false });

    const result = await ladeSyncLaeufeAction(FIRMA_ID, VOR);

    expect(listSyncLaeufeForFirma).toHaveBeenCalledWith(FIRMA_ID, { vor: VOR, standortId: null });
    expect(result).toEqual({ success: true, laeufe: [], hatMehr: false });
  });
});

// PROJ-12: Sync pro Standort.
describe("syncFirmaAction pro Standort (PROJ-12)", () => {
  const ERFOLG = { status: "erfolg", meldung: "ok", bereiche: [], probleme: [] };
  const kontakt = (o: Record<string, unknown> = {}) => ({ id: KONTAKT_ID, name: "Max", email: "max@example.ch", rollen: [], freigegeben: true, weitereStandorte: [], ...o });

  function bereit() {
    istFreigeberMock.mockResolvedValue(true);
    istSyncKonfiguriert.mockReturnValue(true);
    getFirma.mockResolvedValue({ id: FIRMA_ID, name: "Bilfinger AG" });
    listKundenportalKontakteForFirma.mockResolvedValue([kontakt()]);
    starteFirmaSync.mockResolvedValue(ERFOLG);
    erstelleSyncLauf.mockImplementation(async (l: Record<string, unknown>) => ({ id: "lauf-1", ...l }));
    listSyncLaeufeForFirma.mockResolvedValue({ laeufe: [], hatMehr: false });
  }

  it("transfers only the current Standort when the switch is on, and logs it with the Standort", async () => {
    bereit();
    istStandortSyncAktiv.mockReturnValue(true);

    const result = await syncFirmaAction(FIRMA_ID, STANDORT_ID);

    expect(result.success).toBe(true);
    expect(starteFirmaSync).toHaveBeenCalledWith(FIRMA_ID, "Bilfinger AG · Pratteln", STANDORT);
    expect(erstelleSyncLauf).toHaveBeenCalledWith(expect.objectContaining({ firmaName: "Bilfinger AG", standort: STANDORT }));
    expect(listKundenportalKontakteForFirma).toHaveBeenCalledWith(FIRMA_ID, [], STANDORT_ID);
  });

  it("syncs the whole Firma as before while the switch is off, even if a Standort is passed", async () => {
    bereit();

    await syncFirmaAction(FIRMA_ID, STANDORT_ID);

    expect(starteFirmaSync).toHaveBeenCalledWith(FIRMA_ID, "Bilfinger AG", null);
    expect(erstelleSyncLauf).toHaveBeenCalledWith(expect.objectContaining({ standort: null }));
    expect(ladeArbeitskontext).not.toHaveBeenCalled();
  });

  it("refuses when the Standort is no longer the session's current one", async () => {
    bereit();
    istStandortSyncAktiv.mockReturnValue(true);

    const result = await syncFirmaAction(FIRMA_ID, "33333333-3333-f111-cccc-333333333333");

    expect(result).toEqual({ success: false, message: "Firma oder Standort wurden inzwischen gewechselt. Bitte die Seite neu laden." });
    expect(starteFirmaSync).not.toHaveBeenCalled();
  });

  it("requires access to THIS Standort — access to another Standort only is not enough", async () => {
    bereit();
    istStandortSyncAktiv.mockReturnValue(true);
    listKundenportalKontakteForFirma.mockResolvedValue([kontakt({ freigegeben: false, weitereStandorte: ["Boningen"] })]);

    const result = await syncFirmaAction(FIRMA_ID, STANDORT_ID);

    expect(result.success).toBe(false);
    expect(!result.success && result.message).toContain("für diesen Standort");
    expect(listSyncLaeufeForFirma).toHaveBeenCalledWith(FIRMA_ID, { standortId: STANDORT_ID });
    expect(starteFirmaSync).not.toHaveBeenCalled();
  });

  it("allows the Standort sync without access when the Standort (or the whole Firma) was transferred before", async () => {
    bereit();
    istStandortSyncAktiv.mockReturnValue(true);
    listKundenportalKontakteForFirma.mockResolvedValue([kontakt({ freigegeben: false })]);
    listSyncLaeufeForFirma.mockResolvedValue({
      laeufe: [{ id: "alt", standortId: null, ergebnis: { status: "erfolg" } }],
      hatMehr: false,
    });

    const result = await syncFirmaAction(FIRMA_ID, STANDORT_ID);

    expect(result.success).toBe(true);
  });

  it("rejects a malformed standortId", async () => {
    bereit();
    istStandortSyncAktiv.mockReturnValue(true);

    const result = await syncFirmaAction(FIRMA_ID, "x' or 1 eq 1");

    expect(result).toEqual({ success: false, message: "Ungültige Standort-ID." });
  });
});
