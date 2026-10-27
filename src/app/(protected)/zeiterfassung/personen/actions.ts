"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { aktuellerBenutzerIstFreigeber } from "@/lib/auth/freigeber";
import { DataverseError } from "@/lib/dataverse/errors";
import {
  aendereArbeitsmodell,
  erstelleArbeitsmodell,
  getPersonByEmail,
  listArbeitsmodelle,
  listZeiterfassungEmails,
  loescheArbeitsmodell,
  normalisiereEmail,
  speicherePersonStammdaten,
  stellePersonSicher,
} from "@/lib/dataverse/zeiterfassung";
import { istGueltigesDatum } from "@/lib/zeiterfassung/datum";
import type { Arbeitstage } from "@/lib/zeiterfassung/soll";

export type ZeiterfassungAktionResult = { success: true } | { success: false; message: string };

const NUR_FREIGEBER = "Nur Freigeber dürfen die Zeiterfassung bearbeiten.";

const emailSchema = z
  .string()
  .trim()
  .min(3, "Ungültige E-Mail-Adresse.")
  .max(320, "Ungültige E-Mail-Adresse.")
  .refine((e) => e.includes("@"), "Ungültige E-Mail-Adresse.")
  .transform(normalisiereEmail);

const datumSchema = (meldung: string) =>
  z.string().trim().refine(istGueltigesDatum, meldung);

/** Leer → null; Komma als Dezimaltrennzeichen erlaubt. */
const optionaleZahl = (meldung: string) =>
  z
    .string()
    .trim()
    .transform((s) => (s === "" ? null : Number(s.replace(",", "."))))
    .refine((n) => n === null || Number.isFinite(n), meldung);

const stammdatenSchema = z
  .object({
    name: z.string().trim().max(100, "Der Name darf höchstens 100 Zeichen lang sein."),
    nichtAuswerten: z.boolean(),
    austrittAm: z.union([z.literal(""), datumSchema("Bitte ein gültiges Austrittsdatum angeben.")]),
    startsaldo: optionaleZahl("Der Startsaldo muss eine Zahl sein (z.B. 12.50 oder -3.25).").refine(
      (n) => n === null || Math.abs(n) < 10000,
      "Der Startsaldo muss zwischen -9999.99 und 9999.99 Stunden liegen."
    ),
    stichtag: z.union([z.literal(""), datumSchema("Bitte einen gültigen Stichtag angeben.")]),
  })
  .refine((d) => d.startsaldo === null || d.stichtag !== "", {
    message: "Zum Startsaldo gehört ein Stichtag.",
  })
  .refine((d) => d.startsaldo !== null || d.stichtag === "", {
    message: "Zum Stichtag gehört ein Startsaldo (auch 0 ist möglich).",
  });

export interface StammdatenEingabe {
  name: string;
  nichtAuswerten: boolean;
  austrittAm: string;
  startsaldo: string;
  stichtag: string;
}

const arbeitsmodellSchema = z
  .object({
    gueltigAb: datumSchema("Bitte ein gültiges Datum für „gültig ab“ angeben."),
    pensum: optionaleZahl("Das Pensum muss eine Zahl sein.")
      .refine((n) => n !== null, "Bitte ein Pensum angeben.")
      .refine((n) => n === null || (n >= 0 && n <= 100), "Das Pensum muss zwischen 0 und 100 % liegen.")
      // Dataverse speichert eine Nachkommastelle.
      .transform((n) => Math.round((n ?? 0) * 10) / 10),
    arbeitstage: z.array(z.boolean()).length(7),
  })
  .refine((d) => d.pensum === 0 || d.arbeitstage.some(Boolean), {
    message: "Bei einem Pensum über 0 % mindestens einen Arbeitstag auswählen.",
  });

export interface ArbeitsmodellFormEingabe {
  gueltigAb: string;
  pensum: string;
  arbeitstage: boolean[];
}

function fehlermeldung(error: unknown, standard: string): string {
  return error instanceof DataverseError ? error.message : standard;
}

function erneuern(email: string) {
  revalidatePath("/zeiterfassung/personen");
  revalidatePath(`/zeiterfassung/personen/${encodeURIComponent(email)}`);
}

/**
 * Personen entstehen nur aus den E-Mails der Zeiteinträge (Out of Scope:
 * Anlegen von Hand) — bevor eine Person neu angelegt wird, muss ihre E-Mail
 * dort vorkommen (oder sie existiert bereits).
 */
async function istBekanntePerson(email: string): Promise<boolean> {
  if (await getPersonByEmail(email)) return true;
  return (await listZeiterfassungEmails()).includes(email);
}

export async function speicherePersonAction(
  email: string,
  eingabe: StammdatenEingabe
): Promise<ZeiterfassungAktionResult> {
  if (!(await aktuellerBenutzerIstFreigeber())) return { success: false, message: NUR_FREIGEBER };

  const mail = emailSchema.safeParse(email);
  const parsed = stammdatenSchema.safeParse(eingabe);
  if (!mail.success) return { success: false, message: mail.error.issues[0]?.message ?? "Ungültige Eingabe." };
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };

  try {
    if (!(await istBekanntePerson(mail.data))) {
      return { success: false, message: "Diese Person kommt in der Zeiterfassung nicht vor." };
    }
    await speicherePersonStammdaten(mail.data, {
      name: parsed.data.name || null,
      nichtAuswerten: parsed.data.nichtAuswerten,
      austrittAm: parsed.data.austrittAm || null,
      startsaldo: parsed.data.startsaldo === null ? null : Math.round(parsed.data.startsaldo * 100) / 100,
      stichtag: parsed.data.stichtag || null,
    });
  } catch (error) {
    return { success: false, message: fehlermeldung(error, "Die Angaben konnten nicht gespeichert werden.") };
  }

  erneuern(mail.data);
  return { success: true };
}

/** Neue Version (`versionId` = null) oder Korrektur einer bestehenden. */
export async function speichereArbeitsmodellAction(
  email: string,
  versionId: string | null,
  eingabe: ArbeitsmodellFormEingabe
): Promise<ZeiterfassungAktionResult> {
  if (!(await aktuellerBenutzerIstFreigeber())) return { success: false, message: NUR_FREIGEBER };

  const mail = emailSchema.safeParse(email);
  const parsed = arbeitsmodellSchema.safeParse(eingabe);
  if (!mail.success) return { success: false, message: mail.error.issues[0]?.message ?? "Ungültige Eingabe." };
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };
  if (versionId !== null && !z.guid().safeParse(versionId).success) {
    return { success: false, message: "Ungültige Version." };
  }
  const daten = { ...parsed.data, arbeitstage: parsed.data.arbeitstage as Arbeitstage };

  try {
    const person = await getPersonByEmail(mail.data);
    const versionen = person ? await listArbeitsmodelle(person.id) : [];
    if (versionId !== null && !versionen.some((v) => v.id === versionId)) {
      return { success: false, message: "Diese Version gibt es nicht mehr. Bitte die Seite neu laden." };
    }
    // Kein alternativer Schlüssel in Dataverse — doppelte Daten prüft das Tool.
    if (versionen.some((v) => v.id !== versionId && v.gueltigAb === daten.gueltigAb)) {
      return { success: false, message: "Für dieses Datum gibt es bereits eine Version." };
    }

    if (versionId !== null) {
      await aendereArbeitsmodell(versionId, mail.data, daten);
    } else {
      if (!person && !(await istBekanntePerson(mail.data))) {
        return { success: false, message: "Diese Person kommt in der Zeiterfassung nicht vor." };
      }
      const personId = person?.id ?? (await stellePersonSicher(mail.data));
      await erstelleArbeitsmodell(personId, mail.data, daten);
    }
  } catch (error) {
    return { success: false, message: fehlermeldung(error, "Das Arbeitsmodell konnte nicht gespeichert werden.") };
  }

  erneuern(mail.data);
  return { success: true };
}

export async function loescheArbeitsmodellAction(email: string, versionId: string): Promise<ZeiterfassungAktionResult> {
  if (!(await aktuellerBenutzerIstFreigeber())) return { success: false, message: NUR_FREIGEBER };

  const mail = emailSchema.safeParse(email);
  if (!mail.success || !z.guid().safeParse(versionId).success) {
    return { success: false, message: "Ungültige Anfrage." };
  }

  try {
    const person = await getPersonByEmail(mail.data);
    const versionen = person ? await listArbeitsmodelle(person.id) : [];
    // Nur Versionen dieser Person löschen; bereits gelöschte gelten als erledigt.
    if (versionen.some((v) => v.id === versionId)) {
      await loescheArbeitsmodell(versionId);
    }
  } catch (error) {
    if (!(error instanceof DataverseError && error.category === "not_found")) {
      return { success: false, message: fehlermeldung(error, "Die Version konnte nicht gelöscht werden.") };
    }
  }

  erneuern(mail.data);
  return { success: true };
}
