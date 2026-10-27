import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Recharts misst seinen Container mit ResizeObserver, den jsdom nicht kennt.
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
);

import { UebersichtGrafiken } from "./uebersicht-grafiken";
import type { UebersichtZeile } from "./uebersicht-tabelle";

function zeile(anzeige: string, extra: Partial<UebersichtZeile> = {}): UebersichtZeile {
  return {
    email: `${anzeige}@x.ch`,
    anzeige,
    gleitzeitMinuten: 120,
    veraenderungMinuten: 0,
    istMinuten: 0,
    sollMinuten: 0,
    abweichungMinuten: 0,
    offeneTage: 0,
    krankheitMonat: 0,
    krankheitJahr: 0,
    kompGlzMonat: 0,
    kompGlzJahr: 0,
    feriensaldo: 5,
    ferienBezogen: 10,
    ferienGeplant: 3,
    ferienSaldoJahresende: 5,
    ausgetreten: false,
    warnungen: { keinArbeitsmodell: false, offeneEintraege: false, ferienNegativ: false, gleitzeitAusserhalb: false },
    ...extra,
  };
}

describe("UebersichtGrafiken", () => {
  it("renders both charts and names persons left out", () => {
    render(
      <UebersichtGrafiken
        jahr={2026}
        zeilen={[zeile("Anna"), zeile("Cleo", { gleitzeitMinuten: null, feriensaldo: null, ferienSaldoJahresende: null })]}
      />
    );
    expect(screen.getByText("Gleitzeit")).toBeInTheDocument();
    expect(screen.getByText("Ferien 2026")).toBeInTheDocument();
    expect(screen.getByText("Ohne Gleitzeit (kein Arbeitsmodell oder vor dem Beginn): Cleo")).toBeInTheDocument();
    expect(screen.getByText("Ohne Feriensaldo: Cleo")).toBeInTheDocument();
  });

  it("shows empty hints without values", () => {
    render(<UebersichtGrafiken jahr={2026} zeilen={[zeile("Cleo", { gleitzeitMinuten: null, feriensaldo: null, ferienSaldoJahresende: null })]} />);
    expect(screen.getByText("Keine Gleitzeit in diesem Monat.")).toBeInTheDocument();
    expect(screen.getByText("Keine Ferienwerte in diesem Jahr.")).toBeInTheDocument();
  });
});
