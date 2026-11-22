import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/app/(protected)/zeiterfassung/actions", () => ({
  aendereZeiteintragAction: vi.fn(),
  erfasseTagAction: vi.fn(),
  erfasseFerienAction: vi.fn(),
  planeFerienAction: vi.fn(),
  loescheAbwesenheitenAction: vi.fn(),
}));
vi.mock("@/app/(protected)/mein-zeitnachweis/actions", () => ({ sendeKorrekturAnfrageAction: vi.fn() }));
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
    // Einzelne Einträge löschbar (Nutzerwunsch 2026-10-27)
    // PROJ-22: Zeitpaar öffnet „Eintrag bearbeiten“.
    expect(within(montag).getByRole("button", { name: "Eintrag 07:30–12:00 vom 02.11.2026 bearbeiten" })).toBeInTheDocument();
  });

  it("names holidays and free days", () => {
    zeigen(eingabe({ monat: "2026-12", stichtag: "2026-11-30" }));

    expect(zeile("25.12.")).toHaveTextContent("Feiertag: Weihnachten");
    expect(zeile("06.12.")).toHaveTextContent("arbeitsfrei");
    expect(zeile("26.12.")).toHaveTextContent("Feiertag: Stephanstag"); // Samstag
  });

  it("warns about open entries on past days", () => {
    zeigen(eingabe({ eintraege: [arbeit("2026-11-02", "06:30", null)] }));

    expect(screen.getByText(/An 1 Tag fehlt ein „Gehen“/)).toBeInTheDocument();
    expect(zeile("02.11.")).toHaveTextContent("offen – Gehen fehlt");
    // Klickbar: im Hinweis (Datum + Kommen) und in der Tageszeile
    expect(screen.getByText(/Zum Nachtragen anklicken/)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Eintrag 07:30–offen vom 02.11.2026 bearbeiten" })).toHaveLength(2);
  });

  it("offers editing an open entry today, without a warning", () => {
    zeigen(eingabe({ heute: "2026-11-02", eintraege: [arbeit("2026-11-02", "06:30", null)] }));

    expect(within(zeile("02.11.")).getByRole("button", { name: "Eintrag 07:30–offen vom 02.11.2026 bearbeiten" })).toBeInTheDocument();
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

  it("explains that Gleitzeit continues from the Startsaldo without an Arbeitsmodell (QA BUG-1)", () => {
    zeigen(eingabe({ versionen: [] }));
    expect(screen.getByText(/die Gleitzeit läuft ab dem Startsaldo nur mit der Ist-Zeit weiter/)).toBeInTheDocument();
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

  describe("nurLesen (PROJ-20, Mitarbeiteransicht)", () => {
    function lesen(e: ZeitnachweisEingabe) {
      render(
        <ZeitnachweisAnsicht zeitnachweis={berechneZeitnachweis(e)} personName="Anna" personEmail="anna@x.ch" personHref="/x" nurLesen />
      );
    }

    it("offers no editing: no Tag erfassen, no delete, no nachtragen", () => {
      lesen(
        eingabe({
          eintraege: [
            arbeit("2026-11-02", "06:30", "11:00"),
            arbeit("2026-11-03", "06:30", null),
            { ...arbeit("2026-11-04", "00:00", null), id: "ferien", typ: "ferien" },
          ],
        })
      );

      expect(screen.queryAllByRole("button")).toHaveLength(0);
      expect(zeile("02.11.")).toHaveTextContent("07:30–12:00");
      // Hinweis bleibt, aber mit Verweis auf SharePoint statt Links
      expect(screen.getByText(/Bitte in der SharePoint-Zeiterfassung ergänzen: Di 03.11. 07:30/)).toBeInTheDocument();
      expect(zeile("03.11.")).toHaveTextContent("offen – Gehen fehlt");
    });

    it("hides the 'aus SharePoint' remark but keeps the own remark", () => {
      lesen(
        eingabe({
          eintraege: [
            arbeit("2026-11-02", "06:30", "11:00", { bemerkung: "aus SharePoint" }),
            arbeit("2026-11-03", "06:30", "11:00", { bemerkung: "Kunde X · aus SharePoint" }),
          ],
        })
      );

      expect(zeile("02.11.")).not.toHaveTextContent("SharePoint");
      expect(zeile("03.11.")).toHaveTextContent("Kunde X");
      expect(zeile("03.11.")).not.toHaveTextContent("aus SharePoint");
    });

    it("hides the technical Flow comparisons", () => {
      lesen(eingabe({ eintraege: [arbeit("2026-11-02", "07:00", "11:00", { tagestotal: 200, monatstotal: 200 })] }));
      expect(zeile("02.11.")).not.toHaveTextContent("Tagestotal laut App");
      expect(screen.queryByText(/Monatstotal laut App/)).not.toBeInTheDocument();
    });

    it("asks to contact HR instead of linking to the person without an Arbeitsmodell", () => {
      lesen(eingabe({ versionen: [], startsaldoStunden: null, stichtag: null }));
      expect(screen.queryByRole("link")).not.toBeInTheDocument();
      expect(screen.getByText("Arbeitsmodell noch nicht erfasst – bitte an die Personalverantwortung wenden.")).toBeInTheDocument();
    });
  });

  describe("Korrektur-Anfragen (PROJ-21)", () => {
    const anfrage = (id: string, datum: string, status: "offen" | "erledigt", erstelltAm: string, nachricht = "Gehen war 17:30") => ({
      id,
      datum,
      nachricht,
      status,
      erstelltAm,
    });

    it("offers 'Korrektur anfragen' only for days inside the allowed period", () => {
      render(
        <ZeitnachweisAnsicht
          zeitnachweis={berechneZeitnachweis(eingabe({ heute: "2026-11-05" }))}
          personName="Anna"
          personEmail="anna@x.ch"
          personHref="/x"
          nurLesen
          anfrageZeitraum={{ von: "2026-11-02", bis: "2026-11-04" }}
        />
      );
      expect(within(zeile("02.11.")).getByRole("button", { name: /Korrektur anfragen für 02.11.2026/ })).toBeInTheDocument();
      expect(within(zeile("04.11.")).getByRole("button", { name: /Korrektur anfragen/ })).toBeInTheDocument();
      expect(within(zeile("01.11.")).queryByRole("button")).not.toBeInTheDocument();
      expect(within(zeile("05.11.")).queryByRole("button")).not.toBeInTheDocument();
    });

    it("shows employees only the status of the newest request", () => {
      render(
        <ZeitnachweisAnsicht
          zeitnachweis={berechneZeitnachweis(eingabe())}
          personName="Anna"
          personEmail="anna@x.ch"
          personHref="/x"
          nurLesen
          anfragen={{
            "2026-11-02": [anfrage("2", "2026-11-02", "offen", "2026-11-04T08:00:00Z"), anfrage("1", "2026-11-02", "erledigt", "2026-11-03T08:00:00Z")],
            "2026-11-03": [anfrage("3", "2026-11-03", "erledigt", "2026-11-04T08:00:00Z")],
          }}
        />
      );
      expect(zeile("02.11.")).toHaveTextContent("Korrektur angefragt (offen)");
      expect(zeile("02.11.")).not.toHaveTextContent("Gehen war 17:30");
      expect(zeile("03.11.")).toHaveTextContent("Korrektur erledigt");
    });

    it("shows Freigeber every request with date, status and message as plain text", () => {
      render(
        <ZeitnachweisAnsicht
          zeitnachweis={berechneZeitnachweis(eingabe())}
          personName="Anna"
          personEmail="anna@x.ch"
          personHref="/x"
          anfragen={{
            "2026-11-02": [
              anfrage("2", "2026-11-02", "offen", "2026-11-20T23:30:00Z", "<b>fett</b>"),
              anfrage("1", "2026-11-02", "erledigt", "2026-11-03T08:00:00Z"),
            ],
          }}
        />
      );
      // 20.11. 23:30 UTC = 21.11. in der Schweiz
      expect(zeile("02.11.")).toHaveTextContent("Korrektur angefragt 21.11. (offen): <b>fett</b>");
      expect(zeile("02.11.")).toHaveTextContent("Korrektur angefragt 03.11. (erledigt): Gehen war 17:30");
      expect(screen.queryByRole("button", { name: /Korrektur anfragen/ })).not.toBeInTheDocument();
    });

    it("notes when requests could not be loaded", () => {
      render(
        <ZeitnachweisAnsicht zeitnachweis={berechneZeitnachweis(eingabe())} personName="Anna" personEmail="anna@x.ch" personHref="/x" anfragenFehler />
      );
      expect(screen.getByText("Korrektur-Anfragen konnten nicht geladen werden.")).toBeInTheDocument();
    });
  });
});

describe("Korrekturen im Tool (PROJ-22)", () => {
  const korrigiert = { am: "2026-11-21T09:00:00Z", von: "Robert Bienz", vorher: "07:30–16:30", geloescht: false };
  const geloescht = { am: "2026-11-21T09:00:00Z", von: "Robert Bienz", vorher: null, geloescht: true };

  it("shows Freigeber who corrected what and when, and deleted entries struck through without counting them", () => {
    zeigen(
      eingabe({
        eintraege: [
          arbeit("2026-11-02", "06:30", "15:00", { imTool: korrigiert }),
          arbeit("2026-11-02", "16:00", "18:00", { imTool: geloescht, tagestotal: 999 }),
        ],
      })
    );

    const montag = zeile("02.11.");
    expect(montag).toHaveTextContent("korrigiert 21.11. von Robert Bienz (vorher 07:30–16:30)");
    expect(montag).toHaveTextContent("17:00–19:00 gelöscht 21.11. von Robert Bienz");
    expect(within(montag).getByLabelText("gelöscht: 17:00–19:00")).toBeInTheDocument();
    // Nur das korrigierte Paar zählt (8.50 h), kein Abgleich mit dem Flow-Total.
    expect(montag).toHaveTextContent("8.50 h");
    expect(montag).not.toHaveTextContent("Tagestotal laut App");
    expect(within(montag).queryByRole("button", { name: /17:00–19:00/ })).not.toBeInTheDocument();
  });

  it("shows employees only 'korrigiert' and hides deleted entries completely", () => {
    render(
      <ZeitnachweisAnsicht
        zeitnachweis={berechneZeitnachweis(
          eingabe({
            eintraege: [
              arbeit("2026-11-02", "06:30", "15:00", { imTool: { ...korrigiert, von: null, vorher: null } }),
              arbeit("2026-11-02", "16:00", "18:00", { imTool: geloescht }),
            ],
          })
        )}
        personName="Anna"
        personEmail="anna@x.ch"
        personHref="/x"
        nurLesen
      />
    );

    const montag = zeile("02.11.");
    expect(within(montag).getByText("korrigiert")).toBeInTheDocument();
    expect(montag).not.toHaveTextContent("Robert Bienz");
    expect(montag).not.toHaveTextContent("vorher");
    expect(montag).not.toHaveTextContent("17:00");
  });
});
