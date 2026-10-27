import type { Tageszeile } from "./zeitnachweis";

// Beschriftung eines Tages (Spalte "Art") — gemeinsam für den Zeitnachweis am
// Bildschirm (PROJ-13) und das PDF (PROJ-16), damit beide gleich lauten.

/** Hauptgrund des Tages, z.B. "Krankheit", "Feiertag: Auffahrt", "½ Ferien", "frei". */
export function grundText(t: Tageszeile): string | null {
  if (t.auswertung.krankheit) return "Krankheit";
  if (t.auswertung.kompGlz) return "Komp. GLZ";
  if (t.ferientag === 0.5) return "½ Ferien";
  switch (t.grund?.art) {
    case "feiertag":
      return `Feiertag: ${t.grund.name}`;
    case "ferien":
      return "Ferien";
    case "frei":
      return "frei";
    case "kein-arbeitsmodell":
      return "kein Arbeitsmodell";
    case "nicht-angestellt":
      return "nicht angestellt";
    default:
      return null;
  }
}

/** Alle Beschriftungen eines Tages inkl. halbem Feiertag (PROJ-18) und Kennzeichnung "Frei" (PROJ-15). */
export function artTexte(t: Tageszeile): string[] {
  return [grundText(t), t.halberFeiertag && `½ Feiertag: ${t.halberFeiertag}`, t.auswertung.frei && "Frei"].filter(
    (x): x is string => !!x
  );
}
