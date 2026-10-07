"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { aktuellerBenutzerIstFreigeber } from "@/lib/auth/freigeber";
import { listKundenportalKontakteForFirma, setKundenportalFreigabe } from "@/lib/dataverse/kontakte";
import { getFirma } from "@/lib/dataverse/geraete";
import { DataverseError } from "@/lib/dataverse/errors";
import { istSyncKonfiguriert, starteFirmaSync, type SyncErgebnis } from "@/lib/kundenportal-sync";

export type KontaktFreigabeResult = { success: true } | { success: false; message: string };

const freigabeSchema = z.object({
  // z.guid() statt z.string().uuid(): Zod 4 prüft bei uuid() die RFC-Versions-
  // Bits, die echte Dataverse-IDs (z.B. "…-f111-…") nicht erfüllen.
  kontaktId: z.guid("Ungültige Kontakt-ID."),
  freigegeben: z.boolean(),
});

export async function setKundenportalFreigabeAction(
  kontaktId: string,
  freigegeben: boolean
): Promise<KontaktFreigabeResult> {
  // Serverseitige Sperre: die Seite selbst prüft das auch, aber eine Server
  // Action lässt sich unabhängig von der Seite direkt aufrufen.
  if (!(await aktuellerBenutzerIstFreigeber())) {
    return { success: false, message: "Nur Freigeber dürfen Kontakte fürs Kundenportal freigeben." };
  }

  const parsed = freigabeSchema.safeParse({ kontaktId, freigegeben });
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };
  }

  try {
    await setKundenportalFreigabe(parsed.data.kontaktId, parsed.data.freigegeben);
  } catch (error) {
    const message = error instanceof DataverseError ? error.message : "Unbekannter Fehler beim Speichern der Freigabe.";
    return { success: false, message };
  }

  revalidatePath("/sync-freigabe");
  return { success: true };
}

export type FirmaSyncResult = { success: true; ergebnis: SyncErgebnis } | { success: false; message: string };

/**
 * PROJ-5: löst den Kundenportal-Sync für genau eine Firma aus. Die Firma-ID
 * kommt aus dem Bestätigungsdialog (der angezeigten Firma), nicht erneut aus
 * der Session — ein Firmenwechsel während des Syncs betrifft so weiterhin die
 * bestätigte Firma (Edge Case). Ein Freigeber darf ohnehin jede Firma
 * synchronisieren, daraus entsteht kein Berechtigungsrisiko.
 */
export async function syncFirmaAction(firmaId: string): Promise<FirmaSyncResult> {
  if (!(await aktuellerBenutzerIstFreigeber())) {
    return { success: false, message: "Nur Freigeber dürfen den Sync ins Kundenportal auslösen." };
  }

  // Ohne geprüfte Firma-ID nie aufrufen: der Endpoint würde sonst ALLE Firmen synchronisieren.
  const parsed = z.guid().safeParse(firmaId);
  if (!parsed.success) {
    return { success: false, message: "Ungültige Firma-ID." };
  }

  if (!istSyncKonfiguriert()) {
    return { success: false, message: "Der Sync ist noch nicht aktiviert bzw. nicht konfiguriert." };
  }

  let firmaName: string;
  try {
    const [firma, kontakte] = await Promise.all([getFirma(parsed.data), listKundenportalKontakteForFirma(parsed.data)]);
    firmaName = firma.name;
    // Serverseitige Wiederholung der Sperre (z.B. letzte Freigabe in einem anderen Tab entzogen).
    if (!kontakte.some((k) => k.freigegeben && k.email)) {
      return {
        success: false,
        message: "Zuerst mindestens einen Kontakt mit E-Mail-Adresse fürs Kundenportal freigeben.",
      };
    }
  } catch (error) {
    const message = error instanceof DataverseError ? error.message : "Die Firmendaten konnten nicht geprüft werden.";
    return { success: false, message };
  }

  try {
    return { success: true, ergebnis: await starteFirmaSync(parsed.data, firmaName) };
  } catch {
    return { success: false, message: "Unbekannter Fehler beim Auslösen des Syncs." };
  }
}
