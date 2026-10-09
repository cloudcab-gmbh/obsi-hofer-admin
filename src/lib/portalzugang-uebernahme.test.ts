import { describe, it, expect } from "vitest";
import { planeUebernahme } from "./portalzugang-uebernahme";

const basis = {
  freigegebeneKontakte: [{ id: "k1", name: "Max Muster" }],
  relationen: [{ kontaktId: "k1", firmaId: "f1" }],
  standorte: [
    { id: "s1", name: "Pratteln", firmaId: "f1" },
    { id: "s2", name: "Boningen", firmaId: "f1" },
    { id: "s9", name: "Fremd", firmaId: "f9" },
  ],
  bestehendeZugaenge: [],
};

describe("planeUebernahme", () => {
  it("grants every released contact access to all Standorte of its Firma", () => {
    const plan = planeUebernahme(basis);
    expect(plan.anzulegen).toEqual([
      { kontaktId: "k1", standortId: "s1", name: "Max Muster – Pratteln" },
      { kontaktId: "k1", standortId: "s2", name: "Max Muster – Boningen" },
    ]);
  });

  it("covers all Firmen of a contact (several Bexio relations)", () => {
    const plan = planeUebernahme({ ...basis, relationen: [...basis.relationen, { kontaktId: "k1", firmaId: "f9" }] });
    expect(plan.anzulegen.map((z) => z.standortId)).toEqual(["s1", "s2", "s9"]);
  });

  it("skips existing Portalzugänge, so it can be run again without duplicates", () => {
    const plan = planeUebernahme({ ...basis, bestehendeZugaenge: [{ kontaktId: "k1", standortId: "s1" }] });
    expect(plan.anzulegen.map((z) => z.standortId)).toEqual(["s2"]);
    expect(plan.bereitsVorhanden).toBe(1);

    const zweiterLauf = planeUebernahme({
      ...basis,
      bestehendeZugaenge: [
        { kontaktId: "k1", standortId: "s1" },
        { kontaktId: "k1", standortId: "s2" },
      ],
    });
    expect(zweiterLauf.anzulegen).toEqual([]);
  });

  it("does not plan the same access twice when a contact has two relations to the same Firma", () => {
    const plan = planeUebernahme({ ...basis, relationen: [...basis.relationen, { kontaktId: "k1", firmaId: "f1" }] });
    expect(plan.anzulegen).toHaveLength(2);
  });

  it("reports released contacts without Firma or without Standort instead of failing", () => {
    const plan = planeUebernahme({
      freigegebeneKontakte: [
        { id: "k1", name: "Ohne Firma" },
        { id: "k2", name: "Ohne Standort" },
      ],
      relationen: [{ kontaktId: "k2", firmaId: "f-leer" }],
      standorte: [],
      bestehendeZugaenge: [],
    });
    expect(plan.anzulegen).toEqual([]);
    expect(plan.kontakteOhneFirma).toEqual(["Ohne Firma"]);
    expect(plan.kontakteOhneStandort).toEqual(["Ohne Standort"]);
  });

  it("ignores contacts that are not released today", () => {
    expect(planeUebernahme({ ...basis, freigegebeneKontakte: [] }).anzulegen).toEqual([]);
  });
});
