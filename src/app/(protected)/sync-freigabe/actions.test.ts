import { describe, it, expect, vi, beforeEach } from "vitest";

const setKundenportalFreigabe = vi.fn();
const istFreigeberMock = vi.fn();
const revalidatePath = vi.fn();

vi.mock("@/lib/dataverse/kontakte", () => ({
  setKundenportalFreigabe: (...args: unknown[]) => setKundenportalFreigabe(...args),
}));
vi.mock("@/lib/auth/freigeber", () => ({ aktuellerBenutzerIstFreigeber: () => istFreigeberMock() }));
vi.mock("next/cache", () => ({ revalidatePath: (...args: unknown[]) => revalidatePath(...args) }));

import { setKundenportalFreigabeAction } from "./actions";
import { DataverseError } from "@/lib/dataverse/errors";

const KONTAKT_ID = "37b3cb61-90c0-f111-aaaf-70a8a5061d7a"; // echte Dataverse-Form (keine RFC-UUID)

beforeEach(() => {
  setKundenportalFreigabe.mockReset();
  istFreigeberMock.mockReset();
  revalidatePath.mockReset();
});

describe("setKundenportalFreigabeAction", () => {
  it("refuses a non-Freigeber (e.g. Bearbeiter calling the action directly) without touching Dataverse", async () => {
    istFreigeberMock.mockResolvedValue(false);

    const result = await setKundenportalFreigabeAction(KONTAKT_ID, true);

    expect(result.success).toBe(false);
    expect(setKundenportalFreigabe).not.toHaveBeenCalled();
  });

  it("saves the Freigabe for a Freigeber and revalidates the page", async () => {
    istFreigeberMock.mockResolvedValue(true);
    setKundenportalFreigabe.mockResolvedValue(undefined);

    const result = await setKundenportalFreigabeAction(KONTAKT_ID, true);

    expect(result).toEqual({ success: true });
    expect(setKundenportalFreigabe).toHaveBeenCalledWith(KONTAKT_ID, true);
    expect(revalidatePath).toHaveBeenCalledWith("/sync-freigabe");
  });

  it("accepts real Dataverse GUIDs that are not RFC-version UUIDs", async () => {
    istFreigeberMock.mockResolvedValue(true);

    const result = await setKundenportalFreigabeAction(KONTAKT_ID, false);

    expect(result.success).toBe(true);
  });

  it("rejects a malformed kontaktId", async () => {
    istFreigeberMock.mockResolvedValue(true);

    const result = await setKundenportalFreigabeAction("abc", true);

    expect(result.success).toBe(false);
    expect(setKundenportalFreigabe).not.toHaveBeenCalled();
  });

  it("returns the DataverseError message (e.g. missing email) instead of throwing", async () => {
    istFreigeberMock.mockResolvedValue(true);
    setKundenportalFreigabe.mockRejectedValue(new DataverseError("validation_error", "Ein Kontakt ohne E-Mail-Adresse …"));

    const result = await setKundenportalFreigabeAction(KONTAKT_ID, true);

    expect(result).toEqual({ success: false, message: "Ein Kontakt ohne E-Mail-Adresse …" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
