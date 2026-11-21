"use server";

import { aktuellerMitarbeiter } from "@/lib/auth/mitarbeiter";
import { revalidatePath } from "next/cache";
import { heuteSchweiz, istGueltigerMonat, istGueltigesDatum } from "@/lib/zeiterfassung/datum";
import { anfrageZeitraum, bisherigeZeiten, darfAnfragen, pruefeNachricht } from "@/lib/zeiterfassung/korrektur";
import { erstelleKorrekturAnfrage } from "@/lib/dataverse/korrekturanfragen";
import { zeitnachweisHref } from "@/lib/zeiterfassung/links";
import { ladeEigenenZeitnachweis } from "@/lib/zeiterfassung/zeitnachweis-laden";
import { ladeLogoDataUrl, renderePdf } from "@/lib/pdf/grundlage";
import { bauePdfDokument, zeitnachweisDateiname } from "@/lib/zeiterfassung/zeitnachweis-pdf";
import type { ZeitnachweisPdfResult } from "@/app/(protected)/zeiterfassung/actions";

/**
 * PROJ-20: PDF des eigenen Zeitnachweises. Nimmt bewusst keine E-Mail entgegen —
 * die Person ergibt sich nur aus der Anmeldung; der Monat wird wie auf der
 * Seite auf die erlaubten Monate begrenzt.
 */
export async function erzeugeEigenesZeitnachweisPdfAction(monat: string): Promise<ZeitnachweisPdfResult> {
  const mitarbeiter = await aktuellerMitarbeiter();
  if (!mitarbeiter) return { success: false, message: "Nur mit der Rolle „Mitarbeiter“ verfügbar." };
  if (!mitarbeiter.email) return { success: false, message: "Für dein Konto ist keine E-Mail-Adresse hinterlegt." };
  if (typeof monat !== "string" || !istGueltigerMonat(monat)) return { success: false, message: "Ungültige Anfrage." };

  try {
    const heute = heuteSchweiz();
    const eigener = await ladeEigenenZeitnachweis(mitarbeiter.email, monat, heute);
    if (eigener.art !== "ok") return { success: false, message: "Für dich gibt es keinen Zeitnachweis." };
    const { geladen } = eigener;
    const dokument = bauePdfDokument({
      zeitnachweis: geladen.zeitnachweis,
      personName: geladen.person.anzeige,
      versionen: geladen.versionen,
      heute,
      erstelltVon: mitarbeiter.name || geladen.person.anzeige,
      logoDataUrl: ladeLogoDataUrl(),
    });
    const pdf = await renderePdf(dokument);
    return { success: true, pdfBase64: pdf.toString("base64"), dateiname: zeitnachweisDateiname(geladen.person.anzeige, eigener.monat) };
  } catch {
    // Keine Personendaten in Meldung oder Log.
    return { success: false, message: "Das PDF konnte nicht erzeugt werden. Bitte später erneut versuchen." };
  }
}

export type KorrekturAnfrageResult = { success: true } | { success: false; message: string };

/** Basis-Adresse des Tools für den Link in der Teams-Karte. */
function toolAdresse(): string {
  const basis = process.env.AUTH_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "");
  return basis.replace(/\/+$/, "");
}

/**
 * PROJ-21: Korrektur-Anfrage der angemeldeten Person für einen Tag. Person aus
 * der Anmeldung, Frist (aktueller und vorheriger Monat bis heute, innerhalb der
 * sichtbaren Monate) und bisherige Zeiten werden hier geprüft bzw. berechnet —
 * nichts davon kommt aus dem Browser.
 */
export async function sendeKorrekturAnfrageAction(datum: string, nachricht: string): Promise<KorrekturAnfrageResult> {
  const mitarbeiter = await aktuellerMitarbeiter();
  if (!mitarbeiter) return { success: false, message: "Nur mit der Rolle „Mitarbeiter“ verfügbar." };
  if (!mitarbeiter.email) return { success: false, message: "Für dein Konto ist keine E-Mail-Adresse hinterlegt." };
  const nachrichtFehler = pruefeNachricht(nachricht);
  if (nachrichtFehler) return { success: false, message: nachrichtFehler };
  if (typeof datum !== "string" || !istGueltigesDatum(datum)) return { success: false, message: "Ungültiges Datum." };

  try {
    const heute = heuteSchweiz();
    const monat = datum.slice(0, 7);
    const eigener = await ladeEigenenZeitnachweis(mitarbeiter.email, monat, heute);
    if (eigener.art !== "ok") return { success: false, message: "Für dich gibt es keinen Zeitnachweis." };
    // Ein Monat ausserhalb der sichtbaren Monate wird beim Laden verschoben → dann nicht erlaubt.
    if (eigener.monat !== monat || !darfAnfragen(datum, anfrageZeitraum(heute, eigener.bereich))) {
      return { success: false, message: "Für diesen Tag kann keine Korrektur mehr angefragt werden." };
    }
    const tag = eigener.geladen.zeitnachweis.tage.find((t) => t.datum === datum);
    if (!tag) return { success: false, message: "Ungültiges Datum." };

    const { email, anzeige } = eigener.geladen.person;
    await erstelleKorrekturAnfrage({
      email,
      name: mitarbeiter.name || anzeige,
      datum,
      nachricht: nachricht.trim(),
      bisherigeZeiten: bisherigeZeiten(tag),
      link: `${toolAdresse()}${zeitnachweisHref(email, monat)}`,
    });
  } catch {
    // Keine Personendaten in Meldung oder Log.
    return { success: false, message: "Die Anfrage konnte nicht gesendet werden. Bitte später erneut versuchen." };
  }
  revalidatePath("/mein-zeitnachweis");
  return { success: true };
}
