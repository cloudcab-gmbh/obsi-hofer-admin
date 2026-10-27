import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const uebernehmeJahrAction = vi.fn();
const speichereFeiertagAction = vi.fn();
const refresh = vi.fn();
vi.mock("@/app/(protected)/zeiterfassung/feiertage/actions", () => ({
  uebernehmeJahrAction: (...args: unknown[]) => uebernehmeJahrAction(...args),
  speichereFeiertagAction: (...args: unknown[]) => speichereFeiertagAction(...args),
  entferneFeiertagAction: vi.fn(),
  setzeJahrZurueckAction: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
);

import { FeiertageVerwaltung } from "./feiertage-verwaltung";

beforeEach(() => {
  vi.resetAllMocks();
});

const VORSCHLAG = [{ id: null, datum: "2027-12-25", name: "Weihnachten", halb: false }];

describe("FeiertageVerwaltung", () => {
  it("shows the suggestion and takes over a current year directly", async () => {
    uebernehmeJahrAction.mockResolvedValue({ success: true });
    render(<FeiertageVerwaltung jahr={2027} gepflegt={false} feiertage={VORSCHLAG} vergangen={false} />);

    expect(screen.getByText("automatischer Vorschlag")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /hinzufügen/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Jahr übernehmen" }));

    await waitFor(() => expect(uebernehmeJahrAction).toHaveBeenCalledWith(2027));
  });

  it("asks for confirmation before taking over a past year", () => {
    render(<FeiertageVerwaltung jahr={2025} gepflegt={false} feiertage={VORSCHLAG} vergangen />);
    fireEvent.click(screen.getByRole("button", { name: "Jahr übernehmen" }));

    expect(screen.getByText(/rechnen danach neu/)).toBeInTheDocument();
    expect(uebernehmeJahrAction).not.toHaveBeenCalled();
  });

  it("adds a half holiday in a maintained year and keeps the dialog on error", async () => {
    speichereFeiertagAction.mockResolvedValue({ success: false, message: "An diesem Datum gibt es bereits einen Feiertag." });
    render(
      <FeiertageVerwaltung
        jahr={2027}
        gepflegt
        feiertage={[{ id: "f1", datum: "2027-12-25", name: "Weihnachten", halb: false }]}
        vergangen={false}
      />
    );
    expect(screen.getByText("gepflegt")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Feiertag hinzufügen/ }));
    fireEvent.change(screen.getByLabelText("Datum"), { target: { value: "2027-12-25" } });
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Heiligabend" } });
    fireEvent.click(screen.getByRole("checkbox", { name: /halber Tag/ }));
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("An diesem Datum gibt es bereits einen Feiertag.");
    expect(speichereFeiertagAction).toHaveBeenCalledWith({ jahr: 2027, id: null, datum: "2027-12-25", name: "Heiligabend", halb: true });
  });

  it("shows an empty hint for a maintained year without holidays", () => {
    render(<FeiertageVerwaltung jahr={2027} gepflegt feiertage={[]} vergangen={false} />);
    expect(screen.getByText(/keine Feiertage erfasst/)).toBeInTheDocument();
  });
});
