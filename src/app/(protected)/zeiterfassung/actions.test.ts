import { describe, it, expect, vi, beforeEach } from "vitest";

const istFreigeberMock = vi.fn();
const revalidatePath = vi.fn();
const getZeiteintragFuerKorrektur = vi.fn();
const setzeGehen = vi.fn();

vi.mock("@/lib/auth/freigeber", () => ({ aktuellerBenutzerIstFreigeber: () => istFreigeberMock() }));
vi.mock("next/cache", () => ({ revalidatePath: (...args: unknown[]) => revalidatePath(...args) }));
vi.mock("@/lib/dataverse/zeiterfassung", () => ({
  getZeiteintragFuerKorrektur: (...args: unknown[]) => getZeiteintragFuerKorrektur(...args),
  setzeGehen: (...args: unknown[]) => setzeGehen(...args),
}));

import { trageGehenNachAction } from "./actions";
import { DataverseError } from "@/lib/dataverse/errors";

const ID = "37b3cb61-90c0-f111-aaaf-70a8a5061d7a";
// Kommen 12.08.2026 07:30 Schweizer Sommerzeit
const OFFEN = { email: "anna@x.ch", typ: "arbeitszeit", kommen: "2026-08-12T05:30:00Z", gehen: null };

beforeEach(() => {
  vi.resetAllMocks();
  istFreigeberMock.mockResolvedValue(true);
  getZeiteintragFuerKorrektur.mockResolvedValue(OFFEN);
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
    expect(revalidatePath).toHaveBeenCalledWith("/zeiterfassung");
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
