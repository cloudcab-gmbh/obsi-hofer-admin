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

/**
 * PROJ-20: Seit der Rolle „Mitarbeiter“ kommen auch Personen ins Tool, die
 * Geräte und Prüfberichte nicht sehen dürfen. Server Actions sind unabhängig
 * von der Seite aufrufbar — deshalb prüfen die Aktionen dieser Bereiche selbst.
 */
export function istBearbeiterOderFreigeber(session: Session | null): boolean {
  const roles = session?.user?.roles ?? [];
  return roles.includes("bearbeiter") || roles.includes("freigeber");
}

export async function aktuellerBenutzerIstBearbeiterOderFreigeber(): Promise<boolean> {
  return istBearbeiterOderFreigeber(await auth());
}

export const NUR_BEARBEITER_HINWEIS = "Nur für Benutzer mit der Rolle „Bearbeiter“ oder „Freigeber“.";

/**
 * PROJ-6: Name des eingeloggten Freigebers (für "Ausgelöst von" im
 * Sync-Verlauf), oder `null`, wenn der Benutzer kein Freigeber ist — eine
 * Abfrage für Prüfung und Name zugleich.
 */
export async function aktuellerFreigeberName(): Promise<string | null> {
  const session = await auth();
  if (!istFreigeber(session)) return null;
  return session?.user?.name?.trim() || session?.user?.email || "Unbekannt";
}
