// PROJ-22: Prüfregeln für Arbeitszeit-Einträge (rein, ohne Datenzugriff) —
// gemeinsam für „Tag erfassen“ (PROJ-13) und „Eintrag bearbeiten“.

/** Mehr als 14 h am Stück gilt als unplausibel (wie in der Tagesauswertung). */
export const MAX_DAUER_MS = 14 * 60 * 60 * 1000;

export interface Intervall {
  /** Zeitpunkte (ISO). */
  kommen: string;
  gehen: string;
}

function ms(iso: string): number {
  return new Date(iso).getTime();
}

/** Zwei Intervalle [kommen, gehen) überschneiden sich (Berühren zählt nicht). */
export function ueberschneiden(a: Intervall, b: Intervall): boolean {
  return ms(a.kommen) < ms(b.gehen) && ms(b.kommen) < ms(a.gehen);
}

/** Fehlermeldung zur Dauer eines Paars, sonst `null`. */
export function pruefeDauer(kommen: string, gehen: string): string | null {
  const dauer = ms(gehen) - ms(kommen);
  if (dauer <= 0) return "„Gehen“ muss nach „Kommen“ liegen.";
  if (dauer > MAX_DAUER_MS) return "Mehr als 14 Stunden am Stück sind nicht möglich.";
  return null;
}

/** Anzeige eines Paars, z.B. "07:30–16:30" bzw. "07:30–offen". */
export function paarText(kommen: string, gehen: string | null): string {
  return `${kommen}–${gehen ?? "offen"}`;
}

/**
 * Prüft die Korrektur eines Arbeitszeit-Eintrags. `andere` sind die übrigen,
 * nicht gelöschten Arbeitszeit-Einträge desselben Tages. Gibt die erste
 * Fehlermeldung zurück, sonst `null`.
 */
export function pruefeKorrektur(p: {
  kommen: string;
  gehen: string | null;
  /** Hatte der Eintrag vorher ein Gehen? Dann darf es nicht geleert werden. */
  hatteGehen: boolean;
  jetzt: Date;
  andere: readonly { kommen: string | null; gehen: string | null }[];
}): string | null {
  if (p.gehen === null && p.hatteGehen) {
    return "„Gehen“ darf nicht leer sein — der Eintrag hatte bereits ein „Gehen“. Zum Entfernen den Eintrag löschen.";
  }
  if (p.gehen !== null) {
    const dauer = pruefeDauer(p.kommen, p.gehen);
    if (dauer) return dauer;
  }
  const jetzt = p.jetzt.getTime();
  if (ms(p.kommen) > jetzt || (p.gehen !== null && ms(p.gehen) > jetzt)) {
    return "Zeiten in der Zukunft sind nicht möglich.";
  }
  const vollstaendige = p.andere.filter((a): a is Intervall => !!a.kommen && !!a.gehen);
  const ueberschneidet =
    p.gehen !== null
      ? vollstaendige.some((a) => ueberschneiden({ kommen: p.kommen, gehen: p.gehen! }, a))
      : // Offener Eintrag: Kommen darf nicht in einem anderen Paar liegen.
        vollstaendige.some((a) => ms(a.kommen) <= ms(p.kommen) && ms(p.kommen) < ms(a.gehen));
  if (ueberschneidet) return "Die Zeiten überschneiden sich mit einem anderen Eintrag dieses Tages.";
  return null;
}
