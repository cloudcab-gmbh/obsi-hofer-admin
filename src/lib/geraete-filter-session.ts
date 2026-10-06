"use server";

import { cookies } from "next/headers";

// Hält den zuletzt auf /geraete gewählten Filter (Suche/Lagerort/Standort)
// session-weit fest, analog zu firma-session.ts — damit er beim Wechsel zu
// /pruefberichte erhalten bleibt (Nutzerwunsch 2026-10-05).
const COOKIE_NAME = "geraete_filter";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 Tage

export interface GeraeteFilterState {
  suche: string;
  /** Leerstring = "alle Lagerorte". */
  lagerort: string;
  /** Leerstring = "alle Standorte". */
  standortId: string;
  /** Leerstring = keine Einschränkung; sonst Anzahl Tage als String (z.B. "7"). */
  letztePruefungTage: string;
}

const DEFAULT_STATE: GeraeteFilterState = { suche: "", lagerort: "", standortId: "", letztePruefungTage: "" };

export async function getGeraeteFilterState(): Promise<GeraeteFilterState> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return DEFAULT_STATE;

  try {
    const parsed = JSON.parse(raw) as Partial<GeraeteFilterState>;
    return {
      suche: typeof parsed.suche === "string" ? parsed.suche : "",
      lagerort: typeof parsed.lagerort === "string" ? parsed.lagerort : "",
      standortId: typeof parsed.standortId === "string" ? parsed.standortId : "",
      letztePruefungTage: typeof parsed.letztePruefungTage === "string" ? parsed.letztePruefungTage : "",
    };
  } catch {
    return DEFAULT_STATE;
  }
}

/** Setzt den Filter zurück — beim Firmenwechsel, da Lagerorte/Standorte firmenspezifisch sind. */
export async function clearGeraeteFilterState(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function setGeraeteFilterState(state: GeraeteFilterState): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, JSON.stringify(state), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE_SECONDS,
    path: "/",
  });
}
