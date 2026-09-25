import { describe, it, expect, vi } from "vitest";
import type { NextResponse } from "next/server";

// auth() ist ein Higher-Order-Wrapper von Auth.js (übernimmt normalerweise
// Session-Auflösung aus dem Cookie) — hier durch die Identitätsfunktion
// ersetzt, damit der eigentliche Redirect-Logik-Callback in proxy.ts direkt
// mit einer frei konstruierten Fake-Session getestet werden kann.
vi.mock("@/auth", () => ({
  auth: (handler: (request: unknown) => unknown) => handler,
}));

import proxyImport from "./proxy";

// proxy.ts exportiert das Ergebnis von auth(callback) — dank des Mocks oben
// zur Laufzeit einfach der rohe callback. Der echte (ungemockte) Typ von
// auth(...) ist für einen Test unnötig kompliziert, daher hier bewusst ein
// einfacherer, auf das Nötigste reduzierter Funktionstyp für den Test.
type FakeRequest = { nextUrl: URL; auth: { user: { roles: string[] } } | null };
const proxy = proxyImport as unknown as (request: FakeRequest) => NextResponse | undefined;

function makeRequest(pathname: string, roles: string[] | null): FakeRequest {
  return {
    nextUrl: new URL(`http://localhost:3000${pathname}`),
    auth: roles === null ? null : { user: { roles } },
  };
}

describe("proxy (PROJ-1 Zugriffsprüfung)", () => {
  it("redirects to /login when there is no session on a protected path", () => {
    const res = proxy(makeRequest("/start", null));
    expect(res?.status).toBe(307);
    expect(res?.headers.get("location")).toContain("/login");
  });

  it("does not redirect /login itself without a session", () => {
    const res = proxy(makeRequest("/login", null));
    expect(res).toBeUndefined();
  });

  it("does not redirect /kein-zugang without a session", () => {
    const res = proxy(makeRequest("/kein-zugang", null));
    expect(res).toBeUndefined();
  });

  it("redirects to /kein-zugang when logged in without bearbeiter/freigeber role", () => {
    const res = proxy(makeRequest("/start", []));
    expect(res?.status).toBe(307);
    expect(res?.headers.get("location")).toContain("/kein-zugang");
  });

  it("allows access to a protected path with the bearbeiter role", () => {
    const res = proxy(makeRequest("/start", ["bearbeiter"]));
    expect(res).toBeUndefined();
  });

  it("allows access to a protected path with the freigeber role", () => {
    const res = proxy(makeRequest("/start", ["freigeber"]));
    expect(res).toBeUndefined();
  });

  it("redirects an already-logged-in user with a role away from /login to /start", () => {
    const res = proxy(makeRequest("/login", ["bearbeiter"]));
    expect(res?.status).toBe(307);
    expect(res?.headers.get("location")).toContain("/start");
  });

  it("redirects an already-logged-in user with a role away from /kein-zugang to /start", () => {
    const res = proxy(makeRequest("/kein-zugang", ["freigeber"]));
    expect(res?.status).toBe(307);
    expect(res?.headers.get("location")).toContain("/start");
  });

  it("does not redirect a logged-in user without a role who is already on /kein-zugang", () => {
    const res = proxy(makeRequest("/kein-zugang", []));
    expect(res).toBeUndefined();
  });
});
