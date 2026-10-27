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

export function formatGleitzeitTage(minuten: number): string {
  const tage = minuten / 60 / STUNDEN_PRO_TAG;
  return `${tage > 0 ? "+" : ""}${tage.toFixed(2)} Tage`;
}
