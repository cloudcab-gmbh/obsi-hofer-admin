"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { aktuellerBenutzerIstFreigeber, aktuellerFreigeberName } from "@/lib/auth/freigeber";
import { ladeLogoDataUrl, renderePdf } from "@/lib/pdf/grundlage";
import { ladeZeitnachweis } from "@/lib/zeiterfassung/zeitnachweis-laden";
import { bauePdfDokument, zeitnachweisDateiname } from "@/lib/zeiterfassung/zeitnachweis-pdf";
import { DataverseError } from "@/lib/dataverse/errors";
import { ladeFeiertagskalender } from "@/lib/dataverse/feiertage";
import {
  erstelleZeiteintrag,
  getPersonByEmail,
  getZeiteintragFuerKorrektur,
  korrigiereZeiteintrag,
  listZeiteintraege,
  listArbeitsmodelle,
  listZeiterfassungEmails,
  loescheZeiteintrag,
  markiereAlsGeloescht,
  setzeHalberTag,
  stosseFlowAn,
  normalisiereEmail,
} from "@/lib/dataverse/zeiterfassung";
import {
  alsSchweizerMitternacht,
  alsSchweizerZeitpunkt,
  folgetag,
  heuteSchweiz,
  tageDesMonats,
  istGueltigesDatum,
  istGueltigerMonat,
  istGueltigeUhrzeit,
  zuSchweizerUhrzeit,
} from "@/lib/zeiterfassung/datum";
import { paarText, pruefeDauer, pruefeKorrektur, ueberschneiden } from "@/lib/zeiterfassung/eintrag-pruefung";
import { bestehendeFerienNachTag, planeFerien, type FerienPlan } from "@/lib/zeiterfassung/ferien";
import { uebersprungenText } from "@/lib/zeiterfassung/format";

export type EintragAendernResult = { success: true } | { success: false; message: string };

const NICHT_MEHR_DA = "Diesen Eintrag gibt es nicht mehr. Bitte die Seite neu laden.";

const aendernSchema = z.object({
  eintragId: z.guid("Ungültiger Eintrag."),
  kommen: z.string().refine(istGueltigeUhrzeit, "Bitte „Kommen“ im Format HH:MM angeben."),
  // Leer = Gehen bleibt offen (nur erlaubt, wenn es vorher offen war).
  gehen: z.string().refine((u) => u === "" || istGueltigeUhrzeit(u), "Bitte „Gehen“ im Format HH:MM angeben."),
  bemerkung: z.string().trim().max(500, "Die Bemerkung darf höchstens 500 Zeichen lang sein."),
  // QA BUG-1: Gehen nach Mitternacht (Einsatz über Mitternacht).
  gehenAmFolgetag: z.boolean().optional(),
});

export type EintragAendernEingabe = z.input<typeof aendernSchema>;

/**
 * PROJ-22: Ändert Kommen, Gehen und Bemerkung eines Arbeitszeit-Eintrags
 * (ersetzt „Gehen nachtragen“ aus PROJ-13). Gleiche Prüfungen wie „Tag
 * erfassen“; Gehen gilt am Tag des Eintrags, auf Wunsch am Folgetag (QA BUG-1).
 * Der Eintrag wird als „im Tool
 * korrigiert“ markiert und ist damit vor dem SharePoint-Flow geschützt.
 */
export async function aendereZeiteintragAction(eingabe: EintragAendernEingabe): Promise<EintragAendernResult> {
  const freigeber = await aktuellerFreigeberName();
  if (!freigeber) return { success: false, message: "Nur Freigeber dürfen Zeiteinträge ändern." };
  const parsed = aendernSchema.safeParse(eingabe);
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };
  const d = parsed.data;

  try {
    const eintrag = await getZeiteintragFuerKorrektur(d.eintragId);
    if (eintrag.geloescht || !eintrag.datum) return { success: false, message: NICHT_MEHR_DA };
    if (eintrag.typ !== "arbeitszeit" || !eintrag.kommen) {
      return { success: false, message: "Nur Arbeitszeit-Einträge können geändert werden." };
    }

    const kommen = alsSchweizerZeitpunkt(eintrag.datum, d.kommen);
    const gehen = d.gehen ? alsSchweizerZeitpunkt(d.gehenAmFolgetag ? folgetag(eintrag.datum) : eintrag.datum, d.gehen) : null;
    const bemerkung = d.bemerkung || null;
    const zeitpunkt = (iso: string) => new Date(iso).getTime();
    // Unverändert (gleiche Zeitpunkte, gleiche Bemerkung): nichts speichern, keine Markierung.
    const gleicheZeiten =
      zeitpunkt(kommen) === zeitpunkt(eintrag.kommen) &&
      (gehen === null ? eintrag.gehen === null : !!eintrag.gehen && zeitpunkt(gehen) === zeitpunkt(eintrag.gehen));
    if (gleicheZeiten && bemerkung === (eintrag.bemerkung?.trim() || null)) return { success: true };

    const andere = (await listZeiteintraege(eintrag.email, eintrag.datum, eintrag.datum)).filter(
      (e) => e.id !== d.eintragId && e.typ === "arbeitszeit"
    );
    const fehler = pruefeKorrektur({ kommen, gehen, hatteGehen: eintrag.gehen !== null, jetzt: new Date(), andere });
    if (fehler) return { success: false, message: fehler };

    await korrigiereZeiteintrag(d.eintragId, {
      datum: eintrag.datum,
      kommen,
      gehen,
      bemerkung,
      von: freigeber,
      // QA BUG-2: „vorher“ nur, wenn sich die Zeiten ändern; sonst bleibt der bisherige Wert.
      vorher: gleicheZeiten ? undefined : paarText(zuSchweizerUhrzeit(eintrag.kommen), eintrag.gehen ? zuSchweizerUhrzeit(eintrag.gehen) : null),
    });
  } catch (error) {
    const message =
      error instanceof DataverseError && error.category === "not_found"
        ? NICHT_MEHR_DA
        : error instanceof DataverseError
          ? error.message
          : "Der Eintrag konnte nicht gespeichert werden.";
    return { success: false, message };
  }

  revalidatePath("/zeiterfassung", "layout");
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
    const dauer = pruefeDauer(i.kommen, i.gehen);
    if (dauer) return { success: false, message: dauer };
  }
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
      .map((e) => ({ kommen: e.kommen!, gehen: e.gehen! }));
    if (intervalle.some((n) => bestehendeIntervalle.some((b) => ueberschneiden(n, b)))) {
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
    revalidatePath("/zeiterfassung", "layout");
    return {
      success: false,
      message:
        angelegt > 0
          ? `Nur ${angelegt} Eintrag/Einträge gespeichert, danach Fehler: ${grund} Bitte den Tag prüfen.`
          : `Der Eintrag konnte nicht gespeichert werden. ${grund}`,
    };
  }

  revalidatePath("/zeiterfassung", "layout");
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
  const bestehende = bestehendeFerienNachTag(await listZeiteintraege(email, d.von, d.bis));
  // PROJ-18: gepflegte Feiertage werden übersprungen (halbe zählen 0.5).
  const feiertage = await ladeFeiertagskalender(d.von, d.bis);
  return planeFerien({ versionen, austrittAm: person?.austrittAm ?? null, feiertage }, d.von, d.bis, bestehende, d.halberTag);
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
 * Ferientage werden übersprungen bzw. auf ganz/halb umgestellt (QA BUG-1) —
 * ein zweiter Versuch nach einem Fehler legt nichts doppelt an. Danach werden
 * Doppelungen bereinigt (QA BUG-3).
 */
export async function erfasseFerienAction(eingabe: FerienEingabe): Promise<FerienErfassenResult> {
  const d = await pruefeFerien(eingabe);
  if (typeof d === "string") return { success: false, message: d };

  let angelegt = 0;
  try {
    const plan = await berechneFerienPlan(d);
    if (typeof plan === "string") return { success: false, message: plan };
    if (plan.tage.length === 0 && plan.umstellen.length === 0) {
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
    for (const { eintragIds } of plan.umstellen) {
      for (const id of eintragIds) await setzeHalberTag(id, d.halberTag);
      angelegt++;
    }
    await bereinigeDoppelteFerien(normalisiereEmail(d.email), d.von, d.bis);
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

/**
 * QA BUG-3: Speichern zwei Freigeber gleichzeitig dieselben Ferien, entstehen
 * zwei Einträge pro Tag. Behalten wird pro Tag der Eintrag mit der kleinsten ID —
 * eine feste Regel, damit gleichzeitige Bereinigungen nicht beide löschen.
 */
async function bereinigeDoppelteFerien(email: string, von: string, bis: string): Promise<void> {
  for (const { eintragIds } of bestehendeFerienNachTag(await listZeiteintraege(email, von, bis)).values()) {
    for (const id of [...eintragIds].sort().slice(1)) {
      try {
        await loescheMitNachpruefung(id);
      } catch (error) {
        if (!(error instanceof DataverseError && error.category === "not_found")) throw error;
      }
    }
  }
}

/**
 * Löscht einen Zeiteintrag. Lehnt Dataverse ab, weil gleichzeitig schon eine
 * andere Löschung desselben Eintrags läuft ("More than one concurrent Delete
 * requests", Nutzer-Test 2026-10-27), zählt das als Erfolg, sofern der Eintrag
 * danach weg ist.
 */
async function loescheMitNachpruefung(id: string): Promise<void> {
  try {
    await loescheZeiteintrag(id);
  } catch (error) {
    if (!(error instanceof DataverseError) || error.category === "not_found") throw error;
    try {
      await getZeiteintragFuerKorrektur(id);
    } catch (nachher) {
      if (nachher instanceof DataverseError && nachher.category === "not_found") return;
    }
    throw error;
  }
}

export type LoeschenResult = { success: true; geloescht: number } | { success: false; message: string };

/**
 * PROJ-15: löscht Ferien- und Frei-Einträge; seit 2026-10-27 (Nutzerwunsch)
 * auch einzelne Arbeitszeit-, Krankheits- und Komp.-GLZ-Einträge. Der Typ
 * wird vor dem Löschen neu gelesen — Einträge unbekannten Typs werden nie gelöscht.
 * PROJ-22: Einträge aus SharePoint werden als „im Tool gelöscht“ markiert statt
 * entfernt (sonst legt der Flow sie wieder an); im Tool erfasste endgültig gelöscht.
 */
export async function loescheAbwesenheitenAction(eintragIds: string[]): Promise<LoeschenResult> {
  const freigeber = await aktuellerFreigeberName();
  if (!freigeber) return { success: false, message: "Nur Freigeber dürfen Einträge löschen." };
  const ids = z.array(z.guid()).min(1).max(MAX_FERIEN_TAGE).safeParse(eintragIds);
  if (!ids.success) return { success: false, message: "Ungültige Auswahl." };

  let geloescht = 0;
  /** Betroffene Person und Tag — für das Anstossen des Flows danach. */
  const betroffen = new Map<string, { email: string; datum: string }>();
  try {
    for (const id of ids.data) {
      let eintrag;
      try {
        eintrag = await getZeiteintragFuerKorrektur(id);
        if (eintrag.email && eintrag.datum) betroffen.set(`${eintrag.email}|${eintrag.datum}`, { email: eintrag.email, datum: eintrag.datum });
      } catch (error) {
        // Bereits gelöscht → Ziel erreicht.
        if (error instanceof DataverseError && error.category === "not_found") continue;
        throw error;
      }
      if (eintrag.geloescht) continue;
      if (eintrag.typ === "unbekannt") {
        return { success: false, message: "Einträge unbekannten Typs können im Tool nicht gelöscht werden." };
      }
      if (typeof eintrag.sharepointId === "number") await markiereAlsGeloescht(id, freigeber);
      else await loescheMitNachpruefung(id);
      geloescht++;
    }
  } catch (error) {
    const grund = error instanceof DataverseError ? error.message : "Unbekannter Fehler.";
    revalidatePath("/zeiterfassung", "layout");
    return { success: false, message: `Löschen abgebrochen nach ${geloescht} Eintrag/Einträgen: ${grund}` };
  }

  await stosseFlowNachLoeschenAn([...betroffen.values()]);
  revalidatePath("/zeiterfassung", "layout");
  return { success: true, geloescht };
}

/**
 * Der Power-Automate-Flow läuft beim Löschen nicht (Nutzer-Test 2026-10-27).
 * Damit Tages- und Monatstotal stimmen, wird ein verbleibender Eintrag desselben
 * Tages — sonst desselben Monats — unverändert neu geschrieben; dabei läuft der
 * Flow. Ein Fehler hier lässt das Löschen bestehen (nur die Totals bleiben alt).
 */
async function stosseFlowNachLoeschenAn(betroffen: { email: string; datum: string }[]): Promise<void> {
  for (const { email, datum } of betroffen) {
    try {
      const amTag = await listZeiteintraege(email, datum, datum);
      const monat = datum.slice(0, 7);
      const kandidat = amTag[0] ?? (await listZeiteintraege(email, `${monat}-01`, tageDesMonats(monat).at(-1)!)).at(-1);
      if (kandidat) await stosseFlowAn(kandidat);
    } catch {
      // Totals bleiben veraltet; der Zeitnachweis zeigt dann den Abgleich-Hinweis.
    }
  }
}

// ---------------------------------------------------------------------------
// PROJ-16: Zeitnachweis als PDF

export type ZeitnachweisPdfResult = { success: true; pdfBase64: string; dateiname: string } | { success: false; message: string };

/**
 * Erzeugt das PDF des Zeitnachweises einer Person für einen Monat — mit
 * demselben Lade- und Rechenweg wie die Seite. Nichts wird gespeichert; das
 * PDF geht als Base64 an den Browser (wie der Prüfbericht-Export, PROJ-7).
 */
export async function erzeugeZeitnachweisPdfAction(email: string, monat: string): Promise<ZeitnachweisPdfResult> {
  const freigeber = await aktuellerFreigeberName();
  if (!freigeber) return { success: false, message: "Nur Freigeber dürfen Zeitnachweise erzeugen." };
  if (typeof email !== "string" || email.length > 320 || typeof monat !== "string" || !istGueltigerMonat(monat)) {
    return { success: false, message: "Ungültige Anfrage." };
  }

  try {
    const heute = heuteSchweiz();
    const geladen = await ladeZeitnachweis(email, monat, heute);
    if (!geladen) return { success: false, message: "Diese Person kommt in der Zeiterfassung nicht vor." };
    const dokument = bauePdfDokument({
      zeitnachweis: geladen.zeitnachweis,
      personName: geladen.person.anzeige,
      versionen: geladen.versionen,
      heute,
      erstelltVon: freigeber,
      logoDataUrl: ladeLogoDataUrl(),
    });
    const pdf = await renderePdf(dokument);
    return { success: true, pdfBase64: pdf.toString("base64"), dateiname: zeitnachweisDateiname(geladen.person.anzeige, monat) };
  } catch {
    // Keine Personendaten in Meldung oder Log.
    return { success: false, message: "Das PDF konnte nicht erzeugt werden. Bitte später erneut versuchen." };
  }
}
