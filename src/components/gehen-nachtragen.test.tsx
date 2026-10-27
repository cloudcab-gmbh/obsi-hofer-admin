import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const trageGehenNachAction = vi.fn();
const refresh = vi.fn();
vi.mock("@/app/(protected)/zeiterfassung/actions", () => ({
  trageGehenNachAction: (...args: unknown[]) => trageGehenNachAction(...args),
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

import { GehenNachtragen } from "./gehen-nachtragen";

function oeffnen() {
  render(
    <GehenNachtragen eintragId="e1" datum="2026-08-12" kommen="07:30" personName="Anna">
      nachtragen
    </GehenNachtragen>
  );
  fireEvent.click(screen.getByRole("button", { name: "nachtragen" }));
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("GehenNachtragen", () => {
  it("shows the entry and saves the time, then refreshes", async () => {
    trageGehenNachAction.mockResolvedValue({ success: true });
    oeffnen();

    expect(screen.getByText(/Anna, Mittwoch 12.08.2026: Kommen 07:30, Gehen fehlt/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Gehen"), { target: { value: "17:15" } });
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(trageGehenNachAction).toHaveBeenCalledWith("e1", "17:15", false);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps the dialog open with the message when saving fails", async () => {
    trageGehenNachAction.mockResolvedValue({ success: false, message: "„Gehen“ muss nach „Kommen“ liegen." });
    oeffnen();

    fireEvent.change(screen.getByLabelText("Gehen"), { target: { value: "07:00" } });
    fireEvent.click(screen.getByRole("checkbox", { name: /am Folgetag/ }));
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("„Gehen“ muss nach „Kommen“ liegen.");
    expect(trageGehenNachAction).toHaveBeenCalledWith("e1", "07:00", true);
    expect(screen.getByLabelText("Gehen")).toHaveValue("07:00");
  });
});
