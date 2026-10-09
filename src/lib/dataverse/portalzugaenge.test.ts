import { describe, it, expect, vi, beforeEach } from "vitest";

const listRecords = vi.fn();
const createRecord = vi.fn();
const deleteRecord = vi.fn();

vi.mock("./records", () => ({
  listRecords: (...args: unknown[]) => listRecords(...args),
  createRecord: (...args: unknown[]) => createRecord(...args),
  deleteRecord: (...args: unknown[]) => deleteRecord(...args),
}));

import { entfernePortalzugang, erstellePortalzugang, listPortalzugaengeForKontakte } from "./portalzugaenge";
import { DataverseError } from "./errors";

const K1 = "aaaaaaaa-aaaa-f111-aaaa-aaaaaaaaaaaa";
const S1 = "dddddddd-dddd-f111-dddd-dddddddddddd";
const S2 = "eeeeeeee-eeee-f111-eeee-eeeeeeeeeeee";

function zugang(id: string, kontakt: string | null, standort: string | null) {
  return { bmvcc_portalzugangid: id, _bmvcc_kontakt_value: kontakt, _bmvcc_standort_value: standort };
}

beforeEach(() => {
  vi.resetAllMocks();
  listRecords.mockResolvedValue({ records: [], nextPageCursor: null });
});

describe("listPortalzugaengeForKontakte", () => {
  it("queries the Portalzugang table by contact and ignores orphans with an empty lookup", async () => {
    listRecords.mockResolvedValue({
      records: [zugang("z1", K1, S1), zugang("z2", K1, null), zugang("z3", null, S1)],
      nextPageCursor: null,
    });

    const result = await listPortalzugaengeForKontakte([K1]);

    expect(listRecords).toHaveBeenCalledWith(
      "bmvcc_portalzugangs",
      expect.objectContaining({ filter: `_bmvcc_kontakt_value eq ${K1}` })
    );
    expect(result).toEqual([{ id: "z1", kontaktId: K1, standortId: S1 }]);
  });

  it("splits long contact lists into blocks of 20 (URL length limit)", async () => {
    const ids = Array.from({ length: 45 }, (_, i) => `aaaaaaaa-aaaa-f111-aaaa-${String(i).padStart(12, "0")}`);
    await listPortalzugaengeForKontakte(ids);
    expect(listRecords).toHaveBeenCalledTimes(3);
  });

  it("rejects ids that are not GUIDs (OData injection guard)", async () => {
    await expect(listPortalzugaengeForKontakte(["x' or 1 eq 1"])).rejects.toThrow();
    expect(listRecords).not.toHaveBeenCalled();
  });
});

describe("erstellePortalzugang", () => {
  it("creates the record with both lookups bound and the name", async () => {
    await erstellePortalzugang(K1, S1, "Max Muster – Pratteln");

    expect(createRecord).toHaveBeenCalledWith("bmvcc_portalzugangs", {
      bmvcc_name: "Max Muster – Pratteln",
      "bmvcc_Kontakt@odata.bind": `/bmvcc_kontakts(${K1})`,
      "bmvcc_Standort@odata.bind": `/bmvcc_organizationlocations(${S1})`,
    });
  });

  it("does nothing when the Portalzugang already exists (idempotent)", async () => {
    listRecords.mockResolvedValue({ records: [zugang("z1", K1, S1)], nextPageCursor: null });

    await erstellePortalzugang(K1, S1, "x");

    expect(createRecord).not.toHaveBeenCalled();
  });

  it("treats a duplicate-key rejection as success when the record now exists (concurrent clicks)", async () => {
    listRecords
      .mockResolvedValueOnce({ records: [], nextPageCursor: null })
      .mockResolvedValueOnce({ records: [zugang("z1", K1, S1)], nextPageCursor: null });
    createRecord.mockRejectedValue(new DataverseError("validation_error", "Doppelter Schlüssel"));

    await expect(erstellePortalzugang(K1, S1, "x")).resolves.toBeUndefined();
  });

  it("passes other create errors on", async () => {
    createRecord.mockRejectedValue(new DataverseError("permission_denied", "keine Berechtigung"));
    await expect(erstellePortalzugang(K1, S1, "x")).rejects.toBeInstanceOf(DataverseError);
  });

  it("shortens names longer than the column allows", async () => {
    await erstellePortalzugang(K1, S1, "A".repeat(150));
    expect(createRecord.mock.calls[0][1].bmvcc_name).toHaveLength(100);
  });
});

describe("entfernePortalzugang", () => {
  it("deletes only the Portalzugang of this Standort", async () => {
    listRecords.mockResolvedValue({ records: [zugang("z1", K1, S1), zugang("z2", K1, S2)], nextPageCursor: null });

    await entfernePortalzugang(K1, S1);

    expect(deleteRecord).toHaveBeenCalledTimes(1);
    expect(deleteRecord).toHaveBeenCalledWith("bmvcc_portalzugangs", "z1");
  });

  it("is fine when the record was already removed by someone else", async () => {
    listRecords.mockResolvedValue({ records: [zugang("z1", K1, S1)], nextPageCursor: null });
    deleteRecord.mockRejectedValue(new DataverseError("not_found", "weg"));

    await expect(entfernePortalzugang(K1, S1)).resolves.toBeUndefined();
  });
});
