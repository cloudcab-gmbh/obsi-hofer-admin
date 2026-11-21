import { listKorrekturAnfragen } from "@/lib/dataverse/korrekturanfragen";
import { tageDesMonats } from "./datum";
import { anfragenProTag, type KorrekturAnfrage } from "./korrektur";

/**
 * PROJ-21: Korrektur-Anfragen einer Person für einen Monat, pro Tag. Ein
 * Fehler blockiert den Zeitnachweis nicht — die Anfragen sind Zusatz.
 */
export async function ladeAnfragenDesMonats(
  email: string,
  monat: string
): Promise<{ anfragen: Record<string, KorrekturAnfrage[]>; fehler: boolean }> {
  const tage = tageDesMonats(monat);
  try {
    return { anfragen: anfragenProTag(await listKorrekturAnfragen(email, tage[0], tage.at(-1)!)), fehler: false };
  } catch {
    return { anfragen: {}, fehler: true };
  }
}
