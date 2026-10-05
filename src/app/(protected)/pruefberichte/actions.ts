"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { createPruefbericht, updatePruefbericht, stornierePruefbericht, ERGEBNIS_OPTIONEN } from "@/lib/dataverse/pruefberichte";
import { computePrueferKuerzel } from "@/lib/pruefer-kuerzel";
import { DataverseError } from "@/lib/dataverse/errors";

const pruefberichtSchema = z.object({
  pruefdatum: z.string().trim().min(1, "Prüfdatum darf nicht leer sein."),
  ergebnis: z.enum(ERGEBNIS_OPTIONEN, { message: "Bitte ein gültiges Ergebnis auswählen." }),
  bemerkungen: z.string().trim().nullable(),
});

export type PruefberichtActionResult = { success: true } | { success: false; message: string };

function emptyToNull(value: FormDataEntryValue | null): string | null {
  const str = typeof value === "string" ? value.trim() : "";
  return str.length > 0 ? str : null;
}

function parsePruefberichtFormData(formData: FormData) {
  return pruefberichtSchema.safeParse({
    pruefdatum: formData.get("pruefdatum") ?? "",
    ergebnis: formData.get("ergebnis") ?? "",
    bemerkungen: emptyToNull(formData.get("bemerkungen")),
  });
}

export async function createPruefberichtAction(
  geraetId: string,
  formData: FormData
): Promise<PruefberichtActionResult> {
  const parsed = parsePruefberichtFormData(formData);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };
  }

  const session = await auth();
  const pruefer = computePrueferKuerzel(session?.user?.name ?? "");

  try {
    await createPruefbericht(geraetId, { ...parsed.data, pruefer });
  } catch (error) {
    const message = error instanceof DataverseError ? error.message : "Unbekannter Fehler beim Speichern.";
    return { success: false, message };
  }

  revalidatePath(`/geraete/${geraetId}`);
  revalidatePath("/pruefberichte");
  return { success: true };
}

export async function updatePruefberichtAction(id: string, formData: FormData): Promise<PruefberichtActionResult> {
  const parsed = parsePruefberichtFormData(formData);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };
  }

  let geraetId: string;
  try {
    ({ geraetId } = await updatePruefbericht(id, parsed.data));
  } catch (error) {
    const message = error instanceof DataverseError ? error.message : "Unbekannter Fehler beim Speichern.";
    return { success: false, message };
  }

  revalidatePath(`/geraete/${geraetId}`);
  revalidatePath(`/pruefberichte/${id}`);
  revalidatePath("/pruefberichte");
  return { success: true };
}

export async function stornierePruefberichtAction(id: string): Promise<PruefberichtActionResult> {
  let geraetId: string;
  try {
    ({ geraetId } = await stornierePruefbericht(id));
  } catch (error) {
    const message = error instanceof DataverseError ? error.message : "Unbekannter Fehler beim Stornieren.";
    return { success: false, message };
  }

  revalidatePath(`/geraete/${geraetId}`);
  revalidatePath(`/pruefberichte/${id}`);
  revalidatePath("/pruefberichte");
  return { success: true };
}
