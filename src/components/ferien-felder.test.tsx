import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const planeFerienAction = vi.fn();
vi.mock("@/app/(protected)/zeiterfassung/actions", () => ({
  planeFerienAction: (...args: unknown[]) => planeFerienAction(...args),
}));

import { FerienFelder } from "./ferien-felder";
import { vorschauText } from "@/lib/zeiterfassung/format";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("vorschauText", () => {
  it("names the Ferientage and what was skipped", () => {
    expect(
      vorschauText({
        tage: [],
        umstellen: [],
        ferientage: 7,
        uebersprungen: { feiertag: 2, ohneSoll: 4, ohneArbeitsmodell: 0, bereitsFerien: 1 },
      })
    ).toBe("ergibt 7 Ferientage; übersprungen: 2 Feiertage, 4 ohne Soll (Wochenende/frei), 1 bereits Ferien");
    expect(
      vorschauText({ tage: [], umstellen: [], ferientage: 1, uebersprungen: { feiertag: 0, ohneSoll: 0, ohneArbeitsmodell: 0, bereitsFerien: 0 } })
    ).toBe("ergibt 1 Ferientag");
  });
});

describe("FerienFelder", () => {
  it("asks the server for a preview of the entered period", async () => {
    planeFerienAction.mockResolvedValue({
      success: true,
      plan: { tage: [], umstellen: [], ferientage: 5, uebersprungen: { feiertag: 0, ohneSoll: 2, ohneArbeitsmodell: 0, bereitsFerien: 0 } },
    });
    render(
      <FerienFelder
        email="anna@x.ch"
        werte={{ von: "2026-11-02", bis: "2026-11-08", halberTag: false }}
        onChange={() => {}}
        idPrefix="t"
      />
    );

    expect(await screen.findByText("ergibt 5 Ferientage; übersprungen: 2 ohne Soll (Wochenende/frei)")).toBeInTheDocument();
    expect(planeFerienAction).toHaveBeenCalledWith({
      email: "anna@x.ch",
      von: "2026-11-02",
      bis: "2026-11-08",
      halberTag: false,
      bemerkung: "",
    });
  });

  it("allows a half day only for a single day", async () => {
    planeFerienAction.mockResolvedValue({ success: false, message: "x" });
    const { rerender } = render(
      <FerienFelder email="a@x.ch" werte={{ von: "2026-11-02", bis: "2026-11-03", halberTag: false }} onChange={() => {}} idPrefix="t" />
    );
    expect(screen.getByRole("checkbox", { name: "halber Tag" })).toBeDisabled();

    rerender(
      <FerienFelder email="a@x.ch" werte={{ von: "2026-11-02", bis: "2026-11-02", halberTag: false }} onChange={() => {}} idPrefix="t" />
    );
    await waitFor(() => expect(screen.getByRole("checkbox", { name: "halber Tag" })).not.toBeDisabled());
  });
});
