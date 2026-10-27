import { describe, it, expect, vi, beforeEach } from "vitest";

const dataverseFetch = vi.fn();
const listRecords = vi.fn();
const listAllRecords = vi.fn();
const createRecord = vi.fn();
const updateRecord = vi.fn();
const upsertRecordByKey = vi.fn();

vi.mock("./client", () => ({ dataverseFetch: (...args: unknown[]) => dataverseFetch(...args) }));
vi.mock("./records", () => ({
  listRecords: (...args: unknown[]) => listRecords(...args),
  listAllRecords: (...args: unknown[]) => listAllRecords(...args),
  createRecord: (...args: unknown[]) => createRecord(...args),
  updateRecord: (...args: unknown[]) => updateRecord(...args),
  deleteRecord: vi.fn(),
  upsertRecordByKey: (...args: unknown[]) => upsertRecordByKey(...args),
}));

import {
  stosseFlowAn,
  erstelleArbeitsmodell,
  erstelleZeiteintrag,
  getPersonByEmail,
  listArbeitsmodelle,
  listZeiteintraege,
  listZeiterfassungEmails,
  speicherePersonStammdaten,
} from "./zeiterfassung";

const PERSON_ID = "37b3cb61-90c0-f111-aaaf-70a8a5061d7a";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("listZeiterfassungEmails", () => {
  it("groups by email, merges upper/lower case and follows further pages", async () => {
    dataverseFetch
      .mockResolvedValueOnce(
        Response.json({
          value: [{ bmvcc_useremail: "Anna@Example.ch" }, { bmvcc_useremail: null }],
          "@odata.nextLink": "https://x/next",
        })
      )
      .mockResolvedValueOnce(Response.json({ value: [{ bmvcc_useremail: "anna@example.ch " }, { bmvcc_useremail: "ben@example.ch" }] }));

    expect(await listZeiterfassungEmails()).toEqual(["anna@example.ch", "ben@example.ch"]);
    expect(dataverseFetch.mock.calls[0][0]).toContain("$apply=groupby((bmvcc_useremail))");
    expect(dataverseFetch.mock.calls[1][0]).toBe("https://x/next");
  });
});

describe("getPersonByEmail", () => {
  it("looks the person up by lower-case email and converts dates to Swiss calendar dates", async () => {
    listRecords.mockResolvedValue({
      records: [
        {
          bmvcc_zeiterfassungpersonid: PERSON_ID,
          bmvcc_name: "anna@example.ch",
          bmvcc_anzeigename: "Anna",
          bmvcc_nichtauswerten: false,
          bmvcc_austrittam: "2027-03-30T22:00:00Z",
          bmvcc_gleitzeitstartsaldo: -3.25,
          bmvcc_startsaldostichtag: "2026-10-30T23:00:00Z",
        },
      ],
      nextPageCursor: null,
    });

    const person = await getPersonByEmail("O'Anna@Example.ch");

    expect(listRecords.mock.calls[0][1].filter).toBe("bmvcc_name eq 'o''anna@example.ch'");
    expect(person).toEqual({
      id: PERSON_ID,
      email: "anna@example.ch",
      name: "Anna",
      nichtAuswerten: false,
      austrittAm: "2027-03-31",
      startsaldo: -3.25,
      stichtag: "2026-10-31",
      ferienanspruch: null,
      ferienStartsaldo: null,
    });
  });
});

describe("listArbeitsmodelle", () => {
  it("maps the seven weekday columns and skips incomplete records", async () => {
    listAllRecords.mockResolvedValue([
      {
        bmvcc_arbeitsmodellid: "v1",
        _bmvcc_person_value: PERSON_ID,
        bmvcc_gultigab: "2026-10-31T23:00:00Z",
        bmvcc_pensum: 40,
        bmvcc_arbeitstagmontag: true,
        bmvcc_arbeitstagdienstag: true,
      },
      { bmvcc_arbeitsmodellid: "v2", _bmvcc_person_value: PERSON_ID, bmvcc_gultigab: null },
    ]);

    const versionen = await listArbeitsmodelle(PERSON_ID);

    expect(listAllRecords.mock.calls[0][1].filter).toBe(`_bmvcc_person_value eq ${PERSON_ID}`);
    expect(versionen).toEqual([
      {
        id: "v1",
        personId: PERSON_ID,
        gueltigAb: "2026-11-01",
        pensum: 40,
        arbeitstage: [true, true, false, false, false, false, false],
      },
    ]);
  });
});

describe("writing", () => {
  it("upserts the person via the email key with dates as Swiss midnight", async () => {
    upsertRecordByKey.mockResolvedValue({ bmvcc_zeiterfassungpersonid: PERSON_ID });

    const id = await speicherePersonStammdaten("Anna@Example.ch", {
      name: "Anna",
      nichtAuswerten: true,
      austrittAm: "2027-03-31",
      startsaldo: 12.5,
      stichtag: null,
      ferienanspruch: 27.5,
      ferienStartsaldo: null,
    });

    expect(id).toBe(PERSON_ID);
    expect(upsertRecordByKey).toHaveBeenCalledWith(
      "bmvcc_zeiterfassungpersons",
      "bmvcc_name",
      "anna@example.ch",
      {
        bmvcc_name: "anna@example.ch",
        bmvcc_anzeigename: "Anna",
        bmvcc_nichtauswerten: true,
        bmvcc_austrittam: "2027-03-30T22:00:00Z",
        bmvcc_gleitzeitstartsaldo: 12.5,
        bmvcc_startsaldostichtag: null,
        bmvcc_ferienanspruch: 27.5,
        bmvcc_ferienstartsaldo: null,
      },
      ["bmvcc_zeiterfassungpersonid"]
    );
  });

  it("creates a version bound to the person by id", async () => {
    createRecord.mockResolvedValue({ id: "v1" });

    await erstelleArbeitsmodell(PERSON_ID, "anna@example.ch", {
      gueltigAb: "2026-11-01",
      pensum: 40,
      arbeitstage: [true, true, false, false, false, false, false],
    });

    expect(createRecord).toHaveBeenCalledWith("bmvcc_arbeitsmodells", {
      bmvcc_name: "anna@example.ch ab 01.11.2026",
      bmvcc_gultigab: "2026-10-31T23:00:00Z",
      bmvcc_pensum: 40,
      bmvcc_arbeitstagmontag: true,
      bmvcc_arbeitstagdienstag: true,
      bmvcc_arbeitstagmittwoch: false,
      bmvcc_arbeitstagdonnerstag: false,
      bmvcc_arbeitstagfreitag: false,
      bmvcc_arbeitstagsamstag: false,
      bmvcc_arbeitstagsonntag: false,
      "bmvcc_Person@odata.bind": `/bmvcc_zeiterfassungpersons(${PERSON_ID})`,
    });
  });
});

describe("listZeiteintraege", () => {
  it("filters by email and Swiss date range and maps types, fallback fields and totals", async () => {
    listAllRecords.mockResolvedValue([
      {
        bmvcc_timetrackingentryid: "e1",
        bmvcc_activitydate: "2026-11-01T23:00:00Z",
        bmvcc_activitytype: 0,
        bmvcc_kommen: null,
        bmvcc_activitystarttime: "2026-11-02T07:00:00Z",
        bmvcc_gehen: "2026-11-02T11:00:00Z",
        bmvcc_tagestotal: 240,
        bmvcc_monatstotal: 960,
        bmvcc_mittagessen: true,
        bmvcc_abendessen: false,
        bmvcc_remarks: "",
      },
      { bmvcc_activitydate: "2026-11-02T23:00:00Z", bmvcc_activitytype: 2 },
      { bmvcc_activitydate: "2026-11-03T23:00:00Z", bmvcc_activitytype: 7 },
      { bmvcc_activitydate: null, bmvcc_activitytype: 0 },
    ]);

    const eintraege = await listZeiteintraege("Anna@Example.ch", "2026-11-01", "2026-11-30");

    expect(listAllRecords.mock.calls[0][1].filter).toBe(
      "bmvcc_useremail eq 'anna@example.ch' and bmvcc_activitydate ge 2026-10-31T23:00:00Z and bmvcc_activitydate lt 2026-11-30T23:00:00Z"
    );
    expect(eintraege).toHaveLength(3);
    expect(eintraege[0]).toEqual({
      id: "e1",
      datum: "2026-11-02",
      typ: "arbeitszeit",
      kommen: "2026-11-02T07:00:00Z",
      gehen: "2026-11-02T11:00:00Z",
      tagestotal: 240,
      monatstotal: 960,
      mittagessen: true,
      abendessen: false,
      bemerkung: null,
      halberTag: false,
    });
    expect(eintraege.map((e) => e.typ)).toEqual(["arbeitszeit", "krankheit", "unbekannt"]);
  });
});

describe("erstelleZeiteintrag", () => {
  it("fills the same fields as the capture app", async () => {
    createRecord.mockResolvedValue({ id: "neu" });

    await erstelleZeiteintrag("Anna@Example.ch", "2026-08-12", {
      typ: "arbeitszeit",
      kommen: "2026-08-12T05:30:00Z",
      gehen: "2026-08-12T10:00:00Z",
      mittagessen: true,
      abendessen: false,
      bemerkung: "Stempeln vergessen",
    });

    const [entity, daten] = createRecord.mock.calls[0];
    expect(entity).toBe("bmvcc_timetrackingentries");
    expect(daten).toMatchObject({
      bmvcc_activitydatetimecode: "202608120730",
      bmvcc_useremail: "anna@example.ch",
      bmvcc_activitydate: "2026-08-11T22:00:00Z",
      bmvcc_activitytype: 0,
      bmvcc_kommen: "2026-08-12T05:30:00Z",
      bmvcc_activitystarttime: "2026-08-12T05:30:00Z",
      bmvcc_gehen: "2026-08-12T10:00:00Z",
      bmvcc_checkouttime: "2026-08-12T10:00:00Z",
      bmvcc_mittagessen: true,
      bmvcc_essen: true,
      bmvcc_abendessen: false,
      bmvcc_remarks: "Stempeln vergessen",
    });
    expect(daten.bmvcc_timerecordid).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("uses 0000 as time code for whole-day entries", async () => {
    createRecord.mockResolvedValue({ id: "neu" });
    await erstelleZeiteintrag("anna@example.ch", "2026-08-12", {
      typ: "krankheit",
      kommen: null,
      gehen: null,
      mittagessen: false,
      abendessen: false,
      bemerkung: null,
    });
    expect(createRecord.mock.calls[0][1]).toMatchObject({ bmvcc_activitydatetimecode: "202608120000", bmvcc_activitytype: 2 });
  });
});

describe("stosseFlowAn", () => {
  it("rewrites Gehen (or Kommen without Gehen) with the same value", async () => {
    await stosseFlowAn({ id: "a", kommen: "2026-10-26T15:54:00Z", gehen: "2026-10-26T16:00:00Z" });
    expect(updateRecord).toHaveBeenCalledWith("bmvcc_timetrackingentries", "a", {
      bmvcc_gehen: "2026-10-26T16:00:00Z",
      bmvcc_checkouttime: "2026-10-26T16:00:00Z",
    });
    await stosseFlowAn({ id: "b", kommen: "2026-10-27T06:46:00Z", gehen: null });
    expect(updateRecord).toHaveBeenLastCalledWith("bmvcc_timetrackingentries", "b", {
      bmvcc_kommen: "2026-10-27T06:46:00Z",
      bmvcc_activitystarttime: "2026-10-27T06:46:00Z",
    });
  });
});
