import { describe, it, expect } from "vitest";
import { formatGeraeteAnzahl } from "./format";

describe("formatGeraeteAnzahl", () => {
  it("shows only the total when no filter narrows the list", () => {
    expect(formatGeraeteAnzahl(120, 120)).toBe("120 Geräte");
    expect(formatGeraeteAnzahl(1, 1)).toBe("1 Gerät");
  });

  it("shows 'x von y' when a filter narrows the list", () => {
    expect(formatGeraeteAnzahl(42, 120)).toBe("42 von 120 Geräten");
    expect(formatGeraeteAnzahl(1, 120)).toBe("1 von 120 Geräten");
    expect(formatGeraeteAnzahl(0, 120)).toBe("0 von 120 Geräten");
  });
});
