import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const syncFirmaAction = vi.fn();
vi.mock("@/app/(protected)/sync-freigabe/actions", () => ({
  syncFirmaAction: (...args: unknown[]) => syncFirmaAction(...args),
}));

import { SyncAusloesen } from "./sync-ausloesen";

const FIRMA_ID = "11111111-1111-f111-aaaa-111111111111";

function button() {
  return screen.getByRole("button", { name: /Freigeben & synchronisieren|Synchronisiere/ });
}

async function bestaetigen() {
  fireEvent.click(button());
  fireEvent.click(await screen.findByRole("button", { name: "Übertragen" }));
}

beforeEach(() => {
  syncFirmaAction.mockReset();
});

describe("SyncAusloesen", () => {
  it("is disabled with a hint while no contact with email is granted", () => {
    render(<SyncAusloesen firmaId={FIRMA_ID} firmaName="Beispiel AG" anzahlZugriffe={0} fehlendeSyncEinstellungen={[]} />);

    expect(button()).toBeDisabled();
    expect(screen.getByText(/mindestens einen Kontakt/)).toBeInTheDocument();
  });

  it("is disabled with a hint while the sync is not activated", () => {
    render(<SyncAusloesen firmaId={FIRMA_ID} firmaName="Beispiel AG" anzahlZugriffe={2} fehlendeSyncEinstellungen={["KUNDENPORTAL_SYNC_AKTIV=true"]} />);

    expect(button()).toBeDisabled();
    expect(screen.getByText(/noch nicht aktiviert/)).toBeInTheDocument();
    expect(screen.getByText("KUNDENPORTAL_SYNC_AKTIV=true")).toBeInTheDocument();
  });

  it("asks for confirmation with Firma and number of contacts, and does nothing on cancel", async () => {
    render(<SyncAusloesen firmaId={FIRMA_ID} firmaName="Beispiel AG" anzahlZugriffe={2} fehlendeSyncEinstellungen={[]} />);

    fireEvent.click(button());
    expect(await screen.findByText(/„Beispiel AG“.*2 Kontakte haben danach Zugriff/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Abbrechen" }));

    expect(syncFirmaAction).not.toHaveBeenCalled();
  });

  it("syncs the confirmed Firma and shows the result with counts", async () => {
    syncFirmaAction.mockResolvedValue({
      success: true,
      ergebnis: {
        status: "erfolg",
        meldung: "„Beispiel AG“ wurde ins Kundenportal übertragen.",
        bereiche: [{ bereich: "Geräte", geladen: 12, neu: 1, aktualisiert: 11, geloescht: 0 }],
        probleme: [],
      },
    });
    render(<SyncAusloesen firmaId={FIRMA_ID} firmaName="Beispiel AG" anzahlZugriffe={1} fehlendeSyncEinstellungen={[]} />);

    await bestaetigen();

    expect(await screen.findByText("„Beispiel AG“ wurde ins Kundenportal übertragen.")).toBeInTheDocument();
    expect(syncFirmaAction).toHaveBeenCalledWith(FIRMA_ID);
    expect(screen.getByRole("cell", { name: "Geräte" })).toBeInTheDocument();
    expect(button()).not.toBeDisabled();
  });

  // PROJ-6
  it("hands the saved run to the history and shows no warning", async () => {
    const lauf = { id: "l1" };
    const onNeuerLauf = vi.fn();
    syncFirmaAction.mockResolvedValue({ success: true, ergebnis: { status: "erfolg", meldung: "ok", bereiche: [], probleme: [] }, lauf });
    render(<SyncAusloesen firmaId={FIRMA_ID} firmaName="Beispiel AG" anzahlZugriffe={1} fehlendeSyncEinstellungen={[]} onNeuerLauf={onNeuerLauf} />);

    await bestaetigen();

    await screen.findByText("ok");
    expect(onNeuerLauf).toHaveBeenCalledWith(lauf);
    expect(screen.queryByText(/nicht im Sync-Verlauf gespeichert/)).not.toBeInTheDocument();
  });

  it("shows the sync result with a hint when the run could not be saved in the history", async () => {
    syncFirmaAction.mockResolvedValue({ success: true, ergebnis: { status: "erfolg", meldung: "ok", bereiche: [], probleme: [] }, lauf: null });
    render(<SyncAusloesen firmaId={FIRMA_ID} firmaName="Beispiel AG" anzahlZugriffe={1} fehlendeSyncEinstellungen={[]} />);

    await bestaetigen();

    expect(await screen.findByText("ok")).toBeInTheDocument();
    expect(screen.getByText(/nicht im Sync-Verlauf gespeichert/)).toBeInTheDocument();
  });

  it("shows the refusal message from the action as a failure", async () => {
    syncFirmaAction.mockResolvedValue({ success: false, message: "Der Sync ist noch nicht aktiviert bzw. nicht konfiguriert." });
    render(<SyncAusloesen firmaId={FIRMA_ID} firmaName="Beispiel AG" anzahlZugriffe={1} fehlendeSyncEinstellungen={[]} />);

    await bestaetigen();

    expect(await screen.findByText("Der Sync ist noch nicht aktiviert bzw. nicht konfiguriert.")).toBeInTheDocument();
  });

  it("shows 'unknown' and unlocks the button when the action call itself throws", async () => {
    syncFirmaAction.mockRejectedValue(new Error("Failed to find Server Action"));
    render(<SyncAusloesen firmaId={FIRMA_ID} firmaName="Beispiel AG" anzahlZugriffe={1} fehlendeSyncEinstellungen={[]} />);

    await bestaetigen();

    expect(await screen.findByText(/Keine Antwort erhalten/)).toBeInTheDocument();
    expect(button()).not.toBeDisabled();
  });
});

// Nutzer-Entscheidung 2026-10-07: Entzug des letzten Kontakts muss ins Portal gelangen können.
describe("SyncAusloesen — ohne freigegebenen Kontakt", () => {
  it("stays enabled with a warning when the Firma was already transferred", async () => {
    render(<SyncAusloesen firmaId={FIRMA_ID} firmaName="Beispiel AG" anzahlZugriffe={0} fehlendeSyncEinstellungen={[]} bereitsUebertragen />);

    expect(button()).not.toBeDisabled();
    expect(screen.getByText(/entzieht allen bisherigen Kontakten den Zugang/)).toBeInTheDocument();

    fireEvent.click(button());
    expect(await screen.findByText(/Danach hat kein Kontakt mehr Zugriff — bestehende Zugänge werden entzogen/)).toBeInTheDocument();
  });

  it("stays disabled for the very first sync of a Firma", () => {
    render(<SyncAusloesen firmaId={FIRMA_ID} firmaName="Beispiel AG" anzahlZugriffe={0} fehlendeSyncEinstellungen={[]} bereitsUebertragen={false} />);

    expect(button()).toBeDisabled();
    expect(screen.getByText(/Zuerst mindestens einen Kontakt/)).toBeInTheDocument();
  });
});
