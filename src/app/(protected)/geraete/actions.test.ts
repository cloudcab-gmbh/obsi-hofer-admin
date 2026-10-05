import { describe, it, expect, vi, beforeEach } from "vitest";

const updateGeraetStammdaten = vi.fn();
const revalidatePath = vi.fn();

vi.mock("@/lib/dataverse/geraete", () => ({
  updateGeraetStammdaten: (...args: unknown[]) => updateGeraetStammdaten(...args),
}));
vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePath(...args),
}));

import { saveGeraetStammdaten } from "./actions";
import { DataverseError } from "@/lib/dataverse/errors";

const GERAET_ID = "44444444-4444-4444-4444-444444444444";

function formDataWith(fields: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) formData.set(key, value);
  return formData;
}

const ALL_FIELDS = {
  serienummer: "",
  barcode: "",
  lagerort: "",
  bemerkungen: "",
  zubehoer: "",
  herstelljahr: "",
  erstgebrauch: "",
  ablegereife: "",
  kundenId: "",
};

beforeEach(() => {
  updateGeraetStammdaten.mockReset();
  revalidatePath.mockReset();
});

describe("saveGeraetStammdaten", () => {
  it("converts blank fields to null before calling updateGeraetStammdaten", async () => {
    updateGeraetStammdaten.mockResolvedValue(undefined);

    const result = await saveGeraetStammdaten(GERAET_ID, formDataWith({ ...ALL_FIELDS, barcode: "  " }));

    expect(result).toEqual({ success: true });
    expect(updateGeraetStammdaten).toHaveBeenCalledWith(
      GERAET_ID,
      expect.objectContaining({ barcode: null, serienummer: null, kundenId: null })
    );
  });

  it("trims and forwards non-empty values", async () => {
    updateGeraetStammdaten.mockResolvedValue(undefined);

    await saveGeraetStammdaten(GERAET_ID, formDataWith({ ...ALL_FIELDS, kundenId: "  KD-42  " }));

    expect(updateGeraetStammdaten).toHaveBeenCalledWith(GERAET_ID, expect.objectContaining({ kundenId: "KD-42" }));
  });

  it("revalidates the Gerät detail path on success", async () => {
    updateGeraetStammdaten.mockResolvedValue(undefined);

    await saveGeraetStammdaten(GERAET_ID, formDataWith(ALL_FIELDS));

    expect(revalidatePath).toHaveBeenCalledWith(`/geraete/${GERAET_ID}`);
  });

  it("surfaces a DataverseError's message instead of the generic fallback", async () => {
    updateGeraetStammdaten.mockRejectedValue(new DataverseError("unavailable", "Dataverse ist nicht erreichbar."));

    const result = await saveGeraetStammdaten(GERAET_ID, formDataWith(ALL_FIELDS));

    expect(result).toEqual({ success: false, message: "Dataverse ist nicht erreichbar." });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("falls back to a generic message for a non-DataverseError failure", async () => {
    updateGeraetStammdaten.mockRejectedValue(new Error("boom"));

    const result = await saveGeraetStammdaten(GERAET_ID, formDataWith(ALL_FIELDS));

    expect(result).toEqual({ success: false, message: "Unbekannter Fehler beim Speichern." });
  });

  it("preserves the submitted values in the error path (no data loss)", async () => {
    updateGeraetStammdaten.mockRejectedValue(new Error("boom"));

    // saveGeraetStammdaten itself doesn't mutate/clear the FormData it was
    // given — the caller (GeraetForm) keeps whatever the user typed as long
    // as it doesn't reset the form on a failed result.
    const formData = formDataWith({ ...ALL_FIELDS, lagerort: "Lager A" });
    await saveGeraetStammdaten(GERAET_ID, formData);

    expect(formData.get("lagerort")).toBe("Lager A");
  });
});
