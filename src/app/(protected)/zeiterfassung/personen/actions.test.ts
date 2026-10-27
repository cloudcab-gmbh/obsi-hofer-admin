import { describe, it, expect, vi, beforeEach } from "vitest";

const istFreigeberMock = vi.fn();
const revalidatePath = vi.fn();
const getPersonByEmail = vi.fn();
const listArbeitsmodelle = vi.fn();
const listZeiterfassungEmails = vi.fn();
const speicherePersonStammdaten = vi.fn();
const stellePersonSicher = vi.fn();
const erstelleArbeitsmodell = vi.fn();
const aendereArbeitsmodell = vi.fn();
const loescheArbeitsmodell = vi.fn();

vi.mock("@/lib/auth/freigeber", () => ({ aktuellerBenutzerIstFreigeber: () => istFreigeberMock() }));
vi.mock("next/cache", () => ({ revalidatePath: (...args: unknown[]) => revalidatePath(...args) }));
vi.mock("@/lib/dataverse/zeiterfassung", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/dataverse/zeiterfassung")>()),
  getPersonByEmail: (...args: unknown[]) => getPersonByEmail(...args),
  listArbeitsmodelle: (...args: unknown[]) => listArbeitsmodelle(...args),
  listZeiterfassungEmails: () => listZeiterfassungEmails(),
  speicherePersonStammdaten: (...args: unknown[]) => speicherePersonStammdaten(...args),
  stellePersonSicher: (...args: unknown[]) => stellePersonSicher(...args),
  erstelleArbeitsmodell: (...args: unknown[]) => erstelleArbeitsmodell(...args),
  aendereArbeitsmodell: (...args: unknown[]) => aendereArbeitsmodell(...args),
  loescheArbeitsmodell: (...args: unknown[]) => loescheArbeitsmodell(...args),
}));

import { loescheArbeitsmodellAction, speichereArbeitsmodellAction, speicherePersonAction } from "./actions";
import { DataverseError } from "@/lib/dataverse/errors";

const PERSON_ID = "37b3cb61-90c0-f111-aaaf-70a8a5061d7a";
const VERSION_ID = "11111111-1111-f111-aaaa-111111111111";
const PERSON = {
  id: PERSON_ID,
  email: "anna@example.ch",
  name: null,
  nichtAuswerten: false,
  austrittAm: null,
  startsaldo: null,
  stichtag: null,
};
const MO_FR = [true, true, true, true, true, false, false];
const STAMMDATEN = { name: "Anna", nichtAuswerten: false, austrittAm: "", startsaldo: "", stichtag: "", ferienanspruch: "", ferienStartsaldo: "" };

beforeEach(() => {
  vi.resetAllMocks();
  istFreigeberMock.mockResolvedValue(true);
  getPersonByEmail.mockResolvedValue(PERSON);
  listArbeitsmodelle.mockResolvedValue([]);
  listZeiterfassungEmails.mockResolvedValue(["anna@example.ch"]);
  stellePersonSicher.mockResolvedValue(PERSON_ID);
});

describe("access", () => {
  it("rejects Bearbeiter for every action without touching Dataverse", async () => {
    istFreigeberMock.mockResolvedValue(false);

    const results = await Promise.all([
      speicherePersonAction("anna@example.ch", STAMMDATEN),
      speichereArbeitsmodellAction("anna@example.ch", null, { gueltigAb: "2026-11-01", pensum: "40", arbeitstage: MO_FR }),
      loescheArbeitsmodellAction("anna@example.ch", VERSION_ID),
    ]);

    expect(results.every((r) => !r.success)).toBe(true);
    expect(getPersonByEmail).not.toHaveBeenCalled();
    expect(speicherePersonStammdaten).not.toHaveBeenCalled();
  });
});

describe("speicherePersonAction", () => {
  it("saves with the email in lower case and an empty name as null", async () => {
    const result = await speicherePersonAction(" Anna@Example.CH ", { ...STAMMDATEN, name: "  " });

    expect(result).toEqual({ success: true });
    expect(speicherePersonStammdaten).toHaveBeenCalledWith("anna@example.ch", {
      name: null,
      nichtAuswerten: false,
      austrittAm: null,
      startsaldo: null,
      stichtag: null,
      ferienanspruch: null,
      ferienStartsaldo: null,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/zeiterfassung/personen");
  });

  it("accepts a negative Startsaldo with comma and rounds to two decimals", async () => {
    await speicherePersonAction("anna@example.ch", { ...STAMMDATEN, startsaldo: "-3,256", stichtag: "2026-10-31" });

    expect(speicherePersonStammdaten).toHaveBeenCalledWith(
      "anna@example.ch",
      expect.objectContaining({ startsaldo: -3.26, stichtag: "2026-10-31" })
    );
  });

  it("requires a Stichtag with a Startsaldo and vice versa", async () => {
    const ohneStichtag = await speicherePersonAction("anna@example.ch", { ...STAMMDATEN, startsaldo: "5" });
    const ohneSaldo = await speicherePersonAction("anna@example.ch", { ...STAMMDATEN, stichtag: "2026-10-31" });

    expect(ohneStichtag).toEqual({ success: false, message: "Zum Startsaldo gehört ein Stichtag." });
    expect(ohneSaldo.success).toBe(false);
    expect(speicherePersonStammdaten).not.toHaveBeenCalled();
  });

  it("rejects a non-numeric Startsaldo and an invalid Austritt", async () => {
    const saldo = await speicherePersonAction("anna@example.ch", { ...STAMMDATEN, startsaldo: "abc", stichtag: "2026-10-31" });
    const austritt = await speicherePersonAction("anna@example.ch", { ...STAMMDATEN, austrittAm: "2026-02-30" });

    expect(saldo.success).toBe(false);
    expect(austritt.success).toBe(false);
  });

  it("does not create persons that never appear in the time entries", async () => {
    getPersonByEmail.mockResolvedValue(null);
    listZeiterfassungEmails.mockResolvedValue(["anna@example.ch"]);

    const result = await speicherePersonAction("fremd@example.ch", STAMMDATEN);

    expect(result).toEqual({ success: false, message: "Diese Person kommt in der Zeiterfassung nicht vor." });
    expect(speicherePersonStammdaten).not.toHaveBeenCalled();
  });

  it("returns the Dataverse message on failure", async () => {
    speicherePersonStammdaten.mockRejectedValue(new DataverseError("permission_denied", "Keine Berechtigung."));

    expect(await speicherePersonAction("anna@example.ch", STAMMDATEN)).toEqual({
      success: false,
      message: "Keine Berechtigung.",
    });
  });
  it("saves Ferienanspruch and Ferien-Startsaldo with the shared Stichtag", async () => {
    await speicherePersonAction("anna@example.ch", { ...STAMMDATEN, ferienanspruch: "27,5", ferienStartsaldo: "-1.5", stichtag: "2026-10-31" });
    expect(speicherePersonStammdaten).toHaveBeenCalledWith("anna@example.ch", expect.objectContaining({ ferienanspruch: 27.5, ferienStartsaldo: -1.5, startsaldo: null }));
  });

  it("validates Ferienanspruch and requires a Stichtag for the Ferien-Startsaldo", async () => {
    expect((await speicherePersonAction("anna@example.ch", { ...STAMMDATEN, ferienanspruch: "60" })).success).toBe(false);
    expect(await speicherePersonAction("anna@example.ch", { ...STAMMDATEN, ferienStartsaldo: "2" })).toEqual({ success: false, message: "Zum Startsaldo gehört ein Stichtag." });
  });
});

describe("speichereArbeitsmodellAction", () => {
  it("creates the person on the first version and stores the version", async () => {
    getPersonByEmail.mockResolvedValue(null);

    const result = await speichereArbeitsmodellAction("anna@example.ch", null, {
      gueltigAb: "2026-11-01",
      pensum: "45,55",
      arbeitstage: [true, true, true, false, false, false, false],
    });

    expect(result).toEqual({ success: true });
    expect(stellePersonSicher).toHaveBeenCalledWith("anna@example.ch");
    expect(erstelleArbeitsmodell).toHaveBeenCalledWith(PERSON_ID, "anna@example.ch", {
      gueltigAb: "2026-11-01",
      pensum: 45.6,
      arbeitstage: [true, true, true, false, false, false, false],
    });
  });

  it.each([
    ["101", MO_FR, "Das Pensum muss zwischen 0 und 100 % liegen."],
    ["-5", MO_FR, "Das Pensum muss zwischen 0 und 100 % liegen."],
    ["", MO_FR, "Bitte ein Pensum angeben."],
    ["40", [false, false, false, false, false, false, false], "Bei einem Pensum über 0 % mindestens einen Arbeitstag auswählen."],
  ])("rejects Pensum %s with the given days", async (pensum, arbeitstage, message) => {
    const result = await speichereArbeitsmodellAction("anna@example.ch", null, { gueltigAb: "2026-11-01", pensum, arbeitstage });

    expect(result).toEqual({ success: false, message });
    expect(erstelleArbeitsmodell).not.toHaveBeenCalled();
  });

  it("allows Pensum 0 without working days", async () => {
    const result = await speichereArbeitsmodellAction("anna@example.ch", null, {
      gueltigAb: "2026-11-01",
      pensum: "0",
      arbeitstage: [false, false, false, false, false, false, false],
    });
    expect(result).toEqual({ success: true });
  });

  it("rejects a missing 'gültig ab'", async () => {
    const result = await speichereArbeitsmodellAction("anna@example.ch", null, { gueltigAb: "", pensum: "40", arbeitstage: MO_FR });
    expect(result.success).toBe(false);
  });

  it("rejects a second version on the same date", async () => {
    listArbeitsmodelle.mockResolvedValue([{ id: VERSION_ID, personId: PERSON_ID, gueltigAb: "2026-11-01", pensum: 100, arbeitstage: MO_FR }]);

    const result = await speichereArbeitsmodellAction("anna@example.ch", null, { gueltigAb: "2026-11-01", pensum: "40", arbeitstage: MO_FR });

    expect(result).toEqual({ success: false, message: "Für dieses Datum gibt es bereits eine Version." });
  });

  it("removes its own version again when a concurrent save created one on the same date (QA BUG-2)", async () => {
    erstelleArbeitsmodell.mockResolvedValue("zzzz-neu");
    listArbeitsmodelle
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: "aaaa-anderer", personId: PERSON_ID, gueltigAb: "2026-11-01", pensum: 100, arbeitstage: MO_FR },
        { id: "zzzz-neu", personId: PERSON_ID, gueltigAb: "2026-11-01", pensum: 40, arbeitstage: MO_FR },
      ]);

    const result = await speichereArbeitsmodellAction("anna@example.ch", null, { gueltigAb: "2026-11-01", pensum: "40", arbeitstage: MO_FR });

    expect(result).toEqual({ success: false, message: "Für dieses Datum gibt es bereits eine Version." });
    expect(loescheArbeitsmodell).toHaveBeenCalledWith("zzzz-neu");
  });

  it("corrects an existing version of the same person, keeping its own date", async () => {
    listArbeitsmodelle.mockResolvedValue([{ id: VERSION_ID, personId: PERSON_ID, gueltigAb: "2026-11-01", pensum: 100, arbeitstage: MO_FR }]);

    const result = await speichereArbeitsmodellAction("anna@example.ch", VERSION_ID, { gueltigAb: "2026-11-01", pensum: "80", arbeitstage: MO_FR });

    expect(result).toEqual({ success: true });
    expect(aendereArbeitsmodell).toHaveBeenCalledWith(VERSION_ID, "anna@example.ch", expect.objectContaining({ pensum: 80 }));
  });

  it("refuses to change a version of another person", async () => {
    const result = await speichereArbeitsmodellAction("anna@example.ch", VERSION_ID, { gueltigAb: "2026-11-01", pensum: "80", arbeitstage: MO_FR });

    expect(result.success).toBe(false);
    expect(aendereArbeitsmodell).not.toHaveBeenCalled();
  });
});

describe("loescheArbeitsmodellAction", () => {
  it("deletes a version of this person", async () => {
    listArbeitsmodelle.mockResolvedValue([{ id: VERSION_ID, personId: PERSON_ID, gueltigAb: "2026-11-01", pensum: 100, arbeitstage: MO_FR }]);

    expect(await loescheArbeitsmodellAction("anna@example.ch", VERSION_ID)).toEqual({ success: true });
    expect(loescheArbeitsmodell).toHaveBeenCalledWith(VERSION_ID);
  });

  it("does not delete versions of other persons", async () => {
    await loescheArbeitsmodellAction("anna@example.ch", VERSION_ID);
    expect(loescheArbeitsmodell).not.toHaveBeenCalled();
  });

  it("rejects an invalid id", async () => {
    expect((await loescheArbeitsmodellAction("anna@example.ch", "x")).success).toBe(false);
  });
});
