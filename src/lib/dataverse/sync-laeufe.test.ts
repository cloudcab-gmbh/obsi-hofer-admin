import { describe, it, expect, vi, beforeEach } from "vitest";

const createRecord = vi.fn();
const listRecords = vi.fn();

vi.mock("./records", () => ({
  createRecord: (...args: unknown[]) => createRecord(...args),
  listRecords: (...args: unknown[]) => listRecords(...args),
}));

import { erstelleSyncLauf, listSyncLaeufeForFirma, serialisiereDetails, SEITEN_GROESSE } from "./sync-laeufe";

const FIRMA_ID = "11111111-1111-f111-aaaa-111111111111";
const ERFOLG = {
  status: "erfolg" as const,
  meldung: "„Cloudcab GmbH“ wurde ins Kundenportal übertragen.",
  bereiche: [{ bereich: "Geräte", geladen: 8, neu: 0, aktualisiert: 8, geloescht: 0 }],
  probleme: [],
};

function rawLauf(overrides: Record<string, unknown> = {}) {
  return {
    bmvcc_synclaufid: "lauf-1",
    _bmvcc_firma_value: FIRMA_ID,
    bmvcc_gestartedam: "2026-10-07T12:30:00Z",
    bmvcc_dauersekunden: 4,
    bmvcc_ausgelostvon: "Robert Bienz",
    bmvcc_ergebnis: "erfolg",
    bmvcc_meldung: ERFOLG.meldung,
    bmvcc_details: JSON.stringify({ bereiche: ERFOLG.bereiche, probleme: [] }),
    ...overrides,
  };
}

beforeEach(() => {
  createRecord.mockReset();
  listRecords.mockReset();
  createRecord.mockResolvedValue({ id: "neu-1" });
});

describe("erstelleSyncLauf", () => {
  const eingabe = {
    firmaId: FIRMA_ID,
    firmaName: "Cloudcab GmbH",
    gestartetAm: new Date("2026-10-07T12:30:00Z"),
    dauerSekunden: 4,
    ausgeloestVon: "Robert Bienz",
    ergebnis: ERFOLG,
  };

  it("writes all columns, binds the Firma via the verified navigation property and names the entry in Swiss time", async () => {
    await erstelleSyncLauf(eingabe);

    const [entity, daten] = createRecord.mock.calls[0];
    expect(entity).toBe("bmvcc_synclaufs");
    expect(daten).toMatchObject({
      bmvcc_name: "Cloudcab GmbH – 07.10.2026, 14:30",
      "bmvcc_Firma@odata.bind": `/bmvcc_firmas(${FIRMA_ID})`,
      bmvcc_gestartedam: "2026-10-07T12:30:00.000Z",
      bmvcc_dauersekunden: 4,
      bmvcc_ausgelostvon: "Robert Bienz",
      bmvcc_ergebnis: "erfolg",
      bmvcc_meldung: ERFOLG.meldung,
    });
    expect(JSON.parse(daten.bmvcc_details)).toEqual({ bereiche: ERFOLG.bereiche, probleme: [] });
  });

  it("returns the saved run so it can be shown immediately", async () => {
    const lauf = await erstelleSyncLauf(eingabe);

    expect(lauf).toMatchObject({ id: "neu-1", firmaId: FIRMA_ID, ausgeloestVon: "Robert Bienz", ergebnis: ERFOLG });
  });

  it("truncates texts to the column limits", async () => {
    await erstelleSyncLauf({ ...eingabe, ausgeloestVon: "x".repeat(300), ergebnis: { ...ERFOLG, meldung: "m".repeat(800) } });

    const [, daten] = createRecord.mock.calls[0];
    expect(daten.bmvcc_ausgelostvon.length).toBe(200);
    expect(daten.bmvcc_meldung.length).toBe(500);
  });

  it("rejects an invalid firmaId before writing anything", async () => {
    await expect(erstelleSyncLauf({ ...eingabe, firmaId: "x' or 1 eq 1" })).rejects.toThrow();
    expect(createRecord).not.toHaveBeenCalled();
  });
});

describe("serialisiereDetails", () => {
  it("drops problems from the end with a note when the column limit would be exceeded", () => {
    const probleme = Array.from({ length: 50 }, (_, i) => `Problem ${i} ${"x".repeat(5000)}`);

    const json = serialisiereDetails([], probleme);

    expect(json.length).toBeLessThanOrEqual(100_000);
    const parsed = JSON.parse(json);
    expect(parsed.probleme.at(-1)).toMatch(/weitere Probleme gekürzt/);
    expect(parsed.probleme[0]).toContain("Problem 0");
  });
});

describe("listSyncLaeufeForFirma", () => {
  it("loads the newest runs of the Firma, one more than a page to detect older ones", async () => {
    listRecords.mockResolvedValue({ records: [rawLauf()], nextPageCursor: null });

    const result = await listSyncLaeufeForFirma(FIRMA_ID);

    const [entity, options] = listRecords.mock.calls[0];
    expect(entity).toBe("bmvcc_synclaufs");
    expect(options.filter).toBe(`_bmvcc_firma_value eq ${FIRMA_ID}`);
    expect(options.orderBy).toBe("bmvcc_gestartedam desc,createdon desc");
    expect(options.top).toBe(SEITEN_GROESSE + 1);
    expect(result.hatMehr).toBe(false);
    expect(result.laeufe[0]).toMatchObject({ id: "lauf-1", dauerSekunden: 4, ausgeloestVon: "Robert Bienz", ergebnis: ERFOLG });
  });

  it("reports hatMehr and returns only one page when more runs exist", async () => {
    listRecords.mockResolvedValue({
      records: Array.from({ length: SEITEN_GROESSE + 1 }, (_, i) => rawLauf({ bmvcc_synclaufid: `l${i}` })),
      nextPageCursor: null,
    });

    const result = await listSyncLaeufeForFirma(FIRMA_ID);

    expect(result.laeufe).toHaveLength(SEITEN_GROESSE);
    expect(result.hatMehr).toBe(true);
  });

  it("continues with runs older than the given timestamp", async () => {
    listRecords.mockResolvedValue({ records: [], nextPageCursor: null });

    await listSyncLaeufeForFirma(FIRMA_ID, { vor: "2026-10-07T12:30:00Z" });

    expect(listRecords.mock.calls[0][1].filter).toBe(
      `_bmvcc_firma_value eq ${FIRMA_ID} and bmvcc_gestartedam lt 2026-10-07T12:30:00.000Z`
    );
  });

  it("rejects an invalid timestamp or firmaId instead of building a broken filter", async () => {
    await expect(listSyncLaeufeForFirma(FIRMA_ID, { vor: "x) or (1 eq 1" })).rejects.toThrow();
    await expect(listSyncLaeufeForFirma("abc")).rejects.toThrow();
    expect(listRecords).not.toHaveBeenCalled();
  });

  it("falls back to 'unbekannt' for an unexpected Ergebnis value and survives broken details", async () => {
    listRecords.mockResolvedValue({
      records: [rawLauf({ bmvcc_ergebnis: "irgendwas", bmvcc_details: "{kaputt" })],
      nextPageCursor: null,
    });

    const [lauf] = (await listSyncLaeufeForFirma(FIRMA_ID)).laeufe;

    expect(lauf.ergebnis.status).toBe("unbekannt");
    expect(lauf.ergebnis.probleme).toEqual(["Details konnten nicht gelesen werden."]);
  });
});

// PROJ-12: Läufe pro Standort.
describe("Sync-Läufe pro Standort (PROJ-12)", () => {
  const STANDORT_ID = "22222222-2222-f111-bbbb-222222222222";
  const eingabe = {
    firmaId: FIRMA_ID,
    firmaName: "Bilfinger AG",
    gestartetAm: new Date("2026-10-09T12:30:00Z"),
    dauerSekunden: 4,
    ausgeloestVon: "Robert Bienz",
    ergebnis: ERFOLG,
  };

  it("binds the Standort and names the entry 'Firma · Standort – Zeit'", async () => {
    const lauf = await erstelleSyncLauf({ ...eingabe, standort: { id: STANDORT_ID, name: "Pratteln" } });

    const [, daten] = createRecord.mock.calls[0];
    expect(daten["bmvcc_Standort@odata.bind"]).toBe(`/bmvcc_organizationlocations(${STANDORT_ID})`);
    expect(daten.bmvcc_name).toBe("Bilfinger AG · Pratteln – 09.10.2026, 14:30");
    expect(lauf.standortId).toBe(STANDORT_ID);
  });

  it("writes no Standort for a run of the whole Firma", async () => {
    const lauf = await erstelleSyncLauf(eingabe);

    const [, daten] = createRecord.mock.calls[0];
    expect(daten).not.toHaveProperty("bmvcc_Standort@odata.bind");
    expect(lauf.standortId).toBeNull();
  });

  it("lists the runs of this Standort plus the runs of the whole Firma", async () => {
    listRecords.mockResolvedValue({
      records: [rawLauf({ _bmvcc_standort_value: STANDORT_ID }), rawLauf({ bmvcc_synclaufid: "alt", _bmvcc_standort_value: null })],
      nextPageCursor: null,
    });

    const { laeufe } = await listSyncLaeufeForFirma(FIRMA_ID, { standortId: STANDORT_ID });

    expect(listRecords.mock.calls[0][1].filter).toBe(
      `_bmvcc_firma_value eq ${FIRMA_ID} and (_bmvcc_standort_value eq ${STANDORT_ID} or _bmvcc_standort_value eq null)`
    );
    expect(laeufe.map((l) => l.standortId)).toEqual([STANDORT_ID, null]);
  });

  it("rejects an invalid standortId instead of building a broken filter", async () => {
    await expect(listSyncLaeufeForFirma(FIRMA_ID, { standortId: "x' or 1 eq 1" })).rejects.toThrow();
    expect(listRecords).not.toHaveBeenCalled();
  });
});
