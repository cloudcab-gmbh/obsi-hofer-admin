import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SyncVerlauf } from "./sync-verlauf";
import type { SyncLauf } from "@/lib/dataverse/sync-laeufe";

function lauf(overrides: Partial<SyncLauf> = {}): SyncLauf {
  return {
    id: "l1",
    firmaId: "11111111-1111-f111-aaaa-111111111111",
    gestartetAm: "2026-10-07T12:30:00Z",
    dauerSekunden: 4,
    ausgeloestVon: "Robert Bienz",
    ergebnis: {
      status: "erfolg",
      meldung: "„Cloudcab GmbH“ wurde ins Kundenportal übertragen.",
      bereiche: [{ bereich: "Geräte", geladen: 8, neu: 0, aktualisiert: 8, geloescht: 0 }],
      probleme: [],
    },
    ...overrides,
  };
}

const props = { hatMehr: false, fehler: null, laedtMehr: false, onMehrLaden: () => {} };

describe("SyncVerlauf", () => {
  it("shows an empty hint instead of an empty list", () => {
    render(<SyncVerlauf laeufe={[]} {...props} />);

    expect(screen.getByText("Noch kein Sync für diese Firma.")).toBeInTheDocument();
  });

  it("highlights the last run and lists runs with Swiss time, name, duration and result badge", () => {
    render(
      <SyncVerlauf
        laeufe={[lauf(), lauf({ id: "l2", gestartetAm: "2026-10-06T08:00:00Z", ergebnis: { ...lauf().ergebnis, status: "fehler" } })]}
        {...props}
      />
    );

    expect(screen.getByText(/Letzter Sync: 07.10.2026, 14:30/)).toBeInTheDocument();
    expect(screen.getAllByText("Robert Bienz")).toHaveLength(2);
    expect(screen.getAllByText("4 s")).toHaveLength(2);
    expect(screen.getByText("Fehlgeschlagen")).toBeInTheDocument();
  });

  it("expands a run to show the same details as right after the sync", () => {
    render(<SyncVerlauf laeufe={[lauf()]} {...props} />);
    expect(screen.queryByRole("cell", { name: "Geräte" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /07.10.2026, 14:30/ }));

    expect(screen.getByText("„Cloudcab GmbH“ wurde ins Kundenportal übertragen.")).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Geräte" })).toBeInTheDocument();
  });

  it("offers 'Mehr anzeigen' only when older runs exist", () => {
    const onMehrLaden = vi.fn();
    const { rerender } = render(<SyncVerlauf laeufe={[lauf()]} {...props} />);
    expect(screen.queryByRole("button", { name: "Mehr anzeigen" })).not.toBeInTheDocument();

    rerender(<SyncVerlauf laeufe={[lauf()]} {...props} hatMehr onMehrLaden={onMehrLaden} />);
    fireEvent.click(screen.getByRole("button", { name: "Mehr anzeigen" }));

    expect(onMehrLaden).toHaveBeenCalled();
  });

  it("shows a loading error in the history area without an empty hint", () => {
    render(<SyncVerlauf laeufe={[]} {...props} fehler="Der Sync-Verlauf konnte nicht geladen werden." />);

    expect(screen.getByRole("alert")).toHaveTextContent("Der Sync-Verlauf konnte nicht geladen werden.");
    expect(screen.queryByText("Noch kein Sync für diese Firma.")).not.toBeInTheDocument();
  });
});
