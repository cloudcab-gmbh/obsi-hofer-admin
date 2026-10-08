import { describe, it, expect, vi, beforeEach } from "vitest";

const getRecord = vi.fn();
const listRecords = vi.fn();
const updateRecord = vi.fn();

vi.mock("./records", () => ({
  getRecord: (...args: unknown[]) => getRecord(...args),
  listRecords: (...args: unknown[]) => listRecords(...args),
  updateRecord: (...args: unknown[]) => updateRecord(...args),
}));

import {
  getArtikel,
  getFirma,
  getGeraet,
  getStandort,
  listFirmen,
  listGeraeteForStandorte,
  listStandorteForFirma,
  matchesGeraeteFilter,
  sortiereGeraete,
  eindeutigeStandortNamen,
  firmenAnzeigenamen,
  updateGeraetStammdaten,
  type Geraet,
} from "./geraete";

const VALID_FIRMA_ID = "11111111-1111-1111-1111-111111111111";
const VALID_STANDORT_ID = "22222222-2222-2222-2222-222222222222";
const VALID_STANDORT_ID_2 = "33333333-3333-3333-3333-333333333333";
const VALID_GERAET_ID = "44444444-4444-4444-4444-444444444444";

beforeEach(() => {
  getRecord.mockReset();
  listRecords.mockReset();
  updateRecord.mockReset();
});

describe("listFirmen", () => {
  it("maps Dataverse rows to Firma objects, sorted by name", async () => {
    listRecords.mockResolvedValue({
      records: [{ bmvcc_firmaid: VALID_FIRMA_ID, bmvcc_name: "ACME AG" }],
      nextPageCursor: null,
    });

    const result = await listFirmen();

    expect(result).toEqual([{ id: VALID_FIRMA_ID, name: "ACME AG" }]);
    expect(listRecords).toHaveBeenCalledWith("bmvcc_firmas", expect.objectContaining({ orderBy: "bmvcc_name asc" }));
  });

  // Live-Fund 2026-10-08: deaktivierte Firmen erschienen in der Auswahl.
  it("lists only active Firmen", async () => {
    listRecords.mockResolvedValue({ records: [], nextPageCursor: null });
    await listFirmen();
    expect(listRecords).toHaveBeenCalledWith("bmvcc_firmas", expect.objectContaining({ filter: "statecode eq 0" }));
  });

  it("falls back to a placeholder name when bmvcc_name is missing", async () => {
    listRecords.mockResolvedValue({ records: [{ bmvcc_firmaid: VALID_FIRMA_ID, bmvcc_name: null }], nextPageCursor: null });

    const result = await listFirmen();

    expect(result[0].name).toBe("(ohne Name)");
  });
});

describe("getFirma / getStandort / getArtikel", () => {
  it("maps a Firma record", async () => {
    getRecord.mockResolvedValue({ bmvcc_firmaid: VALID_FIRMA_ID, bmvcc_name: "ACME AG" });
    const firma = await getFirma(VALID_FIRMA_ID);
    expect(firma).toEqual({ id: VALID_FIRMA_ID, name: "ACME AG" });
  });

  it("maps a Standort record including its Firma lookup", async () => {
    getRecord.mockResolvedValue({
      bmvcc_organizationlocationid: VALID_STANDORT_ID,
      bmvcc_displayname: "Hauptsitz",
      _bmvcc_bexiofirma_value: VALID_FIRMA_ID,
    });
    const standort = await getStandort(VALID_STANDORT_ID);
    expect(standort).toEqual({ id: VALID_STANDORT_ID, name: "Hauptsitz", firmaId: VALID_FIRMA_ID });
  });

  it("maps an Artikel record", async () => {
    getRecord.mockResolvedValue({
      bmvcc_artikelid: "artikel-1",
      bmvcc_modelarticle: "Seil 10mm",
      bmvcc_manufacturer: "Petzl",
      bmvcc_articletype: "Seil",
      bmvcc_dimensions: "10mm",
      bmvcc_standardnorm: "EN 1891",
    });
    const artikel = await getArtikel("artikel-1");
    expect(artikel).toEqual({
      id: "artikel-1",
      bezeichnung: "Seil 10mm",
      hersteller: "Petzl",
      typ: "Seil",
      dimension: "10mm",
      norm: "EN 1891",
    });
  });
});

describe("listStandorteForFirma", () => {
  it("builds an unquoted GUID filter against the Firma lookup", async () => {
    listRecords.mockResolvedValue({ records: [], nextPageCursor: null });

    await listStandorteForFirma(VALID_FIRMA_ID);

    expect(listRecords).toHaveBeenCalledWith(
      "bmvcc_organizationlocations",
      expect.objectContaining({ filter: `_bmvcc_bexiofirma_value eq ${VALID_FIRMA_ID}` })
    );
  });

  it("rejects a malformed firmaId without querying Dataverse (OData-injection guard)", async () => {
    await expect(listStandorteForFirma("1 eq 1 or 1 eq 1")).rejects.toThrow(/GUID/);
    expect(listRecords).not.toHaveBeenCalled();
  });
});

describe("listGeraeteForStandorte", () => {
  it("returns an empty array without calling Dataverse when given no Standorte", async () => {
    const result = await listGeraeteForStandorte([]);
    expect(result).toEqual([]);
    expect(listRecords).not.toHaveBeenCalled();
  });

  it("builds an OR filter chain across all given Standort ids", async () => {
    listRecords.mockResolvedValue({ records: [], nextPageCursor: null });

    await listGeraeteForStandorte([VALID_STANDORT_ID, VALID_STANDORT_ID_2]);

    expect(listRecords).toHaveBeenCalledWith(
      "bmvcc_equipmentrecords",
      expect.objectContaining({
        filter: `_bmvcc_standort_value eq ${VALID_STANDORT_ID} or _bmvcc_standort_value eq ${VALID_STANDORT_ID_2}`,
      })
    );
  });

  it("rejects a malformed standortId without querying Dataverse", async () => {
    await expect(listGeraeteForStandorte(["not-a-guid"])).rejects.toThrow(/GUID/);
    expect(listRecords).not.toHaveBeenCalled();
  });

  it("maps every Gerät field, including the newly added Kunden-ID", async () => {
    listRecords.mockResolvedValue({
      records: [
        {
          bmvcc_equipmentrecordid: VALID_GERAET_ID,
          bmvcc_geraetename: "Seil 1",
          bmvcc_serienummer: "SN-1",
          bmvcc_barcode: "BC-1",
          bmvcc_betriebsmittelstatus: "Freigabe",
          bmvcc_letztepruefung: "2026-01-01T00:00:00Z",
          bmvcc_ablegereife: "2030-01-01T00:00:00Z",
          bmvcc_herstelljahr: "2020-01-01T00:00:00Z",
          bmvcc_erstgebrauch: "2021-01-01",
          _bmvcc_standort_value: VALID_STANDORT_ID,
          _cre77_artikel_value: "artikel-1",
          bmvcc_lagerort: "Lager A",
          bmvcc_pruefer: "M. Muster",
          bmvcc_zubehoer: "Karabiner",
          bmvcc_bemerkungen: "Alles ok",
          bmvcc_kundenid: "KD-42",
        },
      ],
      nextPageCursor: null,
    });

    const [geraet] = await listGeraeteForStandorte([VALID_STANDORT_ID]);

    expect(geraet).toEqual({
      id: VALID_GERAET_ID,
      name: "Seil 1",
      serienummer: "SN-1",
      barcode: "BC-1",
      status: "Freigabe",
      letztePruefung: "2026-01-01T00:00:00Z",
      ablegereife: "2030-01-01T00:00:00Z",
      herstelljahr: "2020-01-01T00:00:00Z",
      erstgebrauch: "2021-01-01",
      standortId: VALID_STANDORT_ID,
      artikelId: "artikel-1",
      lagerort: "Lager A",
      pruefer: "M. Muster",
      zubehoer: "Karabiner",
      bemerkungen: "Alles ok",
      kundenId: "KD-42",
    });
  });
});

describe("getGeraet", () => {
  it("fetches and maps a single Gerät by id", async () => {
    getRecord.mockResolvedValue({ bmvcc_equipmentrecordid: VALID_GERAET_ID, bmvcc_geraetename: "Seil 1" });

    const geraet = await getGeraet(VALID_GERAET_ID);

    expect(geraet.id).toBe(VALID_GERAET_ID);
    expect(geraet.name).toBe("Seil 1");
    expect(getRecord).toHaveBeenCalledWith(
      "bmvcc_equipmentrecords",
      VALID_GERAET_ID,
      expect.objectContaining({ select: expect.arrayContaining(["bmvcc_kundenid"]) })
    );
  });
});

describe("updateGeraetStammdaten", () => {
  it("sends only the editable Stammdaten fields, never bmvcc_geraetename", async () => {
    await updateGeraetStammdaten(VALID_GERAET_ID, {
      serienummer: "SN-1",
      barcode: "BC-1",
      lagerort: "Lager A",
      bemerkungen: "Kommentar",
      zubehoer: "Karabiner",
      herstelljahr: "2020-01-01",
      erstgebrauch: "2021-01-01",
      ablegereife: "2030-01-01",
      kundenId: "KD-42",
    });

    expect(updateRecord).toHaveBeenCalledWith(
      "bmvcc_equipmentrecords",
      VALID_GERAET_ID,
      expect.objectContaining({
        bmvcc_serienummer: "SN-1",
        bmvcc_kundenid: "KD-42",
      })
    );
    const payload = updateRecord.mock.calls[0][2];
    expect(payload).not.toHaveProperty("bmvcc_geraetename");
  });
});

function fixtureGeraet(overrides: Partial<Geraet> = {}): Geraet {
  return {
    id: VALID_GERAET_ID,
    name: "Seil 1",
    serienummer: "SN-1",
    barcode: "BC-1",
    status: "Freigabe",
    letztePruefung: null,
    ablegereife: null,
    herstelljahr: null,
    erstgebrauch: null,
    standortId: VALID_STANDORT_ID,
    artikelId: null,
    lagerort: "Lager A",
    pruefer: null,
    zubehoer: null,
    bemerkungen: null,
    kundenId: "KD-42",
    ...overrides,
  };
}

const EMPTY_FILTER = { suche: "", lagerort: "", letztePruefungTage: "" };

describe("matchesGeraeteFilter", () => {
  it("matches everything when the filter is empty", () => {
    expect(matchesGeraeteFilter(fixtureGeraet(), EMPTY_FILTER)).toBe(true);
  });

  it("excludes a Gerät at a different Lagerort", () => {
    expect(matchesGeraeteFilter(fixtureGeraet(), { ...EMPTY_FILTER, lagerort: "Lager B" })).toBe(false);
  });

  it("matches a search term against name, barcode, serienummer or kundenId (case-insensitive)", () => {
    expect(matchesGeraeteFilter(fixtureGeraet(), { ...EMPTY_FILTER, suche: "seil" })).toBe(true);
    expect(matchesGeraeteFilter(fixtureGeraet(), { ...EMPTY_FILTER, suche: "kd-42" })).toBe(true);
    expect(matchesGeraeteFilter(fixtureGeraet(), { ...EMPTY_FILTER, suche: "nichts-passt" })).toBe(false);
  });

  it("matches a Gerät whose letzte Prüfung lies within the given number of days", () => {
    const vorZweiTagen = new Date();
    vorZweiTagen.setDate(vorZweiTagen.getDate() - 2);
    const geraet = fixtureGeraet({ letztePruefung: vorZweiTagen.toISOString() });

    expect(matchesGeraeteFilter(geraet, { ...EMPTY_FILTER, letztePruefungTage: "7" })).toBe(true);
  });

  it("excludes a Gerät whose letzte Prüfung lies outside the given number of days", () => {
    const vorZehnTagen = new Date();
    vorZehnTagen.setDate(vorZehnTagen.getDate() - 10);
    const geraet = fixtureGeraet({ letztePruefung: vorZehnTagen.toISOString() });

    expect(matchesGeraeteFilter(geraet, { ...EMPTY_FILTER, letztePruefungTage: "7" })).toBe(false);
  });

  it("excludes a Gerät that was never inspected when the Letzte-Prüfung filter is active", () => {
    const geraet = fixtureGeraet({ letztePruefung: null });
    expect(matchesGeraeteFilter(geraet, { ...EMPTY_FILTER, letztePruefungTage: "7" })).toBe(false);
  });

  it("ignores an invalid (non-numeric or non-positive) letztePruefungTage value", () => {
    const geraet = fixtureGeraet({ letztePruefung: null });
    expect(matchesGeraeteFilter(geraet, { ...EMPTY_FILTER, letztePruefungTage: "abc" })).toBe(true);
    expect(matchesGeraeteFilter(geraet, { ...EMPTY_FILTER, letztePruefungTage: "0" })).toBe(true);
  });

  it("combines Standort/Lagerort restriction with a search term", () => {
    const filter = { ...EMPTY_FILTER, suche: "seil", lagerort: "Lager A", standortId: VALID_STANDORT_ID };
    expect(matchesGeraeteFilter(fixtureGeraet(), filter)).toBe(true);
    expect(matchesGeraeteFilter(fixtureGeraet({ lagerort: "Lager B" }), filter)).toBe(false);
  });
});

describe("sortiereGeraete", () => {
  const lookups = {
    pbBemerkung: () => null,
  };
  const ids = (geraete: Geraet[]) => geraete.map((g) => g.id);

  it("sorts text columns ascending/descending, case-insensitive and numeric-aware", () => {
    const geraete = [
      fixtureGeraet({ id: "a", kundenId: "KD-10" }),
      fixtureGeraet({ id: "b", kundenId: "kd-2" }),
      fixtureGeraet({ id: "c", kundenId: "KD-1" }),
    ];
    expect(ids(sortiereGeraete(geraete, { spalte: "kundenId", richtung: "asc" }, lookups))).toEqual(["c", "b", "a"]);
    expect(ids(sortiereGeraete(geraete, { spalte: "kundenId", richtung: "desc" }, lookups))).toEqual(["a", "b", "c"]);
  });

  it("sorts letzte Prüfung by date, not by string", () => {
    const geraete = [
      fixtureGeraet({ id: "a", letztePruefung: "2026-09-01T00:00:00Z" }),
      fixtureGeraet({ id: "b", letztePruefung: "2025-12-31T00:00:00Z" }),
      fixtureGeraet({ id: "c", letztePruefung: "2026-10-01T00:00:00Z" }),
    ];
    expect(ids(sortiereGeraete(geraete, { spalte: "letztePruefung", richtung: "desc" }, lookups))).toEqual([
      "c",
      "a",
      "b",
    ]);
  });

  it("always puts empty values last, regardless of direction", () => {
    const geraete = [
      fixtureGeraet({ id: "leer", barcode: null }),
      fixtureGeraet({ id: "b", barcode: "B" }),
      fixtureGeraet({ id: "leer2", barcode: "" }),
      fixtureGeraet({ id: "a", barcode: "A" }),
    ];
    expect(ids(sortiereGeraete(geraete, { spalte: "barcode", richtung: "asc" }, lookups))).toEqual([
      "a",
      "b",
      "leer",
      "leer2",
    ]);
    expect(ids(sortiereGeraete(geraete, { spalte: "barcode", richtung: "desc" }, lookups))).toEqual([
      "b",
      "a",
      "leer",
      "leer2",
    ]);
  });

  it("sorts PB_Bemerkung via the lookup", () => {
    const geraete = [fixtureGeraet({ id: "b" }), fixtureGeraet({ id: "z" })];
    const bemerkungen: Record<string, string> = { z: "alpha", b: "beta" };
    expect(
      ids(
        sortiereGeraete(geraete, { spalte: "pbBemerkung", richtung: "asc" }, { ...lookups, pbBemerkung: (id) => bemerkungen[id] })
      )
    ).toEqual(["z", "b"]);
  });

  it("does not mutate the input array", () => {
    const geraete = [fixtureGeraet({ id: "b", name: "B" }), fixtureGeraet({ id: "a", name: "A" })];
    sortiereGeraete(geraete, { spalte: "name", richtung: "asc" }, lookups);
    expect(ids(geraete)).toEqual(["b", "a"]);
  });
});

// PROJ-10: eindeutige Anzeigenamen für gleichnamige Standorte einer Firma.
describe("eindeutigeStandortNamen", () => {
  const standort = (id: string, name: string, erstelltAm: string | null = null) => ({
    id,
    name,
    firmaId: VALID_FIRMA_ID,
    erstelltAm,
  });

  it("keeps unique names unchanged (trimmed)", () => {
    const namen = eindeutigeStandortNamen([standort("a", "Haupthaus "), standort("b", "Werkhof")]);
    expect(namen.get("a")).toBe("Haupthaus");
    expect(namen.get("b")).toBe("Werkhof");
  });

  it("numbers duplicate names by creation date, case-insensitively", () => {
    const namen = eindeutigeStandortNamen([
      standort("neu", "Kochergasse 9", "2026-07-14T10:00:00Z"),
      standort("alt", "kochergasse 9", "2026-01-01T10:00:00Z"),
      standort("mitte", "Kochergasse 9", "2026-03-01T10:00:00Z"),
    ]);
    expect(namen.get("alt")).toBe("kochergasse 9");
    expect(namen.get("mitte")).toBe("Kochergasse 9 (2)");
    expect(namen.get("neu")).toBe("Kochergasse 9 (3)");
  });

  it("is stable regardless of input order (same Standort → same name)", () => {
    const a = standort("x1", "Lager", "2026-01-01T00:00:00Z");
    const b = standort("x2", "Lager", "2026-02-01T00:00:00Z");
    expect(eindeutigeStandortNamen([a, b])).toEqual(eindeutigeStandortNamen([b, a]));
  });
});

// PROJ-10 / Live-Fund 2026-10-08: bewusst getrennte, gleichnamige Firmen unterscheidbar machen.
describe("firmenAnzeigenamen", () => {
  const NAME = "Bilfinger Industrial Services Schweiz AG";
  const firma = (id: string, name = NAME) => ({ id, name });
  const standort = (id: string, firmaId: string, name: string) => ({ id, name, firmaId });

  it("keeps unique Firma names unchanged", () => {
    const namen = firmenAnzeigenamen([firma("a", "ACME AG"), firma("b", "Beta AG")], []);
    expect(namen.get("a")).toBe("ACME AG");
    expect(namen.get("b")).toBe("Beta AG");
  });

  it("adds the Standort without the repeated Firma name; an empty suffix is fine while unique", () => {
    const namen = firmenAnzeigenamen(
      [firma("haupt"), firma("pratteln"), firma("boningen")],
      [
        standort("s1", "haupt", NAME),
        standort("s2", "pratteln", `${NAME} - Pratteln`),
        standort("s3", "boningen", `${NAME}-Boningen`),
      ]
    );
    expect(namen.get("haupt")).toBe(NAME);
    expect(namen.get("pratteln")).toBe(`${NAME} · Pratteln`);
    expect(namen.get("boningen")).toBe(`${NAME} · Boningen`);
  });

  it("uses the full Standort name when it does not start with the Firma name", () => {
    const namen = firmenAnzeigenamen(
      [firma("a", "ISS Facility Services AG"), firma("b", "ISS Facility Services AG")],
      [standort("s1", "a", "ISS Facility Services AG, Schlieren"), standort("s2", "b", "Swisscom, Schulstrasse 2, Sins")]
    );
    expect(namen.get("a")).toBe("ISS Facility Services AG · Schlieren");
    expect(namen.get("b")).toBe("ISS Facility Services AG · Swisscom, Schulstrasse 2, Sins");
  });

  it("marks Firmen without or with several Standorte", () => {
    const namen = firmenAnzeigenamen(
      [firma("leer"), firma("viele")],
      [standort("s1", "viele", "A"), standort("s2", "viele", "B")]
    );
    expect(namen.get("leer")).toBe(`${NAME} · ohne Standort`);
    expect(namen.get("viele")).toBe(`${NAME} · 2 Standorte`);
  });

  it("numbers names that are still identical, in a stable order", () => {
    const namen = firmenAnzeigenamen([firma("b"), firma("a")], []);
    expect(namen.get("a")).toBe(`${NAME} · ohne Standort (1)`);
    expect(namen.get("b")).toBe(`${NAME} · ohne Standort (2)`);
  });
});
