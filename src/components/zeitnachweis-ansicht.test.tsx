import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/app/(protected)/zeiterfassung/actions", () => ({
  trageGehenNachAction: vi.fn(),
  erfasseTagAction: vi.fn(),
  erfasseFerienAction: vi.fn(),
  planeFerienAction: vi.fn(),
  loescheAbwesenheitenAction: vi.fn(),
}));
import { ZeitnachweisAnsicht } from "./zeitnachweis-ansicht";
import { berechneZeitnachweis, type ZeitnachweisEingabe } from "@/lib/zeiterfassung/zeitnachweis";
import type { Zeiteintrag } from "@/lib/zeiterfassung/tagesauswertung";

function arbeit(datum: string, kommen: string, gehen: string | null, extra: Partial<Zeiteintrag> = {}): Zeiteintrag {
  return {
    id: `${datum}-${kommen}`,
    datum,
    typ: "arbeitszeit",
    kommen: `${datum}T${kommen}:00Z`,
    gehen: gehen && `${datum}T${gehen}:00Z`,
    tagestotal: null,
    monatstotal: null,
    mittagessen: false,
    abendessen: false,
    bemerkung: null,
    halberTag: false,
    ...extra,
  };
}

function eingabe(extra: Partial<ZeitnachweisEingabe> = {}): ZeitnachweisEingabe {
  return {
    monat: "2026-11",
    heute: "2026-12-15",
    eintraege: [],
    versionen: [{ id: "v1", gueltigAb: "2026-01-01", pensum: 100, arbeitstage: [true, true, true, true, true, false, false] }],
    austrittAm: null,
    startsaldoStunden: 2.5,
    stichtag: "2026-10-31",
    ...extra,
  };
}

function zeigen(e: ZeitnachweisEingabe) {
  render(<ZeitnachweisAnsicht zeitnachweis={berechneZeitnachweis(e)} personName="Anna" personEmail="anna@x.ch" personHref="/zeiterfassung/personen/anna%40x.ch" />);
}

function zeile(datumPrefix: string) {
  return screen.getAllByRole("row").find((r) => r.textContent?.startsWith(datumPrefix))!;
}

describe("ZeitnachweisAnsicht", () => {
  it("shows the summary with Saldo Vormonat and Gleitzeit in hours and days", () => {
    zeigen(eingabe({ eintraege: [arbeit("2026-11-02", "06:30", "16:30")] }));

    // Gleitzeit beginnt am 01.11. (Tag nach dem Stichtag) → Kachel "Startsaldo"
    expect(screen.getByText("Startsaldo").nextSibling).toHaveTextContent("+2.50 h");
    // 2.5 h + 10 h Ist − 21 × 8 h Soll = −155.5 h
    expect(screen.getByText("Gleitzeit Monatsende").parentElement).toHaveTextContent("-155.50 h");
    expect(screen.getByText("-19.44 Tage")).toBeInTheDocument();
  });

  it("shows pairs, Ist/Soll/Abweichung, meals and remarks per day", () => {
    zeigen(
      eingabe({
        eintraege: [
          arbeit("2026-11-02", "06:30", "11:00", { mittagessen: true, bemerkung: "Kunde A" }),
          arbeit("2026-11-02", "11:45", "16:15"),
        ],
      })
    );

    const montag = zeile("02.11.");
    expect(within(montag).getByText(/07:30–12:00/)).toBeInTheDocument();
    expect(montag).toHaveTextContent("9.00 h");
    expect(montag).toHaveTextContent("8.00 h");
    expect(montag).toHaveTextContent("+1.00 h");
    expect(montag).toHaveTextContent("Mittag");
    expect(montag).toHaveTextContent("Kunde A");
  });

  it("names holidays and free days", () => {
    zeigen(eingabe({ monat: "2026-12", stichtag: "2026-11-30" }));

    expect(zeile("25.12.")).toHaveTextContent("Feiertag: Weihnachten");
    expect(zeile("06.12.")).toHaveTextContent("frei");
    expect(zeile("26.12.")).toHaveTextContent("Feiertag: Stephanstag"); // Samstag
  });

  it("warns about open entries on past days", () => {
    zeigen(eingabe({ eintraege: [arbeit("2026-11-02", "06:30", null)] }));

    expect(screen.getByText(/An 1 Tag fehlt ein „Gehen“/)).toBeInTheDocument();
    expect(zeile("02.11.")).toHaveTextContent("offen – Gehen fehlt");
    // Klickbar: im Hinweis (Datum + Kommen) und in der Tageszeile
    expect(screen.getByRole("button", { name: "Mo 02.11. 07:30" })).toBeInTheDocument();
    expect(within(zeile("02.11.")).getByRole("button", { name: "nachtragen" })).toBeInTheDocument();
  });

  it("offers nachtragen for an open entry today, without a warning", () => {
    zeigen(eingabe({ heute: "2026-11-02", eintraege: [arbeit("2026-11-02", "06:30", null)] }));

    expect(within(zeile("02.11.")).getByRole("button", { name: "nachtragen" })).toBeInTheDocument();
    expect(screen.queryByText(/fehlt ein „Gehen“/)).not.toBeInTheDocument();
  });

  it("links to the person when there is no Arbeitsmodell", () => {
    zeigen(eingabe({ versionen: [], startsaldoStunden: null, stichtag: null }));

    expect(screen.getByRole("link", { name: "Arbeitsmodell erfassen" })).toHaveAttribute(
      "href",
      "/zeiterfassung/personen/anna%40x.ch"
    );
    expect(screen.getByText("Keine Zeiteinträge in diesem Monat.")).toBeInTheDocument();
  });

  it("explains months before the Startsaldo (Excel period)", () => {
    zeigen(eingabe({ monat: "2026-09" }));
    expect(screen.getByText(/liegt vor dem Stichtag des Startsaldos/)).toBeInTheDocument();
  });

  it("labels the current month as 'Stand heute'", () => {
    zeigen(eingabe({ heute: "2026-11-10" }));
    expect(screen.getByText("Gleitzeit Stand heute")).toBeInTheDocument();
  });

  it("shows the Flow day total when it differs", () => {
    zeigen(eingabe({ eintraege: [arbeit("2026-11-02", "07:00", "11:00", { tagestotal: 200 })] }));
    expect(zeile("02.11.")).toHaveTextContent("Tagestotal laut App 3.33 h statt 4.00 h");
  });

  it("shows Ferien, half Ferien and Frei with a delete link, and the Ferien figures (PROJ-15)", () => {
    const ganztags = (datum: string, typ: Zeiteintrag["typ"], halberTag = false) => ({
      ...arbeit(datum, "00:00", null),
      id: `${typ}-${datum}`,
      typ,
      halberTag,
    });
    zeigen(
      eingabe({
        heute: "2026-11-03",
        ferienStartsaldo: 3,
        eintraege: [ganztags("2026-11-02", "ferien"), ganztags("2026-11-04", "ferien", true), ganztags("2026-11-05", "frei")],
      })
    );

    expect(zeile("02.11.")).toHaveTextContent("Ferien");
    expect(zeile("04.11.")).toHaveTextContent("½ Ferien");
    expect(zeile("05.11.")).toHaveTextContent("Frei");
    expect(within(zeile("02.11.")).getByRole("button", { name: "löschen" })).toBeInTheDocument();
    expect(screen.getByText("Ferien im Monat").parentElement).toHaveTextContent("1 Tag+ 0.5 Tage geplant");
    expect(screen.getByText("Feriensaldo Monatsende").nextSibling).toHaveTextContent("5.5 Tage");
  });
});
