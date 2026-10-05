"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getFirma, updateGeraetStammdaten, type Geraet } from "@/lib/dataverse/geraete";
import { DataverseError } from "@/lib/dataverse/errors";
import { getCurrentFirmaId } from "@/lib/firma-session";
import { generatePruefberichtPdf, ExportFehler } from "@/lib/pruefbericht-export/export";
import { SharePointError } from "@/lib/sharepoint/errors";

const stammdatenSchema = z.object({
  serienummer: z.string().trim().nullable(),
  barcode: z.string().trim().nullable(),
  lagerort: z.string().trim().nullable(),
  bemerkungen: z.string().trim().nullable(),
  zubehoer: z.string().trim().nullable(),
  herstelljahr: z.string().trim().nullable(),
  erstgebrauch: z.string().trim().nullable(),
  ablegereife: z.string().trim().nullable(),
  kundenId: z.string().trim().nullable(),
});

export type SaveGeraetResult = { success: true } | { success: false; message: string };

function emptyToNull(value: FormDataEntryValue | null): string | null {
  const str = typeof value === "string" ? value.trim() : "";
  return str.length > 0 ? str : null;
}

export async function saveGeraetStammdaten(id: string, formData: FormData): Promise<SaveGeraetResult> {
  const parsed = stammdatenSchema.safeParse({
    serienummer: emptyToNull(formData.get("serienummer")),
    barcode: emptyToNull(formData.get("barcode")),
    lagerort: emptyToNull(formData.get("lagerort")),
    bemerkungen: emptyToNull(formData.get("bemerkungen")),
    zubehoer: emptyToNull(formData.get("zubehoer")),
    herstelljahr: emptyToNull(formData.get("herstelljahr")),
    erstgebrauch: emptyToNull(formData.get("erstgebrauch")),
    ablegereife: emptyToNull(formData.get("ablegereife")),
    kundenId: emptyToNull(formData.get("kundenId")),
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

export type GeneratePdfResult =
  | { success: true; pdfBase64: string; dateiname: string }
  | { success: false; message: string };

/**
 * `geraete` kommt von der bereits beim Seitenaufruf geladenen, client-seitig
 * gefilterten Liste — kein zusätzlicher Dataverse-Roundtrip nötig und keine
 * Sicherheitsfrage, da rein lesend und ohnehin bereits für diesen Nutzer
 * geladene Daten (siehe PROJ-7 Tech Design).
 */
export async function generatePdfAction(geraete: Geraet[], lagerortFilter: string | null): Promise<GeneratePdfResult> {
  const firmaId = await getCurrentFirmaId();
  if (!firmaId) {
    return { success: false, message: "Keine Firma ausgewählt." };
  }

  try {
    const firma = await getFirma(firmaId);
    const { pdfBuffer, dateiname } = await generatePruefberichtPdf({
      firmaName: firma.name,
      geraete,
      lagerortFilter,
    });
    return { success: true, pdfBase64: Buffer.from(pdfBuffer).toString("base64"), dateiname };
  } catch (error) {
    if (error instanceof ExportFehler) return { success: false, message: error.message };
    if (error instanceof DataverseError || error instanceof SharePointError) {
      return { success: false, message: error.message };
    }
    return { success: false, message: "Unbekannter Fehler beim Generieren des PDFs." };
  }
}
