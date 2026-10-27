import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/app/(protected)/zeiterfassung/actions", () => ({
  erfasseFerienAction: vi.fn(),
  planeFerienAction: vi.fn(),
  loescheAbwesenheitenAction: vi.fn(),
}));

import { FerienDerPerson, FerienJahresuebersicht } from "./ferien-uebersicht";

describe("FerienJahresuebersicht", () => {
  it("lists every person with the year figures and marks a negative balance", () => {
    render(
      <FerienJahresuebersicht
        jahr={2026}
        gewaehlt={null}
        zeilen={[
          {
            email: "anna@x.ch",
            anzeige: "Anna",
            ohneArbeitsmodell: false,
            stand: { jahr: 2026, vorBeginn: false, saldoVorjahr: 5, anspruch: 25, bezogen: 20, geplant: 12, saldoEnde: -2 },
          },
          {
            email: "ben@x.ch",
            anzeige: "ben@x.ch",
            ohneArbeitsmodell: true,
            stand: { jahr: 2026, vorBeginn: true, saldoVorjahr: null, anspruch: 0, bezogen: 0, geplant: 0, saldoEnde: null },
          },
        ]}
      />
    );

    const anna = screen.getByRole("link", { name: "Anna" }).closest("tr")!;
    // Saldo Vorjahr 5 · Anspruch 25 · bezogen 20 · geplant 12 · Saldo Ende -2
    expect([...anna.querySelectorAll("td")].slice(1).map((td) => td.textContent)).toEqual(["5", "25", "20", "12", "-2"]);
    expect(within(anna).getByText("-2")).toHaveClass("text-destructive");
    expect(screen.getByRole("link", { name: "Anna" })).toHaveAttribute("href", "/zeiterfassung/ferien?jahr=2026&person=anna%40x.ch");
    expect(screen.getByText("kein Arbeitsmodell")).toBeInTheDocument();
    expect(screen.getByText("kein Feriensaldo in diesem Jahr")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Vorjahr" })).toHaveAttribute("href", "/zeiterfassung/ferien?jahr=2025");
  });
});

describe("FerienDerPerson", () => {
  it("shows periods with status and a delete link", () => {
    render(
      <FerienDerPerson
        email="anna@x.ch"
        personName="Anna"
        jahr={2026}
        heute="2026-10-27"
        zeitraeume={[
          { von: "2026-03-02", bis: "2026-03-06", ferientage: 5, eintragIds: ["a"] },
          { von: "2026-12-21", bis: "2026-12-28", ferientage: 5, eintragIds: ["b"] },
        ]}
      />
    );

    expect(screen.getByText("02.03.2026 – 06.03.2026").closest("tr")).toHaveTextContent("bezogen");
    expect(screen.getByText("21.12.2026 – 28.12.2026").closest("tr")).toHaveTextContent("geplant");
    expect(screen.getAllByRole("button", { name: "löschen" })).toHaveLength(2);
    expect(screen.getByRole("button", { name: /Ferien erfassen/ })).toBeInTheDocument();
  });

  it("shows an empty hint", () => {
    render(<FerienDerPerson email="a@x.ch" personName="A" jahr={2026} heute="2026-10-27" zeitraeume={[]} />);
    expect(screen.getByText("Keine Ferien in diesem Jahr erfasst.")).toBeInTheDocument();
  });
});
