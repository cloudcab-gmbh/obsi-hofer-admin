// @vitest-environment node
// Echtes PDF-Rendern (pdfmake/pdfkit) braucht die Node-Umgebung — wie pdf-generator.test.ts.
import { describe, it, expect } from "vitest";
import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";
import { bauePdfDokument, versionenImMonat, zeitnachweisDateiname } from "./zeitnachweis-pdf";
import { berechneZeitnachweis, type ZeitnachweisEingabe } from "./zeitnachweis";
import { renderePdf } from "@/lib/pdf/grundlage";
import type { Arbeitstage, ArbeitsmodellVersion } from "./soll";
import type { Zeiteintrag } from "./tagesauswertung";

const MO_FR: Arbeitstage = [true, true, true, true, true, false, false];
const VOLLZEIT: ArbeitsmodellVersion = { id: "v1", gueltigAb: "2026-01-01", pensum: 100, arbeitstage: MO_FR };

function eintrag(datum: string, kommen: string, gehen: string | null, extra: Partial<Zeiteintrag> = {}): Zeiteintrag {
  return {
    id: `${datum}-${kommen}`,
    datum,
    typ: "arbeitszeit",
    kommen: `${datum}T${kommen}:00Z`,
    gehen: gehen && `${datum}T${gehen}:00Z`,
    tagestotal: 999,
    monatstotal: null,
    mittagessen: false,
    abendessen: false,
    bemerkung: null,
    halberTag: false,
    ...extra,
  };
}

function nachweis(extra: Partial<ZeitnachweisEingabe> = {}) {
  return berechneZeitnachweis({
    monat: "2026-11",
    heute: "2026-12-15",
    eintraege: [
      eintrag("2026-11-02", "06:30", "11:00", { mittagessen: true, bemerkung: "Kunde A" }),
      eintrag("2026-11-02", "11:45", "16:15"),
      eintrag("2026-11-03", "07:00", null),
      eintrag("2026-11-04", "07:00", "08:00"),
      eintrag("2026-11-04", "07:30", "09:00"), // Überschneidung — interner Hinweis, nicht im PDF
    ],
    versionen: [VOLLZEIT],
    austrittAm: null,
    startsaldoStunden: 2,
    stichtag: "2026-09-30",
    ...extra,
  });
}

function dokument(extra: Partial<Parameters<typeof bauePdfDokument>[0]> = {}): TDocumentDefinitions {
  return bauePdfDokument({
    zeitnachweis: nachweis(),
    personName: "Anna Muster",
    versionen: [VOLLZEIT],
    heute: "2026-12-15",
    erstelltVon: "Robert Bienz",
    logoDataUrl: null,
    ...extra,
  });
}

/** Alle Texte eines Dokuments (rekursiv), um Inhalte ohne PDF-Rendern zu prüfen. */
function texte(knoten: unknown): string[] {
  if (typeof knoten === "string") return [knoten];
  if (Array.isArray(knoten)) return knoten.flatMap(texte);
  if (knoten && typeof knoten === "object") return Object.values(knoten as Record<string, unknown>).flatMap(texte);
  return [];
}

function tabellenzeile(doc: TDocumentDefinitions, prefix: string): string[] {
  const tabelle = (doc.content as Content[]).find((c) => typeof c === "object" && c !== null && "table" in c) as { table: { body: { text: string }[][] } };
  return tabelle.table.body.find((zeile) => String(zeile[0].text).endsWith(prefix))!.map((z) => String(z.text));
}

describe("bauePdfDokument", () => {
  it("is A4 portrait with a repeating table header and the footer with creator", () => {
    const doc = dokument();
    expect(doc.pageSize).toBe("A4");
    expect(doc.pageOrientation).toBe("portrait");
    const fuss = texte((doc.footer as (a: number, b: number) => Content)(2, 3));
    expect(fuss).toContain("Seite 2 von 3");
    expect(fuss).toContain("Erstellt am 15.12.2026 von Robert Bienz");
  });

  it("shows head with person, month and Arbeitsmodell", () => {
    const alle = texte(dokument().content);
    expect(alle).toContain("Zeitnachweis");
    expect(alle).toContain("Anna Muster");
    expect(alle).toContain("November 2026");
    expect(alle).toContain("Arbeitsmodell: 100 % · Mo, Di, Mi, Do, Fr");
  });

  it("has one row per calendar day with the same numbers as the screen", () => {
    expect(tabellenzeile(dokument(), "02.11.")).toEqual([
      "Mo 02.11.",
      "07:30–12:00, 12:45–17:15",
      "",
      "9.00 h",
      "8.00 h",
      "+1.00 h",
      tabellenzeile(dokument(), "02.11.")[6],
      "Mittag",
      "Kunde A",
    ]);
    expect(tabellenzeile(dokument(), "07.11.")[2]).toBe("frei");
  });

  it("marks open entries as 'Gehen fehlt' and leaves internal hints out", () => {
    expect(tabellenzeile(dokument(), "03.11.")[1]).toBe("08:00–… (Gehen fehlt)");
    const alle = texte(dokument().content).join(" ");
    expect(alle).not.toMatch(/überschneiden|Tagestotal|unplausibel|vor Arbeitsmodell/);
  });

  it("shows the totals, Gleitzeit in hours and days and the Ferien", () => {
    const alle = texte(dokument().content);
    expect(alle).toContain("Saldo Vormonat");
    expect(alle).toContain("Gleitzeit Monatsende");
    expect(alle.some((t) => /Tage\)$/.test(t))).toBe(true);
    expect(alle).toContain("Feriensaldo Monatsende");
  });

  it("marks the current month as 'Stand' and adds notes for missing data", () => {
    const laufend = dokument({ zeitnachweis: nachweis({ heute: "2026-11-10" }), heute: "2026-11-10" });
    expect(texte(laufend.content)).toContain("November 2026 · Stand 10.11.2026");
    // QA BUG-1: auch ein künftiger Monat ist ein Zwischenstand
    const kuenftig = dokument({ zeitnachweis: nachweis({ heute: "2026-10-27" }), heute: "2026-10-27" });
    expect(texte(kuenftig.content)).toContain("November 2026 · Stand 27.10.2026");

    const leer = dokument({ zeitnachweis: nachweis({ eintraege: [], versionen: [], startsaldoStunden: null, stichtag: null }), versionen: [] });
    const alle = texte(leer.content);
    expect(alle).toContain("Keine Zeiteinträge in diesem Monat.");
    expect(alle).toContain("Kein Arbeitsmodell erfasst — ohne Arbeitsmodell gibt es kein Soll.");
    expect(alle).toContain("Arbeitsmodell: Kein Arbeitsmodell");
  });

  it("names every Arbeitsmodell valid in the month", () => {
    const v2 = { id: "v2", gueltigAb: "2026-11-16", pensum: 40, arbeitstage: [true, true, false, false, false, false, false] as Arbeitstage };
    expect(versionenImMonat([VOLLZEIT, v2], "2026-11").map((v) => v.id)).toEqual(["v1", "v2"]);
    expect(versionenImMonat([VOLLZEIT, v2], "2026-12").map((v) => v.id)).toEqual(["v2"]);
    expect(texte(dokument({ versionen: [VOLLZEIT, v2] }).content)).toContain(
      "Arbeitsmodell: 100 % · Mo, Di, Mi, Do, Fr (ab 01.01.2026); 40 % · Mo, Di (ab 16.11.2026)"
    );
  });
});

describe("zeitnachweisDateiname", () => {
  it("replaces characters not allowed in file names", () => {
    expect(zeitnachweisDateiname("Anna Muster", "2026-11")).toBe("Zeitnachweis Anna Muster 2026-11.pdf");
    expect(zeitnachweisDateiname('a/b:c*?"<>|', "2026-11")).toBe("Zeitnachweis a_b_c______ 2026-11.pdf");
  });
});

describe("renderePdf", () => {
  it("renders a real PDF", async () => {
    const pdf = await renderePdf(dokument());
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
  });
});
