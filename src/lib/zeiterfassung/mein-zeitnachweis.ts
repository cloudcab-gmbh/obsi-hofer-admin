// PROJ-20: Regeln für den eigenen Zeitnachweis der Mitarbeitenden (reine
// Funktionen, ohne Dataverse) — welche Monate wählbar sind und wie Bemerkungen
// angezeigt werden.

/** Wählbare Monate "JJJJ-MM" (von ≤ bis). */
export interface MonatsBereich {
  von: string;
  bis: string;
}

/**
 * Vom Monat des Auswertungsbeginns bis zum aktuellen Monat, bei Austritt
 * höchstens bis zum Austrittsmonat. Ohne Beginn (kein Arbeitsmodell) nur der
 * aktuelle Monat.
 */
export function erlaubteMonate(p: { beginn: string | null; austrittAm: string | null; heute: string }): MonatsBereich {
  const aktuell = p.heute.slice(0, 7);
  const austritt = p.austrittAm?.slice(0, 7) ?? null;
  const bis = austritt && austritt < aktuell ? austritt : aktuell;
  if (!p.beginn) return { von: aktuell, bis: aktuell };
  const beginn = p.beginn.slice(0, 7);
  // Beginn nach dem Austritt oder in der Zukunft: nur der späteste erlaubte Monat.
  return beginn > bis ? { von: bis, bis } : { von: beginn, bis };
}

/** Setzt einen Monat ausserhalb des Bereichs auf den nächstgelegenen erlaubten Monat. */
export function begrenzeMonat(monat: string | null, bereich: MonatsBereich): string {
  if (!monat) return bereich.bis;
  if (monat < bereich.von) return bereich.von;
  if (monat > bereich.bis) return bereich.bis;
  return monat;
}

/** Herkunftsvermerk der importierten Einträge (PROJ-19), für Mitarbeitende ausgeblendet. */
const HERKUNFT = "aus SharePoint";

/** Bemerkung ohne den Vermerk „aus SharePoint“; `null`, wenn nichts übrig bleibt. */
export function ohneHerkunftsvermerk(bemerkung: string): string | null {
  const rest = bemerkung === HERKUNFT ? "" : bemerkung.endsWith(` · ${HERKUNFT}`) ? bemerkung.slice(0, -(HERKUNFT.length + 3)) : bemerkung;
  return rest.trim() || null;
}
