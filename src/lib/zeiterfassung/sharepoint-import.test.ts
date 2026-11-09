import { describe, expect, it } from "vitest";
import { bildeZeileAb, leseSharePointCsv, parseCsv, planeImport, type SharePointZeile } from "./sharepoint-import";

function zeile(teil: Partial<SharePointZeile>): SharePointZeile {
  return {
    Title: "max.muster@obsi-hofer.ch",
    AktivitaetsDatum: "05.11.2026 07:00",
    AZNetto: "8,50",
    AStart: "05.11.2026 07:00",
    AEnde: "05.11.2026 16:00",
    PStart: "05.11.2026 12:00",
    PEnde: "05.11.2026 12:30",
    Mittagessen: "True",
    Bemerkung: "",
    ID: "1559",
    Aktivitaetstyp: "Arbeitszeit",
    ...teil,
  };
}

describe("parseCsv / leseSharePointCsv", () => {
  it("liest Anführungszeichen, leere Felder, BOM und Zeilenumbrüche", () => {
    expect(parseCsv('﻿"a","b,c",,"d""e"\r\n"1","2","3","4"\n')).toEqual([
      ["a", "b,c", "", 'd"e'],
      ["1", "2", "3", "4"],
    ]);
  });

  it("findet Spalten über die Überschrift, unabhängig von der Reihenfolge", () => {
    const csv =
      '"ID","Title","AktivitaetsDatum","AZNetto","AStart","AEnde","PStart","PEnde","Mittagessen","Bemerkung","Aktivitaetstyp","zeitrecid"\n' +
      '"7","a@b.ch","01.01.2026 07:00","1,00","01.01.2026 07:00","01.01.2026 08:00",,,"False",,"Arbeitszeit","x"\n';
    const [z] = leseSharePointCsv(csv);
    expect(z.ID).toBe("7");
    expect(z.Title).toBe("a@b.ch");
    expect(z.PStart).toBe("");
  });

  it("bricht ab, wenn eine Pflichtspalte fehlt", () => {
    expect(() => leseSharePointCsv('"Title","ID"\n"a","1"\n')).toThrow(/Spalten fehlen/);
  });
});

describe("bildeZeileAb", () => {
  it("teilt einen Tag mit Pause in zwei Einträge (Winterzeit = UTC+1)", () => {
    const r = bildeZeileAb(zeile({}));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.eintraege).toEqual([
      expect.objectContaining({ kommen: "2026-11-05T06:00:00Z", gehen: "2026-11-05T11:00:00Z", mittagessen: true, sharepointId: 1559, datum: "2026-11-05" }),
      expect.objectContaining({ kommen: "2026-11-05T11:30:00Z", gehen: "2026-11-05T15:00:00Z", mittagessen: false, bemerkung: null }),
    ]);
    expect(r.hinweise).toEqual([]);
  });

  it("rechnet im Sommer mit UTC+2", () => {
    const r = bildeZeileAb(zeile({ AStart: "01.07.2026 07:00", AEnde: "01.07.2026 08:00", PStart: "", PEnde: "", AZNetto: "1,00" }));
    expect(r.ok && r.eintraege[0].kommen).toBe("2026-07-01T05:00:00Z");
  });

  it("schreibt E-Mail klein und Bemerkung nur auf den ersten Eintrag", () => {
    const r = bildeZeileAb(zeile({ Title: "Max.Muster@OBSI-Hofer.ch", Bemerkung: "Kunde X" }));
    expect(r.ok && r.eintraege.map((x) => [x.email, x.bemerkung])).toEqual([
      ["max.muster@obsi-hofer.ch", "Kunde X"],
      ["max.muster@obsi-hofer.ch", null],
    ]);
  });

  it.each([
    ["leer", "", ""],
    ["gleich", "05.11.2026 12:00", "05.11.2026 12:00"],
    ["Platzhalter 00:00", "05.11.2026 00:00", "05.11.2026 00:00"],
    ["Platzhalter 01:00", "05.11.2026 01:00", "05.11.2026 01:00"],
    ["nur PStart", "05.11.2026 00:00", ""],
  ])("ohne Pause (%s) → ein Eintrag AStart→AEnde", (_, PStart, PEnde) => {
    const r = bildeZeileAb(zeile({ PStart, PEnde, AZNetto: "9,00" }));
    expect(r.ok && r.eintraege.map((x) => [x.kommen, x.gehen])).toEqual([["2026-11-05T06:00:00Z", "2026-11-05T15:00:00Z"]]);
  });

  it("Pause endet genau bei AEnde → ein Eintrag AStart→PStart", () => {
    const r = bildeZeileAb(zeile({ AEnde: "05.11.2026 12:30", AZNetto: "5,00" }));
    expect(r.ok && r.eintraege.map((x) => [x.kommen, x.gehen])).toEqual([["2026-11-05T06:00:00Z", "2026-11-05T11:00:00Z"]]);
  });

  it("AEnde am Folgetag wird übernommen", () => {
    const r = bildeZeileAb(zeile({ AStart: "05.11.2026 16:00", AEnde: "06.11.2026 00:00", PStart: "", PEnde: "", AZNetto: "8,00" }));
    expect(r.ok && r.eintraege[0].gehen).toBe("2026-11-05T23:00:00Z");
  });

  it.each([
    ["Typ leer = Arbeitszeit", { Aktivitaetstyp: "" }, true],
    ["Typ Krankheit", { Aktivitaetstyp: "Krankheit" }, "Typ Krankheit"],
    ["Typ Komp. GLZ", { Aktivitaetstyp: "Komp. GLZ" }, "Typ Komp. GLZ"],
    ["kein AEnde", { AEnde: "" }, "kein AEnde (offen)"],
    ["kein AStart", { AStart: "" }, "kein AStart"],
    ["nur AZNetto", { AStart: "", AEnde: "", PStart: "", PEnde: "" }, "nur AZNetto, keine Uhrzeiten"],
    ["AEnde 00:00 am selben Tag", { AEnde: "05.11.2026 00:00" }, "AEnde vor oder gleich AStart"],
    ["AEnde = AStart", { AEnde: "05.11.2026 07:00" }, "AEnde vor oder gleich AStart"],
    ["PEnde vor PStart", { PStart: "05.11.2026 12:30", PEnde: "05.11.2026 12:00" }, "Pause unplausibel"],
    ["Pause nach AEnde", { PStart: "05.11.2026 16:30", PEnde: "05.11.2026 17:00" }, "Pause unplausibel"],
    ["Pause beginnt vor AStart, endet danach", { PStart: "05.11.2026 00:00", PEnde: "05.11.2026 12:00" }, "Pause unplausibel"],
    ["leere Zeile", { Title: "", AktivitaetsDatum: "" }, "ohne E-Mail oder Datum"],
    ["ohne ID", { ID: "" }, "ohne gültige SharePoint-ID"],
  ])("%s", (_, teil, erwartet) => {
    const r = bildeZeileAb(zeile(teil));
    if (erwartet === true) expect(r.ok).toBe(true);
    else expect(r).toEqual({ ok: false, grund: erwartet });
  });

  it("lässt ausgeschlossene Personen weg (Gross-/Kleinschreibung egal)", () => {
    const r = bildeZeileAb(zeile({ Title: "Erika.Muster@obsi-hofer.ch" }), new Set(["erika.muster@obsi-hofer.ch"]));
    expect(r).toEqual({ ok: false, grund: "Person ausgeschlossen" });
  });

  it("meldet abweichendes AZNetto und Spanne über 14 h als Hinweis, importiert aber", () => {
    const r = bildeZeileAb(zeile({ AStart: "05.11.2026 06:00", AEnde: "05.11.2026 21:00", AZNetto: "15,00" }));
    expect(r.ok).toBe(true);
    expect(r.ok && r.hinweise).toEqual(["Spanne über 14 h", "AZNetto 15,00 h weicht von den Uhrzeiten ab (14.50 h)"]);
  });

  it("AZNetto innerhalb 1 Minute gilt nicht als Abweichung", () => {
    const r = bildeZeileAb(zeile({ AZNetto: "8,49" }));
    expect(r.ok && r.hinweise).toEqual([]);
  });
});

describe("planeImport", () => {
  it("sammelt Einträge, weggelassene Zeilen und Hinweise; Duplikat-Tag: nur die gültige Zeile zählt", () => {
    const plan = planeImport([
      zeile({ ID: "1" }),
      zeile({ ID: "2", AEnde: "" }),
      zeile({ ID: "3", PStart: "", PEnde: "", AZNetto: "1,00" }),
    ]);
    expect(plan.eintraege.map((e) => e.sharepointId)).toEqual([1, 1, 3]);
    expect(plan.weggelassen.map((w) => [w.zeile.ID, w.grund])).toEqual([["2", "kein AEnde (offen)"]]);
    expect(plan.hinweise.map((h) => h.zeile.ID)).toEqual(["3"]);
  });
});
