"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { aktuellerBenutzerIstFreigeber } from "@/lib/auth/freigeber";
import { setKundenportalFreigabe } from "@/lib/dataverse/kontakte";
import { DataverseError } from "@/lib/dataverse/errors";

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
