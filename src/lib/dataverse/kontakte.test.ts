import { describe, it, expect, vi, beforeEach } from "vitest";

const getRecord = vi.fn();
const listRecords = vi.fn();
const updateRecord = vi.fn();
const listPortalzugaengeForKontakte = vi.fn();
const erstellePortalzugang = vi.fn();
const entfernePortalzugang = vi.fn();

vi.mock("./records", () => ({
  getRecord: (...args: unknown[]) => getRecord(...args),
  listRecords: (...args: unknown[]) => listRecords(...args),
  updateRecord: (...args: unknown[]) => updateRecord(...args),
}));
vi.mock("./portalzugaenge", () => ({
  listPortalzugaengeForKontakte: (...args: unknown[]) => listPortalzugaengeForKontakte(...args),
  erstellePortalzugang: (...args: unknown[]) => erstellePortalzugang(...args),
  entfernePortalzugang: (...args: unknown[]) => entfernePortalzugang(...args),
}));

import { hatZugangBeiFirma, listKundenportalKontakteForFirma, setStandortFreigabe } from "./kontakte";
import { DataverseError } from "./errors";

// Echte Dataverse-IDs erfüllen die RFC-UUID-Versionsbits nicht ("f111").
const FIRMA_ID = "11111111-1111-f111-aaaa-111111111111";
const P1 = "aaaaaaaa-aaaa-f111-aaaa-aaaaaaaaaaaa";
const P2 = "bbbbbbbb-bbbb-f111-bbbb-bbbbbbbbbbbb";
const P3 = "cccccccc-cccc-f111-cccc-cccccccccccc";
const S_PRATTELN = "dddddddd-dddd-f111-dddd-dddddddddddd";
const S_BONINGEN = "eeeeeeee-eeee-f111-eeee-eeeeeeeeeeee";
const S_FREMD = "ffffffff-ffff-f111-ffff-ffffffffffff";
const STANDORTE = [
  { id: S_PRATTELN, name: "Pratteln" },
  { id: S_BONINGEN, name: "Boningen" },
];

function kontakt(id: string, overrides: Record<string, unknown> = {}) {
  return { bmvcc_kontaktid: id, bmvcc_name_1: "Muster", bmvcc_name_2: "Max", bmvcc_mail: "max@example.ch", ...overrides };
}

function stubListRecords(opts: { relationen: Record<string, unknown>[]; kontakte: Record<string, unknown>[] }) {
  listRecords.mockImplementation(async (entity: string) => {
    if (entity === "bmvcc_kontakts") return { records: opts.kontakte, nextPageCursor: null };
    return { records: opts.relationen, nextPageCursor: null };
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  listPortalzugaengeForKontakte.mockResolvedValue([]);
});

describe("listKundenportalKontakteForFirma", () => {
  it("rejects a firmaId that is not a GUID before querying Dataverse (OData injection guard)", async () => {
    await expect(listKundenportalKontakteForFirma("x' or 1 eq 1", STANDORTE, S_PRATTELN)).rejects.toThrow();
    expect(listRecords).not.toHaveBeenCalled();
  });

  it("returns an empty list without loading contacts when the Firma has no relations", async () => {
    stubListRecords({ relationen: [], kontakte: [] });

    await expect(listKundenportalKontakteForFirma(FIRMA_ID, STANDORTE, S_PRATTELN)).resolves.toEqual([]);
    expect(listRecords).toHaveBeenCalledTimes(1);
    expect(listPortalzugaengeForKontakte).not.toHaveBeenCalled();
  });

  it("loads the Firma's active contacts via bmvcc_relation and their Portalzugänge in one batch", async () => {
    stubListRecords({
      relationen: [{ _bmvcc_person_value: P1, bmvcc_role_description: "Hauswart" }, { _bmvcc_person_value: P2 }],
      kontakte: [kontakt(P1), kontakt(P2)],
    });

    await listKundenportalKontakteForFirma(FIRMA_ID, STANDORTE, S_PRATTELN);

    const [relEntity, relOpts] = listRecords.mock.calls[0];
    expect(relEntity).toBe("bmvcc_relations");
    expect(relOpts.filter).toContain(`_bmvcc_firma_value eq ${FIRMA_ID}`);
    const kontaktCall = listRecords.mock.calls.find(([entity]) => entity === "bmvcc_kontakts");
    expect(kontaktCall?.[1].filter).toContain("statecode eq 0");
    expect(listPortalzugaengeForKontakte).toHaveBeenCalledTimes(1);
    expect(listPortalzugaengeForKontakte).toHaveBeenCalledWith([P1, P2]);
  });

  it("marks 'freigegeben' for the current Standort and lists other Standorte of this Firma only", async () => {
    stubListRecords({
      relationen: [{ _bmvcc_person_value: P1 }, { _bmvcc_person_value: P2 }],
      kontakte: [kontakt(P1, { bmvcc_name_1: "Ammann" }), kontakt(P2, { bmvcc_name_1: "Zeller" })],
    });
    listPortalzugaengeForKontakte.mockResolvedValue([
      { id: "z1", kontaktId: P1, standortId: S_PRATTELN },
      { id: "z2", kontaktId: P1, standortId: S_BONINGEN },
      { id: "z3", kontaktId: P2, standortId: S_BONINGEN },
      // Zugang bei einer anderen Firma: hier nicht relevant
      { id: "z4", kontaktId: P2, standortId: S_FREMD },
    ]);

    const [ammann, zeller] = await listKundenportalKontakteForFirma(FIRMA_ID, STANDORTE, S_PRATTELN);

    expect(ammann).toMatchObject({ freigegeben: true, weitereStandorte: ["Boningen"] });
    expect(zeller).toMatchObject({ freigegeben: false, weitereStandorte: ["Boningen"] });
    expect(hatZugangBeiFirma(ammann)).toBe(true);
    expect(hatZugangBeiFirma(zeller)).toBe(true);
  });

  it("counts every Standort as 'weitere' when no current Standort is given (sync precondition)", async () => {
    stubListRecords({ relationen: [{ _bmvcc_person_value: P1 }], kontakte: [kontakt(P1)] });
    listPortalzugaengeForKontakte.mockResolvedValue([{ id: "z1", kontaktId: P1, standortId: S_PRATTELN }]);

    const [k] = await listKundenportalKontakteForFirma(FIRMA_ID, STANDORTE, "");

    expect(k.freigegeben).toBe(false);
    expect(hatZugangBeiFirma(k)).toBe(true);
  });

  it("maps name as 'Vorname Nachname', email and sorts by Nachname", async () => {
    stubListRecords({
      relationen: [{ _bmvcc_person_value: P1 }, { _bmvcc_person_value: P2 }],
      kontakte: [
        kontakt(P1, { bmvcc_name_1: "Zürcher", bmvcc_name_2: "Anna" }),
        kontakt(P2, { bmvcc_name_1: "Ammann", bmvcc_name_2: null, bmvcc_mail: null }),
      ],
    });

    const result = await listKundenportalKontakteForFirma(FIRMA_ID, STANDORTE, S_PRATTELN);

    expect(result.map((k) => k.name)).toEqual(["Ammann", "Anna Zürcher"]);
    expect(result[0]).toMatchObject({ email: null, freigegeben: false, rollen: [], weitereStandorte: [] });
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

    const result = await listKundenportalKontakteForFirma(FIRMA_ID, STANDORTE, S_PRATTELN);

    expect(result).toHaveLength(1);
    expect(result[0].rollen).toEqual(["Hauswart", "Sicherheitsbeauftragter"]);
  });

  it("drops relations whose contact is inactive (not returned by the active-only query)", async () => {
    stubListRecords({ relationen: [{ _bmvcc_person_value: P1 }, { _bmvcc_person_value: P3 }], kontakte: [kontakt(P1)] });

    const result = await listKundenportalKontakteForFirma(FIRMA_ID, STANDORTE, S_PRATTELN);

    expect(result.map((k) => k.id)).toEqual([P1]);
  });
});

describe("setStandortFreigabe", () => {
  const PRATTELN = { id: S_PRATTELN, name: "Pratteln" };

  function kontaktGehoertZurFirma(gehoert = true) {
    listRecords.mockResolvedValue({ records: gehoert ? [{ bmvcc_relationid: "r1" }] : [], nextPageCursor: null });
  }

  it("grants access: creates the Portalzugang with a readable name", async () => {
    kontaktGehoertZurFirma();
    getRecord.mockResolvedValue({ bmvcc_mail: "max@example.ch", statecode: 0, bmvcc_name_1: "Muster", bmvcc_name_2: "Max" });

    await setStandortFreigabe({ kontaktId: P1, firmaId: FIRMA_ID, standort: PRATTELN, freigegeben: true });

    expect(listRecords.mock.calls[0][1].filter).toBe(
      `_bmvcc_person_value eq ${P1} and _bmvcc_firma_value eq ${FIRMA_ID} and statecode eq 0`
    );
    expect(erstellePortalzugang).toHaveBeenCalledWith(P1, S_PRATTELN, "Max Muster – Pratteln");
  });

  it("rejects a contact that is not assigned to the Firma (direct Server Action call)", async () => {
    kontaktGehoertZurFirma(false);

    await expect(
      setStandortFreigabe({ kontaktId: P1, firmaId: FIRMA_ID, standort: PRATTELN, freigegeben: true })
    ).rejects.toBeInstanceOf(DataverseError);
    expect(erstellePortalzugang).not.toHaveBeenCalled();
  });

  it("rejects granting access to a contact without an email address", async () => {
    kontaktGehoertZurFirma();
    getRecord.mockResolvedValue({ bmvcc_mail: null, statecode: 0 });

    await expect(
      setStandortFreigabe({ kontaktId: P1, firmaId: FIRMA_ID, standort: PRATTELN, freigegeben: true })
    ).rejects.toBeInstanceOf(DataverseError);
    expect(erstellePortalzugang).not.toHaveBeenCalled();
  });

  it("rejects granting access to an inactive contact", async () => {
    kontaktGehoertZurFirma();
    getRecord.mockResolvedValue({ bmvcc_mail: "max@example.ch", statecode: 1 });

    await expect(
      setStandortFreigabe({ kontaktId: P1, firmaId: FIRMA_ID, standort: PRATTELN, freigegeben: true })
    ).rejects.toBeInstanceOf(DataverseError);
    expect(erstellePortalzugang).not.toHaveBeenCalled();
  });

  it("revokes only this Standort, without checking email or status", async () => {
    kontaktGehoertZurFirma();

    await setStandortFreigabe({ kontaktId: P1, firmaId: FIRMA_ID, standort: PRATTELN, freigegeben: false });

    expect(getRecord).not.toHaveBeenCalled();
    expect(entfernePortalzugang).toHaveBeenCalledWith(P1, S_PRATTELN);
  });

  // Seit Kundenportal PROJ-15 zählt nur noch die Tabelle Portalzugang.
  it("no longer writes the former contact flag bmvcc_kundenportal", async () => {
    kontaktGehoertZurFirma();
    getRecord.mockResolvedValue({ bmvcc_mail: "max@example.ch", statecode: 0 });

    await setStandortFreigabe({ kontaktId: P1, firmaId: FIRMA_ID, standort: PRATTELN, freigegeben: true });
    await setStandortFreigabe({ kontaktId: P1, firmaId: FIRMA_ID, standort: PRATTELN, freigegeben: false });

    expect(updateRecord).not.toHaveBeenCalled();
  });

  it("rejects ids that are not GUIDs before querying Dataverse", async () => {
    await expect(
      setStandortFreigabe({ kontaktId: "not-a-guid", firmaId: FIRMA_ID, standort: PRATTELN, freigegeben: false })
    ).rejects.toThrow();
    expect(listRecords).not.toHaveBeenCalled();
  });
});
