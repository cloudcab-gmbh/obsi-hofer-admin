import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const speichereArbeitsmodellAction = vi.fn();
const loescheArbeitsmodellAction = vi.fn();
const refresh = vi.fn();
vi.mock("@/app/(protected)/zeiterfassung/personen/actions", () => ({
  speichereArbeitsmodellAction: (...args: unknown[]) => speichereArbeitsmodellAction(...args),
  loescheArbeitsmodellAction: (...args: unknown[]) => loescheArbeitsmodellAction(...args),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
// Radix-Checkbox in einem <form> misst sich mit ResizeObserver, den jsdom nicht kennt.
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
);

import { ArbeitsmodellVerlauf, type VerlaufVersion } from "./arbeitsmodell-verlauf";

const VERSION: VerlaufVersion = {
  id: "v1",
  gueltigAb: "2026-01-01",
  gueltigBis: null,
  pensum: 40,
  arbeitstage: [true, true, false, false, false, false, false],
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe("ArbeitsmodellVerlauf", () => {
  it("shows the history with derived 'gültig bis' and Soll", () => {
    render(
      <ArbeitsmodellVerlauf
        email="anna@x.ch"
        versionen={[{ ...VERSION, id: "v2", gueltigAb: "2026-11-01", pensum: 100, arbeitstage: [true, true, true, true, true, false, false] }, { ...VERSION, gueltigBis: "2026-10-31" }]}
      />
    );

    const zeilen = screen.getAllByRole("row");
    expect(zeilen[1]).toHaveTextContent("01.11.2026offen100 %Mo, Di, Mi, Do, Fr8.00 h");
    expect(zeilen[2]).toHaveTextContent("01.01.202631.10.202640 %Mo, Di8.00 h");
  });

  it("shows an empty hint without versions", () => {
    render(<ArbeitsmodellVerlauf email="anna@x.ch" versionen={[]} />);
    expect(screen.getByText(/Noch kein Arbeitsmodell/)).toBeInTheDocument();
  });

  it("updates the Soll live in the dialog", () => {
    render(<ArbeitsmodellVerlauf email="anna@x.ch" versionen={[VERSION]} />);

    fireEvent.click(screen.getByRole("button", { name: /Neue Version/ }));
    expect(screen.getByText("8.00 h an Mo, Di")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Pensum in %"), { target: { value: "45" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Mi" }));

    expect(screen.getByText("6.00 h an Mo, Di, Mi")).toBeInTheDocument();
  });

  it("keeps the dialog and inputs open when saving fails", async () => {
    speichereArbeitsmodellAction.mockResolvedValue({ success: false, message: "Für dieses Datum gibt es bereits eine Version." });
    render(<ArbeitsmodellVerlauf email="anna@x.ch" versionen={[VERSION]} />);

    fireEvent.click(screen.getByRole("button", { name: /Neue Version/ }));
    fireEvent.change(screen.getByLabelText("gültig ab"), { target: { value: "2026-01-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Für dieses Datum gibt es bereits eine Version.");
    expect(screen.getByLabelText("gültig ab")).toHaveValue("2026-01-01");
    expect(speichereArbeitsmodellAction).toHaveBeenCalledWith("anna@x.ch", null, {
      gueltigAb: "2026-01-01",
      pensum: "40",
      arbeitstage: [true, true, false, false, false, false, false],
    });
  });

  it("closes the dialog and refreshes after saving a correction", async () => {
    speichereArbeitsmodellAction.mockResolvedValue({ success: true });
    render(<ArbeitsmodellVerlauf email="anna@x.ch" versionen={[VERSION]} />);

    fireEvent.click(screen.getByRole("button", { name: "Version ab 01.01.2026 bearbeiten" }));
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(speichereArbeitsmodellAction.mock.calls[0][1]).toBe("v1");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("asks for confirmation before deleting", async () => {
    loescheArbeitsmodellAction.mockResolvedValue({ success: true });
    render(<ArbeitsmodellVerlauf email="anna@x.ch" versionen={[VERSION]} />);

    fireEvent.click(screen.getByRole("button", { name: "Version ab 01.01.2026 löschen" }));
    expect(loescheArbeitsmodellAction).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Löschen" }));

    await waitFor(() => expect(loescheArbeitsmodellAction).toHaveBeenCalledWith("anna@x.ch", "v1"));
  });
});
