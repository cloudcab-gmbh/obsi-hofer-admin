import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/lib/auth/sign-out", () => ({ signOutEverywhere: vi.fn() }));

import { MobileNav } from "./mobile-nav";

const links = [
  { href: "/geraete", label: "Geräte" },
  { href: "/pruefberichte", label: "Prüfberichte" },
  { href: "/sync-freigabe", label: "Freigabe" },
];

describe("MobileNav", () => {
  it("is closed until the menu button is pressed", () => {
    render(<MobileNav links={links} firmaName="Cloudcab GmbH" userName="Robert Bienz" />);

    expect(screen.getByRole("button", { name: "Menü öffnen" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Geräte" })).not.toBeInTheDocument();
  });

  it("shows all links, the current Firma with a way to change it, the user and Abmelden", () => {
    render(<MobileNav links={links} firmaName="Cloudcab GmbH" userName="Robert Bienz" />);

    fireEvent.click(screen.getByRole("button", { name: "Menü öffnen" }));

    for (const link of links) {
      expect(screen.getByRole("link", { name: link.label })).toHaveAttribute("href", link.href);
    }
    expect(screen.getByRole("link", { name: /Cloudcab GmbH.*wechseln/ })).toHaveAttribute("href", "/start");
    expect(screen.getByText("Robert Bienz")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Abmelden" })).toBeInTheDocument();
  });

  it("shows 'keine ausgewählt' when no Firma is selected", () => {
    render(<MobileNav links={links} firmaName={null} userName={null} />);

    fireEvent.click(screen.getByRole("button", { name: "Menü öffnen" }));

    expect(screen.getByRole("link", { name: /keine ausgewählt/ })).toHaveAttribute("href", "/start");
  });

  it("closes again after choosing a link", () => {
    render(<MobileNav links={links} firmaName="Cloudcab GmbH" userName="Robert Bienz" />);
    fireEvent.click(screen.getByRole("button", { name: "Menü öffnen" }));

    fireEvent.click(screen.getByRole("link", { name: "Prüfberichte" }));

    expect(screen.queryByRole("link", { name: "Geräte" })).not.toBeInTheDocument();
  });
});
