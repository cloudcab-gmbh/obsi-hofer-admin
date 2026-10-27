import { describe, it, expect, vi, beforeEach } from "vitest";

const listAllRecords = vi.fn();
const createRecord = vi.fn();
vi.mock("./records", () => ({
  listAllRecords: (...args: unknown[]) => listAllRecords(...args),
  createRecord: (...args: unknown[]) => createRecord(...args),
  updateRecord: vi.fn(),
  deleteRecord: vi.fn(),
}));

import { erstelleFeiertag, ladeFeiertagskalender, listFeiertagsjahre } from "./feiertage";

const J27 = "11111111-1111-f111-aaaa-111111111111";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("listFeiertagsjahre", () => {
  it("returns maintained years in the range with their holidays, sorted, ignoring incomplete rows", async () => {
    listAllRecords
      .mockResolvedValueOnce([
        { bmvcc_feriertagsjahrid: J27, bmvcc_jahr: "2027" },
        { bmvcc_feriertagsjahrid: "x", bmvcc_jahr: "2030" },
      ])
      .mockResolvedValueOnce([
        { bmvcc_feriertagid: "b", bmvcc_name: "Weihnachten", bmvcc_datum: "2027-12-25", bmvcc_halbertag: false, _bmvcc_feiertagsjahr_value: J27 },
        { bmvcc_feriertagid: "a", bmvcc_name: "Heiligabend", bmvcc_datum: "2027-12-24", bmvcc_halbertag: true, _bmvcc_feiertagsjahr_value: J27 },
        { bmvcc_feriertagid: "c", bmvcc_name: "ohne Datum", bmvcc_datum: null, _bmvcc_feiertagsjahr_value: J27 },
      ]);

    const jahre = await listFeiertagsjahre(2026, 2028);

    expect(listAllRecords.mock.calls[1][1].filter).toBe(`_bmvcc_feiertagsjahr_value eq ${J27}`);
    expect(jahre).toEqual([
      {
        id: J27,
        jahr: 2027,
        feiertage: [
          { id: "a", datum: "2027-12-24", name: "Heiligabend", halb: true },
          { id: "b", datum: "2027-12-25", name: "Weihnachten", halb: false },
        ],
      },
    ]);
  });

  it("does not query holidays when no year is maintained", async () => {
    listAllRecords.mockResolvedValueOnce([]);
    expect(await listFeiertagsjahre(2026, 2026)).toEqual([]);
    expect(listAllRecords).toHaveBeenCalledTimes(1);
  });
});

describe("ladeFeiertagskalender", () => {
  it("combines maintained years and the suggestion", async () => {
    listAllRecords
      .mockResolvedValueOnce([{ bmvcc_feriertagsjahrid: J27, bmvcc_jahr: "2027" }])
      .mockResolvedValueOnce([
        { bmvcc_feriertagid: "a", bmvcc_name: "Heiligabend", bmvcc_datum: "2027-12-24", bmvcc_halbertag: true, _bmvcc_feiertagsjahr_value: J27 },
      ]);

    const kalender = await ladeFeiertagskalender("2026-11-01", "2027-12-31");

    expect(kalender.am("2026-12-25")?.name).toBe("Weihnachten");
    expect(kalender.am("2027-12-24")).toEqual({ name: "Heiligabend", halb: true });
    expect(kalender.am("2027-12-25")).toBeNull();
  });
});

describe("erstelleFeiertag", () => {
  it("writes the date without conversion and binds the year", async () => {
    createRecord.mockResolvedValue({ id: "neu" });
    await erstelleFeiertag(J27, { datum: "2027-12-24", name: "Heiligabend", halb: true });
    expect(createRecord).toHaveBeenCalledWith("bmvcc_feriertags", {
      bmvcc_name: "Heiligabend",
      bmvcc_datum: "2027-12-24",
      bmvcc_halbertag: true,
      "bmvcc_Feiertagsjahr@odata.bind": `/bmvcc_feriertagsjahrs(${J27})`,
    });
  });
});
