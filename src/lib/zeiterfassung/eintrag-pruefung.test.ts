import { describe, it, expect } from "vitest";
import { paarText, pruefeDauer, pruefeKorrektur, ueberschneiden } from "./eintrag-pruefung";

const JETZT = new Date("2026-11-22T12:00:00Z");
const t = (hhmm: string) => `2026-11-20T${hhmm}:00Z`;

describe("eintrag-pruefung (PROJ-22)", () => {
  it("treats touching intervals as not overlapping", () => {
    expect(ueberschneiden({ kommen: t("07:00"), gehen: t("12:00") }, { kommen: t("12:00"), gehen: t("13:00") })).toBe(false);
    expect(ueberschneiden({ kommen: t("07:00"), gehen: t("12:01") }, { kommen: t("12:00"), gehen: t("13:00") })).toBe(true);
  });

  it("checks duration", () => {
    expect(pruefeDauer(t("08:00"), t("08:00"))).toBe("„Gehen“ muss nach „Kommen“ liegen.");
    expect(pruefeDauer(t("06:00"), t("20:01"))).toBe("Mehr als 14 Stunden am Stück sind nicht möglich.");
    expect(pruefeDauer(t("06:00"), t("20:00"))).toBeNull();
  });

  it("formats pairs", () => {
    expect(paarText("07:30", "16:30")).toBe("07:30–16:30");
    expect(paarText("07:30", null)).toBe("07:30–offen");
  });

  const basis = { hatteGehen: true, jetzt: JETZT, andere: [] };

  it("accepts a valid correction", () => {
    expect(pruefeKorrektur({ ...basis, kommen: t("07:00"), gehen: t("16:00") })).toBeNull();
  });

  it("rejects clearing an existing Gehen but allows leaving an open entry open", () => {
    expect(pruefeKorrektur({ ...basis, kommen: t("07:00"), gehen: null })).toMatch(/darf nicht leer sein/);
    expect(pruefeKorrektur({ ...basis, hatteGehen: false, kommen: t("07:00"), gehen: null })).toBeNull();
  });

  it("rejects times in the future", () => {
    expect(pruefeKorrektur({ ...basis, kommen: "2026-11-22T11:00:00Z", gehen: "2026-11-22T13:00:00Z" })).toBe(
      "Zeiten in der Zukunft sind nicht möglich."
    );
  });

  it("rejects overlaps with other complete entries, also for open entries", () => {
    const andere = [{ kommen: t("12:00"), gehen: t("16:00") }, { kommen: t("17:00"), gehen: null }];
    expect(pruefeKorrektur({ ...basis, andere, kommen: t("07:00"), gehen: t("12:30") })).toMatch(/überschneiden sich/);
    expect(pruefeKorrektur({ ...basis, andere, kommen: t("07:00"), gehen: t("12:00") })).toBeNull();
    expect(pruefeKorrektur({ ...basis, andere, hatteGehen: false, kommen: t("13:00"), gehen: null })).toMatch(/überschneiden sich/);
    // Offene andere Einträge zählen nicht (wie bei „Tag erfassen“).
    expect(pruefeKorrektur({ ...basis, andere, kommen: t("16:30"), gehen: t("18:00") })).toBeNull();
  });
});
