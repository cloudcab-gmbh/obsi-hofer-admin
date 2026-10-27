// PROJ-14: Die Datumsfelder der Zeiterfassung sind in Dataverse "Benutzer
// lokal" und lassen sich nicht umstellen. Das Tool speichert ein Kalender-
// datum deshalb immer als Mitternacht Schweizer Zeit (als UTC-Zeitpunkt,
// z.B. 01.11.2026 → "2026-10-31T23:00:00Z") und liest es in Schweizer Zeit
// zurück. Intern wird mit "YYYY-MM-DD" gerechnet.

const ZEITZONE = "Europe/Zurich";
const DATUM_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const teileFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZEITZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function schweizerTeile(zeitpunkt: Date) {
  const teile = Object.fromEntries(teileFormat.formatToParts(zeitpunkt).map((t) => [t.type, t.value]));
  return {
    datum: `${teile.year}-${teile.month}-${teile.day}`,
    // Abstand Schweizer Ortszeit ↔ UTC in Millisekunden (1 h Winter, 2 h Sommer).
    offset:
      Date.UTC(+teile.year, +teile.month - 1, +teile.day, +teile.hour, +teile.minute, +teile.second) -
      Math.floor(zeitpunkt.getTime() / 1000) * 1000,
  };
}

export function istGueltigesDatum(datum: string): boolean {
  const m = DATUM_PATTERN.exec(datum);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

/** Dataverse-Zeitpunkt → Kalenderdatum in Schweizer Zeit ("YYYY-MM-DD"). */
export function zuSchweizerDatum(zeitpunkt: string | null | undefined): string | null {
  if (!zeitpunkt) return null;
  const d = new Date(zeitpunkt);
  if (Number.isNaN(d.getTime())) return null;
  return schweizerTeile(d).datum;
}

/** Kalenderdatum ("YYYY-MM-DD") → Mitternacht Schweizer Zeit als UTC-Zeitpunkt für Dataverse. */
export function alsSchweizerMitternacht(datum: string): string {
  const m = DATUM_PATTERN.exec(datum);
  if (!m || !istGueltigesDatum(datum)) throw new Error(`Ungültiges Datum: "${datum}"`);
  const utcMitternacht = Date.UTC(+m[1], +m[2] - 1, +m[3]);
  // Mitternacht liegt nie in der Zeitumstellung (02:00/03:00), der Offset ist eindeutig.
  const { offset } = schweizerTeile(new Date(utcMitternacht));
  return new Date(utcMitternacht - offset).toISOString().replace(".000Z", "Z");
}

export function heuteSchweiz(jetzt: Date = new Date()): string {
  return schweizerTeile(jetzt).datum;
}

/** Wochentag eines Kalenderdatums, 0 = Montag … 6 = Sonntag. */
export function wochentagIndex(datum: string): number {
  const m = DATUM_PATTERN.exec(datum);
  if (!m) throw new Error(`Ungültiges Datum: "${datum}"`);
  return (new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay() + 6) % 7;
}

export function vortag(datum: string): string {
  const m = DATUM_PATTERN.exec(datum);
  if (!m) throw new Error(`Ungültiges Datum: "${datum}"`);
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3] - 1)).toISOString().slice(0, 10);
}

/** "YYYY-MM-DD" → "dd.mm.yyyy" (ohne Zeitzonen-Umweg über Date). */
export function formatKalenderdatum(datum: string | null): string {
  if (!datum) return "—";
  const m = DATUM_PATTERN.exec(datum);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : datum;
}
