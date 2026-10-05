"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { updateGeraetStammdaten } from "@/lib/dataverse/geraete";
import { DataverseError } from "@/lib/dataverse/errors";

const stammdatenSchema = z.object({
  name: z.string().trim().min(1, "Gerätename darf nicht leer sein."),
  serienummer: z.string().trim().nullable(),
  barcode: z.string().trim().nullable(),
  lagerort: z.string().trim().nullable(),
  bemerkungen: z.string().trim().nullable(),
  zubehoer: z.string().trim().nullable(),
  herstelljahr: z.string().trim().nullable(),
  erstgebrauch: z.string().trim().nullable(),
  ablegereife: z.string().trim().nullable(),
});

export type SaveGeraetResult = { success: true } | { success: false; message: string };

function emptyToNull(value: FormDataEntryValue | null): string | null {
  const str = typeof value === "string" ? value.trim() : "";
  return str.length > 0 ? str : null;
}

export async function saveGeraetStammdaten(id: string, formData: FormData): Promise<SaveGeraetResult> {
  const parsed = stammdatenSchema.safeParse({
    name: formData.get("name") ?? "",
    serienummer: emptyToNull(formData.get("serienummer")),
    barcode: emptyToNull(formData.get("barcode")),
    lagerort: emptyToNull(formData.get("lagerort")),
    bemerkungen: emptyToNull(formData.get("bemerkungen")),
    zubehoer: emptyToNull(formData.get("zubehoer")),
    herstelljahr: emptyToNull(formData.get("herstelljahr")),
    erstgebrauch: emptyToNull(formData.get("erstgebrauch")),
    ablegereife: emptyToNull(formData.get("ablegereife")),
  });

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };
  }

  try {
    await updateGeraetStammdaten(id, parsed.data);
  } catch (error) {
    const message = error instanceof DataverseError ? error.message : "Unbekannter Fehler beim Speichern.";
    return { success: false, message };
  }

  revalidatePath(`/geraete/${id}`);
  return { success: true };
}
