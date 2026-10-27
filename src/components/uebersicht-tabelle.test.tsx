import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { UebersichtTabelle, type UebersichtZeile } from "./uebersicht-tabelle";

function zeile(anzeige: string, extra: Partial<UebersichtZeile> = {}): UebersichtZeile {
  return {
    email: `${anzeige.toLowerCase()}@x.ch`,
    anzeige,
    gleitzeitMinuten: 0,
    veraenderungMinuten: 0,
    istMinuten: 0,
    sollMinuten: 0,
    abweichungMinuten: 0,
    offeneTage: 0,
    krankheitMonat: 0,
    krankheitJahr: 0,
    kompGlzMonat: 0,
    kompGlzJahr: 0,
    feriensaldo: 0,
    ferienBezogen: 0,
    ferienGeplant: 0,
    ausgetreten: false,
    warnungen: { keinArbeitsmodell: false, offeneEintraege: false, ferienNegativ: false, gleitzeitAusserhalb: false },
    ...extra,
  };
}

const ZEILEN = [
  zeile("Ben", { gleitzeitMinuten: 600 }),
  zeile("Anna", { gleitzeitMinuten: -3000, warnungen: { keinArbeitsmodell: false, offeneEintraege: false, ferienNegativ: false, gleitzeitAusserhalb: true } }),
  zeile("Cleo", { gleitzeitMinuten: null, veraenderungMinuten: null, warnungen: { keinArbeitsmodell: true, offeneEintraege: true, ferienNegativ: false, gleitzeitAusserhalb: false }, offeneTage: 2 }),
];

function namen() {
  return screen.getAllByRole("link").map((l) => l.textContent);
}

describe("UebersichtTabelle", () => {
  it("sorts by name by default and links to the Zeitnachweis of the month", () => {
    render(<UebersichtTabelle zeilen={ZEILEN} monat="2026-11" jahr={2026} />);
    expect(namen()).toEqual(["Anna", "Ben", "Cleo"]);
    expect(screen.getByRole("link", { name: "Anna" })).toHaveAttribute("href", "/zeiterfassung/zeitnachweis?person=anna%40x.ch&monat=2026-11");
  });

  it("sorts by a column on click and reverses on a second click, missing values last", () => {
    render(<UebersichtTabelle zeilen={ZEILEN} monat="2026-11" jahr={2026} />);
    fireEvent.click(screen.getByRole("button", { name: /Gleitzeit/ }));
    expect(namen()).toEqual(["Anna", "Ben", "Cleo"]);
    fireEvent.click(screen.getByRole("button", { name: /Gleitzeit/ }));
    expect(namen()).toEqual(["Ben", "Anna", "Cleo"]);
  });

  it("highlights warnings and shows missing values as dash", () => {
    render(<UebersichtTabelle zeilen={ZEILEN} monat="2026-11" jahr={2026} />);
    expect(screen.getByText("-50.00 h")).toHaveClass("text-destructive");
    expect(screen.getByText("kein Arbeitsmodell")).toBeInTheDocument();
    expect(screen.getByText("2 offen")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cleo" }).closest("tr")).toHaveTextContent("—");
  });
});
