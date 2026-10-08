"use server";

import { cookies } from "next/headers";
import { GERAETE_SORT_SPALTEN, STANDARD_GERAETE_SORTIERUNG, type GeraeteSortierung } from "./dataverse/geraete";

// Hält den zuletzt auf /geraete gewählten Filter (Suche/Lagerort/Letzte Prüfung, dazu die Spaltensortierung)
// session-weit fest, analog zu firma-session.ts — damit er beim Wechsel zu
// /pruefberichte erhalten bleibt (Nutzerwunsch 2026-10-05).
const COOKIE_NAME = "geraete_filter";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 Tage

export interface GeraeteFilterState {
  suche: string;
  /** Leerstring = "alle Lagerorte". */
  lagerort: string;
  /** Leerstring = keine Einschränkung; sonst Anzahl Tage als String (z.B. "7"). */
  letztePruefungTage: string;
  /** Ohne gültige gespeicherte Sortierung gilt STANDARD_GERAETE_SORTIERUNG (letzte Prüfung absteigend). */
  sortierung: GeraeteSortierung;
}

const DEFAULT_STATE: GeraeteFilterState = {
  suche: "",
  lagerort: "",
  letztePruefungTage: "",
  sortierung: STANDARD_GERAETE_SORTIERUNG,
};

// Fehlend, ungültig oder `null` (Cookies von vor der Standard-Sortierung) → Standard.
function parseSortierung(value: unknown): GeraeteSortierung {
  if (!value || typeof value !== "object") return STANDARD_GERAETE_SORTIERUNG;
  const { spalte, richtung } = value as Record<string, unknown>;
  if (!GERAETE_SORT_SPALTEN.includes(spalte as GeraeteSortierung["spalte"])) return STANDARD_GERAETE_SORTIERUNG;
  if (richtung !== "asc" && richtung !== "desc") return STANDARD_GERAETE_SORTIERUNG;
  return { spalte: spalte as GeraeteSortierung["spalte"], richtung };
}

export async function getGeraeteFilterState(): Promise<GeraeteFilterState> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return DEFAULT_STATE;

  try {
    const parsed = JSON.parse(raw) as Partial<GeraeteFilterState>;
    return {
      suche: typeof parsed.suche === "string" ? parsed.suche : "",
      lagerort: typeof parsed.lagerort === "string" ? parsed.lagerort : "",
      letztePruefungTage: typeof parsed.letztePruefungTage === "string" ? parsed.letztePruefungTage : "",
      sortierung: parseSortierung(parsed.sortierung),
    };
  } catch {
    return DEFAULT_STATE;
  }
}

/** Setzt den Filter zurück — beim Firmen- und Standortwechsel, da Lagerorte standortspezifisch sind. */
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
