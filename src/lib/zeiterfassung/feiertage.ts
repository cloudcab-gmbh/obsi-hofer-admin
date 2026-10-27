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

/** Vorschlag (ohne Pflege) — für Stellen ohne geladenen Kalender. */
export function feiertagAm(tag: string): string | null {
  return feiertageAargau(Number(tag.slice(0, 4))).get(tag) ?? null;
}

// ---------------------------------------------------------------------------
// PROJ-18: pflegbare Feiertage. Gepflegte Jahre (in Dataverse übernommen)
// gelten mit ihrer Liste, alle anderen Jahre mit dem Vorschlag oben.

export interface Feiertag {
  name: string;
  /** Halber Feiertag: Soll halbiert. */
  halb: boolean;
}

export interface GepflegterFeiertag extends Feiertag {
  datum: string;
}

export interface Feiertagskalender {
  /** Feiertag an einem Datum ("YYYY-MM-DD"), sonst `null`. */
  am(datum: string): Feiertag | null;
  /** Ob das Jahr gepflegt ist (sonst gilt der Vorschlag). */
  gepflegt(jahr: number): boolean;
}

/**
 * Kalender aus den gepflegten Jahren; ein gepflegtes Jahr ohne Einträge hat
 * keine Feiertage (bewusst leer gepflegt).
 */
export function baueFeiertagskalender(gepflegt: ReadonlyMap<number, readonly GepflegterFeiertag[]> = new Map()): Feiertagskalender {
  const nachDatum = new Map<string, Feiertag>();
  for (const liste of gepflegt.values()) {
    for (const f of liste) nachDatum.set(f.datum, { name: f.name, halb: f.halb });
  }
  return {
    am(tag) {
      const jahr = Number(tag.slice(0, 4));
      if (gepflegt.has(jahr)) return nachDatum.get(tag) ?? null;
      const name = feiertageAargau(jahr).get(tag);
      return name ? { name, halb: false } : null;
    },
    gepflegt: (jahr) => gepflegt.has(jahr),
  };
}

/** Kalender nur mit dem Vorschlag (Standard, wenn nichts gepflegt bzw. geladen ist). */
export const VORSCHLAGS_KALENDER = baueFeiertagskalender();

/** Vorschlag eines Jahres als Liste (für "Jahr übernehmen" und die Anzeige). */
export function vorschlagListe(jahr: number): GepflegterFeiertag[] {
  return [...feiertageAargau(jahr)].map(([datum, name]) => ({ datum, name, halb: false }));
}
