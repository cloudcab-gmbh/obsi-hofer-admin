import { describe, it, expect, vi, beforeEach } from "vitest";

const istFreigeberMock = vi.fn();
const revalidatePath = vi.fn();
const getZeiteintragFuerKorrektur = vi.fn();
const setzeGehen = vi.fn();
const erstelleZeiteintrag = vi.fn();
const getPersonByEmail = vi.fn();
const listZeiterfassungEmails = vi.fn();
const listZeiteintraege = vi.fn();
const heuteSchweiz = vi.fn();
const listArbeitsmodelle = vi.fn();
const loescheZeiteintrag = vi.fn();
const setzeHalberTag = vi.fn();

vi.mock("@/lib/auth/freigeber", () => ({ aktuellerBenutzerIstFreigeber: () => istFreigeberMock() }));
vi.mock("next/cache", () => ({ revalidatePath: (...args: unknown[]) => revalidatePath(...args) }));
vi.mock("@/lib/dataverse/zeiterfassung", () => ({
  getZeiteintragFuerKorrektur: (...args: unknown[]) => getZeiteintragFuerKorrektur(...args),
  setzeGehen: (...args: unknown[]) => setzeGehen(...args),
  erstelleZeiteintrag: (...args: unknown[]) => erstelleZeiteintrag(...args),
  getPersonByEmail: (...args: unknown[]) => getPersonByEmail(...args),
  listZeiterfassungEmails: () => listZeiterfassungEmails(),
  listZeiteintraege: (...args: unknown[]) => listZeiteintraege(...args),
  listArbeitsmodelle: (...args: unknown[]) => listArbeitsmodelle(...args),
  loescheZeiteintrag: (...args: unknown[]) => loescheZeiteintrag(...args),
  setzeHalberTag: (...args: unknown[]) => setzeHalberTag(...args),
  normalisiereEmail: (e: string) => e.trim().toLowerCase(),
}));
vi.mock("@/lib/zeiterfassung/datum", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/zeiterfassung/datum")>()),
  heuteSchweiz: () => heuteSchweiz(),
}));

import {
  erfasseFerienAction,
  erfasseTagAction,
  loescheAbwesenheitenAction,
  planeFerienAction,
  trageGehenNachAction,
  type TagErfassenEingabe,
} from "./actions";
import { DataverseError } from "@/lib/dataverse/errors";

const ID = "37b3cb61-90c0-f111-aaaf-70a8a5061d7a";
// Kommen 12.08.2026 07:30 Schweizer Sommerzeit
const OFFEN = { email: "anna@x.ch", typ: "arbeitszeit", kommen: "2026-08-12T05:30:00Z", gehen: null };

beforeEach(() => {
  vi.resetAllMocks();
  istFreigeberMock.mockResolvedValue(true);
  getZeiteintragFuerKorrektur.mockResolvedValue(OFFEN);
  heuteSchweiz.mockReturnValue("2026-10-27");
  getPersonByEmail.mockResolvedValue({ id: "p" });
  listZeiterfassungEmails.mockResolvedValue([]);
  listZeiteintraege.mockResolvedValue([]);
  erstelleZeiteintrag.mockResolvedValue("neu");
  listArbeitsmodelle.mockResolvedValue([
    { id: "v1", personId: "p", gueltigAb: "2026-01-01", pensum: 100, arbeitstage: [true, true, true, true, true, false, false] },
  ]);
});

describe("trageGehenNachAction", () => {
  it("rejects Bearbeiter without touching Dataverse", async () => {
    istFreigeberMock.mockResolvedValue(false);

    expect((await trageGehenNachAction(ID, "17:00", false)).success).toBe(false);
    expect(getZeiteintragFuerKorrektur).not.toHaveBeenCalled();
  });

  it("writes Gehen on the Kommen day in Swiss time and refreshes the page", async () => {
    expect(await trageGehenNachAction(ID, "17:15", false)).toEqual({ success: true });

    expect(setzeGehen).toHaveBeenCalledWith(ID, "2026-08-12T15:15:00Z");
    expect(revalidatePath).toHaveBeenCalledWith("/zeiterfassung", "layout");
  });

  it("supports Gehen after midnight", async () => {
    getZeiteintragFuerKorrektur.mockResolvedValue({ ...OFFEN, kommen: "2026-08-12T18:00:00Z" }); // 20:00

    await trageGehenNachAction(ID, "01:30", true);

    expect(setzeGehen).toHaveBeenCalledWith(ID, "2026-08-12T23:30:00Z");
  });

  it.each([
    ["07:00", false, "„Gehen“ muss nach „Kommen“ liegen."],
    ["22:00", false, "Mehr als 14 Stunden am Stück sind nicht möglich."],
    ["7:00", false, "Bitte eine Uhrzeit im Format HH:MM angeben."],
  ])("rejects %s", async (uhrzeit, folgetag, message) => {
    expect(await trageGehenNachAction(ID, uhrzeit, folgetag)).toEqual({ success: false, message });
    expect(setzeGehen).not.toHaveBeenCalled();
  });

  it("does not overwrite an existing Gehen", async () => {
    getZeiteintragFuerKorrektur.mockResolvedValue({ ...OFFEN, gehen: "2026-08-12T15:00:00Z" });

    expect((await trageGehenNachAction(ID, "17:00", false)).success).toBe(false);
    expect(setzeGehen).not.toHaveBeenCalled();
  });

  it("only completes working-time entries", async () => {
    getZeiteintragFuerKorrektur.mockResolvedValue({ ...OFFEN, typ: "krankheit" });
    expect((await trageGehenNachAction(ID, "17:00", false)).success).toBe(false);
  });

  it("rejects invalid ids and reports deleted entries", async () => {
    expect((await trageGehenNachAction("x", "17:00", false)).success).toBe(false);

    getZeiteintragFuerKorrektur.mockRejectedValue(new DataverseError("not_found", "x"));
    expect(await trageGehenNachAction(ID, "17:00", false)).toEqual({
      success: false,
      message: "Diesen Eintrag gibt es nicht mehr. Bitte die Seite neu laden.",
    });
  });
});

const TAG: TagErfassenEingabe = {
  email: "Anna@X.ch",
  datum: "2026-08-12",
  typ: "arbeitszeit",
  paare: [
    { kommen: "07:30", gehen: "12:00" },
    { kommen: "12:45", gehen: "17:15" },
  ],
  mittagessen: true,
  abendessen: false,
  bemerkung: " Stempeln vergessen ",
};

describe("erfasseTagAction", () => {
  it("rejects Bearbeiter", async () => {
    istFreigeberMock.mockResolvedValue(false);
    expect((await erfasseTagAction(TAG)).success).toBe(false);
    expect(erstelleZeiteintrag).not.toHaveBeenCalled();
  });

  it("creates one entry per pair in Swiss time; meals and remark on the first", async () => {
    expect(await erfasseTagAction(TAG)).toEqual({ success: true, angelegt: 2 });

    expect(erstelleZeiteintrag).toHaveBeenNthCalledWith(1, "anna@x.ch", "2026-08-12", {
      typ: "arbeitszeit",
      kommen: "2026-08-12T05:30:00Z",
      gehen: "2026-08-12T10:00:00Z",
      mittagessen: true,
      abendessen: false,
      bemerkung: "Stempeln vergessen",
    });
    expect(erstelleZeiteintrag).toHaveBeenNthCalledWith(2, "anna@x.ch", "2026-08-12", expect.objectContaining({
      kommen: "2026-08-12T10:45:00Z",
      mittagessen: false,
      bemerkung: null,
    }));
    expect(revalidatePath).toHaveBeenCalledWith("/zeiterfassung", "layout");
  });

  it("creates a whole-day Krankheit starting at midnight without Gehen", async () => {
    expect(await erfasseTagAction({ ...TAG, typ: "krankheit", paare: [] })).toEqual({ success: true, angelegt: 1 });
    // Kommen = Tagesbeginn Schweizer Zeit, weil der Flow ein Kommen braucht
    expect(erstelleZeiteintrag).toHaveBeenCalledWith("anna@x.ch", "2026-08-12", expect.objectContaining({ typ: "krankheit", kommen: "2026-08-11T22:00:00Z", gehen: null }));
  });

  it.each([
    [{ datum: "2026-10-28" }, "Einträge in der Zukunft sind nicht möglich."],
    [{ paare: [] }, "Mindestens ein Paar Kommen–Gehen erfassen."],
    [{ paare: [{ kommen: "12:00", gehen: "08:00" }] }, "„Gehen“ muss nach „Kommen“ liegen."],
    [{ paare: [{ kommen: "08:00", gehen: "12:00" }, { kommen: "11:00", gehen: "13:00" }] }, "Die erfassten Paare überschneiden sich."],
    [{ paare: [{ kommen: "8:00", gehen: "12:00" }] }, "Bitte Uhrzeiten im Format HH:MM angeben."],
  ])("rejects %o", async (aenderung, message) => {
    expect(await erfasseTagAction({ ...TAG, ...aenderung })).toEqual({ success: false, message });
    expect(erstelleZeiteintrag).not.toHaveBeenCalled();
  });

  it("rejects overlaps with existing entries of the day", async () => {
    listZeiteintraege.mockResolvedValue([{ typ: "arbeitszeit", kommen: "2026-08-12T06:00:00.000Z", gehen: "2026-08-12T07:00:00Z" }]);

    expect(await erfasseTagAction(TAG)).toEqual({
      success: false,
      message: "Ein Paar überschneidet sich mit einem bestehenden Eintrag dieses Tages.",
    });
  });

  it("rejects a second Krankheit on the same day", async () => {
    listZeiteintraege.mockResolvedValue([{ typ: "krankheit", kommen: null, gehen: null }]);
    expect((await erfasseTagAction({ ...TAG, typ: "krankheit", paare: [] })).success).toBe(false);
  });

  it("does not create entries for unknown persons", async () => {
    getPersonByEmail.mockResolvedValue(null);
    expect(await erfasseTagAction(TAG)).toEqual({ success: false, message: "Diese Person kommt in der Zeiterfassung nicht vor." });
  });

  it("reports a partial save", async () => {
    erstelleZeiteintrag.mockResolvedValueOnce("neu").mockRejectedValueOnce(new DataverseError("unavailable", "Weg."));

    const result = await erfasseTagAction(TAG);

    expect(result).toEqual({ success: false, message: "Nur 1 Eintrag/Einträge gespeichert, danach Fehler: Weg. Bitte den Tag prüfen." });
  });
});

describe("Frei (PROJ-15)", () => {
  it("allows Frei in the future", async () => {
    expect(await erfasseTagAction({ ...TAG, typ: "frei", paare: [], datum: "2026-12-01" })).toEqual({ success: true, angelegt: 1 });
    expect(erstelleZeiteintrag).toHaveBeenCalledWith("anna@x.ch", "2026-12-01", expect.objectContaining({ typ: "frei", gehen: null }));
  });
});

const FERIEN = { email: "anna@x.ch", von: "2026-12-21", bis: "2027-01-03", halberTag: false, bemerkung: "" };

describe("Ferien (PROJ-15)", () => {
  it("previews and creates only days with Soll, skipping holidays and existing Ferien, also in the future", async () => {
    listZeiteintraege.mockResolvedValue([{ id: "e-2026-12-22", datum: "2026-12-22", typ: "ferien", halberTag: false }]);

    const vorschau = await planeFerienAction(FERIEN);
    expect(vorschau).toMatchObject({ success: true, plan: { ferientage: 7, uebersprungen: { feiertag: 2, bereitsFerien: 1 } } });

    expect(await erfasseFerienAction(FERIEN)).toEqual({ success: true, angelegt: 7 });
    expect(erstelleZeiteintrag).toHaveBeenCalledTimes(7);
    expect(erstelleZeiteintrag).toHaveBeenCalledWith("anna@x.ch", "2026-12-21", {
      typ: "ferien",
      kommen: "2026-12-20T23:00:00Z",
      gehen: null,
      mittagessen: false,
      abendessen: false,
      bemerkung: null,
      halberTag: false,
    });
  });

  it.each([
    [{ bis: "2026-12-01" }, "„bis“ darf nicht vor „von“ liegen."],
    [{ halberTag: true }, "Ein halber Ferientag ist nur für einen einzelnen Tag möglich."],
    [{ bis: "2028-01-01" }, "Höchstens ein Jahr auf einmal erfassen."],
  ])("rejects %o", async (aenderung, message) => {
    expect(await erfasseFerienAction({ ...FERIEN, ...aenderung })).toEqual({ success: false, message });
  });

  it("rejects a period without any Ferientag and names the reason", async () => {
    const result = await erfasseFerienAction({ ...FERIEN, von: "2026-11-07", bis: "2026-11-08" });
    expect(result).toEqual({ success: false, message: "Kein Ferientag zu erfassen — übersprungen: 2 ohne Soll (Wochenende/frei)." });

    listZeiteintraege.mockResolvedValue([{ id: "e-2026-11-02", datum: "2026-11-02", typ: "ferien", halberTag: false }]);
    // Gleicher Typ (ganz auf ganz) → bereits Ferien; ganz → halb würde umgestellt (BUG-1).
    expect(await erfasseFerienAction({ ...FERIEN, von: "2026-11-02", bis: "2026-11-02", halberTag: false })).toEqual({
      success: false,
      message: "Kein Ferientag zu erfassen — übersprungen: 1 bereits Ferien.",
    });
    expect(erstelleZeiteintrag).not.toHaveBeenCalled();
  });

  it("rejects Bearbeiter", async () => {
    istFreigeberMock.mockResolvedValue(false);
    expect((await erfasseFerienAction(FERIEN)).success).toBe(false);
    expect((await planeFerienAction(FERIEN)).success).toBe(false);
  });
});

describe("Ferien QA-Fixes", () => {
  it("converts an existing full Ferientag into a half one (BUG-1)", async () => {
    listZeiteintraege.mockResolvedValue([{ id: "e1", datum: "2026-11-02", typ: "ferien", halberTag: false }]);

    expect(await erfasseFerienAction({ ...FERIEN, von: "2026-11-02", bis: "2026-11-02", halberTag: true })).toEqual({
      success: true,
      angelegt: 1,
    });
    expect(setzeHalberTag).toHaveBeenCalledWith("e1", true);
    expect(erstelleZeiteintrag).not.toHaveBeenCalled();
  });

  it("removes duplicate Ferien of a day after saving, keeping the smallest id (BUG-3)", async () => {
    listZeiteintraege
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: "bbb", datum: "2026-11-02", typ: "ferien", halberTag: false },
        { id: "aaa", datum: "2026-11-02", typ: "ferien", halberTag: false },
      ]);

    await erfasseFerienAction({ ...FERIEN, von: "2026-11-02", bis: "2026-11-02" });

    expect(loescheZeiteintrag).toHaveBeenCalledTimes(1);
    expect(loescheZeiteintrag).toHaveBeenCalledWith("bbb");
  });
});

describe("loescheAbwesenheitenAction (PROJ-15)", () => {
  it("deletes Ferien and Frei, skipping already deleted entries", async () => {
    getZeiteintragFuerKorrektur
      .mockResolvedValueOnce({ typ: "ferien" })
      .mockRejectedValueOnce(new DataverseError("not_found", "x"))
      .mockResolvedValueOnce({ typ: "frei" });

    expect(await loescheAbwesenheitenAction([ID, ID, ID])).toEqual({ success: true, geloescht: 2 });
  });

  it("never deletes other types", async () => {
    getZeiteintragFuerKorrektur.mockResolvedValue({ typ: "arbeitszeit" });
    expect((await loescheAbwesenheitenAction([ID])).success).toBe(false);
    expect(loescheZeiteintrag).not.toHaveBeenCalled();
  });

  it("rejects Bearbeiter and invalid ids", async () => {
    expect((await loescheAbwesenheitenAction(["x"])).success).toBe(false);
    istFreigeberMock.mockResolvedValue(false);
    expect((await loescheAbwesenheitenAction([ID])).success).toBe(false);
    expect(loescheZeiteintrag).not.toHaveBeenCalled();
  });
});
