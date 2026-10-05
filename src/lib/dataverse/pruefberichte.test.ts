import { describe, it, expect, vi, beforeEach } from "vitest";

const getRecord = vi.fn();
const listRecords = vi.fn();
const createRecord = vi.fn();
const updateRecord = vi.fn();

vi.mock("./records", () => ({
  getRecord: (...args: unknown[]) => getRecord(...args),
  listRecords: (...args: unknown[]) => listRecords(...args),
  createRecord: (...args: unknown[]) => createRecord(...args),
  updateRecord: (...args: unknown[]) => updateRecord(...args),
}));

import {
  createPruefbericht,
  getAktuelleBemerkungenForGeraete,
  getAktuellsterAktiverPruefbericht,
  getPruefbericht,
  listPruefberichteForGeraet,
  listPruefberichteForGeraete,
  stornierePruefbericht,
  updatePruefbericht,
} from "./pruefberichte";

const GERAET_ID = "11111111-1111-1111-1111-111111111111";
const GERAET_ID_2 = "22222222-2222-2222-2222-222222222222";
const BERICHT_ID = "33333333-3333-3333-3333-333333333333";

function rawBericht(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    bmvcc_pruefberichtid: BERICHT_ID,
    _bmvcc_gearaet_value: GERAET_ID,
    bmvcc_inspectiondate: "2026-01-15",
    bmvcc_inspectionresult: "Freigabe",
    bmvcc_inspector: "mamu",
    bmvcc_isarchived: false,
    bmvcc_remark: "Alles ok",
    ...overrides,
  };
}

beforeEach(() => {
  getRecord.mockReset();
  listRecords.mockReset();
  createRecord.mockReset();
  updateRecord.mockReset();
});

describe("listPruefberichteForGeraet", () => {
  it("filters out stornierte Berichte by default", async () => {
    listRecords.mockResolvedValue({ records: [], nextPageCursor: null });

    await listPruefberichteForGeraet(GERAET_ID);

    expect(listRecords).toHaveBeenCalledWith(
      "bmvcc_pruefberichts",
      expect.objectContaining({ filter: `_bmvcc_gearaet_value eq ${GERAET_ID} and bmvcc_isarchived eq false` })
    );
  });

  it("includes stornierte Berichte when requested", async () => {
    listRecords.mockResolvedValue({ records: [], nextPageCursor: null });

    await listPruefberichteForGeraet(GERAET_ID, { includeStorniert: true });

    expect(listRecords).toHaveBeenCalledWith(
      "bmvcc_pruefberichts",
      expect.objectContaining({ filter: `_bmvcc_gearaet_value eq ${GERAET_ID}` })
    );
  });

  it("rejects a malformed geraetId without querying Dataverse", async () => {
    await expect(listPruefberichteForGeraet("1 eq 1 or 1 eq 1")).rejects.toThrow(/GUID/);
    expect(listRecords).not.toHaveBeenCalled();
  });

  it("maps every field of a Pruefbericht", async () => {
    listRecords.mockResolvedValue({ records: [rawBericht()], nextPageCursor: null });

    const [bericht] = await listPruefberichteForGeraet(GERAET_ID);

    expect(bericht).toEqual({
      id: BERICHT_ID,
      geraetId: GERAET_ID,
      pruefdatum: "2026-01-15",
      ergebnis: "Freigabe",
      pruefer: "mamu",
      bemerkungen: "Alles ok",
      storniert: false,
    });
  });
});

describe("listPruefberichteForGeraete", () => {
  it("returns an empty array without calling Dataverse for an empty id list", async () => {
    const result = await listPruefberichteForGeraete([]);
    expect(result).toEqual([]);
    expect(listRecords).not.toHaveBeenCalled();
  });

  it("chunks more than 20 Gerät ids into separate requests", async () => {
    const manyIds = Array.from({ length: 45 }, () => GERAET_ID);
    listRecords.mockResolvedValue({ records: [], nextPageCursor: null });

    await listPruefberichteForGeraete(manyIds);

    // 45 ids / 20 pro Block = 3 Anfragen (20 + 20 + 5), nicht eine einzige mit 45 OR-Klauseln
    expect(listRecords).toHaveBeenCalledTimes(3);
  });

  it("merges and re-sorts results across chunks by Prüfdatum descending", async () => {
    // 21 ids => zwei Chunks (20 + 1) => zwei separate listRecords-Aufrufe,
    // deren Ergebnisse anschliessend gemeinsam neu sortiert werden müssen.
    listRecords
      .mockResolvedValueOnce({ records: [rawBericht({ bmvcc_inspectiondate: "2026-01-01" })], nextPageCursor: null })
      .mockResolvedValueOnce({
        records: [rawBericht({ bmvcc_pruefberichtid: "other", bmvcc_inspectiondate: "2026-06-01" })],
        nextPageCursor: null,
      });

    const ids = Array.from({ length: 21 }, () => GERAET_ID);
    const result = await listPruefberichteForGeraete(ids);

    expect(result.map((b) => b.pruefdatum)).toEqual(["2026-06-01", "2026-01-01"]);
  });

  it("rejects a malformed Gerät id without querying Dataverse", async () => {
    await expect(listPruefberichteForGeraete(["not-a-guid"])).rejects.toThrow(/GUID/);
    expect(listRecords).not.toHaveBeenCalled();
  });
});

describe("getPruefbericht", () => {
  it("fetches and maps a single Pruefbericht", async () => {
    getRecord.mockResolvedValue(rawBericht());
    const bericht = await getPruefbericht(BERICHT_ID);
    expect(bericht.id).toBe(BERICHT_ID);
    expect(bericht.storniert).toBe(false);
  });

  it("maps bmvcc_isarchived=true to storniert:true", async () => {
    getRecord.mockResolvedValue(rawBericht({ bmvcc_isarchived: true }));
    const bericht = await getPruefbericht(BERICHT_ID);
    expect(bericht.storniert).toBe(true);
  });
});

describe("getAktuellsterAktiverPruefbericht", () => {
  it("orders by Prüfdatum then createdon, both descending, and takes only the top result", async () => {
    listRecords.mockResolvedValue({ records: [rawBericht()], nextPageCursor: null });

    await getAktuellsterAktiverPruefbericht(GERAET_ID);

    expect(listRecords).toHaveBeenCalledWith(
      "bmvcc_pruefberichts",
      expect.objectContaining({ orderBy: "bmvcc_inspectiondate desc,createdon desc", top: 1 })
    );
  });

  it("returns null when the Gerät has no active Pruefbericht", async () => {
    listRecords.mockResolvedValue({ records: [], nextPageCursor: null });
    await expect(getAktuellsterAktiverPruefbericht(GERAET_ID)).resolves.toBeNull();
  });

  it("only considers non-stornierte Berichte", async () => {
    listRecords.mockResolvedValue({ records: [], nextPageCursor: null });

    await getAktuellsterAktiverPruefbericht(GERAET_ID);

    const filterArg = listRecords.mock.calls[0][1].filter as string;
    expect(filterArg).toContain("bmvcc_isarchived eq false");
  });
});

describe("createPruefbericht", () => {
  it("creates the record, binds it to the Gerät, and syncs the Gerät status", async () => {
    createRecord.mockResolvedValue({ id: BERICHT_ID });
    listRecords.mockResolvedValue({ records: [rawBericht()], nextPageCursor: null });
    updateRecord.mockResolvedValue(undefined);

    const result = await createPruefbericht(GERAET_ID, {
      pruefdatum: "2026-01-15",
      ergebnis: "Freigabe",
      bemerkungen: "Alles ok",
      pruefer: "mamu",
    });

    expect(result).toEqual({ id: BERICHT_ID });
    expect(createRecord).toHaveBeenCalledWith(
      "bmvcc_pruefberichts",
      expect.objectContaining({
        "bmvcc_Gearaet@odata.bind": `/bmvcc_equipmentrecords(${GERAET_ID})`,
        bmvcc_inspectionresult: "Freigabe",
        bmvcc_inspector: "mamu",
        bmvcc_isarchived: false,
      })
    );
    // Kaskade: nach dem Anlegen wird der Gerät-Status aus dem (neu ermittelten)
    // aktuellsten aktiven Bericht nachgezogen.
    expect(updateRecord).toHaveBeenCalledWith(
      "bmvcc_equipmentrecords",
      GERAET_ID,
      expect.objectContaining({ bmvcc_betriebsmittelstatus: "Freigabe", bmvcc_pruefer: "mamu" })
    );
  });

  it("clears the Gerät status fields when, after creating, no active Bericht remains (edge case via mocked state)", async () => {
    createRecord.mockResolvedValue({ id: BERICHT_ID });
    listRecords.mockResolvedValue({ records: [], nextPageCursor: null });
    updateRecord.mockResolvedValue(undefined);

    await createPruefbericht(GERAET_ID, {
      pruefdatum: "2026-01-15",
      ergebnis: "Freigabe",
      bemerkungen: null,
      pruefer: "mamu",
    });

    expect(updateRecord).toHaveBeenCalledWith(
      "bmvcc_equipmentrecords",
      GERAET_ID,
      expect.objectContaining({ bmvcc_letztepruefung: null, bmvcc_betriebsmittelstatus: null, bmvcc_pruefer: null })
    );
  });
});

describe("updatePruefbericht", () => {
  it("updates the Pruefbericht fields and re-syncs the Gerät status derived from the record itself", async () => {
    getRecord.mockResolvedValue(rawBericht());
    updateRecord.mockResolvedValue(undefined);
    listRecords.mockResolvedValue({ records: [rawBericht()], nextPageCursor: null });

    const result = await updatePruefbericht(BERICHT_ID, {
      pruefdatum: "2026-02-01",
      ergebnis: "keine Freigabe",
      bemerkungen: "Korrigiert",
    });

    expect(result).toEqual({ geraetId: GERAET_ID });
    expect(updateRecord).toHaveBeenNthCalledWith(
      1,
      "bmvcc_pruefberichts",
      BERICHT_ID,
      expect.objectContaining({ bmvcc_inspectiondate: "2026-02-01", bmvcc_inspectionresult: "keine Freigabe" })
    );
    expect(updateRecord).toHaveBeenNthCalledWith(2, "bmvcc_equipmentrecords", GERAET_ID, expect.any(Object));
  });

  it("does not touch bmvcc_inspector (Prüfer is never editable)", async () => {
    getRecord.mockResolvedValue(rawBericht());
    updateRecord.mockResolvedValue(undefined);
    listRecords.mockResolvedValue({ records: [rawBericht()], nextPageCursor: null });

    await updatePruefbericht(BERICHT_ID, {
      pruefdatum: "2026-02-01",
      ergebnis: "keine Freigabe",
      bemerkungen: null,
    });

    const payload = updateRecord.mock.calls[0][2];
    expect(payload).not.toHaveProperty("bmvcc_inspector");
  });

  it("rejects editing an already stornierten Prüfbericht without writing anything (QA BUG-1 fix)", async () => {
    getRecord.mockResolvedValue(rawBericht({ bmvcc_isarchived: true }));

    await expect(
      updatePruefbericht(BERICHT_ID, { pruefdatum: "2026-02-01", ergebnis: "keine Freigabe", bemerkungen: null })
    ).rejects.toMatchObject({ category: "validation_error" });
    expect(updateRecord).not.toHaveBeenCalled();
  });
});

describe("stornierePruefbericht", () => {
  it("sets bmvcc_isarchived and re-syncs the Gerät status from the next-most-recent active Bericht", async () => {
    getRecord.mockResolvedValue(rawBericht());
    updateRecord.mockResolvedValue(undefined);
    listRecords.mockResolvedValue({
      records: [rawBericht({ bmvcc_pruefberichtid: "older", bmvcc_inspectiondate: "2025-01-01", bmvcc_inspectionresult: "letzte Freigabe" })],
      nextPageCursor: null,
    });

    const result = await stornierePruefbericht(BERICHT_ID);

    expect(result).toEqual({ geraetId: GERAET_ID });
    expect(updateRecord).toHaveBeenNthCalledWith(1, "bmvcc_pruefberichts", BERICHT_ID, { bmvcc_isarchived: true });
    expect(updateRecord).toHaveBeenNthCalledWith(
      2,
      "bmvcc_equipmentrecords",
      GERAET_ID,
      expect.objectContaining({ bmvcc_betriebsmittelstatus: "letzte Freigabe" })
    );
  });

  it("clears the Gerät status fields when no active Bericht remains after stornieren", async () => {
    getRecord.mockResolvedValue(rawBericht());
    updateRecord.mockResolvedValue(undefined);
    listRecords.mockResolvedValue({ records: [], nextPageCursor: null });

    await stornierePruefbericht(BERICHT_ID);

    expect(updateRecord).toHaveBeenNthCalledWith(
      2,
      "bmvcc_equipmentrecords",
      GERAET_ID,
      { bmvcc_letztepruefung: null, bmvcc_betriebsmittelstatus: null, bmvcc_pruefer: null }
    );
  });

  it("rejects stornieren an already stornierten Prüfbericht again", async () => {
    getRecord.mockResolvedValue(rawBericht({ bmvcc_isarchived: true }));

    await expect(stornierePruefbericht(BERICHT_ID)).rejects.toMatchObject({ category: "validation_error" });
    expect(updateRecord).not.toHaveBeenCalled();
  });
});

describe("getAktuelleBemerkungenForGeraete", () => {
  it("returns an empty map without querying Dataverse for an empty id list", async () => {
    const result = await getAktuelleBemerkungenForGeraete([]);
    expect(result).toEqual(new Map());
    expect(listRecords).not.toHaveBeenCalled();
  });

  it("maps each Gerät to the Bemerkung of its most recent active Bericht", async () => {
    listRecords.mockResolvedValue({
      records: [
        rawBericht({ bmvcc_pruefberichtid: "neu", bmvcc_inspectiondate: "2026-03-01", bmvcc_remark: "Neuester" }),
        rawBericht({ bmvcc_pruefberichtid: "alt", bmvcc_inspectiondate: "2026-01-01", bmvcc_remark: "Älter" }),
        rawBericht({
          bmvcc_pruefberichtid: "andereGeraet",
          _bmvcc_gearaet_value: GERAET_ID_2,
          bmvcc_inspectiondate: "2026-02-01",
          bmvcc_remark: "Anderes Gerät",
        }),
      ],
      nextPageCursor: null,
    });

    const result = await getAktuelleBemerkungenForGeraete([GERAET_ID, GERAET_ID_2]);

    expect(result.get(GERAET_ID)).toBe("Neuester");
    expect(result.get(GERAET_ID_2)).toBe("Anderes Gerät");
  });

  it("only considers non-stornierte Berichte", async () => {
    listRecords.mockResolvedValue({ records: [], nextPageCursor: null });

    await getAktuelleBemerkungenForGeraete([GERAET_ID]);

    const filterArg = listRecords.mock.calls[0][1].filter as string;
    expect(filterArg).toContain("bmvcc_isarchived eq false");
  });

  it("leaves a Gerät without any active Bericht out of the map", async () => {
    listRecords.mockResolvedValue({ records: [], nextPageCursor: null });

    const result = await getAktuelleBemerkungenForGeraete([GERAET_ID]);

    expect(result.has(GERAET_ID)).toBe(false);
  });
});
