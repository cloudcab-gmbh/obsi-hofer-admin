import { describe, it, expect } from "vitest";
import { normalizeHeader, resolveSpaltenMapping } from "./feld-mapping";

describe("normalizeHeader", () => {
  it("lowercases, maps umlauts to their ASCII digraphs and strips non-alphanumeric characters", () => {
    expect(normalizeHeader("Zubehör")).toBe("zubehoer");
    expect(normalizeHeader("Zubehoer")).toBe("zubehoer");
    expect(normalizeHeader("Herstell- jahr")).toBe("herstelljahr");
    expect(normalizeHeader("Prüfergebnis")).toBe("pruefergebnis");
  });
});

describe("resolveSpaltenMapping", () => {
  // Reale Kopfzeile aus der 2026er-Vorlage (Rehaklinik Bellikon, siehe PROJ-7-Spec).
  it("maps the 2026-style header row (separate Lagerort/Inv.Nr. columns)", () => {
    const header = [
      "Einbau- / Lagerort",
      "Inv.Nr.",
      "Artikel",
      "Typ",
      "Dim.",
      "Serien-Nr.",
      "Scancode",
      "Hersteller",
      "Herstelljahr",
      "Erstgebrauch",
      "Ablegereife",
      "Zubehör",
      "Geprüft",
      "Prüfer",
      "Prüfergebnis",
      "Bemerkungen",
    ];

    const mapping = resolveSpaltenMapping(header);

    expect(mapping.get(1)).toBe("lagerort");
    expect(mapping.get(2)).toBe("invNr");
    expect(mapping.get(3)).toBe("artikel");
    expect(mapping.get(4)).toBe("typ");
    expect(mapping.get(5)).toBe("dimension");
    expect(mapping.get(6)).toBe("serienummer");
    expect(mapping.get(7)).toBe("barcode");
    expect(mapping.get(8)).toBe("hersteller");
    expect(mapping.get(9)).toBe("herstelljahr");
    expect(mapping.get(10)).toBe("erstgebrauch");
    expect(mapping.get(11)).toBe("ablegereife");
    expect(mapping.get(12)).toBe("zubehoer");
    expect(mapping.get(13)).toBe("geprueft");
    expect(mapping.get(14)).toBe("pruefer");
    expect(mapping.get(15)).toBe("pruefergebnis");
    expect(mapping.get(16)).toBe("bemerkungen");
  });

  // Reale Kopfzeile aus der 2021er-Vorlage (kombinierte Lagerort-Spalte, kein Inv.Nr., ASCII-Zubehoer, zusätzliche "Pic1"-Spalte).
  it("maps the 2021-style header row and ignores an unrecognized trailing column", () => {
    const header = [
      "Lager- oder Einbauort",
      "Artikel",
      "Typ",
      "Dim.",
      "Serien-Nr.",
      "Scancode",
      "Hersteller",
      "Herstell- jahr",
      "Erst- gebrauch",
      "Ablege- reife",
      "Zubehoer",
      "Geprüft",
      "Prüfer",
      "Prüfergebnis",
      "Bemerkungen",
      "Pic1",
    ];

    const mapping = resolveSpaltenMapping(header);

    expect(mapping.get(1)).toBe("lagerort");
    expect(mapping.get(2)).toBe("artikel");
    expect(mapping.get(8)).toBe("herstelljahr");
    expect(mapping.get(9)).toBe("erstgebrauch");
    expect(mapping.get(10)).toBe("ablegereife");
    expect(mapping.get(11)).toBe("zubehoer");
    expect(mapping.get(13)).toBe("pruefer");
    expect(mapping.get(14)).toBe("pruefergebnis");
    expect(mapping.has(16)).toBe(false); // "Pic1" bleibt unerkannt
    expect(mapping.has(2 /* Inv.Nr. */)).toBe(true); // hier ist Spalte 2 "Artikel", keine eigene Inv.Nr.-Spalte vorhanden
    expect(Array.from(mapping.values())).not.toContain("invNr");
  });

  it("never assigns the same field to two different columns", () => {
    const header = ["Prüfer", "Prüfergebnis", "Prüfer"];

    const mapping = resolveSpaltenMapping(header);

    expect(mapping.get(1)).toBe("pruefer");
    expect(mapping.get(2)).toBe("pruefergebnis");
    expect(mapping.has(3)).toBe(false);
  });

  it("ignores empty header cells", () => {
    const mapping = resolveSpaltenMapping([null, "Artikel", "", "Prüfergebnis"]);

    expect(mapping.has(1)).toBe(false);
    expect(mapping.has(3)).toBe(false);
    expect(mapping.get(2)).toBe("artikel");
    expect(mapping.get(4)).toBe("pruefergebnis");
  });
});
