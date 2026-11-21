import { describe, it, expect, vi, beforeEach } from "vitest";

const listAllRecords = vi.fn();
const createRecord = vi.fn();
vi.mock("./records", () => ({
  listAllRecords: (...a: unknown[]) => listAllRecords(...a),
  createRecord: (...a: unknown[]) => createRecord(...a),
}));

import { erstelleKorrekturAnfrage, listKorrekturAnfragen } from "./korrekturanfragen";

beforeEach(() => {
  listAllRecords.mockReset();
  createRecord.mockReset();
  createRecord.mockResolvedValue({ id: "neu" });
});

describe("listKorrekturAnfragen (PROJ-21)", () => {
  it("filters by e-mail (lower case, escaped) and date range, maps status", async () => {
    listAllRecords.mockResolvedValue([
      { bmvcc_korrekturanfrageid: "1", bmvcc_datum: "2026-11-02", bmvcc_nachricht: "a", bmvcc_status: 0, createdon: "2026-11-03T08:00:00Z" },
      { bmvcc_korrekturanfrageid: "2", bmvcc_datum: "2026-11-02", bmvcc_nachricht: "b", bmvcc_status: 1, createdon: "2026-11-04T08:00:00Z" },
      { bmvcc_korrekturanfrageid: "3", bmvcc_datum: "2026-11-05", bmvcc_nachricht: null, bmvcc_status: null, createdon: "2026-11-05T08:00:00Z" },
      { bmvcc_korrekturanfrageid: "4", bmvcc_datum: null, bmvcc_nachricht: "ohne Datum", bmvcc_status: 0, createdon: "x" },
    ]);

    const anfragen = await listKorrekturAnfragen("O'Brien@X.ch", "2026-11-01", "2026-11-30");

    expect(listAllRecords).toHaveBeenCalledWith("bmvcc_korrekturanfrages", {
      select: ["bmvcc_korrekturanfrageid", "bmvcc_datum", "bmvcc_nachricht", "bmvcc_status", "createdon"],
      filter: "bmvcc_mitarbeiteremail eq 'o''brien@x.ch' and bmvcc_datum ge 2026-11-01 and bmvcc_datum le 2026-11-30",
    });
    expect(anfragen.map((a) => [a.id, a.status, a.nachricht])).toEqual([
      ["1", "offen", "a"],
      ["2", "erledigt", "b"],
      ["3", "offen", ""],
    ]);
  });
});

describe("erstelleKorrekturAnfrage (PROJ-21)", () => {
  it("creates an open request with all columns, cut to the column lengths", async () => {
    const id = await erstelleKorrekturAnfrage({
      email: "Anna@X.ch",
      name: "Anna Muster",
      datum: "2026-11-02",
      nachricht: "x".repeat(1200),
      bisherigeZeiten: "07:30–12:00",
      link: "https://tool/zeiterfassung/zeitnachweis?person=anna%40x.ch&monat=2026-11",
    });

    expect(id).toBe("neu");
    expect(createRecord).toHaveBeenCalledWith("bmvcc_korrekturanfrages", {
      bmvcc_titel: "Korrektur 02.11.2026 · Anna Muster",
      bmvcc_mitarbeiteremail: "anna@x.ch",
      bmvcc_mitarbeitername: "Anna Muster",
      bmvcc_datum: "2026-11-02",
      bmvcc_nachricht: "x".repeat(1000),
      bmvcc_bisherigezeiten: "07:30–12:00",
      bmvcc_link: "https://tool/zeiterfassung/zeitnachweis?person=anna%40x.ch&monat=2026-11",
      bmvcc_status: 0,
    });
  });
});
