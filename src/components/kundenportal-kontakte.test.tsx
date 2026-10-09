import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const setKundenportalFreigabeAction = vi.fn();
vi.mock("@/app/(protected)/sync-freigabe/actions", () => ({
  setKundenportalFreigabeAction: (...args: unknown[]) => setKundenportalFreigabeAction(...args),
}));

import { KundenportalKontakte } from "./kundenportal-kontakte";
import type { KundenportalKontakt } from "@/lib/dataverse/kontakte";

const kontakt: KundenportalKontakt = {
  id: "37b3cb61-90c0-f111-aaaf-70a8a5061d7a",
  name: "Max Muster",
  email: "max@example.ch",
  rollen: [],
  freigegeben: false,
  weitereStandorte: [],
};

function checkbox() {
  return screen.getByRole("checkbox", { name: "Kundenportal-Zugang für Max Muster" });
}

beforeEach(() => {
  setKundenportalFreigabeAction.mockReset();
});

describe("KundenportalKontakte", () => {
  it("keeps the new state after a successful save", async () => {
    setKundenportalFreigabeAction.mockResolvedValue({ success: true });
    render(<KundenportalKontakte kontakte={[kontakt]} titel="Firma" standortId="s1" />);

    fireEvent.click(checkbox());

    await waitFor(() => expect(checkbox()).not.toBeDisabled());
    expect(checkbox()).toHaveAttribute("data-state", "checked");
    expect(screen.getByText("1 von 1 Kontakten freigegeben")).toBeInTheDocument();
  });

  it("rolls back and shows the message when the action reports an error", async () => {
    setKundenportalFreigabeAction.mockResolvedValue({ success: false, message: "Keine Berechtigung." });
    render(<KundenportalKontakte kontakte={[kontakt]} titel="Firma" standortId="s1" />);

    fireEvent.click(checkbox());

    expect(await screen.findByRole("alert")).toHaveTextContent("Max Muster: Keine Berechtigung.");
    expect(checkbox()).toHaveAttribute("data-state", "unchecked");
    expect(checkbox()).not.toBeDisabled();
  });

  // QA BUG-1: Wirft der Aufruf selbst (Verbindungsabbruch, veraltete
  // Server-Action-ID nach einem Deploy), blieb das Häkchen auf dem nicht
  // gespeicherten Zustand stehen und dauerhaft gesperrt.
  it("rolls back, unlocks and shows a message when the action call itself throws", async () => {
    setKundenportalFreigabeAction.mockRejectedValue(new Error("Failed to find Server Action"));
    render(<KundenportalKontakte kontakte={[kontakt]} titel="Firma" standortId="s1" />);

    fireEvent.click(checkbox());

    expect(await screen.findByRole("alert")).toHaveTextContent("konnte nicht gespeichert werden");
    expect(checkbox()).toHaveAttribute("data-state", "unchecked");
    expect(checkbox()).not.toBeDisabled();
  });

  it("disables the checkbox for a contact without email, but keeps an existing Freigabe removable", () => {
    render(
      <KundenportalKontakte
        kontakte={[
          { ...kontakt, email: null },
          { ...kontakt, id: "aaaaaaaa-aaaa-f111-aaaa-aaaaaaaaaaaa", name: "Eva Frei", email: null, freigegeben: true },
        ]}
        titel="Firma" standortId="s1"
      />
    );

    expect(checkbox()).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "Kundenportal-Zugang für Eva Frei" })).not.toBeDisabled();
  });

  // PROJ-11: Häkchen gilt für den angezeigten Standort.
  it("saves the Freigabe for the shown Standort", async () => {
    setKundenportalFreigabeAction.mockResolvedValue({ success: true });
    render(<KundenportalKontakte kontakte={[kontakt]} titel="Firma · Pratteln" standortId="s1" />);

    fireEvent.click(checkbox());

    await waitFor(() => expect(setKundenportalFreigabeAction).toHaveBeenCalledWith(kontakt.id, "s1", true));
    expect(screen.getByText("Kundenportal-Zugang — Firma · Pratteln")).toBeInTheDocument();
  });

  it("shows the other Standorte a contact is already released for", () => {
    render(
      <KundenportalKontakte kontakte={[{ ...kontakt, weitereStandorte: ["Boningen", "Zofingen"] }]} titel="F" standortId="s1" />
    );

    expect(screen.getByText("auch freigegeben für: Boningen, Zofingen")).toBeInTheDocument();
    expect(screen.queryByText("Freigabe gilt auch für weitere Firmen")).not.toBeInTheDocument();
  });

  it("counts contacts released for any Standort of the Firma for the sync precondition", () => {
    const onZugriffeChange = vi.fn();
    render(
      <KundenportalKontakte
        kontakte={[{ ...kontakt, weitereStandorte: ["Boningen"] }]}
        titel="F"
        standortId="s1"
        onZugriffeChange={onZugriffeChange}
      />
    );

    expect(onZugriffeChange).toHaveBeenLastCalledWith(1);
  });
});
