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
  listArbeitsmodelle,
  listZeiterfassungEmails,
  loescheZeiteintrag,
  normalisiereEmail,
  setzeGehen,
} from "@/lib/dataverse/zeiterfassung";
import {
  alsSchweizerMitternacht,
  alsSchweizerZeitpunkt,
  folgetag,
  heuteSchweiz,
  istGueltigesDatum,
  istGueltigeUhrzeit,
  zuSchweizerDatum,
} from "@/lib/zeiterfassung/datum";
import { planeFerien, type FerienPlan } from "@/lib/zeiterfassung/ferien";
import { uebersprungenText } from "@/lib/zeiterfassung/format";

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
    // PROJ-15: "frei" = Kennzeichnung ohne Rechenwirkung; Ferien laufen über erfasseFerienAction.
    typ: z.enum(["arbeitszeit", "krankheit", "komp-glz", "frei"], "Ungültiger Typ."),
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
  // "Frei" darf wie Ferien auch in der Zukunft liegen (PROJ-15).
  if (d.datum > heuteSchweiz() && d.typ !== "frei") {
    return { success: false, message: "Einträge in der Zukunft sind nicht möglich." };
  }

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
        : [
            {
              typ: d.typ,
              // Der Power-Automate-Flow braucht ein "Kommen" (startOfDay) — ganztägige
              // Einträge erhalten den Tagesbeginn, ohne "Gehen" (Fehler im Browser-Test 2026-10-27).
              kommen: alsSchweizerMitternacht(d.datum),
              gehen: null,
              mittagessen: d.mittagessen,
              abendessen: d.abendessen,
              bemerkung,
            },
          ];
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

// ---------------------------------------------------------------------------
// PROJ-15: Ferien

/** Längster Zeitraum, der in einem Schritt erfasst werden kann. */
const MAX_FERIEN_TAGE = 366;

const ferienSchema = z
  .object({
    email: z.string().trim().min(3).max(320),
    von: z.string().refine(istGueltigesDatum, "Bitte ein gültiges Datum „von“ angeben."),
    bis: z.string().refine(istGueltigesDatum, "Bitte ein gültiges Datum „bis“ angeben."),
    halberTag: z.boolean(),
    bemerkung: z.string().trim().max(500, "Die Bemerkung darf höchstens 500 Zeichen lang sein."),
  })
  .refine((d) => d.von <= d.bis, { message: "„bis“ darf nicht vor „von“ liegen." })
  .refine((d) => !d.halberTag || d.von === d.bis, { message: "Ein halber Ferientag ist nur für einen einzelnen Tag möglich." })
  .refine((d) => (Date.parse(d.bis) - Date.parse(d.von)) / 86_400_000 < MAX_FERIEN_TAGE, {
    message: "Höchstens ein Jahr auf einmal erfassen.",
  });

export type FerienEingabe = z.input<typeof ferienSchema>;
export type FerienVorschauResult = { success: true; plan: FerienPlan } | { success: false; message: string };
export type FerienErfassenResult = { success: true; angelegt: number } | { success: false; message: string };

/** Arbeitsmodell und bestehende Ferientage der Person — Grundlage für Vorschau und Speichern. */
async function berechneFerienPlan(d: z.output<typeof ferienSchema>): Promise<FerienPlan | string> {
  const email = normalisiereEmail(d.email);
  const person = await getPersonByEmail(email);
  if (!person && !(await listZeiterfassungEmails()).includes(email)) return "Diese Person kommt in der Zeiterfassung nicht vor.";
  const versionen = person ? await listArbeitsmodelle(person.id) : [];
  const bestehende = await listZeiteintraege(email, d.von, d.bis);
  const ferientage = new Set(bestehende.filter((e) => e.typ === "ferien").map((e) => e.datum));
  return planeFerien({ versionen, austrittAm: person?.austrittAm ?? null }, d.von, d.bis, ferientage, d.halberTag);
}

async function pruefeFerien(eingabe: FerienEingabe): Promise<z.output<typeof ferienSchema> | string> {
  if (!(await aktuellerBenutzerIstFreigeber())) return "Nur Freigeber dürfen Ferien erfassen.";
  const parsed = ferienSchema.safeParse(eingabe);
  return parsed.success ? parsed.data : (parsed.error.issues[0]?.message ?? "Ungültige Eingabe.");
}

/** Vorschau: welche Tage Ferientage würden (gleiche Regeln wie beim Speichern). */
export async function planeFerienAction(eingabe: FerienEingabe): Promise<FerienVorschauResult> {
  const d = await pruefeFerien(eingabe);
  if (typeof d === "string") return { success: false, message: d };
  try {
    const plan = await berechneFerienPlan(d);
    return typeof plan === "string" ? { success: false, message: plan } : { success: true, plan };
  } catch (error) {
    return { success: false, message: error instanceof DataverseError ? error.message : "Die Ferien konnten nicht berechnet werden." };
  }
}

/**
 * Legt für jeden Tag mit Soll im Zeitraum einen Ferien-Eintrag an (Typ 3,
 * Kommen = Tagesbeginn, weil der Flow ein Kommen braucht). Bestehende
 * Ferientage werden übersprungen — ein zweiter Versuch nach einem Fehler
 * legt nichts doppelt an.
 */
export async function erfasseFerienAction(eingabe: FerienEingabe): Promise<FerienErfassenResult> {
  const d = await pruefeFerien(eingabe);
  if (typeof d === "string") return { success: false, message: d };

  let angelegt = 0;
  try {
    const plan = await berechneFerienPlan(d);
    if (typeof plan === "string") return { success: false, message: plan };
    if (plan.tage.length === 0) {
      // Grund nennen (Nutzer-Test 2026-10-27: Meldung ohne Grund war unklar).
      return {
        success: false,
        message: `Kein Ferientag zu erfassen — übersprungen: ${uebersprungenText(plan) || "keine Tage"}.`,
      };
    }
    for (const tag of plan.tage) {
      await erstelleZeiteintrag(normalisiereEmail(d.email), tag, {
        typ: "ferien",
        kommen: alsSchweizerMitternacht(tag),
        gehen: null,
        mittagessen: false,
        abendessen: false,
        bemerkung: d.bemerkung || null,
        halberTag: d.halberTag,
      });
      angelegt++;
    }
  } catch (error) {
    const grund = error instanceof DataverseError ? error.message : "Unbekannter Fehler.";
    revalidatePath("/zeiterfassung", "layout");
    return {
      success: false,
      message:
        angelegt > 0
          ? `Nur ${angelegt} Ferientag(e) gespeichert, danach Fehler: ${grund} Ein erneuter Versuch ergänzt die fehlenden Tage.`
          : `Die Ferien konnten nicht gespeichert werden. ${grund}`,
    };
  }

  revalidatePath("/zeiterfassung", "layout");
  return { success: true, angelegt };
}

export type LoeschenResult = { success: true; geloescht: number } | { success: false; message: string };

/**
 * PROJ-15: löscht Ferien- und Frei-Einträge. Der Typ jedes Eintrags wird vor
 * dem Löschen neu gelesen — andere Typen (gestempelte Zeiten, Krankheit,
 * Komp. GLZ) werden nie gelöscht.
 */
export async function loescheAbwesenheitenAction(eintragIds: string[]): Promise<LoeschenResult> {
  if (!(await aktuellerBenutzerIstFreigeber())) {
    return { success: false, message: "Nur Freigeber dürfen Einträge löschen." };
  }
  const ids = z.array(z.guid()).min(1).max(MAX_FERIEN_TAGE).safeParse(eintragIds);
  if (!ids.success) return { success: false, message: "Ungültige Auswahl." };

  let geloescht = 0;
  try {
    for (const id of ids.data) {
      let typ;
      try {
        typ = (await getZeiteintragFuerKorrektur(id)).typ;
      } catch (error) {
        // Bereits gelöscht → Ziel erreicht.
        if (error instanceof DataverseError && error.category === "not_found") continue;
        throw error;
      }
      if (typ !== "ferien" && typ !== "frei") {
        return { success: false, message: "Nur Ferien- und Frei-Einträge können gelöscht werden." };
      }
      await loescheZeiteintrag(id);
      geloescht++;
    }
  } catch (error) {
    const grund = error instanceof DataverseError ? error.message : "Unbekannter Fehler.";
    revalidatePath("/zeiterfassung", "layout");
    return { success: false, message: `Löschen abgebrochen nach ${geloescht} Eintrag/Einträgen: ${grund}` };
  }

  revalidatePath("/zeiterfassung", "layout");
  return { success: true, geloescht };
}
