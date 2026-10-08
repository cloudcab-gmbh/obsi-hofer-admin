"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { listGeraeteForStandorte, updateGeraetStammdaten } from "@/lib/dataverse/geraete";
import { DataverseError } from "@/lib/dataverse/errors";
import { ladeArbeitskontext, pdfStandortZusatz } from "@/lib/arbeitskontext";
import { generatePruefberichtPdf, ExportFehler } from "@/lib/pruefbericht-export/export";
import { SharePointError } from "@/lib/sharepoint/errors";
import {
  SignaturFehler,
  SIGNATUR_FEHLERMELDUNG_DIENST,
  SIGNATUR_FEHLERMELDUNG_KONFIGURATION,
} from "@/lib/pdf-signatur/konfiguration";

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
 * QA BUG-1 (Fix): `geraetIds` kommt vom Client (der bereits gefilterten
 * Anzeige), bestimmt aber nur noch AUSWAHL — die tatsächlichen Gerätedaten
 * werden hier immer frisch aus Dataverse geladen und auf den aktuellen
 * Standort der Sitzung eingeschränkt (PROJ-10; vorher: Firma). Ein
 * manipulierter Aufruf (Server Actions sind direkt aufrufbar) kann damit
 * weder Daten fälschen noch Geräte eines anderen Standorts einschleusen.
 */
export async function generatePdfAction(geraetIds: string[], lagerortFilter: string | null): Promise<GeneratePdfResult> {
  try {
    const kontext = await ladeArbeitskontext();
    if (kontext.zustand === "keine-firma") return { success: false, message: "Keine Firma ausgewählt." };
    if (kontext.zustand !== "bereit") return { success: false, message: "Kein Standort ausgewählt." };

    const geraeteDesStandorts = await listGeraeteForStandorte([kontext.standort.id]);
    // Reihenfolge der Client-IDs übernehmen (= Sortierung der Geräteliste),
    // die Daten selbst aber nur aus der Standort-gescopten Liste.
    const geraetById = new Map(geraeteDesStandorts.map((g) => [g.id, g]));
    const geraete = [...new Set(geraetIds)].flatMap((id) => geraetById.get(id) ?? []);

    const { pdfBuffer, dateiname } = await generatePruefberichtPdf({
      firmaName: kontext.firma.name,
      // Nur bei mehreren Standorten bzw. gleichnamigen Firmen in Dateiname, Kopfbereich und Ablage.
      standortName: pdfStandortZusatz(kontext),
      geraete,
      lagerortFilter,
    });
    return { success: true, pdfBase64: Buffer.from(pdfBuffer).toString("base64"), dateiname };
  } catch (error) {
    if (error instanceof ExportFehler) return { success: false, message: error.message };
    if (error instanceof SignaturFehler) {
      // PROJ-9: Details (z.B. fehlende Variable, Antwort des Zeitstempeldienstes)
      // nur ins Server-Log — in der Oberfläche keine Hinweise auf Zugangsdaten.
      console.error("generatePdfAction: Signatur fehlgeschlagen", error);
      return {
        success: false,
        message: error.kategorie === "konfiguration" ? SIGNATUR_FEHLERMELDUNG_KONFIGURATION : SIGNATUR_FEHLERMELDUNG_DIENST,
      };
    }
    if (error instanceof DataverseError || error instanceof SharePointError) {
      return { success: false, message: error.message };
    }
    // Interne Admin-Tool-Zielgruppe (keine externen Kunden) — die konkrete
    // Fehlermeldung ist für die Fehlersuche wichtiger als die zusätzliche
    // Abstraktion einer generischen Meldung ohne jedes Detail.
    console.error("generatePdfAction: unerwarteter Fehler", error);
    const detail = error instanceof Error ? error.message : String(error);
    return { success: false, message: `Unbekannter Fehler beim Generieren des PDFs: ${detail}` };
  }
}
