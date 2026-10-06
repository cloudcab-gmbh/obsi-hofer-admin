import { describe, it, expect, vi, beforeEach } from "vitest";

const getRecord = vi.fn();
const listRecords = vi.fn();
const updateRecord = vi.fn();

vi.mock("./records", () => ({
  getRecord: (...args: unknown[]) => getRecord(...args),
  listRecords: (...args: unknown[]) => listRecords(...args),
  updateRecord: (...args: unknown[]) => updateRecord(...args),
}));

import { listKundenportalKontakteForFirma, setKundenportalFreigabe } from "./kontakte";
import { DataverseError } from "./errors";

// Echte Dataverse-IDs erfüllen die RFC-UUID-Versionsbits nicht ("f111").
const FIRMA_ID = "11111111-1111-f111-aaaa-111111111111";
const P1 = "aaaaaaaa-aaaa-f111-aaaa-aaaaaaaaaaaa";
const P2 = "bbbbbbbb-bbbb-f111-bbbb-bbbbbbbbbbbb";
const P3 = "cccccccc-cccc-f111-cccc-cccccccccccc";

function kontakt(id: string, overrides: Record<string, unknown> = {}) {
  return { bmvcc_kontaktid: id, bmvcc_name_1: "Muster", bmvcc_name_2: "Max", bmvcc_mail: "max@example.ch", bmvcc_kundenportal: null, ...overrides };
}

/** listRecords wird für Relationen (Firma), Kontakte und Relationen (weitere Firmen) aufgerufen. */
function stubListRecords(opts: {
  relationen: Record<string, unknown>[];
  kontakte: Record<string, unknown>[];
  weitere?: Record<string, unknown>[];
}) {
  listRecords.mockImplementation(async (entity: string, options: { filter: string }) => {
    if (entity === "bmvcc_kontakts") return { records: opts.kontakte, nextPageCursor: null };
    if (options.filter.includes("_bmvcc_firma_value ne")) return { records: opts.weitere ?? [], nextPageCursor: null };
    return { records: opts.relationen, nextPageCursor: null };
  });
}

beforeEach(() => {
  getRecord.mockReset();
  listRecords.mockReset();
  updateRecord.mockReset();
});

describe("listKundenportalKontakteForFirma", () => {
  it("rejects a firmaId that is not a GUID before querying Dataverse (OData injection guard)", async () => {
    await expect(listKundenportalKontakteForFirma("x' or 1 eq 1")).rejects.toThrow();
    expect(listRecords).not.toHaveBeenCalled();
  });

  it("returns an empty list without loading contacts when the Firma has no relations", async () => {
    stubListRecords({ relationen: [], kontakte: [] });

    await expect(listKundenportalKontakteForFirma(FIRMA_ID)).resolves.toEqual([]);
    expect(listRecords).toHaveBeenCalledTimes(1);
  });

  it("loads the Firma's contacts via bmvcc_relation and only active ones", async () => {
    stubListRecords({ relationen: [{ _bmvcc_person_value: P1, bmvcc_role_description: "Hauswart" }], kontakte: [kontakt(P1)] });

    await listKundenportalKontakteForFirma(FIRMA_ID);

    const [relEntity, relOpts] = listRecords.mock.calls[0];
    expect(relEntity).toBe("bmvcc_relations");
    expect(relOpts.filter).toContain(`_bmvcc_firma_value eq ${FIRMA_ID}`);
    const kontaktCall = listRecords.mock.calls.find(([entity]) => entity === "bmvcc_kontakts");
    expect(kontaktCall?.[1].filter).toContain(`bmvcc_kontaktid eq ${P1}`);
    expect(kontaktCall?.[1].filter).toContain("statecode eq 0");
  });

  it("maps name as 'Vorname Nachname', freigegeben, email and sorts by Nachname", async () => {
    stubListRecords({
      relationen: [{ _bmvcc_person_value: P1 }, { _bmvcc_person_value: P2 }],
      kontakte: [
        kontakt(P1, { bmvcc_name_1: "Zürcher", bmvcc_name_2: "Anna", bmvcc_kundenportal: true }),
        kontakt(P2, { bmvcc_name_1: "Ammann", bmvcc_name_2: null, bmvcc_mail: null }),
      ],
    });

    const result = await listKundenportalKontakteForFirma(FIRMA_ID);

    expect(result.map((k) => k.name)).toEqual(["Ammann", "Anna Zürcher"]);
    expect(result[0]).toMatchObject({ email: null, freigegeben: false, rollen: [] });
    expect(result[1]).toMatchObject({ email: "max@example.ch", freigegeben: true });
  });

  it("merges several relations of the same person into one entry with all distinct roles", async () => {
    stubListRecords({
      relationen: [
        { _bmvcc_person_value: P1, bmvcc_role_description: "Hauswart" },
        { _bmvcc_person_value: P1, bmvcc_role_description: "Sicherheitsbeauftragter" },
        { _bmvcc_person_value: P1, bmvcc_role_description: "Hauswart" },
      ],
      kontakte: [kontakt(P1)],
    });

    const result = await listKundenportalKontakteForFirma(FIRMA_ID);

    expect(result).toHaveLength(1);
    expect(result[0].rollen).toEqual(["Hauswart", "Sicherheitsbeauftragter"]);
  });

  it("flags contacts that are also assigned to other Firmen", async () => {
    stubListRecords({
      relationen: [{ _bmvcc_person_value: P1 }, { _bmvcc_person_value: P2 }],
      kontakte: [kontakt(P1), kontakt(P2, { bmvcc_name_1: "Zeller" })],
      weitere: [{ _bmvcc_person_value: P2 }],
    });

    const result = await listKundenportalKontakteForFirma(FIRMA_ID);

    expect(result.find((k) => k.id === P1)?.weitereFirmen).toBe(false);
    expect(result.find((k) => k.id === P2)?.weitereFirmen).toBe(true);
  });

  it("drops relations whose contact is inactive (not returned by the active-only query)", async () => {
    stubListRecords({ relationen: [{ _bmvcc_person_value: P1 }, { _bmvcc_person_value: P3 }], kontakte: [kontakt(P1)] });

    const result = await listKundenportalKontakteForFirma(FIRMA_ID);

    expect(result.map((k) => k.id)).toEqual([P1]);
  });
});

describe("setKundenportalFreigabe", () => {
  it("grants access for an active contact with an email address, writing only bmvcc_kundenportal", async () => {
    getRecord.mockResolvedValue({ bmvcc_mail: "max@example.ch", statecode: 0 });

    await setKundenportalFreigabe(P1, true);

    expect(updateRecord).toHaveBeenCalledWith("bmvcc_kontakts", P1, { bmvcc_kundenportal: true });
  });

  it("rejects granting access to a contact without an email address (server-side, not just the UI)", async () => {
    getRecord.mockResolvedValue({ bmvcc_mail: null, statecode: 0 });

    await expect(setKundenportalFreigabe(P1, true)).rejects.toBeInstanceOf(DataverseError);
    expect(updateRecord).not.toHaveBeenCalled();
  });

  it("rejects granting access to an inactive contact", async () => {
    getRecord.mockResolvedValue({ bmvcc_mail: "max@example.ch", statecode: 1 });

    await expect(setKundenportalFreigabe(P1, true)).rejects.toBeInstanceOf(DataverseError);
    expect(updateRecord).not.toHaveBeenCalled();
  });

  it("always allows revoking access, without checking email or status", async () => {
    await setKundenportalFreigabe(P1, false);

    expect(getRecord).not.toHaveBeenCalled();
    expect(updateRecord).toHaveBeenCalledWith("bmvcc_kontakts", P1, { bmvcc_kundenportal: false });
  });

  it("rejects a kontaktId that is not a GUID", async () => {
    await expect(setKundenportalFreigabe("not-a-guid", false)).rejects.toThrow();
    expect(updateRecord).not.toHaveBeenCalled();
  });
});
