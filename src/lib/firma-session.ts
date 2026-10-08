"use server";

import { cookies } from "next/headers";
import { listStandorteForFirma } from "./dataverse/geraete";
import { clearGeraeteFilterState } from "./geraete-filter-session";

// "Aktuelle Firma" gilt global für die Session (Nutzerwunsch 2026-10-05,
// siehe PROJ-3 Implementation Notes) — einmal auf /start gewählt, gilt sie
// für Geräte (PROJ-3) und später auch Prüfberichte (PROJ-4), ohne erneute
// Auswahl bei jedem Seitenaufruf.
//
// PROJ-10: Daneben der "aktuelle Standort" der Firma. Ob er gültig ist
// (gehört zur Firma, automatische Wahl bei genau einem Standort), entscheidet
// der Arbeitskontext (arbeitskontext.ts) bei jedem Aufruf.
const COOKIE_NAME = "aktuelle_firma_id";
const STANDORT_COOKIE_NAME = "aktueller_standort_id";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 Tage

const COOKIE_OPTIONEN = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: COOKIE_MAX_AGE_SECONDS,
  path: "/",
};

export async function getCurrentFirmaId(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value ?? null;
}

export async function getCurrentStandortId(): Promise<string | null> {
  const store = await cookies();
  return store.get(STANDORT_COOKIE_NAME)?.value ?? null;
}

/**
 * Setzt die aktuelle Firma. Bei einem Firmenwechsel werden der Standort und
 * die Geräte-Filter verworfen. Hat die Firma genau einen Standort, wird er
 * sofort mitgespeichert (PROJ-10) — so bleibt er gültig, auch wenn die Firma
 * später einen zweiten Standort bekommt.
 *
 * `standortWaehlen`: true, wenn der Nutzer auf der Startseite noch einen
 * Standort wählen muss (mehrere Standorte, keiner gültig gewählt) — oder die
 * Standorte nicht geladen werden konnten (die Startseite zeigt dann den Fehler).
 */
export async function setCurrentFirmaId(firmaId: string): Promise<{ standortWaehlen: boolean }> {
  const store = await cookies();
  // Nutzerwunsch 2026-10-06: Filter der Geräteliste gelten nur für die Firma,
  // für die sie gesetzt wurden (Lagerorte/Standorte sind firmenspezifisch).
  if (store.get(COOKIE_NAME)?.value !== firmaId) {
    await clearGeraeteFilterState();
    store.delete(STANDORT_COOKIE_NAME);
  }
  store.set(COOKIE_NAME, firmaId, COOKIE_OPTIONEN);

  let standorte;
  try {
    standorte = await listStandorteForFirma(firmaId);
  } catch {
    return { standortWaehlen: true };
  }
  if (standorte.length === 1) {
    store.set(STANDORT_COOKIE_NAME, standorte[0].id, COOKIE_OPTIONEN);
    return { standortWaehlen: false };
  }
  const gespeichert = store.get(STANDORT_COOKIE_NAME)?.value;
  return { standortWaehlen: !standorte.some((s) => s.id === gespeichert) };
}

/**
 * Setzt den aktuellen Standort. Server Actions sind direkt aufrufbar — der
 * Standort wird daher nur übernommen, wenn er zur aktuellen Firma gehört.
 * Ein Wechsel setzt die Geräte-Filter zurück (Lagerorte sind standortspezifisch).
 */
export async function setCurrentStandortId(standortId: string): Promise<{ ok: boolean }> {
  const store = await cookies();
  const firmaId = store.get(COOKIE_NAME)?.value;
  if (!firmaId) return { ok: false };

  let standorte;
  try {
    standorte = await listStandorteForFirma(firmaId);
  } catch {
    return { ok: false };
  }
  if (!standorte.some((s) => s.id === standortId)) return { ok: false };

  if (store.get(STANDORT_COOKIE_NAME)?.value !== standortId) {
    await clearGeraeteFilterState();
  }
  store.set(STANDORT_COOKIE_NAME, standortId, COOKIE_OPTIONEN);
  return { ok: true };
}
