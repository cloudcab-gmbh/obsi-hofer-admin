"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { aktuellerBenutzerIstFreigeber, aktuellerFreigeberName } from "@/lib/auth/freigeber";
import { hatZugangBeiFirma, listKundenportalKontakteForFirma, setStandortFreigabe } from "@/lib/dataverse/kontakte";
import { getFirma, listStandorteForFirma } from "@/lib/dataverse/geraete";
import { kontextBezeichnung, ladeArbeitskontext } from "@/lib/arbeitskontext";
import { DataverseError } from "@/lib/dataverse/errors";
import { istStandortSyncAktiv, istSyncKonfiguriert, starteFirmaSync, type SyncErgebnis } from "@/lib/kundenportal-sync";
import { erstelleSyncLauf, listSyncLaeufeForFirma, type SyncLauf } from "@/lib/dataverse/sync-laeufe";
import { wurdeBereitsUebertragen } from "@/lib/sync-lauf-regeln";

export type KontaktFreigabeResult = { success: true } | { success: false; message: string };

const freigabeSchema = z.object({
  // z.guid() statt z.string().uuid(): Zod 4 prüft bei uuid() die RFC-Versions-
  // Bits, die echte Dataverse-IDs (z.B. "…-f111-…") nicht erfüllen.
  kontaktId: z.guid("Ungültige Kontakt-ID."),
  standortId: z.guid("Ungültige Standort-ID."),
  freigegeben: z.boolean(),
});

/**
 * PROJ-11: Freigabe gilt für den Standort, für den die Liste angezeigt wurde
 * (`standortId` vom Browser). Er muss dem aktuellen Standort der Sitzung
 * entsprechen — sonst wurde inzwischen (z.B. in einem anderen Tab) gewechselt,
 * und die Änderung würde den falschen Standort treffen.
 */
export async function setKundenportalFreigabeAction(
  kontaktId: string,
  standortId: string,
  freigegeben: boolean
): Promise<KontaktFreigabeResult> {
  // Serverseitige Sperre: die Seite selbst prüft das auch, aber eine Server
  // Action lässt sich unabhängig von der Seite direkt aufrufen.
  if (!(await aktuellerBenutzerIstFreigeber())) {
    return { success: false, message: "Nur Freigeber dürfen Kontakte fürs Kundenportal freigeben." };
  }

  const parsed = freigabeSchema.safeParse({ kontaktId, standortId, freigegeben });
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };
  }

  try {
    const kontext = await ladeArbeitskontext();
    if (kontext.zustand !== "bereit" || kontext.standort.id !== parsed.data.standortId) {
      return {
        success: false,
        message: "Firma oder Standort wurden inzwischen gewechselt. Bitte die Seite neu laden.",
      };
    }
    await setStandortFreigabe({
      kontaktId: parsed.data.kontaktId,
      firmaId: kontext.firma.id,
      standort: kontext.standort,
      freigegeben: parsed.data.freigegeben,
    });
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
/**
 * PROJ-12: Mit `standortId` (aktueller Standort der Sitzung) und gesetztem
 * Schalter KUNDENPORTAL_STANDORT_SYNC_AKTIV wird nur dieser Standort
 * übertragen und mit Standort protokolliert; sonst wie bisher die ganze Firma.
 */
export async function syncFirmaAction(firmaId: string, standortId: string | null = null): Promise<FirmaSyncResult> {
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

  const standortParsed = standortId === null ? null : z.guid().safeParse(standortId);
  if (standortParsed && !standortParsed.success) {
    return { success: false, message: "Ungültige Standort-ID." };
  }

  let firmaName: string;
  /** Für Meldungen: "Firma" bzw. "Firma · Standort". */
  let bezeichnung: string;
  let standort: { id: string; name: string } | null = null;
  try {
    const [firma, standorte] = await Promise.all([getFirma(parsed.data), listStandorteForFirma(parsed.data)]);
    firmaName = firma.name;
    bezeichnung = firma.name;

    // PROJ-12: Standort muss der aktuelle Standort dieser Firma in der Sitzung sein.
    if (standortParsed && istStandortSyncAktiv()) {
      const kontext = await ladeArbeitskontext();
      if (kontext.zustand !== "bereit" || kontext.firma.id !== parsed.data || kontext.standort.id !== standortParsed.data) {
        return {
          success: false,
          message: "Firma oder Standort wurden inzwischen gewechselt. Bitte die Seite neu laden.",
        };
      }
      standort = kontext.standort;
      // QA BUG-2: dieselbe Bezeichnung wie Dialog und Header ("Firma · Standort",
      // bei Firmen mit einem Standort nur die Firma, gleichnamige Firmen mit Zusatz).
      bezeichnung = kontextBezeichnung(kontext) ?? firma.name;
    }

    // PROJ-11/12: Zugang zu diesem Standort (Standort-Sync) bzw. zu irgendeinem Standort der Firma.
    const kontakte = await listKundenportalKontakteForFirma(parsed.data, standorte, standort?.id ?? "");
    const hatZugang = standort
      ? kontakte.some((k) => k.freigegeben && k.email)
      : kontakte.some((k) => hatZugangBeiFirma(k) && k.email);
    // Serverseitige Wiederholung der Sperre (z.B. letzte Freigabe in einem anderen Tab entzogen).
    // Nutzer-Entscheidung 2026-10-07: Ohne freigegebenen Kontakt ist der Sync
    // trotzdem erlaubt, wenn schon einmal übertragen wurde — sonst liesse sich
    // der Entzug des letzten Kontakts nie ins Portal bringen. PROJ-12: "schon
    // übertragen" zählt Läufe dieses Standorts und Läufe der ganzen Firma.
    if (!hatZugang) {
      const { laeufe } = await listSyncLaeufeForFirma(parsed.data, { standortId: standort?.id ?? null });
      if (!wurdeBereitsUebertragen(laeufe)) {
        return {
          success: false,
          message: standort
            ? "Zuerst mindestens einen Kontakt mit E-Mail-Adresse für diesen Standort fürs Kundenportal freigeben."
            : "Zuerst mindestens einen Kontakt mit E-Mail-Adresse für einen Standort fürs Kundenportal freigeben.",
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
    ergebnis = await starteFirmaSync(parsed.data, bezeichnung, standort);
  } catch {
    return { success: false, message: "Unbekannter Fehler beim Auslösen des Syncs." };
  }

  // Eigener Fehlerpfad: ein Fehler beim Protokollieren darf das Sync-Ergebnis nicht verdecken.
  let lauf: SyncLauf | null = null;
  try {
    lauf = await erstelleSyncLauf({
      firmaId: parsed.data,
      firmaName,
      standort,
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
export async function ladeSyncLaeufeAction(
  firmaId: string,
  vor: string,
  /** PROJ-12: nur Läufe dieses Standorts + der ganzen Firma. */
  standortId: string | null = null
): Promise<SyncVerlaufResult> {
  if (!(await aktuellerBenutzerIstFreigeber())) {
    return { success: false, message: "Nur Freigeber dürfen den Sync-Verlauf einsehen." };
  }
  if (
    !z.guid().safeParse(firmaId).success ||
    Number.isNaN(new Date(vor).getTime()) ||
    (standortId !== null && !z.guid().safeParse(standortId).success)
  ) {
    return { success: false, message: "Ungültige Anfrage." };
  }

  try {
    return { success: true, ...(await listSyncLaeufeForFirma(firmaId, { vor, standortId })) };
  } catch (error) {
    const message = error instanceof DataverseError ? error.message : "Der Verlauf konnte nicht geladen werden.";
    return { success: false, message };
  }
}
