import { describe, it, expect, vi, beforeEach } from "vitest";

const istFreigeberMock = vi.fn();
const revalidatePath = vi.fn();
const getZeiteintragFuerKorrektur = vi.fn();
const korrigiereZeiteintrag = vi.fn();
const markiereAlsGeloescht = vi.fn();
const erstelleZeiteintrag = vi.fn();
const getPersonByEmail = vi.fn();
const listZeiterfassungEmails = vi.fn();
const listZeiteintraege = vi.fn();
const heuteSchweiz = vi.fn();
const listArbeitsmodelle = vi.fn();
const loescheZeiteintrag = vi.fn();
const setzeHalberTag = vi.fn();
const stosseFlowAn = vi.fn();

vi.mock("@/lib/auth/freigeber", () => ({
  aktuellerBenutzerIstFreigeber: () => istFreigeberMock(),
  aktuellerFreigeberName: async () => ((await istFreigeberMock()) ? "Robert Bienz" : null),
}));
const ladeZeitnachweis = vi.fn();
const renderePdf = vi.fn();
vi.mock("@/lib/zeiterfassung/zeitnachweis-laden", () => ({ ladeZeitnachweis: (...args: unknown[]) => ladeZeitnachweis(...args) }));
vi.mock("@/lib/pdf/grundlage", () => ({ ladeLogoDataUrl: () => null, renderePdf: (...args: unknown[]) => renderePdf(...args) }));
vi.mock("next/cache", () => ({ revalidatePath: (...args: unknown[]) => revalidatePath(...args) }));
vi.mock("@/lib/dataverse/zeiterfassung", () => ({
  getZeiteintragFuerKorrektur: (...args: unknown[]) => getZeiteintragFuerKorrektur(...args),
  korrigiereZeiteintrag: (...args: unknown[]) => korrigiereZeiteintrag(...args),
  markiereAlsGeloescht: (...args: unknown[]) => markiereAlsGeloescht(...args),
  erstelleZeiteintrag: (...args: unknown[]) => erstelleZeiteintrag(...args),
  getPersonByEmail: (...args: unknown[]) => getPersonByEmail(...args),
  listZeiterfassungEmails: () => listZeiterfassungEmails(),
  listZeiteintraege: (...args: unknown[]) => listZeiteintraege(...args),
  listArbeitsmodelle: (...args: unknown[]) => listArbeitsmodelle(...args),
  loescheZeiteintrag: (...args: unknown[]) => loescheZeiteintrag(...args),
  setzeHalberTag: (...args: unknown[]) => setzeHalberTag(...args),
  stosseFlowAn: (...args: unknown[]) => stosseFlowAn(...args),
  normalisiereEmail: (e: string) => e.trim().toLowerCase(),
}));
// PROJ-18: ohne gepflegte Jahre gilt der Vorschlag.
vi.mock("@/lib/dataverse/feiertage", async () => {
  const { VORSCHLAGS_KALENDER } = await import("@/lib/zeiterfassung/feiertage");
  return { ladeFeiertagskalender: async () => VORSCHLAGS_KALENDER };
});
vi.mock("@/lib/zeiterfassung/datum", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/zeiterfassung/datum")>()),
  heuteSchweiz: () => heuteSchweiz(),
}));

import {
  aendereZeiteintragAction,
  erzeugeZeitnachweisPdfAction,
  erfasseFerienAction,
  erfasseTagAction,
  loescheAbwesenheitenAction,
  planeFerienAction,
  type TagErfassenEingabe,
} from "./actions";
import { DataverseError } from "@/lib/dataverse/errors";
import { berechneZeitnachweis } from "@/lib/zeiterfassung/zeitnachweis";

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

describe("aendereZeiteintragAction (PROJ-22)", () => {
  // 12.08.2026 Schweizer Sommerzeit: 07:30–16:30 = 05:30–14:30 UTC
  const EINTRAG = {
    email: "anna@x.ch",
    datum: "2026-08-12",
    typ: "arbeitszeit",
    kommen: "2026-08-12T05:30:00Z",
    gehen: "2026-08-12T14:30:00Z",
    bemerkung: "aus SharePoint",
    sharepointId: 1567,
    geloescht: false,
  };
  const AENDERN = { eintragId: ID, kommen: "07:00", gehen: "16:00", bemerkung: " Stempeln vergessen " };

  beforeEach(() => {
    getZeiteintragFuerKorrektur.mockResolvedValue(EINTRAG);
  });

  it("rejects Bearbeiter without touching Dataverse", async () => {
    istFreigeberMock.mockResolvedValue(false);

    expect(await aendereZeiteintragAction(AENDERN)).toEqual({ success: false, message: "Nur Freigeber dürfen Zeiteinträge ändern." });
    expect(getZeiteintragFuerKorrektur).not.toHaveBeenCalled();
    expect(korrigiereZeiteintrag).not.toHaveBeenCalled();
  });

  it("corrects Kommen, Gehen and remark on the day of the entry and records who and what before", async () => {
    expect(await aendereZeiteintragAction(AENDERN)).toEqual({ success: true });

    expect(listZeiteintraege).toHaveBeenCalledWith("anna@x.ch", "2026-08-12", "2026-08-12");
    expect(korrigiereZeiteintrag).toHaveBeenCalledWith(ID, {
      datum: "2026-08-12",
      kommen: "2026-08-12T05:00:00Z",
      gehen: "2026-08-12T14:00:00Z",
      bemerkung: "Stempeln vergessen",
      von: "Robert Bienz",
      vorher: "07:30–16:30",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/zeiterfassung", "layout");
  });

  it("completes an open entry and may leave it open", async () => {
    getZeiteintragFuerKorrektur.mockResolvedValue({ ...EINTRAG, gehen: null });

    await aendereZeiteintragAction({ ...AENDERN, kommen: "07:30", gehen: "17:15" });
    expect(korrigiereZeiteintrag).toHaveBeenLastCalledWith(ID, expect.objectContaining({ gehen: "2026-08-12T15:15:00Z", vorher: "07:30–offen" }));

    await aendereZeiteintragAction({ ...AENDERN, kommen: "07:30", gehen: "", bemerkung: "Gehen folgt" });
    expect(korrigiereZeiteintrag).toHaveBeenLastCalledWith(ID, expect.objectContaining({ gehen: null, bemerkung: "Gehen folgt" }));
  });

  it("saves nothing and sets no marking when nothing changed", async () => {
    expect(await aendereZeiteintragAction({ eintragId: ID, kommen: "07:30", gehen: "16:30", bemerkung: "aus SharePoint " })).toEqual({
      success: true,
    });
    expect(korrigiereZeiteintrag).not.toHaveBeenCalled();
  });

  it("checks overlaps only against the other working-time entries of the day", async () => {
    listZeiteintraege.mockResolvedValue([
      { id: ID, typ: "arbeitszeit", kommen: EINTRAG.kommen, gehen: EINTRAG.gehen },
      { id: "krank", typ: "krankheit", kommen: "2026-08-11T22:00:00Z", gehen: null },
      { id: "nachmittag", typ: "arbeitszeit", kommen: "2026-08-12T15:00:00Z", gehen: "2026-08-12T17:00:00Z" },
    ]);

    expect(await aendereZeiteintragAction({ ...AENDERN, gehen: "17:30" })).toEqual({
      success: false,
      message: "Die Zeiten überschneiden sich mit einem anderen Eintrag dieses Tages.",
    });
    expect(await aendereZeiteintragAction({ ...AENDERN, gehen: "17:00" })).toEqual({ success: true });
  });

  it.each([
    [{ gehen: "" }, "„Gehen“ darf nicht leer sein — der Eintrag hatte bereits ein „Gehen“. Zum Entfernen den Eintrag löschen."],
    [{ gehen: "06:00" }, "„Gehen“ muss nach „Kommen“ liegen."],
    [{ kommen: "05:00", gehen: "19:30" }, "Mehr als 14 Stunden am Stück sind nicht möglich."],
    [{ kommen: "7:00" }, "Bitte „Kommen“ im Format HH:MM angeben."],
    [{ gehen: "25:00" }, "Bitte „Gehen“ im Format HH:MM angeben."],
    [{ bemerkung: "x".repeat(501) }, "Die Bemerkung darf höchstens 500 Zeichen lang sein."],
    [{ eintragId: "kein-guid" }, "Ungültiger Eintrag."],
  ])("rejects %o", async (aenderung, message) => {
    expect(await aendereZeiteintragAction({ ...AENDERN, ...aenderung })).toEqual({ success: false, message });
    expect(korrigiereZeiteintrag).not.toHaveBeenCalled();
  });

  it("rejects times in the future", async () => {
    getZeiteintragFuerKorrektur.mockResolvedValue({ ...EINTRAG, datum: "2099-01-05", kommen: "2099-01-05T06:30:00Z", gehen: null });

    expect(await aendereZeiteintragAction({ ...AENDERN, gehen: "" })).toEqual({
      success: false,
      message: "Zeiten in der Zukunft sind nicht möglich.",
    });
  });

  it("only changes working-time entries", async () => {
    getZeiteintragFuerKorrektur.mockResolvedValue({ ...EINTRAG, typ: "ferien" });
    expect(await aendereZeiteintragAction(AENDERN)).toEqual({ success: false, message: "Nur Arbeitszeit-Einträge können geändert werden." });
  });

  it("reports entries that are gone or deleted in the tool", async () => {
    const message = "Diesen Eintrag gibt es nicht mehr. Bitte die Seite neu laden.";
    getZeiteintragFuerKorrektur.mockResolvedValueOnce({ ...EINTRAG, geloescht: true });
    expect(await aendereZeiteintragAction(AENDERN)).toEqual({ success: false, message });

    getZeiteintragFuerKorrektur.mockRejectedValueOnce(new DataverseError("not_found", "x"));
    expect(await aendereZeiteintragAction(AENDERN)).toEqual({ success: false, message });
    expect(korrigiereZeiteintrag).not.toHaveBeenCalled();
  });

  it("returns the Dataverse message when saving fails", async () => {
    korrigiereZeiteintrag.mockRejectedValueOnce(new DataverseError("unavailable", "Dataverse ist nicht erreichbar."));
    expect(await aendereZeiteintragAction(AENDERN)).toEqual({ success: false, message: "Dataverse ist nicht erreichbar." });
    expect(revalidatePath).not.toHaveBeenCalled();
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

  it("deletes a single working-time entry (Nutzerwunsch 2026-10-27)", async () => {
    getZeiteintragFuerKorrektur.mockResolvedValue({ typ: "arbeitszeit" });
    expect(await loescheAbwesenheitenAction([ID])).toEqual({ success: true, geloescht: 1 });
    expect(loescheZeiteintrag).toHaveBeenCalledWith(ID);
  });

  it("treats a concurrent delete of the same entry as success when it is gone afterwards", async () => {
    getZeiteintragFuerKorrektur
      .mockResolvedValueOnce({ typ: "arbeitszeit" })
      .mockRejectedValueOnce(new DataverseError("not_found", "weg"));
    loescheZeiteintrag.mockRejectedValueOnce(new DataverseError("validation_error", "More than one concurrent Delete requests detected"));

    expect(await loescheAbwesenheitenAction([ID])).toEqual({ success: true, geloescht: 1 });
  });

  it("reports a delete error when the entry still exists", async () => {
    getZeiteintragFuerKorrektur.mockResolvedValue({ typ: "arbeitszeit" });
    loescheZeiteintrag.mockRejectedValueOnce(new DataverseError("validation_error", "abgelehnt"));

    expect((await loescheAbwesenheitenAction([ID])).success).toBe(false);
  });

  it("triggers the Flow on a remaining entry of the same day, else of the month", async () => {
    getZeiteintragFuerKorrektur.mockResolvedValue({ email: "anna@x.ch", datum: "2026-10-26", typ: "arbeitszeit" });
    const rest = { id: "r1", datum: "2026-10-26", kommen: "2026-10-26T17:12:00Z", gehen: "2026-10-26T17:13:00Z" };
    listZeiteintraege.mockResolvedValueOnce([rest]);

    await loescheAbwesenheitenAction([ID]);
    expect(listZeiteintraege).toHaveBeenCalledWith("anna@x.ch", "2026-10-26", "2026-10-26");
    expect(stosseFlowAn).toHaveBeenCalledWith(rest);

    stosseFlowAn.mockClear();
    const imMonat = { id: "r2", datum: "2026-10-27", kommen: "2026-10-27T06:46:00Z", gehen: null };
    listZeiteintraege.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: "r0" }, imMonat]);
    await loescheAbwesenheitenAction([ID]);
    expect(listZeiteintraege).toHaveBeenLastCalledWith("anna@x.ch", "2026-10-01", "2026-10-31");
    expect(stosseFlowAn).toHaveBeenCalledWith(imMonat);
  });

  it("keeps the deletion successful when triggering the Flow fails", async () => {
    getZeiteintragFuerKorrektur.mockResolvedValue({ email: "anna@x.ch", datum: "2026-10-26", typ: "arbeitszeit" });
    listZeiteintraege.mockResolvedValueOnce([{ id: "r1" }]);
    stosseFlowAn.mockRejectedValueOnce(new DataverseError("unavailable", "weg"));

    expect(await loescheAbwesenheitenAction([ID])).toEqual({ success: true, geloescht: 1 });
  });

  it("never deletes entries of an unknown type", async () => {
    getZeiteintragFuerKorrektur.mockResolvedValue({ typ: "unbekannt" });
    expect((await loescheAbwesenheitenAction([ID])).success).toBe(false);
    expect(loescheZeiteintrag).not.toHaveBeenCalled();
  });

  it("marks entries from SharePoint as deleted instead of removing them (PROJ-22)", async () => {
    getZeiteintragFuerKorrektur.mockResolvedValue({ typ: "arbeitszeit", sharepointId: 1567, geloescht: false });

    expect(await loescheAbwesenheitenAction([ID])).toEqual({ success: true, geloescht: 1 });
    expect(markiereAlsGeloescht).toHaveBeenCalledWith(ID, "Robert Bienz");
    expect(loescheZeiteintrag).not.toHaveBeenCalled();
  });

  it("removes entries created in the tool for good (PROJ-22)", async () => {
    getZeiteintragFuerKorrektur.mockResolvedValue({ typ: "ferien", sharepointId: null, geloescht: false });

    await loescheAbwesenheitenAction([ID]);
    expect(loescheZeiteintrag).toHaveBeenCalledWith(ID);
    expect(markiereAlsGeloescht).not.toHaveBeenCalled();
  });

  it("skips entries already deleted in the tool (PROJ-22)", async () => {
    getZeiteintragFuerKorrektur.mockResolvedValue({ typ: "arbeitszeit", sharepointId: 1567, geloescht: true });

    expect(await loescheAbwesenheitenAction([ID])).toEqual({ success: true, geloescht: 0 });
    expect(markiereAlsGeloescht).not.toHaveBeenCalled();
    expect(loescheZeiteintrag).not.toHaveBeenCalled();
  });

  it("rejects Bearbeiter and invalid ids", async () => {
    expect((await loescheAbwesenheitenAction(["x"])).success).toBe(false);
    istFreigeberMock.mockResolvedValue(false);
    expect((await loescheAbwesenheitenAction([ID])).success).toBe(false);
    expect(loescheZeiteintrag).not.toHaveBeenCalled();
    expect(markiereAlsGeloescht).not.toHaveBeenCalled();
  });
});

describe("erzeugeZeitnachweisPdfAction (PROJ-16)", () => {
  const geladen = {
    person: { email: "anna@x.ch", anzeige: "Anna/Muster" },
    zeitnachweis: berechneZeitnachweis({
      monat: "2026-11",
      heute: "2026-12-15",
      eintraege: [],
      versionen: [],
      austrittAm: null,
      startsaldoStunden: null,
      stichtag: null,
    }),
    versionen: [],
  };

  it("returns the PDF as Base64 with a safe file name", async () => {
    ladeZeitnachweis.mockResolvedValue(geladen);
    renderePdf.mockResolvedValue(Buffer.from("%PDF-test"));

    const result = await erzeugeZeitnachweisPdfAction("anna@x.ch", "2026-11");

    expect(result).toEqual({ success: true, pdfBase64: Buffer.from("%PDF-test").toString("base64"), dateiname: "Zeitnachweis Anna_Muster 2026-11.pdf" });
    expect(ladeZeitnachweis).toHaveBeenCalledWith("anna@x.ch", "2026-11", "2026-10-27");
    const dokument = renderePdf.mock.calls[0][0];
    expect(JSON.stringify(dokument.footer(1, 1))).toContain("Erstellt am 27.10.2026 von Robert Bienz");
  });

  it("rejects Bearbeiter, invalid months and unknown persons", async () => {
    ladeZeitnachweis.mockResolvedValue(null);
    expect((await erzeugeZeitnachweisPdfAction("anna@x.ch", "2026-13")).success).toBe(false);
    expect(await erzeugeZeitnachweisPdfAction("fremd@x.ch", "2026-11")).toEqual({ success: false, message: "Diese Person kommt in der Zeiterfassung nicht vor." });
    istFreigeberMock.mockResolvedValue(false);
    expect((await erzeugeZeitnachweisPdfAction("anna@x.ch", "2026-11")).success).toBe(false);
    expect(renderePdf).not.toHaveBeenCalled();
  });

  it("reports errors without personal data", async () => {
    ladeZeitnachweis.mockRejectedValue(new Error("anna@x.ch kaputt"));
    expect(await erzeugeZeitnachweisPdfAction("anna@x.ch", "2026-11")).toEqual({
      success: false,
      message: "Das PDF konnte nicht erzeugt werden. Bitte später erneut versuchen.",
    });
  });
});
