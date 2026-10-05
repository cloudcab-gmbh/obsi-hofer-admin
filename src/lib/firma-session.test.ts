import { describe, it, expect, vi, beforeEach } from "vitest";

const get = vi.fn();
const set = vi.fn();

vi.mock("next/headers", () => ({
  cookies: async () => ({ get, set }),
}));

import { getCurrentFirmaId, setCurrentFirmaId } from "./firma-session";

beforeEach(() => {
  get.mockReset();
  set.mockReset();
});

describe("getCurrentFirmaId", () => {
  it("returns the cookie value when present", async () => {
    get.mockReturnValue({ value: "firma-1" });

    await expect(getCurrentFirmaId()).resolves.toBe("firma-1");
    expect(get).toHaveBeenCalledWith("aktuelle_firma_id");
  });

  it("returns null when no cookie is set", async () => {
    get.mockReturnValue(undefined);

    await expect(getCurrentFirmaId()).resolves.toBeNull();
  });
});

describe("setCurrentFirmaId", () => {
  it("sets the cookie with httpOnly and a 30-day expiry", async () => {
    await setCurrentFirmaId("firma-1");

    expect(set).toHaveBeenCalledWith(
      "aktuelle_firma_id",
      "firma-1",
      expect.objectContaining({ httpOnly: true, path: "/", maxAge: 60 * 60 * 24 * 30 })
    );
  });
});
