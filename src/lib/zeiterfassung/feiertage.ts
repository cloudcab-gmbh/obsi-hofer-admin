// PROJ-13: gesetzliche Feiertage Aargau gemäss bisheriger Excel-Liste,
// pro Jahr berechnet (Product Decision 2026-10-26). 1. Mai und Fronleichnam
// sind offen (Open Questions) und deshalb nicht enthalten.

function datum(jahr: number, monat: number, tag: number): string {
  return new Date(Date.UTC(jahr, monat - 1, tag)).toISOString().slice(0, 10);
}

/** Ostersonntag nach der gregorianischen Osterformel (Meeus/Jones/Butcher). */
export function ostersonntag(jahr: number): string {
  const a = jahr % 19;
  const b = Math.floor(jahr / 100);
  const c = jahr % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const monat = Math.floor((h + l - 7 * m + 114) / 31);
  const tag = ((h + l - 7 * m + 114) % 31) + 1;
  return datum(jahr, monat, tag);
}

function plusTage(iso: string, tage: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + tage);
  return d.toISOString().slice(0, 10);
}

const cache = new Map<number, Map<string, string>>();

/** Feiertage eines Jahres: Datum ("YYYY-MM-DD") → Name. */
export function feiertageAargau(jahr: number): Map<string, string> {
  const vorhanden = cache.get(jahr);
  if (vorhanden) return vorhanden;
  const ostern = ostersonntag(jahr);
  const feiertage = new Map<string, string>([
    [datum(jahr, 1, 1), "Neujahr"],
    [datum(jahr, 1, 2), "Berchtoldstag"],
    [plusTage(ostern, -2), "Karfreitag"],
    [plusTage(ostern, 1), "Ostermontag"],
    [plusTage(ostern, 39), "Auffahrt"],
    [plusTage(ostern, 50), "Pfingstmontag"],
    [datum(jahr, 8, 1), "Bundesfeiertag"],
    [datum(jahr, 12, 25), "Weihnachten"],
    [datum(jahr, 12, 26), "Stephanstag"],
  ]);
  cache.set(jahr, feiertage);
  return feiertage;
}

export function feiertagAm(tag: string): string | null {
  return feiertageAargau(Number(tag.slice(0, 4))).get(tag) ?? null;
}
