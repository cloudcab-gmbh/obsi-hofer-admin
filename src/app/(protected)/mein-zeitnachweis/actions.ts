"use server";

import { aktuellerMitarbeiter } from "@/lib/auth/mitarbeiter";
import { heuteSchweiz, istGueltigerMonat } from "@/lib/zeiterfassung/datum";
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
