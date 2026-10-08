import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import type { Geraet, Standort } from "@/lib/dataverse/geraete";

vi.mock("@/lib/geraete-filter-session", () => ({ setGeraeteFilterState: vi.fn() }));
vi.mock("@/app/(protected)/geraete/actions", () => ({ generatePdfAction: vi.fn() }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { GeraeteListe } from "./geraete-liste";

const LEER_FILTER = { suche: "", lagerort: "", standortId: "", letztePruefungTage: "", sortierung: null };
const STANDORTE: Standort[] = [{ id: "s1", name: "Standort 1", firmaId: "f1" } as Standort];

function geraet(overrides: Partial<Geraet>): Geraet {
  return {
    id: "g",
    name: null,
    serienummer: null,
    barcode: null,
    status: null,
    letztePruefung: null,
    ablegereife: null,
    herstelljahr: null,
    erstgebrauch: null,
    standortId: "s1",
    artikelId: null,
    lagerort: null,
    pruefer: null,
    zubehoer: null,
    bemerkungen: null,
    kundenId: null,
    ...overrides,
  };
}

function vorTagen(tage: number): string {
  const d = new Date();
  d.setDate(d.getDate() - tage);
  return d.toISOString();
}

const GERAETE = [
  geraet({ id: "g1", name: "Seil 1", barcode: "BC-100", lagerort: "Lager A", letztePruefung: vorTagen(2) }),
  geraet({ id: "g2", name: "Gurt 7", barcode: "BC-200", lagerort: "Lager B", letztePruefung: vorTagen(30) }),
  geraet({ id: "g3", name: "Seil 9", kundenId: "KD-9", lagerort: "Lager A", letztePruefung: null }),
];

function zeige(filter = LEER_FILTER) {
  return render(
    <GeraeteListe geraete={GERAETE} standorte={STANDORTE} initialFilter={filter} pruefberichtBemerkungen={new Map()} />
  );
}

function sichtbareGeraete(): string[] {
  return screen.queryAllByRole("link").map((a) => a.textContent ?? "");
}

beforeEach(() => {
  vi.useRealTimers();
});

describe("GeraeteListe — Filter", () => {
  it("shows all devices and the total above the PDF button without a filter", () => {
    zeige();
    expect(sichtbareGeraete()).toEqual(["Seil 1", "Gurt 7", "Seil 9"]);
    expect(screen.getByText("3 Geräte")).toBeInTheDocument();
  });

  it("filters by search text typed into the search field", () => {
    zeige();
    fireEvent.change(screen.getByPlaceholderText(/Suche nach Name/), { target: { value: "seil" } });
    expect(sichtbareGeraete()).toEqual(["Seil 1", "Seil 9"]);
    expect(screen.getByText("2 von 3 Geräten")).toBeInTheDocument();
  });

  it("filters by the number of days since the last inspection", () => {
    zeige();
    fireEvent.change(screen.getByLabelText("Letzte Prüfung (Tage)"), { target: { value: "7" } });
    expect(sichtbareGeraete()).toEqual(["Seil 1"]);
  });

  it("applies a search stored in the session filter on load", () => {
    zeige({ ...LEER_FILTER, suche: "BC-200" });
    expect(sichtbareGeraete()).toEqual(["Gurt 7"]);
  });

  it("keeps the search result while the filter is saved after the debounce", async () => {
    vi.useFakeTimers();
    zeige();
    fireEvent.change(screen.getByPlaceholderText(/Suche nach Name/), { target: { value: "gurt" } });
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    expect(sichtbareGeraete()).toEqual(["Gurt 7"]);
  });
});
