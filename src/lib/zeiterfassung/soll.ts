import { vortag, wochentagIndex } from "./datum";

// PROJ-14: gemeinsame Rechenregel für das Soll (von PROJ-13 und PROJ-15
// wiederverwendet). Ohne Datenzugriff; alle Daten als "YYYY-MM-DD" in
// Schweizer Zeit (siehe datum.ts).

/** Wochenstunden bei 100 % — fest (Product Decision 2026-10-26). */
export const WOCHENSTUNDEN_VOLLZEIT = 40;

export const WOCHENTAGE_KURZ = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] as const;

/** Arbeitstage Montag … Sonntag. */
export type Arbeitstage = [boolean, boolean, boolean, boolean, boolean, boolean, boolean];

export interface ArbeitsmodellVersion {
  id: string;
  gueltigAb: string;
  /** Pensum in Prozent, 0–100. */
  pensum: number;
  arbeitstage: Arbeitstage;
}

function rundeAufZweiStellen(wert: number): number {
  return Math.round(wert * 100) / 100;
}

/** Soll pro Arbeitstag = 40 h × Pensum ÷ Anzahl Arbeitstage, auf zwei Nachkommastellen. */
export function sollProArbeitstag(pensum: number, arbeitstage: readonly boolean[]): number {
  const anzahl = arbeitstage.filter(Boolean).length;
  if (anzahl === 0 || pensum <= 0) return 0;
  return rundeAufZweiStellen((WOCHENSTUNDEN_VOLLZEIT * pensum) / 100 / anzahl);
}

/** z.B. "Mo, Di, Fr" bzw. "keine". */
export function formatArbeitstage(arbeitstage: readonly boolean[]): string {
  const tage = WOCHENTAGE_KURZ.filter((_, i) => arbeitstage[i]);
  return tage.length > 0 ? tage.join(", ") : "keine";
}

export function formatPensum(pensum: number): string {
  return `${pensum} %`;
}

export function formatStunden(stunden: number): string {
  return `${stunden.toFixed(2)} h`;
}

/** z.B. "8.00 h an Mo, Di" bzw. "kein Soll". */
export function formatSollBeschreibung(pensum: number, arbeitstage: readonly boolean[]): string {
  const soll = sollProArbeitstag(pensum, arbeitstage);
  if (soll === 0) return "kein Soll";
  return `${formatStunden(soll)} an ${formatArbeitstage(arbeitstage)}`;
}

/** Versionen neueste zuerst (wie im Verlauf angezeigt). */
export function sortiereVersionen<T extends { gueltigAb: string }>(versionen: readonly T[]): T[] {
  return [...versionen].sort((a, b) => b.gueltigAb.localeCompare(a.gueltigAb));
}

/** Die an `datum` gültige Version, oder `null` vor der ersten Version. */
export function gueltigeVersion<T extends { gueltigAb: string }>(versionen: readonly T[], datum: string): T | null {
  return sortiereVersionen(versionen).find((v) => v.gueltigAb <= datum) ?? null;
}

/**
 * Abgeleitetes "gültig bis" einer Version: Vortag der nächsten Version bzw.
 * der Austritt, je nachdem was früher ist (`null` = offen). Beginnt die
 * Version erst nach dem Austritt, hat sie keine Wirkung (`null`, siehe
 * `nachAustritt`; PROJ-14 QA BUG-1).
 */
export function gueltigBis(
  versionen: readonly { gueltigAb: string }[],
  version: { gueltigAb: string },
  austrittAm: string | null
): string | null {
  if (nachAustritt(version, austrittAm)) return null;
  const naechste = [...versionen]
    .filter((v) => v.gueltigAb > version.gueltigAb)
    .sort((a, b) => a.gueltigAb.localeCompare(b.gueltigAb))[0];
  const bisNaechste = naechste ? vortag(naechste.gueltigAb) : null;
  if (austrittAm && (bisNaechste === null || austrittAm < bisNaechste)) return austrittAm;
  return bisNaechste;
}

/** Version beginnt erst nach dem Austritt und hat damit keine Wirkung. */
export function nachAustritt(version: { gueltigAb: string }, austrittAm: string | null): boolean {
  return !!austrittAm && version.gueltigAb > austrittAm;
}

/** Soll einer Person an einem Datum (ohne Feiertage/Ferien — die setzt PROJ-13/15 zusätzlich auf 0). */
export function sollAmDatum(
  person: { versionen: readonly ArbeitsmodellVersion[]; austrittAm: string | null },
  datum: string
): number {
  if (person.austrittAm && datum > person.austrittAm) return 0;
  const version = gueltigeVersion(person.versionen, datum);
  if (!version || !version.arbeitstage[wochentagIndex(datum)]) return 0;
  return sollProArbeitstag(version.pensum, version.arbeitstage);
}

/**
 * Version für die Personenliste: die heute gültige, sonst die nächste
 * künftige (z.B. Eintritt nächsten Monat). `null` = kein Arbeitsmodell.
 */
export function aktuelleVersion<T extends { gueltigAb: string }>(versionen: readonly T[], heute: string): T | null {
  return (
    gueltigeVersion(versionen, heute) ??
    [...versionen].sort((a, b) => a.gueltigAb.localeCompare(b.gueltigAb))[0] ??
    null
  );
}
