import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/app/(protected)/sync-freigabe/actions", () => ({
  setKundenportalFreigabeAction: vi.fn(),
  syncFirmaAction: vi.fn(),
  ladeSyncLaeufeAction: vi.fn(),
}));

import { SyncFreigabeBereich } from "./sync-freigabe-bereich";

const VERLAUF = { laeufe: [], hatMehr: false, fehler: null };

describe("SyncFreigabeBereich", () => {
  // PROJ-11 QA BUG-2: Firma ohne Standort — keine Freigaben möglich, Sync/Verlauf aber weiterhin.
  it("shows a hint instead of the contact list for a Firma without Standort, but keeps sync and history", () => {
    render(
      <SyncFreigabeBereich
        firmaId="11111111-1111-f111-aaaa-111111111111"
        firmaName="Leere AG"
        standortId={null}
        listenTitel="Leere AG"
        kontakte={[]}
        fehlendeSyncEinstellungen={[]}
        verlauf={VERLAUF}
      />
    );

    expect(screen.getByText(/keine Standorte erfasst/)).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Freigeben & synchronisieren" })).toBeInTheDocument();
    expect(screen.getByText("Sync-Verlauf")).toBeInTheDocument();
  });

  it("shows the contact list when a Standort is given", () => {
    render(
      <SyncFreigabeBereich
        firmaId="11111111-1111-f111-aaaa-111111111111"
        firmaName="Firma"
        standortId="s1"
        listenTitel="Firma · Pratteln"
        kontakte={[
          { id: "k1", name: "Max Muster", email: "max@example.ch", rollen: [], freigegeben: true, weitereStandorte: [] },
        ]}
        fehlendeSyncEinstellungen={[]}
        verlauf={VERLAUF}
      />
    );

    expect(screen.getByText("Kundenportal-Zugang — Firma · Pratteln")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Kundenportal-Zugang für Max Muster" })).toBeInTheDocument();
  });
});
