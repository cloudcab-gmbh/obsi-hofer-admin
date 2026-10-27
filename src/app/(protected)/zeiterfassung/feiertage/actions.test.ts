import { describe, it, expect, vi, beforeEach } from "vitest";

const istFreigeberMock = vi.fn();
const revalidatePath = vi.fn();
const listFeiertagsjahre = vi.fn();
const erstelleFeiertagsjahr = vi.fn();
const erstelleFeiertag = vi.fn();
const aendereFeiertag = vi.fn();
const loescheFeiertag = vi.fn();
const loescheFeiertagsjahr = vi.fn();

vi.mock("@/lib/auth/freigeber", () => ({ aktuellerBenutzerIstFreigeber: () => istFreigeberMock() }));
vi.mock("next/cache", () => ({ revalidatePath: (...args: unknown[]) => revalidatePath(...args) }));
vi.mock("@/lib/dataverse/feiertage", () => ({
  listFeiertagsjahre: (...args: unknown[]) => listFeiertagsjahre(...args),
  erstelleFeiertagsjahr: (...args: unknown[]) => erstelleFeiertagsjahr(...args),
  erstelleFeiertag: (...args: unknown[]) => erstelleFeiertag(...args),
  aendereFeiertag: (...args: unknown[]) => aendereFeiertag(...args),
  loescheFeiertag: (...args: unknown[]) => loescheFeiertag(...args),
  loescheFeiertagsjahr: (...args: unknown[]) => loescheFeiertagsjahr(...args),
}));

import { entferneFeiertagAction, setzeJahrZurueckAction, speichereFeiertagAction, uebernehmeJahrAction } from "./actions";

const JAHR_ID = "11111111-1111-f111-aaaa-111111111111";
const F1 = "22222222-2222-f111-bbbb-222222222222";
const GEPFLEGT = { id: JAHR_ID, jahr: 2027, feiertage: [{ id: F1, datum: "2027-12-25", name: "Weihnachten", halb: false }] };

beforeEach(() => {
  vi.resetAllMocks();
  istFreigeberMock.mockResolvedValue(true);
  listFeiertagsjahre.mockResolvedValue([GEPFLEGT]);
  erstelleFeiertagsjahr.mockResolvedValue(JAHR_ID);
});

describe("access", () => {
  it("rejects Bearbeiter for every action", async () => {
    istFreigeberMock.mockResolvedValue(false);
    const results = await Promise.all([
      uebernehmeJahrAction(2027),
      speichereFeiertagAction({ jahr: 2027, id: null, datum: "2027-12-24", name: "x", halb: false }),
      entferneFeiertagAction(2027, F1),
      setzeJahrZurueckAction(2027),
    ]);
    expect(results.every((r) => !r.success)).toBe(true);
    expect(listFeiertagsjahre).not.toHaveBeenCalled();
  });
});

describe("uebernehmeJahrAction", () => {
  it("stores the year and the nine suggested holidays", async () => {
    listFeiertagsjahre.mockResolvedValue([]);
    expect(await uebernehmeJahrAction(2027)).toEqual({ success: true });
    expect(erstelleFeiertagsjahr).toHaveBeenCalledWith(2027);
    expect(erstelleFeiertag).toHaveBeenCalledTimes(9);
    expect(erstelleFeiertag).toHaveBeenCalledWith(JAHR_ID, { datum: "2027-03-26", name: "Karfreitag", halb: false });
    expect(revalidatePath).toHaveBeenCalledWith("/zeiterfassung", "layout");
  });

  it("refuses a year that is already maintained", async () => {
    expect((await uebernehmeJahrAction(2027)).success).toBe(false);
    expect(erstelleFeiertagsjahr).not.toHaveBeenCalled();
  });
});

describe("speichereFeiertagAction", () => {
  it("adds a half holiday", async () => {
    expect(await speichereFeiertagAction({ jahr: 2027, id: null, datum: "2027-12-24", name: " Heiligabend ", halb: true })).toEqual({ success: true });
    expect(erstelleFeiertag).toHaveBeenCalledWith(JAHR_ID, expect.objectContaining({ datum: "2027-12-24", name: "Heiligabend", halb: true }));
  });

  it.each([
    [{ datum: "2027-12-25" }, "An diesem Datum gibt es bereits einen Feiertag."],
    [{ datum: "2028-01-03" }, "Das Datum muss im Jahr 2027 liegen."],
    [{ name: "  " }, "Bitte einen Namen angeben."],
    [{ datum: "" }, "Bitte ein gültiges Datum angeben."],
  ])("rejects %o", async (aenderung, message) => {
    const result = await speichereFeiertagAction({ jahr: 2027, id: null, datum: "2027-12-24", name: "Heiligabend", halb: false, ...aenderung });
    expect(result).toEqual({ success: false, message });
    expect(erstelleFeiertag).not.toHaveBeenCalled();
  });

  it("changes name and half/full of an existing holiday", async () => {
    await speichereFeiertagAction({ jahr: 2027, id: F1, datum: "2027-12-25", name: "Weihnachtstag", halb: true });
    expect(aendereFeiertag).toHaveBeenCalledWith(F1, expect.objectContaining({ name: "Weihnachtstag", halb: true }));
  });

  it("refuses changes in a year that is not maintained", async () => {
    listFeiertagsjahre.mockResolvedValue([]);
    expect(await speichereFeiertagAction({ jahr: 2027, id: null, datum: "2027-12-24", name: "x", halb: false })).toEqual({
      success: false,
      message: "Dieses Jahr ist noch nicht übernommen.",
    });
  });
});

describe("entfernen und zurücksetzen", () => {
  it("removes only holidays of the year", async () => {
    await entferneFeiertagAction(2027, F1);
    expect(loescheFeiertag).toHaveBeenCalledWith(F1);

    loescheFeiertag.mockClear();
    await entferneFeiertagAction(2027, "33333333-3333-f111-cccc-333333333333");
    expect(loescheFeiertag).not.toHaveBeenCalled();
  });

  it("resets a year by deleting its holidays first, then the year", async () => {
    const reihenfolge: string[] = [];
    loescheFeiertag.mockImplementation(async () => reihenfolge.push("feiertag"));
    loescheFeiertagsjahr.mockImplementation(async () => reihenfolge.push("jahr"));

    expect(await setzeJahrZurueckAction(2027)).toEqual({ success: true });
    expect(reihenfolge).toEqual(["feiertag", "jahr"]);
  });
});
