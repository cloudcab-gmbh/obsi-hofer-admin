import { describe, it, expect } from "vitest";
import { wurdeBereitsUebertragen } from "./sync-lauf-regeln";
import type { SyncLauf } from "@/lib/dataverse/sync-laeufe";
import type { SyncStatus } from "@/lib/kundenportal-sync";

const lauf = (status: SyncStatus) =>
  ({ id: status, firmaId: "f", standortId: null, gestartetAm: "", dauerSekunden: 1, ausgeloestVon: "x", ergebnis: { status, meldung: "", bereiche: [], probleme: [] } }) satisfies SyncLauf;

describe("wurdeBereitsUebertragen", () => {
  it("is false without any run", () => {
    expect(wurdeBereitsUebertragen([])).toBe(false);
  });

  it("is false when every run failed (nothing reached the portal)", () => {
    expect(wurdeBereitsUebertragen([lauf("fehler"), lauf("fehler")])).toBe(false);
  });

  it.each<SyncStatus>(["erfolg", "teilweise", "unbekannt"])("is true once a run with status %s exists", (status) => {
    expect(wurdeBereitsUebertragen([lauf("fehler"), lauf(status)])).toBe(true);
  });
});
