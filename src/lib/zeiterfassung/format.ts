import type { FerienPlan } from "./ferien";

// PROJ-13: Anzeige von Minuten als Stunden mit zwei Nachkommastellen.

/** Gleitzeit-Tage = Stunden ÷ 8 (wie in der bisherigen Excel-Mappe). */
const STUNDEN_PRO_TAG = 8;

export function formatMinuten(minuten: number): string {
  return `${(minuten / 60).toFixed(2)} h`;
}

/** Mit Vorzeichen, z.B. "+1.50 h", "-0.25 h", "0.00 h". */
export function formatMinutenMitVorzeichen(minuten: number): string {
  const text = formatMinuten(minuten);
  return minuten > 0 ? `+${text}` : text;
}

/** PROJ-15: z.B. "1 Ferientag", "7.5 Ferientage" (von Server- und Client-Komponenten genutzt). */
export function formatFerientage(tage: number): string {
  return tage === 1 ? "1 Ferientag" : `${tage} Ferientage`;
}

/** Übersprungene Tage einer Ferien-Vorschau, z.B. "2 Feiertage, 1 bereits Ferien" (leer = keine). */
export function uebersprungenText(plan: FerienPlan): string {
  const u = plan.uebersprungen;
  return [
    u.feiertag && `${u.feiertag} Feiertag${u.feiertag === 1 ? "" : "e"}`,
    u.ohneSoll && `${u.ohneSoll} ohne Soll (Wochenende/frei)`,
    u.bereitsFerien && `${u.bereitsFerien} bereits Ferien`,
    u.ohneArbeitsmodell && `${u.ohneArbeitsmodell} ohne Arbeitsmodell`,
  ]
    .filter(Boolean)
    .join(", ");
}

/** Text der Vorschau, z.B. "ergibt 8 Ferientage; übersprungen: 2 Feiertage, 1 bereits Ferien". */
export function vorschauText(plan: FerienPlan): string {
  const uebersprungen = uebersprungenText(plan);
  return `ergibt ${formatFerientage(plan.ferientage)}${uebersprungen ? `; übersprungen: ${uebersprungen}` : ""}`;
}

export function formatGleitzeitTage(minuten: number): string {
  const tage = minuten / 60 / STUNDEN_PRO_TAG;
  return `${tage > 0 ? "+" : ""}${tage.toFixed(2)} Tage`;
}
