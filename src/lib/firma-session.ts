"use server";

import { cookies } from "next/headers";

// "Aktuelle Firma" gilt global für die Session (Nutzerwunsch 2026-10-05,
// siehe PROJ-3 Implementation Notes) — einmal auf /start gewählt, gilt sie
// für Geräte (PROJ-3) und später auch Prüfberichte (PROJ-4), ohne erneute
// Auswahl bei jedem Seitenaufruf.
const COOKIE_NAME = "aktuelle_firma_id";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 Tage

export async function getCurrentFirmaId(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value ?? null;
}

export async function setCurrentFirmaId(firmaId: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, firmaId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE_SECONDS,
    path: "/",
  });
}
