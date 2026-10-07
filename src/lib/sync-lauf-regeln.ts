import type { SyncLauf } from "@/lib/dataverse/sync-laeufe";

// Reine Regel ohne Server-Abhängigkeiten — wird sowohl im Browser (Button-
// Sperre) als auch in der Server Action (serverseitige Prüfung) verwendet.
// Bewusst NICHT in dataverse/sync-laeufe.ts, das den Dataverse-Client
// importiert und deshalb nicht ins Client-Bundle gehört.

/**
 * Wurde die Firma schon einmal tatsächlich ins Portal übertragen? Zählt jeder
 * Lauf ausser "fehler" (dabei kam nichts im Portal an, z.B. abgelehnter
 * Zugangsschlüssel). PROJ-5, Nutzer-Entscheidung 2026-10-07: dann ist ein Sync
 * auch ohne freigegebenen Kontakt erlaubt, um bestehende Zugänge zu entziehen.
 */
export function wurdeBereitsUebertragen(laeufe: SyncLauf[]): boolean {
  return laeufe.some((l) => l.ergebnis.status !== "fehler");
}
