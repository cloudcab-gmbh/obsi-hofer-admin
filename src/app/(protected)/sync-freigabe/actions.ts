"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { aktuellerBenutzerIstFreigeber, aktuellerFreigeberName } from "@/lib/auth/freigeber";
import { listKundenportalKontakteForFirma, setKundenportalFreigabe } from "@/lib/dataverse/kontakte";
import { getFirma } from "@/lib/dataverse/geraete";
import { DataverseError } from "@/lib/dataverse/errors";
import { istSyncKonfiguriert, starteFirmaSync, type SyncErgebnis } from "@/lib/kundenportal-sync";
import { erstelleSyncLauf, listSyncLaeufeForFirma, type SyncLauf } from "@/lib/dataverse/sync-laeufe";
import { wurdeBereitsUebertragen } from "@/lib/sync-lauf-regeln";

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

export type FirmaSyncResult =
  | {
      success: true;
      ergebnis: SyncErgebnis;
      /** PROJ-6: der gespeicherte Verlaufseintrag, oder `null`, wenn das Speichern scheiterte. */
      lauf: SyncLauf | null;
    }
  | { success: false; message: string };

/**
 * PROJ-5: löst den Kundenportal-Sync für genau eine Firma aus. Die Firma-ID
 * kommt aus dem Bestätigungsdialog (der angezeigten Firma), nicht erneut aus
 * der Session — ein Firmenwechsel während des Syncs betrifft so weiterhin die
 * bestätigte Firma (Edge Case). Ein Freigeber darf ohnehin jede Firma
 * synchronisieren, daraus entsteht kein Berechtigungsrisiko.
 *
 * PROJ-6: jeder tatsächliche Aufruf ans Kundenportal wird hier — serverseitig,
 * unabhängig davon, ob der Browser die Antwort noch empfängt — im Sync-Verlauf
 * protokolliert. Ablehnungen davor erzeugen bewusst keinen Eintrag.
 */
export async function syncFirmaAction(firmaId: string): Promise<FirmaSyncResult> {
  const freigeberName = await aktuellerFreigeberName();
  if (!freigeberName) {
    return { success: false, message: "Nur Freigeber dürfen den Sync ins Kundenportal auslösen." };
  }

  // Ohne geprüfte Firma-ID nie aufrufen (Verteidigungslinie gegen einen Gesamt-Sync, siehe kundenportal-sync.ts).
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
    // Nutzer-Entscheidung 2026-10-07: Ohne freigegebenen Kontakt ist der Sync
    // trotzdem erlaubt, wenn die Firma schon einmal übertragen wurde — sonst
    // liesse sich der Entzug des letzten Kontakts nie ins Portal bringen.
    if (!kontakte.some((k) => k.freigegeben && k.email)) {
      const { laeufe } = await listSyncLaeufeForFirma(parsed.data);
      if (!wurdeBereitsUebertragen(laeufe)) {
        return {
          success: false,
          message: "Zuerst mindestens einen Kontakt mit E-Mail-Adresse fürs Kundenportal freigeben.",
        };
      }
    }
  } catch (error) {
    const message = error instanceof DataverseError ? error.message : "Die Firmendaten konnten nicht geprüft werden.";
    return { success: false, message };
  }

  const gestartetAm = new Date();
  let ergebnis: SyncErgebnis;
  try {
    ergebnis = await starteFirmaSync(parsed.data, firmaName);
  } catch {
    return { success: false, message: "Unbekannter Fehler beim Auslösen des Syncs." };
  }

  // Eigener Fehlerpfad: ein Fehler beim Protokollieren darf das Sync-Ergebnis nicht verdecken.
  let lauf: SyncLauf | null = null;
  try {
    lauf = await erstelleSyncLauf({
      firmaId: parsed.data,
      firmaName,
      gestartetAm,
      dauerSekunden: Math.round((Date.now() - gestartetAm.getTime()) / 1000),
      ausgeloestVon: freigeberName,
      ergebnis,
    });
  } catch (error) {
    console.error(`Sync-Lauf für Firma ${parsed.data} konnte nicht im Verlauf gespeichert werden:`, error);
  }

  return { success: true, ergebnis, lauf };
}

export type SyncVerlaufResult =
  | { success: true; laeufe: SyncLauf[]; hatMehr: boolean }
  | { success: false; message: string };

/** PROJ-6: "Mehr anzeigen" — die nächsten älteren Läufe einer Firma. */
export async function ladeSyncLaeufeAction(firmaId: string, vor: string): Promise<SyncVerlaufResult> {
  if (!(await aktuellerBenutzerIstFreigeber())) {
    return { success: false, message: "Nur Freigeber dürfen den Sync-Verlauf einsehen." };
  }
  if (!z.guid().safeParse(firmaId).success || Number.isNaN(new Date(vor).getTime())) {
    return { success: false, message: "Ungültige Anfrage." };
  }

  try {
    return { success: true, ...(await listSyncLaeufeForFirma(firmaId, { vor })) };
  } catch (error) {
    const message = error instanceof DataverseError ? error.message : "Der Verlauf konnte nicht geladen werden.";
    return { success: false, message };
  }
}
