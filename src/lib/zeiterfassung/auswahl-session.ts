"use server";

import { cookies } from "next/headers";
import { aktuellerBenutzerIstFreigeber } from "@/lib/auth/freigeber";
import { istGueltigerMonat } from "./datum";

// PROJ-13: Zuletzt gewählte Person und Monat des Zeitnachweises, damit der
// Menüpunkt dort weitermacht (die Auswahl steht zusätzlich in der Adresse).
const COOKIE_NAME = "zeitnachweis_auswahl";
const COOKIE_OPTIONEN = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 30, // 30 Tage
  path: "/",
};

export interface ZeitnachweisAuswahl {
  person: string | null;
  monat: string | null;
}

export async function getZeitnachweisAuswahl(): Promise<ZeitnachweisAuswahl> {
  try {
    const wert = JSON.parse((await cookies()).get(COOKIE_NAME)?.value ?? "{}");
    return {
      person: typeof wert.person === "string" ? wert.person : null,
      monat: typeof wert.monat === "string" && istGueltigerMonat(wert.monat) ? wert.monat : null,
    };
  } catch {
    return { person: null, monat: null };
  }
}

export async function merkeZeitnachweisAuswahl(person: string | null, monat: string): Promise<void> {
  if (!(await aktuellerBenutzerIstFreigeber())) return;
  if (!istGueltigerMonat(monat) || (person !== null && (typeof person !== "string" || person.length > 320))) return;
  (await cookies()).set(COOKIE_NAME, JSON.stringify({ person, monat }), COOKIE_OPTIONEN);
}
