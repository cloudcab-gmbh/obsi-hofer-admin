"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { aktuellerBenutzerIstFreigeber } from "@/lib/auth/freigeber";
import { DataverseError } from "@/lib/dataverse/errors";
import {
  erstelleZeiteintrag,
  getPersonByEmail,
  getZeiteintragFuerKorrektur,
  listZeiteintraege,
  listZeiterfassungEmails,
  normalisiereEmail,
  setzeGehen,
} from "@/lib/dataverse/zeiterfassung";
import {
  alsSchweizerZeitpunkt,
  folgetag,
  heuteSchweiz,
  istGueltigesDatum,
  istGueltigeUhrzeit,
  zuSchweizerDatum,
} from "@/lib/zeiterfassung/datum";

export type GehenNachtragenResult = { success: true } | { success: false; message: string };

/** Mehr als 14 h am Stück gilt als unplausibel (wie in der Tagesauswertung). */
const MAX_DAUER_MS = 14 * 60 * 60 * 1000;

const eingabeSchema = z.object({
  eintragId: z.guid("Ungültiger Eintrag."),
  uhrzeit: z.string().refine(istGueltigeUhrzeit, "Bitte eine Uhrzeit im Format HH:MM angeben."),
  folgetag: z.boolean(),
});

/**
 * PROJ-13: Trägt bei einem offenen Eintrag (Kommen ohne Gehen) das Gehen nach
 * (Nutzer-Entscheidung 2026-10-27). Nur offene Einträge — erfasste Zeiten
 * werden nicht überschrieben.
 */
export async function trageGehenNachAction(
  eintragId: string,
  uhrzeit: string,
  amFolgetag: boolean
): Promise<GehenNachtragenResult> {
  if (!(await aktuellerBenutzerIstFreigeber())) {
    return { success: false, message: "Nur Freigeber dürfen Zeiteinträge korrigieren." };
  }
  const parsed = eingabeSchema.safeParse({ eintragId, uhrzeit, folgetag: amFolgetag });
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };

  try {
    const eintrag = await getZeiteintragFuerKorrektur(parsed.data.eintragId);
    if (eintrag.typ !== "arbeitszeit" || !eintrag.kommen) {
      return { success: false, message: "Dieser Eintrag hat kein „Kommen“ und kann nicht ergänzt werden." };
    }
    if (eintrag.gehen) {
      return { success: false, message: "Für diesen Eintrag ist bereits ein „Gehen“ erfasst. Bitte die Seite neu laden." };
    }

    const kommenTag = zuSchweizerDatum(eintrag.kommen)!;
    const gehen = alsSchweizerZeitpunkt(parsed.data.folgetag ? folgetag(kommenTag) : kommenTag, parsed.data.uhrzeit);
    const dauer = new Date(gehen).getTime() - new Date(eintrag.kommen).getTime();
    if (dauer <= 0) return { success: false, message: "„Gehen“ muss nach „Kommen“ liegen." };
    if (dauer > MAX_DAUER_MS) return { success: false, message: "Mehr als 14 Stunden am Stück sind nicht möglich." };

    await setzeGehen(parsed.data.eintragId, gehen);
  } catch (error) {
    const message =
      error instanceof DataverseError && error.category === "not_found"
        ? "Diesen Eintrag gibt es nicht mehr. Bitte die Seite neu laden."
        : error instanceof DataverseError
          ? error.message
          : "Das „Gehen“ konnte nicht gespeichert werden.";
    return { success: false, message };
  }

  revalidatePath("/zeiterfassung");
  return { success: true };
}

const MAX_PAARE = 10;

const tagErfassenSchema = z
  .object({
    email: z.string().trim().min(3).max(320),
    datum: z.string().refine(istGueltigesDatum, "Ungültiges Datum."),
    typ: z.enum(["arbeitszeit", "krankheit", "komp-glz"], "Ungültiger Typ."),
    paare: z
      .array(
        z.object({
          kommen: z.string().refine(istGueltigeUhrzeit, "Bitte Uhrzeiten im Format HH:MM angeben."),
          gehen: z.string().refine(istGueltigeUhrzeit, "Bitte Uhrzeiten im Format HH:MM angeben."),
        })
      )
      .max(MAX_PAARE, `Höchstens ${MAX_PAARE} Paare auf einmal.`),
    mittagessen: z.boolean(),
    abendessen: z.boolean(),
    bemerkung: z.string().trim().max(500, "Die Bemerkung darf höchstens 500 Zeichen lang sein."),
  })
  .refine((d) => d.typ !== "arbeitszeit" || d.paare.length > 0, { message: "Mindestens ein Paar Kommen–Gehen erfassen." });

export type TagErfassenEingabe = z.input<typeof tagErfassenSchema>;
export type TagErfassenResult = { success: true; angelegt: number } | { success: false; message: string };

/**
 * PROJ-13 (Nutzerwunsch 2026-10-27): Einträge für einen Tag nachträglich
 * erfassen — Arbeitszeit mit einem oder mehreren Kommen/Gehen-Paaren (je ein
 * Eintrag wie in der Erfassungs-App) oder ganztägig Krankheit / Komp. GLZ.
 * Nur Tage bis heute; Überschneidungen mit bestehenden Einträgen werden abgelehnt.
 */
export async function erfasseTagAction(eingabe: TagErfassenEingabe): Promise<TagErfassenResult> {
  if (!(await aktuellerBenutzerIstFreigeber())) {
    return { success: false, message: "Nur Freigeber dürfen Zeiteinträge erfassen." };
  }
  const parsed = tagErfassenSchema.safeParse(eingabe);
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };
  const d = parsed.data;
  const email = normalisiereEmail(d.email);
  if (d.datum > heuteSchweiz()) return { success: false, message: "Einträge in der Zukunft sind nicht möglich." };

  // Zeiten in Schweizer Zeit am gewählten Tag, Paare untereinander ohne Überschneidung.
  const intervalle = (d.typ === "arbeitszeit" ? d.paare : []).map((p) => ({
    kommen: alsSchweizerZeitpunkt(d.datum, p.kommen),
    gehen: alsSchweizerZeitpunkt(d.datum, p.gehen),
  }));
  for (const i of intervalle) {
    const dauer = new Date(i.gehen).getTime() - new Date(i.kommen).getTime();
    if (dauer <= 0) return { success: false, message: "„Gehen“ muss nach „Kommen“ liegen." };
    if (dauer > MAX_DAUER_MS) return { success: false, message: "Mehr als 14 Stunden am Stück sind nicht möglich." };
  }
  const ueberschneiden = (a: { kommen: string; gehen: string }, b: { kommen: string; gehen: string }) =>
    a.kommen < b.gehen && b.kommen < a.gehen;
  if (intervalle.some((a, i) => intervalle.some((b, j) => i < j && ueberschneiden(a, b)))) {
    return { success: false, message: "Die erfassten Paare überschneiden sich." };
  }

  let angelegt = 0;
  try {
    // Personen entstehen nur aus den Zeiteinträgen (PROJ-14) — keine neuen E-Mails erfinden.
    if (!(await getPersonByEmail(email)) && !(await listZeiterfassungEmails()).includes(email)) {
      return { success: false, message: "Diese Person kommt in der Zeiterfassung nicht vor." };
    }
    const bestehende = await listZeiteintraege(email, d.datum, d.datum);
    if (d.typ !== "arbeitszeit" && bestehende.some((e) => e.typ === d.typ)) {
      return { success: false, message: "Für diesen Tag ist dieser Eintrag bereits erfasst." };
    }
    const bestehendeIntervalle = bestehende
      .filter((e) => e.typ === "arbeitszeit" && e.kommen && e.gehen)
      .map((e) => ({ kommen: new Date(e.kommen!).toISOString(), gehen: new Date(e.gehen!).toISOString() }));
    const normiert = intervalle.map((i) => ({ kommen: new Date(i.kommen).toISOString(), gehen: new Date(i.gehen).toISOString() }));
    if (normiert.some((n) => bestehendeIntervalle.some((b) => ueberschneiden(n, b)))) {
      return { success: false, message: "Ein Paar überschneidet sich mit einem bestehenden Eintrag dieses Tages." };
    }

    const bemerkung = d.bemerkung || null;
    const neue =
      d.typ === "arbeitszeit"
        ? intervalle.map((i, n) => ({
            typ: d.typ,
            ...i,
            // Essen und Bemerkung gelten für den Tag — einmal genügt (Regel "ja, sobald ein Eintrag ja hat").
            mittagessen: n === 0 && d.mittagessen,
            abendessen: n === 0 && d.abendessen,
            bemerkung: n === 0 ? bemerkung : null,
          }))
        : [{ typ: d.typ, kommen: null, gehen: null, mittagessen: d.mittagessen, abendessen: d.abendessen, bemerkung }];
    for (const eintrag of neue) {
      await erstelleZeiteintrag(email, d.datum, eintrag);
      angelegt++;
    }
  } catch (error) {
    const grund = error instanceof DataverseError ? error.message : "Unbekannter Fehler.";
    revalidatePath("/zeiterfassung");
    return {
      success: false,
      message:
        angelegt > 0
          ? `Nur ${angelegt} Eintrag/Einträge gespeichert, danach Fehler: ${grund} Bitte den Tag prüfen.`
          : `Der Eintrag konnte nicht gespeichert werden. ${grund}`,
    };
  }

  revalidatePath("/zeiterfassung");
  return { success: true, angelegt };
}
