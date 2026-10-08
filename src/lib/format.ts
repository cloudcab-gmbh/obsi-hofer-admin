/**
 * Anzahl im Titel der Geräteliste (Nutzerwunsch 2026-10-08): ohne wirksamen
 * Filter nur die Gesamtzahl, sonst "x von y" — die gefilterten Geräte sind
 * genau die, die auch in den PDF-Export gehen.
 */
export function formatGeraeteAnzahl(gefiltert: number, gesamt: number): string {
  if (gefiltert === gesamt) return gesamt === 1 ? "1 Gerät" : `${gesamt} Geräte`;
  return `${gefiltert} von ${gesamt} Geräten`;
}

export function formatDatum(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("de-CH");
}
