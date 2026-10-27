import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const push = vi.fn();
const merkeZeitnachweisAuswahl = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/zeiterfassung/auswahl-session", () => ({
  merkeZeitnachweisAuswahl: (...args: unknown[]) => merkeZeitnachweisAuswahl(...args),
}));

import { ZeitnachweisAuswahl } from "./zeitnachweis-auswahl";

beforeEach(() => {
  vi.resetAllMocks();
  merkeZeitnachweisAuswahl.mockResolvedValue(undefined);
});

describe("ZeitnachweisAuswahl", () => {
  it("moves to the previous and next month, keeping the person, and remembers the choice", async () => {
    render(<ZeitnachweisAuswahl personen={[{ id: "anna@x.ch", name: "Anna" }]} person="anna@x.ch" monat="2026-01" />);

    fireEvent.click(screen.getByRole("button", { name: "Vormonat" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/zeiterfassung/zeitnachweis?person=anna%40x.ch&monat=2025-12"));
    expect(merkeZeitnachweisAuswahl).toHaveBeenCalledWith("anna@x.ch", "2025-12");

    fireEvent.click(screen.getByRole("button", { name: "Folgemonat" }));
    await waitFor(() => expect(push).toHaveBeenLastCalledWith("/zeiterfassung/zeitnachweis?person=anna%40x.ch&monat=2026-02"));
  });

  it("shows the chosen person and month", () => {
    render(<ZeitnachweisAuswahl personen={[{ id: "anna@x.ch", name: "Anna" }]} person="anna@x.ch" monat="2026-10" />);

    expect(screen.getByRole("combobox", { name: "Person" })).toHaveTextContent("Anna");
    expect(screen.getByLabelText("Monat")).toHaveValue("2026-10");
  });

  it("asks for a person when none is chosen", () => {
    render(<ZeitnachweisAuswahl personen={[]} person={null} monat="2026-10" />);
    expect(screen.getByRole("combobox", { name: "Person" })).toHaveTextContent("Person auswählen...");
  });
});
