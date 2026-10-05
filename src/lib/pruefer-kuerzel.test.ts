import { describe, it, expect } from "vitest";
import { computePrueferKuerzel } from "./pruefer-kuerzel";

describe("computePrueferKuerzel", () => {
  it("takes the first 2 letters of first and last name, lowercased", () => {
    expect(computePrueferKuerzel("Max Mustermann")).toBe("mamu");
  });

  it("is case-insensitive on the input", () => {
    expect(computePrueferKuerzel("MAX MUSTERMANN")).toBe("mamu");
  });

  it("uses only the first 2 letters after the first space, ignoring a middle name", () => {
    // Bewusst identisches Verhalten zur Legacy-Power-App-Formel: Find(" ", ...)
    // findet nur das ERSTE Leerzeichen, ein Mittelname würde also fälschlich
    // als "Nachname" gewertet — das ist eine bekannte, übernommene Macke.
    expect(computePrueferKuerzel("Anna Maria Muster")).toBe("anma");
  });

  it("falls back to the first 4 characters when there is no space", () => {
    expect(computePrueferKuerzel("Cher")).toBe("cher");
  });

  it("falls back gracefully for a single short name", () => {
    expect(computePrueferKuerzel("Al")).toBe("al");
  });

  it("trims leading/trailing whitespace before computing", () => {
    expect(computePrueferKuerzel("  Max Mustermann  ")).toBe("mamu");
  });

  it("handles an empty name without throwing", () => {
    expect(computePrueferKuerzel("")).toBe("");
  });
});
