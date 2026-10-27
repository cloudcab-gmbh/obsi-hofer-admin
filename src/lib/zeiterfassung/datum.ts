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

export function folgetag(datum: string): string {
  const m = DATUM_PATTERN.exec(datum);
  if (!m) throw new Error(`Ungültiges Datum: "${datum}"`);
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3] + 1)).toISOString().slice(0, 10);
}

const MONAT_PATTERN = /^(\d{4})-(\d{2})$/;

export function istGueltigerMonat(monat: string): boolean {
  const m = MONAT_PATTERN.exec(monat);
  return !!m && +m[2] >= 1 && +m[2] <= 12 && +m[1] >= 2000 && +m[1] <= 2100;
}

/** Alle Kalendertage eines Monats ("YYYY-MM") als "YYYY-MM-DD". */
export function tageDesMonats(monat: string): string[] {
  const m = MONAT_PATTERN.exec(monat);
  if (!m) throw new Error(`Ungültiger Monat: "${monat}"`);
  const anzahl = new Date(Date.UTC(+m[1], +m[2], 0)).getUTCDate();
  return Array.from({ length: anzahl }, (_, i) => `${monat}-${String(i + 1).padStart(2, "0")}`);
}

/** Monat verschieben, z.B. ("2026-01", -1) → "2025-12". */
export function verschiebeMonat(monat: string, delta: number): string {
  const m = MONAT_PATTERN.exec(monat);
  if (!m) throw new Error(`Ungültiger Monat: "${monat}"`);
  return new Date(Date.UTC(+m[1], +m[2] - 1 + delta, 1)).toISOString().slice(0, 7);
}

const uhrzeitFormat = new Intl.DateTimeFormat("de-CH", {
  timeZone: ZEITZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const UHRZEIT_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function istGueltigeUhrzeit(uhrzeit: string): boolean {
  return UHRZEIT_PATTERN.test(uhrzeit);
}

/** Kalenderdatum + Uhrzeit ("HH:MM") in Schweizer Zeit → UTC-Zeitpunkt für Dataverse. */
export function alsSchweizerZeitpunkt(datum: string, uhrzeit: string): string {
  const u = UHRZEIT_PATTERN.exec(uhrzeit);
  if (!u) throw new Error(`Ungültige Uhrzeit: "${uhrzeit}"`);
  const mitternacht = new Date(alsSchweizerMitternacht(datum)).getTime();
  // Lokale Zeit ab Mitternacht, danach Offset zum Zielzeitpunkt nachkorrigieren
  // (an den Tagen der Zeitumstellung ändert er sich im Lauf des Tages).
  const geschaetzt = mitternacht + (+u[1] * 60 + +u[2]) * 60000;
  const versatz = schweizerTeile(new Date(geschaetzt)).offset - schweizerTeile(new Date(mitternacht)).offset;
  return new Date(geschaetzt - versatz).toISOString().replace(".000Z", "Z");
}

/** Dataverse-Zeitpunkt → Uhrzeit in Schweizer Zeit ("HH:MM"). */
export function zuSchweizerUhrzeit(zeitpunkt: string): string {
  return uhrzeitFormat.format(new Date(zeitpunkt));
}

const WOCHENTAGE_LANG = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

export function wochentagName(datum: string): string {
  return WOCHENTAGE_LANG[wochentagIndex(datum)];
}

/** "2026-10" → "Oktober 2026". */
export function formatMonat(monat: string): string {
  const m = MONAT_PATTERN.exec(monat);
  return m ? `${MONATE[+m[2] - 1]} ${m[1]}` : monat;
}

/** "YYYY-MM-DD" → "dd.mm.yyyy" (ohne Zeitzonen-Umweg über Date). */
export function formatKalenderdatum(datum: string | null): string {
  if (!datum) return "—";
  const m = DATUM_PATTERN.exec(datum);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : datum;
}
