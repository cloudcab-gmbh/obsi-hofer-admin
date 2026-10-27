import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const erfasseTagAction = vi.fn();
const refresh = vi.fn();
vi.mock("@/app/(protected)/zeiterfassung/actions", () => ({
  erfasseTagAction: (...args: unknown[]) => erfasseTagAction(...args),
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

import { TagErfassen } from "./tag-erfassen";

function oeffnen() {
  render(
    <TagErfassen email="anna@x.ch" datum="2026-08-12" personName="Anna">
      12.08.
    </TagErfassen>
  );
  fireEvent.click(screen.getByRole("button", { name: "Eintrag erfassen am 12.08.2026" }));
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("TagErfassen", () => {
  it("collects several pairs with a running total and saves them", async () => {
    erfasseTagAction.mockResolvedValue({ success: true, angelegt: 2 });
    oeffnen();

    fireEvent.change(screen.getByLabelText("Kommen 1"), { target: { value: "07:30" } });
    fireEvent.change(screen.getByLabelText("Gehen 1"), { target: { value: "12:00" } });
    fireEvent.click(screen.getByRole("button", { name: /weiteres Paar/ }));
    fireEvent.change(screen.getByLabelText("Kommen 2"), { target: { value: "13:00" } });
    fireEvent.change(screen.getByLabelText("Gehen 2"), { target: { value: "17:00" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Mittagessen" }));
    expect(screen.getByText("Total 8.50 h")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(erfasseTagAction).toHaveBeenCalledWith({
      email: "anna@x.ch",
      datum: "2026-08-12",
      typ: "arbeitszeit",
      paare: [
        { kommen: "07:30", gehen: "12:00" },
        { kommen: "13:00", gehen: "17:00" },
      ],
      mittagessen: true,
      abendessen: false,
      bemerkung: "",
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("removes a pair again", () => {
    oeffnen();
    fireEvent.click(screen.getByRole("button", { name: /weiteres Paar/ }));
    fireEvent.click(screen.getByRole("button", { name: "Paar 2 entfernen" }));
    expect(screen.queryByLabelText("Kommen 2")).not.toBeInTheDocument();
  });

  it("keeps the dialog open with the message on failure", async () => {
    erfasseTagAction.mockResolvedValue({ success: false, message: "Die erfassten Paare überschneiden sich." });
    oeffnen();

    fireEvent.change(screen.getByLabelText("Kommen 1"), { target: { value: "07:30" } });
    fireEvent.change(screen.getByLabelText("Gehen 1"), { target: { value: "12:00" } });
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Die erfassten Paare überschneiden sich.");
    expect(screen.getByLabelText("Kommen 1")).toHaveValue("07:30");
  });
});
