import type { Session } from "next-auth";
import { auth } from "@/auth";

// Der Zugriffsschutz in proxy.ts lässt Bearbeiter UND Freigeber auf jede
// Seite; der Header blendet "Sync-Freigabe" für Bearbeiter nur aus. Für
// Freigeber-exklusive Funktionen (PROJ-8 Kontakt-Freigabe, PROJ-5 Sync) wird
// deshalb zusätzlich auf Seiten- UND Aktionsebene geprüft — sonst liesse
// sich die Sperre per Direktaufruf der Seite oder Server Action umgehen.
export function istFreigeber(session: Session | null): boolean {
  return session?.user?.roles?.includes("freigeber") ?? false;
}

export async function aktuellerBenutzerIstFreigeber(): Promise<boolean> {
  return istFreigeber(await auth());
}
