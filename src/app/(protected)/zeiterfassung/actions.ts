"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { aktuellerBenutzerIstFreigeber } from "@/lib/auth/freigeber";
import { DataverseError } from "@/lib/dataverse/errors";
import { getZeiteintragFuerKorrektur, setzeGehen } from "@/lib/dataverse/zeiterfassung";
import { alsSchweizerZeitpunkt, folgetag, istGueltigeUhrzeit, zuSchweizerDatum } from "@/lib/zeiterfassung/datum";

export type GehenNachtragenResult = { success: true } | { success: false; message: string };

/** Mehr als 14 h am Stück gilt als unplausibel (wie in der Tagesauswertung). */
const MAX_DAUER_MS = 14 * 60 * 60 * 1000;

const eingabeSchema = z.object({
  eintragId: z.guid("Ungültiger Eintrag."),
  uhrzeit: z.string().refine(istGueltigeUhrzeit, "Bitte eine Uhrzeit im Format HH:MM angeben."),
  folgetag: z.boolean(),
});

/**
 * PROJ-13: Trägt bei einem offenen Eintrag (Kommen ohne Gehen) das Gehen nach
 * (Nutzer-Entscheidung 2026-10-27). Nur offene Einträge — erfasste Zeiten
 * werden nicht überschrieben.
 */
export async function trageGehenNachAction(
  eintragId: string,
  uhrzeit: string,
  amFolgetag: boolean
): Promise<GehenNachtragenResult> {
  if (!(await aktuellerBenutzerIstFreigeber())) {
    return { success: false, message: "Nur Freigeber dürfen Zeiteinträge korrigieren." };
  }
  const parsed = eingabeSchema.safeParse({ eintragId, uhrzeit, folgetag: amFolgetag });
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };

  try {
    const eintrag = await getZeiteintragFuerKorrektur(parsed.data.eintragId);
    if (eintrag.typ !== "arbeitszeit" || !eintrag.kommen) {
      return { success: false, message: "Dieser Eintrag hat kein „Kommen“ und kann nicht ergänzt werden." };
    }
    if (eintrag.gehen) {
      return { success: false, message: "Für diesen Eintrag ist bereits ein „Gehen“ erfasst. Bitte die Seite neu laden." };
    }

    const kommenTag = zuSchweizerDatum(eintrag.kommen)!;
    const gehen = alsSchweizerZeitpunkt(parsed.data.folgetag ? folgetag(kommenTag) : kommenTag, parsed.data.uhrzeit);
    const dauer = new Date(gehen).getTime() - new Date(eintrag.kommen).getTime();
    if (dauer <= 0) return { success: false, message: "„Gehen“ muss nach „Kommen“ liegen." };
    if (dauer > MAX_DAUER_MS) return { success: false, message: "Mehr als 14 Stunden am Stück sind nicht möglich." };

    await setzeGehen(parsed.data.eintragId, gehen);
  } catch (error) {
    const message =
      error instanceof DataverseError && error.category === "not_found"
        ? "Diesen Eintrag gibt es nicht mehr. Bitte die Seite neu laden."
        : error instanceof DataverseError
          ? error.message
          : "Das „Gehen“ konnte nicht gespeichert werden.";
    return { success: false, message };
  }

  revalidatePath("/zeiterfassung");
  return { success: true };
}
