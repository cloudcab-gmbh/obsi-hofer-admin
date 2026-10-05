import { describe, it, expect, vi, beforeEach } from "vitest";

const createPruefbericht = vi.fn();
const updatePruefbericht = vi.fn();
const stornierePruefbericht = vi.fn();
const authMock = vi.fn();
const revalidatePath = vi.fn();

vi.mock("@/lib/dataverse/pruefberichte", () => ({
  createPruefbericht: (...args: unknown[]) => createPruefbericht(...args),
  updatePruefbericht: (...args: unknown[]) => updatePruefbericht(...args),
  stornierePruefbericht: (...args: unknown[]) => stornierePruefbericht(...args),
  ERGEBNIS_OPTIONEN: ["Freigabe", "keine Freigabe", "letzte Freigabe"],
}));
vi.mock("@/auth", () => ({ auth: () => authMock() }));
vi.mock("next/cache", () => ({ revalidatePath: (...args: unknown[]) => revalidatePath(...args) }));

import { createPruefberichtAction, stornierePruefberichtAction, updatePruefberichtAction } from "./actions";
import { DataverseError } from "@/lib/dataverse/errors";

const GERAET_ID = "11111111-1111-1111-1111-111111111111";
const BERICHT_ID = "22222222-2222-2222-2222-222222222222";

function formDataWith(fields: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) formData.set(key, value);
  return formData;
}

beforeEach(() => {
  createPruefbericht.mockReset();
  updatePruefbericht.mockReset();
  stornierePruefbericht.mockReset();
  authMock.mockReset();
  revalidatePath.mockReset();
});

describe("createPruefberichtAction", () => {
  it("rejects an empty Prüfdatum without calling createPruefbericht", async () => {
    const result = await createPruefberichtAction(
      GERAET_ID,
      formDataWith({ pruefdatum: "", ergebnis: "Freigabe", bemerkungen: "" })
    );

    expect(result.success).toBe(false);
    expect(createPruefbericht).not.toHaveBeenCalled();
  });

  it("rejects an empty Ergebnis without calling createPruefbericht", async () => {
    const result = await createPruefberichtAction(
      GERAET_ID,
      formDataWith({ pruefdatum: "2026-01-15", ergebnis: "", bemerkungen: "" })
    );

    expect(result.success).toBe(false);
    expect(createPruefbericht).not.toHaveBeenCalled();
  });

  it("rejects an Ergebnis value outside the three allowed options (QA BUG-2 fix)", async () => {
    const result = await createPruefberichtAction(
      GERAET_ID,
      formDataWith({ pruefdatum: "2026-01-15", ergebnis: "irgendwas", bemerkungen: "" })
    );

    expect(result.success).toBe(false);
    expect(createPruefbericht).not.toHaveBeenCalled();
  });

  it("derives the Prüfer-Kürzel from the logged-in session name", async () => {
    authMock.mockResolvedValue({ user: { name: "Max Mustermann" } });
    createPruefbericht.mockResolvedValue({ id: BERICHT_ID });

    await createPruefberichtAction(GERAET_ID, formDataWith({ pruefdatum: "2026-01-15", ergebnis: "Freigabe", bemerkungen: "" }));

    expect(createPruefbericht).toHaveBeenCalledWith(GERAET_ID, expect.objectContaining({ pruefer: "mamu" }));
  });

  it("revalidates both the Gerät page and the overview on success", async () => {
    authMock.mockResolvedValue({ user: { name: "Max Mustermann" } });
    createPruefbericht.mockResolvedValue({ id: BERICHT_ID });

    await createPruefberichtAction(GERAET_ID, formDataWith({ pruefdatum: "2026-01-15", ergebnis: "Freigabe", bemerkungen: "" }));

    expect(revalidatePath).toHaveBeenCalledWith(`/geraete/${GERAET_ID}`);
    expect(revalidatePath).toHaveBeenCalledWith("/pruefberichte");
  });

  it("surfaces a DataverseError message instead of a generic fallback", async () => {
    authMock.mockResolvedValue({ user: { name: "Max Mustermann" } });
    createPruefbericht.mockRejectedValue(new DataverseError("unavailable", "Dataverse ist nicht erreichbar."));

    const result = await createPruefberichtAction(
      GERAET_ID,
      formDataWith({ pruefdatum: "2026-01-15", ergebnis: "Freigabe", bemerkungen: "" })
    );

    expect(result).toEqual({ success: false, message: "Dataverse ist nicht erreichbar." });
  });
});

describe("updatePruefberichtAction", () => {
  it("rejects an empty Ergebnis without calling updatePruefbericht", async () => {
    const result = await updatePruefberichtAction(
      BERICHT_ID,
      formDataWith({ pruefdatum: "2026-01-15", ergebnis: "", bemerkungen: "" })
    );

    expect(result.success).toBe(false);
    expect(updatePruefbericht).not.toHaveBeenCalled();
  });

  it("forwards trimmed values and converts blank Bemerkungen to null", async () => {
    updatePruefbericht.mockResolvedValue({ geraetId: GERAET_ID });

    await updatePruefberichtAction(BERICHT_ID, formDataWith({ pruefdatum: "2026-01-15", ergebnis: "Freigabe", bemerkungen: "  " }));

    expect(updatePruefbericht).toHaveBeenCalledWith(BERICHT_ID, expect.objectContaining({ bemerkungen: null }));
  });

  it("revalidates using the geraetId returned by updatePruefbericht, not a caller-supplied one", async () => {
    updatePruefbericht.mockResolvedValue({ geraetId: GERAET_ID });

    await updatePruefberichtAction(BERICHT_ID, formDataWith({ pruefdatum: "2026-01-15", ergebnis: "Freigabe", bemerkungen: "" }));

    expect(revalidatePath).toHaveBeenCalledWith(`/geraete/${GERAET_ID}`);
  });

  it("surfaces a validation_error DataverseError when the Bericht is already storniert", async () => {
    updatePruefbericht.mockRejectedValue(
      new DataverseError("validation_error", "Ein stornierter Prüfbericht kann nicht mehr bearbeitet werden.")
    );

    const result = await updatePruefberichtAction(BERICHT_ID, formDataWith({ pruefdatum: "2026-01-15", ergebnis: "Freigabe", bemerkungen: "" }));

    expect(result).toEqual({
      success: false,
      message: "Ein stornierter Prüfbericht kann nicht mehr bearbeitet werden.",
    });
  });
});

describe("stornierePruefberichtAction", () => {
  it("calls stornierePruefbericht and revalidates using its returned geraetId", async () => {
    stornierePruefbericht.mockResolvedValue({ geraetId: GERAET_ID });

    const result = await stornierePruefberichtAction(BERICHT_ID);

    expect(result).toEqual({ success: true });
    expect(stornierePruefbericht).toHaveBeenCalledWith(BERICHT_ID);
    expect(revalidatePath).toHaveBeenCalledWith(`/geraete/${GERAET_ID}`);
  });

  it("surfaces a DataverseError message on failure", async () => {
    stornierePruefbericht.mockRejectedValue(new DataverseError("permission_denied", "Keine Berechtigung."));

    const result = await stornierePruefberichtAction(BERICHT_ID);

    expect(result).toEqual({ success: false, message: "Keine Berechtigung." });
  });
});
