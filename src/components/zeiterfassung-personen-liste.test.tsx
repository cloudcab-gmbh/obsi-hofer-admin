import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ZeiterfassungPersonenListe } from "./zeiterfassung-personen-liste";
import type { PersonUebersicht } from "@/lib/zeiterfassung/personen-uebersicht";

function person(email: string, extra: Partial<PersonUebersicht> = {}): PersonUebersicht {
  return {
    email,
    anzeige: email,
    hatName: false,
    nichtAuswerten: false,
    austrittAm: null,
    ausgetreten: false,
    startsaldo: null,
    stichtag: null,
    version: null,
    ...extra,
  };
}

const MIT_MODELL = person("anna@x.ch", {
  anzeige: "Anna",
  hatName: true,
  startsaldo: -3.25,
  stichtag: "2026-10-31",
  version: {
    gueltigAb: "2026-01-01",
    pensum: 40,
    arbeitstage: [true, true, false, false, false, false, false],
    sollProArbeitstag: 8,
    kuenftig: false,
  },
});
const OHNE_MODELL = person("ben@x.ch");
const AUSGEBLENDET = person("test@x.ch", { nichtAuswerten: true });

describe("ZeiterfassungPersonenListe", () => {
  it("shows an empty hint when there are no time entries", () => {
    render(<ZeiterfassungPersonenListe personen={[]} />);
    expect(screen.getByText(/Es gibt noch keine Zeiteinträge/)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows model, Soll and Startsaldo, and marks persons without a model", () => {
    render(<ZeiterfassungPersonenListe personen={[MIT_MODELL, OHNE_MODELL]} />);

    expect(screen.getByRole("link", { name: "Anna" })).toHaveAttribute("href", "/zeiterfassung/personen/anna%40x.ch");
    expect(screen.getByText("40 % · Mo, Di")).toBeInTheDocument();
    expect(screen.getByText("8.00 h")).toBeInTheDocument();
    expect(screen.getByText("-3.25 h")).toBeInTheDocument();
    expect(screen.getByText("kein Arbeitsmodell")).toBeInTheDocument();
    expect(screen.getByText("kein Startsaldo")).toBeInTheDocument();
    expect(screen.getByText("1 Person hat noch kein Arbeitsmodell.")).toBeInTheDocument();
  });

  it("shows a future Austritt before it happens (QA BUG-3)", () => {
    render(<ZeiterfassungPersonenListe personen={[person("x@x.ch", { austrittAm: "2027-03-31" })]} />);
    expect(screen.getByText("Austritt 31.03.2027")).toBeInTheDocument();
  });

  it("filters to persons without a model", () => {
    render(<ZeiterfassungPersonenListe personen={[MIT_MODELL, OHNE_MODELL]} />);

    fireEvent.click(screen.getByRole("checkbox", { name: /nur ohne Arbeitsmodell/ }));

    expect(screen.queryByRole("link", { name: "Anna" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ben@x.ch" })).toBeInTheDocument();
  });

  it("hides 'nicht auswerten' persons unless requested, and does not count them as missing a model", () => {
    render(<ZeiterfassungPersonenListe personen={[MIT_MODELL, AUSGEBLENDET]} />);

    expect(screen.queryByRole("link", { name: "test@x.ch" })).not.toBeInTheDocument();
    expect(screen.queryByText(/noch kein Arbeitsmodell/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox", { name: /ausgeblendete anzeigen/ }));

    expect(screen.getByRole("link", { name: "test@x.ch" })).toBeInTheDocument();
    expect(screen.getByText("nicht auswerten")).toBeInTheDocument();
  });
});
