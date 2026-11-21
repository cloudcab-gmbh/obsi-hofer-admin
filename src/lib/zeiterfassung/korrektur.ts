// PROJ-21: Regeln für Korrektur-Anfragen (reine Funktionen, ohne Dataverse) —
// welche Tage angefragt werden dürfen, wie die bisherigen Zeiten eines Tages
// beschrieben werden und wie Anfragen pro Tag angezeigt werden.

import { artTexte } from "./anzeige";
import { tageDesMonats, verschiebeMonat } from "./datum";
import type { MonatsBereich } from "./mein-zeitnachweis";
import type { Tageszeile } from "./zeitnachweis";

export type AnfrageStatus = "offen" | "erledigt";

export interface KorrekturAnfrage {
  id: string;
  /** Betroffener Tag "JJJJ-MM-TT". */
  datum: string;
  nachricht: string;
  status: AnfrageStatus;
  /** Zeitpunkt der Anfrage (ISO). */
  erstelltAm: string;
}

export const NACHRICHT_MAX = 1000;

/** Erster und letzter Tag ("JJJJ-MM-TT"), für die eine Anfrage gestellt werden darf. */
export interface AnfrageZeitraum {
  von: string;
  bis: string;
}

/**
 * Aktueller und vorheriger Monat bis und mit heute (Nutzer-Entscheid:
 * ältere Monate sind nach der Lohnabrechnung abgeschlossen), geschnitten mit
 * den sichtbaren Monaten aus PROJ-20. `null`, wenn kein Tag übrig bleibt.
 */
export function anfrageZeitraum(heute: string, bereich: MonatsBereich): AnfrageZeitraum | null {
  const vormonat = verschiebeMonat(heute.slice(0, 7), -1);
  const von = [`${vormonat}-01`, `${bereich.von}-01`].sort().at(-1)!;
  const bis = [heute, tageDesMonats(bereich.bis).at(-1)!].sort()[0];
  return von <= bis ? { von, bis } : null;
}

export function darfAnfragen(datum: string, zeitraum: AnfrageZeitraum | null): boolean {
  return !!zeitraum && datum >= zeitraum.von && datum <= zeitraum.bis;
}

/** Hat der Monat mindestens einen Tag, für den angefragt werden darf? */
export function monatAnfragbar(monat: string, zeitraum: AnfrageZeitraum | null): boolean {
  return !!zeitraum && monat >= zeitraum.von.slice(0, 7) && monat <= zeitraum.bis.slice(0, 7);
}

/** Beschreibung des Tages für die Anfrage, z.B. "07:30–12:00, 12:30–17:00" oder "keine Einträge · Ferien". */
export function bisherigeZeiten(t: Tageszeile): string {
  const paare = t.auswertung.paare.map((p) => `${p.kommen}–${p.gehen ?? "offen"}${p.folgetag ? " (+1)" : ""}`);
  const teile = [paare.length > 0 ? paare.join(", ") : "keine Einträge", ...artTexte(t)];
  return teile.join(" · ").slice(0, 200);
}

/** Anfragen pro Tag, neueste zuerst. */
export function anfragenProTag(anfragen: readonly KorrekturAnfrage[]): Record<string, KorrekturAnfrage[]> {
  const proTag: Record<string, KorrekturAnfrage[]> = {};
  for (const a of anfragen) (proTag[a.datum] ??= []).push(a);
  for (const liste of Object.values(proTag)) liste.sort((x, y) => y.erstelltAm.localeCompare(x.erstelltAm));
  return proTag;
}

/** Prüft die Nachricht; `null` = in Ordnung, sonst die Fehlermeldung. */
export function pruefeNachricht(nachricht: unknown): string | null {
  if (typeof nachricht !== "string" || nachricht.trim() === "") return "Bitte eine Nachricht eingeben.";
  if (nachricht.length > NACHRICHT_MAX) return `Die Nachricht darf höchstens ${NACHRICHT_MAX} Zeichen lang sein.`;
  return null;
}
