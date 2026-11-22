import { formatKalenderdatum, zuSchweizerDatum } from "./datum";
import type { Tagesauswertung } from "./tagesauswertung";
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

function kurzDatum(iso: string): string | null {
  const datum = zuSchweizerDatum(iso || null);
  return datum ? formatKalenderdatum(datum).slice(0, 6) : null;
}

/**
 * PROJ-22: Markierung der im Tool korrigierten bzw. gelöschten Einträge eines
 * Tages. Freigeber sehen Datum, Name und frühere Zeiten; Mitarbeitende (und das
 * PDF) nur „korrigiert“ — gelöschte Einträge erscheinen für sie gar nicht.
 */
export function korrekturTexte(a: Pick<Tagesauswertung, "paare" | "geloeschte">, nurLesen: boolean): string[] {
  const korrigierte = a.paare.filter((p) => p.korrektur !== null);
  if (nurLesen) return korrigierte.length > 0 ? ["korrigiert"] : [];
  const texte = korrigierte.map((p) => {
    const k = p.korrektur!;
    return ["korrigiert", kurzDatum(k.am), k.von && `von ${k.von}`, k.vorher && `(vorher ${k.vorher})`].filter(Boolean).join(" ");
  });
  for (const g of a.geloeschte) {
    texte.push([`${g.text} gelöscht`, kurzDatum(g.am), g.von && `von ${g.von}`].filter(Boolean).join(" "));
  }
  return [...new Set(texte)];
}
