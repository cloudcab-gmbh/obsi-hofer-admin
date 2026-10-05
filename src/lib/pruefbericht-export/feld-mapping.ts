// Ordnet die Spaltenüberschriften einer (beliebigen, kundenspezifischen)
// Excel-Vorlage den bekannten Datenfeldern zu. Reale Vorlagen verwenden
// unterschiedliche Schreibweisen für dieselbe Spalte (z.B. "Zubehör" vs.
// "Zubehoer", "Ablegereife" vs. "Ablege- reife" mit Zeilenumbruch) — siehe
// PROJ-7-Spec, Open Questions. Deshalb: robuste Normalisierung +
// Schlüsselwort-Suche statt exaktem String-Vergleich.

export type ExportFeld =
  | "lagerort"
  | "invNr"
  | "artikel"
  | "typ"
  | "dimension"
  | "serienummer"
  | "barcode"
  | "hersteller"
  | "herstelljahr"
  | "erstgebrauch"
  | "ablegereife"
  | "zubehoer"
  | "kundenId"
  | "geprueft"
  | "pruefer"
  | "pruefergebnis"
  | "bemerkungen";

export interface ExportZeile {
  lagerort: string | null;
  invNr: string | null;
  artikel: string | null;
  typ: string | null;
  dimension: string | null;
  serienummer: string | null;
  barcode: string | null;
  hersteller: string | null;
  herstelljahr: string | null;
  erstgebrauch: string | null;
  ablegereife: string | null;
  zubehoer: string | null;
  kundenId: string | null;
  geprueft: string | null;
  pruefer: string | null;
  pruefergebnis: string | null;
  bemerkungen: string | null;
}

export function normalizeHeader(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]/g, "");
}

// Reihenfolge ist bewusst spezifisch → generisch: "Prüfergebnis" muss vor
// "Prüfer" geprüft werden, sonst würde "pruefer" (als Teilstring von
// "pruefergebnis") die falsche Spalte beanspruchen; "Herstelljahr" vor
// "Hersteller" aus demselben Grund (hier zusätzlich per exaktem Vergleich
// abgesichert).
const FELD_MATCHER: { feld: ExportFeld; test: (normalized: string) => boolean }[] = [
  { feld: "pruefergebnis", test: (n) => n.includes("pruefergebnis") },
  { feld: "pruefer", test: (n) => n === "pruefer" },
  { feld: "geprueft", test: (n) => n.includes("geprueft") },
  { feld: "bemerkungen", test: (n) => n.includes("bemerkung") },
  { feld: "herstelljahr", test: (n) => n.includes("herstelljahr") },
  { feld: "erstgebrauch", test: (n) => n.includes("erstgebrauch") },
  { feld: "ablegereife", test: (n) => n.includes("ablegereife") },
  { feld: "zubehoer", test: (n) => n.includes("zubehoer") },
  { feld: "hersteller", test: (n) => n.includes("hersteller") },
  { feld: "serienummer", test: (n) => n.includes("serien") },
  { feld: "barcode", test: (n) => n.includes("scancode") || n === "barcode" },
  { feld: "invNr", test: (n) => n.includes("invnr") || n.includes("inventarnr") },
  { feld: "kundenId", test: (n) => n.includes("kundenid") },
  { feld: "lagerort", test: (n) => n.includes("lagerort") || n.includes("einbauort") },
  { feld: "dimension", test: (n) => n === "dim" || n.includes("dimension") },
  { feld: "typ", test: (n) => n === "typ" },
  { feld: "artikel", test: (n) => n === "artikel" || n.includes("artikelbezeichnung") },
];

/**
 * Ordnet jeder Spalte (1-indiziert, wie in Excel) höchstens ein bekanntes
 * Datenfeld zu. Nicht erkannte Spalten (z.B. "Pic1") bleiben unberücksichtigt
 * und damit beim Export unverändert.
 */
export function resolveSpaltenMapping(headerZellen: (string | null)[]): Map<number, ExportFeld> {
  const mapping = new Map<number, ExportFeld>();
  const vergebeneFelder = new Set<ExportFeld>();

  headerZellen.forEach((zelle, index) => {
    if (!zelle) return;
    const normalized = normalizeHeader(zelle);
    const treffer = FELD_MATCHER.find((m) => !vergebeneFelder.has(m.feld) && m.test(normalized));
    if (treffer) {
      mapping.set(index + 1, treffer.feld);
      vergebeneFelder.add(treffer.feld);
    }
  });

  return mapping;
}
