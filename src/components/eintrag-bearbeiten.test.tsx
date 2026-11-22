import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const aendereZeiteintragAction = vi.fn();
const loescheAbwesenheitenAction = vi.fn();
const refresh = vi.fn();
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
vi.mock("@/app/(protected)/zeiterfassung/actions", () => ({
  aendereZeiteintragAction: (...args: unknown[]) => aendereZeiteintragAction(...args),
  loescheAbwesenheitenAction: (...args: unknown[]) => loescheAbwesenheitenAction(...args),
}));
import { EintragBearbeiten } from "./eintrag-bearbeiten";

const ID = "37b3cb61-90c0-f111-aaaf-70a8a5061d7a";

function zeigen(extra: Partial<React.ComponentProps<typeof EintragBearbeiten>> = {}) {
  render(
    <EintragBearbeiten eintragId={ID} datum="2026-11-09" kommen="07:10" gehen="12:04" bemerkung="aus SharePoint" personName="Anna" {...extra}>
      07:10–12:04
    </EintragBearbeiten>
  );
}

function oeffnen() {
  fireEvent.click(screen.getByRole("button", { name: "Eintrag 07:10–12:04 vom 09.11.2026 bearbeiten" }));
}

beforeEach(() => vi.resetAllMocks());

describe("EintragBearbeiten (PROJ-22)", () => {
  it("opens with the current times and remark", async () => {
    zeigen();
    oeffnen();

    expect(screen.getByRole("heading", { name: "Eintrag bearbeiten" })).toBeInTheDocument();
    expect(screen.getByText(/Anna, Montag, 09\.11\.2026 · bisher 07:10–12:04/)).toBeInTheDocument();
    expect(screen.getByLabelText("Kommen")).toHaveValue("07:10");
    expect(screen.getByLabelText("Gehen")).toHaveValue("12:04");
    expect(screen.getByLabelText(/Bemerkung/)).toHaveValue("aus SharePoint");
  });

  it("saves the changes, closes and refreshes", async () => {
    aendereZeiteintragAction.mockResolvedValue({ success: true });
    zeigen();
    oeffnen();
    fireEvent.change(screen.getByLabelText("Gehen"), { target: { value: "16:30" } });
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    expect(aendereZeiteintragAction).toHaveBeenCalledWith({
      eintragId: ID,
      kommen: "07:10",
      gehen: "16:30",
      bemerkung: "aus SharePoint",
      gehenAmFolgetag: false,
    });
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(screen.queryByRole("heading", { name: "Eintrag bearbeiten" })).not.toBeInTheDocument();
  });

  it("keeps the input and shows the server message on errors", async () => {
    aendereZeiteintragAction.mockResolvedValue({ success: false, message: "Die Zeiten überschneiden sich mit einem anderen Eintrag dieses Tages." });
    zeigen();
    oeffnen();
    fireEvent.change(screen.getByLabelText(/Bemerkung/), { target: { value: "neu" } });
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("überschneiden sich");
    expect(screen.getByLabelText(/Bemerkung/)).toHaveValue("neu");
    expect(refresh).not.toHaveBeenCalled();
  });

  it("shows a message when the action throws (e.g. network error)", async () => {
    aendereZeiteintragAction.mockRejectedValue(new Error("offline"));
    zeigen();
    oeffnen();
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("konnte nicht gespeichert werden");
  });

  it("requires Gehen when the entry had one", async () => {
    zeigen();
    oeffnen();
    expect(screen.getByLabelText("Gehen")).toBeRequired();
  });

  it("lets an open entry stay open", () => {
    zeigen({ gehen: null });
    fireEvent.click(screen.getByRole("button", { name: "Eintrag 07:10–offen vom 09.11.2026 bearbeiten" }));
    expect(screen.getByLabelText("Gehen (optional)")).not.toBeRequired();
    expect(screen.getByLabelText("Gehen (optional)")).toHaveValue("");
  });

  it("keeps an overnight entry on the following day (QA BUG-1)", async () => {
    aendereZeiteintragAction.mockResolvedValue({ success: true });
    zeigen({ kommen: "22:00", gehen: "01:30", folgetag: true });
    fireEvent.click(screen.getByRole("button", { name: "Eintrag 22:00–01:30 (+1) vom 09.11.2026 bearbeiten" }));

    expect(screen.getByLabelText("Gehen am Folgetag (nach Mitternacht)")).toBeChecked();
    fireEvent.change(screen.getByLabelText(/Bemerkung/), { target: { value: "Nachteinsatz" } });
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));
    expect(aendereZeiteintragAction).toHaveBeenCalledWith(expect.objectContaining({ gehen: "01:30", gehenAmFolgetag: true, bemerkung: "Nachteinsatz" }));
  });

  it("can complete an open entry after midnight (QA BUG-1)", () => {
    zeigen({ kommen: "22:00", gehen: null });
    fireEvent.click(screen.getByRole("button", { name: "Eintrag 22:00–offen vom 09.11.2026 bearbeiten" }));
    const folgetag = screen.getByLabelText("Gehen am Folgetag (nach Mitternacht)");
    expect(folgetag).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Gehen (optional)"), { target: { value: "02:00" } });
    expect(folgetag).toBeEnabled();
    fireEvent.click(folgetag);
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));
    expect(aendereZeiteintragAction).toHaveBeenCalledWith(expect.objectContaining({ gehen: "02:00", gehenAmFolgetag: true }));
  });

  it("deletes only after confirmation, and cancelling returns to the form", async () => {
    loescheAbwesenheitenAction.mockResolvedValue({ success: true, geloescht: 1 });
    zeigen();
    oeffnen();
    fireEvent.click(screen.getByRole("button", { name: "Löschen" }));

    expect(screen.getByRole("heading", { name: "Eintrag löschen?" })).toBeInTheDocument();
    expect(loescheAbwesenheitenAction).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Abbrechen" }));
    expect(screen.getByRole("heading", { name: "Eintrag bearbeiten" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Löschen" }));
    fireEvent.click(screen.getByRole("button", { name: "Löschen" }));
    expect(loescheAbwesenheitenAction).toHaveBeenCalledWith([ID]);
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("shows the delete error in the confirmation", async () => {
    loescheAbwesenheitenAction.mockResolvedValue({ success: false, message: "Nur Freigeber dürfen Einträge löschen." });
    zeigen();
    oeffnen();
    fireEvent.click(screen.getByRole("button", { name: "Löschen" }));
    fireEvent.click(screen.getByRole("button", { name: "Löschen" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Nur Freigeber dürfen Einträge löschen.");
  });

  it("renders remarks as text, not HTML", async () => {
    zeigen({ bemerkung: "<img src=x onerror=alert(1)>" });
    oeffnen();
    expect(screen.getByLabelText(/Bemerkung/)).toHaveValue("<img src=x onerror=alert(1)>");
    expect(document.querySelector("img")).toBeNull();
  });
});
