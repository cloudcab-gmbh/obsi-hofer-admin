import { describe, it, expect } from "vitest";
import { werteTagAus, type Zeiteintrag } from "./tagesauswertung";

// November 2026: Schweizer Zeit = UTC + 1 h.
function eintrag(kommen: string | null, gehen: string | null, extra: Partial<Zeiteintrag> = {}): Zeiteintrag {
  return {
    id: `e-${kommen}-${gehen}`,
    datum: "2026-11-02",
    typ: "arbeitszeit",
    kommen: kommen && `2026-11-02T${kommen}:00Z`,
    gehen: gehen && (gehen.includes("T") ? gehen : `2026-11-02T${gehen}:00Z`),
    tagestotal: null,
    monatstotal: null,
    mittagessen: false,
    abendessen: false,
    bemerkung: null,
    halberTag: false,
    ...extra,
  };
}

describe("werteTagAus", () => {
  it("sums several pairs in chronological order; gaps are breaks", () => {
    const tag = werteTagAus([eintrag("11:45", "16:15"), eintrag("06:30", "11:00")]);

    expect(tag.paare.map((p) => `${p.kommen}–${p.gehen}`)).toEqual(["07:30–12:00", "12:45–17:15"]);
    expect(tag.arbeitszeitMinuten).toBe(540);
    expect(tag.ueberschneidung).toBe(false);
  });

  it("counts overlapping time once and flags it", () => {
    const tag = werteTagAus([eintrag("07:00", "11:00"), eintrag("10:30", "12:00")]);

    expect(tag.arbeitszeitMinuten).toBe(300);
    expect(tag.ueberschneidung).toBe(true);
  });

  it("rounds to whole minutes", () => {
    const tag = werteTagAus([
      { ...eintrag(null, null), kommen: "2026-11-02T07:00:20Z", gehen: "2026-11-02T08:00:50Z" },
    ]);
    expect(tag.arbeitszeitMinuten).toBe(61);
  });

  it("excludes entries without Gehen and marks the day as open", () => {
    const tag = werteTagAus([eintrag("07:00", "11:00"), eintrag("12:00", null)]);

    expect(tag.arbeitszeitMinuten).toBe(240);
    expect(tag.offen).toBe(true);
    expect(tag.paare[1].gehen).toBeNull();
  });

  it("counts an entry over midnight fully and marks the next day", () => {
    const tag = werteTagAus([eintrag("20:00", "2026-11-03T01:00:00Z")]);

    expect(tag.arbeitszeitMinuten).toBe(300);
    expect(tag.paare[0]).toMatchObject({ kommen: "21:00", gehen: "02:00", folgetag: true });
  });

  it("excludes implausible entries (Gehen before Kommen, more than 14 h)", () => {
    const tag = werteTagAus([eintrag("10:00", "09:00"), eintrag("00:00", "2026-11-02T15:00:00Z"), eintrag("12:00", "13:00")]);

    expect(tag.arbeitszeitMinuten).toBe(60);
    expect(tag.unplausibel).toBe(true);
    expect(tag.paare.filter((p) => p.unplausibel)).toHaveLength(2);
  });

  it("sets meals for the whole day as soon as one entry has them", () => {
    const tag = werteTagAus([eintrag("07:00", "11:00", { mittagessen: true }), eintrag("12:00", "17:00", { abendessen: false })]);

    expect(tag.mittagessen).toBe(true);
    expect(tag.abendessen).toBe(false);
  });

  it("collects remarks and the highest Flow day total", () => {
    const tag = werteTagAus([
      eintrag("07:00", "11:00", { tagestotal: 240, bemerkung: " Kunde A " }),
      eintrag("12:00", "13:00", { tagestotal: 300, bemerkung: "" }),
    ]);

    expect(tag.bemerkungen).toEqual(["Kunde A"]);
    expect(tag.flowTagestotal).toBe(300);
  });

  it("flags entries of an unknown type (QA BUG-2)", () => {
    expect(werteTagAus([eintrag("07:00", "08:00", { typ: "unbekannt" })])).toMatchObject({ unbekannt: true, arbeitszeitMinuten: 0 });
  });

  it("recognises Krankheit and Komp. GLZ without counting them as working time", () => {
    const tag = werteTagAus([
      eintrag("07:00", "11:00", { typ: "komp-glz" }),
      eintrag(null, null, { typ: "krankheit" }),
    ]);

    expect(tag).toMatchObject({ krankheit: true, kompGlz: true, arbeitszeitMinuten: 0, hatArbeitszeit: false });
  });
});

describe("im Tool gelöschte Einträge (PROJ-22)", () => {
  const geloescht = { imTool: { am: "2026-11-21T09:00:00Z", von: "Robert Bienz", vorher: null, geloescht: true } };

  it("never counts them, but lists them for display", () => {
    const tag = werteTagAus([
      eintrag("06:30", "11:00", { tagestotal: 270 }),
      eintrag("11:45", "16:15", { ...geloescht, tagestotal: 540, mittagessen: true, bemerkung: "weg" }),
      eintrag("00:00", null, { ...geloescht, id: "krank", typ: "krankheit" }),
    ]);

    expect(tag.paare.map((p) => p.kommen)).toEqual(["07:30"]);
    expect(tag.arbeitszeitMinuten).toBe(270);
    expect(tag.krankheit).toBe(false);
    expect(tag.abwesenheiten).toEqual([]);
    expect(tag.mittagessen).toBe(false);
    expect(tag.bemerkungen).toEqual([]);
    expect(tag.flowTagestotal).toBe(270);
    expect(tag.geloeschte).toEqual([
      { eintragId: "e-11:45-16:15", text: "12:45–17:15", am: "2026-11-21T09:00:00Z", von: "Robert Bienz" },
      { eintragId: "krank", text: "Krankheit", am: "2026-11-21T09:00:00Z", von: "Robert Bienz" },
    ]);
  });

  it("passes remark and correction of each pair through", () => {
    const korrektur = { am: "2026-11-21T09:00:00Z", von: "Robert Bienz", vorher: "07:00–11:00", geloescht: false };
    const [paar] = werteTagAus([eintrag("06:30", "11:00", { bemerkung: " Kunde A ", imTool: korrektur })]).paare;
    expect(paar.bemerkung).toBe("Kunde A");
    expect(paar.korrektur).toEqual({ am: "2026-11-21T09:00:00Z", von: "Robert Bienz", vorher: "07:00–11:00" });
  });
});
