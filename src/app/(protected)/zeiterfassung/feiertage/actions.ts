"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { aktuellerBenutzerIstFreigeber } from "@/lib/auth/freigeber";
import { DataverseError } from "@/lib/dataverse/errors";
import {
  aendereFeiertag,
  erstelleFeiertag,
  erstelleFeiertagsjahr,
  listFeiertagsjahre,
  loescheFeiertag,
  loescheFeiertagsjahr,
  type Feiertagsjahr,
} from "@/lib/dataverse/feiertage";
import { istGueltigesDatum } from "@/lib/zeiterfassung/datum";
import { vorschlagListe } from "@/lib/zeiterfassung/feiertage";

export type FeiertagResult = { success: true } | { success: false; message: string };

const NUR_FREIGEBER = "Nur Freigeber dürfen Feiertage pflegen.";
const jahrSchema = z.number().int().min(2000).max(2100);

function fehler(error: unknown, standard: string): FeiertagResult {
  return { success: false, message: error instanceof DataverseError ? error.message : standard };
}

async function gepflegtesJahr(jahr: number): Promise<Feiertagsjahr | null> {
  return (await listFeiertagsjahre(jahr, jahr))[0] ?? null;
}

function erneuern() {
  // Feiertage wirken auf Übersicht, Zeitnachweis und Ferien.
  revalidatePath("/zeiterfassung", "layout");
}

/** Speichert den automatischen Vorschlag als gepflegte Liste des Jahres. */
export async function uebernehmeJahrAction(jahr: number): Promise<FeiertagResult> {
  if (!(await aktuellerBenutzerIstFreigeber())) return { success: false, message: NUR_FREIGEBER };
  if (!jahrSchema.safeParse(jahr).success) return { success: false, message: "Ungültiges Jahr." };

  let angelegt = 0;
  try {
    if (await gepflegtesJahr(jahr)) return { success: false, message: "Dieses Jahr ist bereits übernommen. Bitte die Seite neu laden." };
    const jahrId = await erstelleFeiertagsjahr(jahr);
    for (const f of vorschlagListe(jahr)) {
      await erstelleFeiertag(jahrId, f);
      angelegt++;
    }
  } catch (error) {
    erneuern();
    return fehler(
      error,
      angelegt > 0
        ? `Nur ${angelegt} Feiertage übernommen. Bitte die fehlenden ergänzen oder das Jahr zurücksetzen.`
        : "Das Jahr konnte nicht übernommen werden."
    );
  }
  erneuern();
  return { success: true };
}

const feiertagSchema = z.object({
  jahr: jahrSchema,
  /** `null` = neuer Feiertag. */
  id: z.guid().nullable(),
  datum: z.string().refine(istGueltigesDatum, "Bitte ein gültiges Datum angeben."),
  name: z.string().trim().min(1, "Bitte einen Namen angeben.").max(100, "Der Name darf höchstens 100 Zeichen lang sein."),
  halb: z.boolean(),
});

export type FeiertagEingabe = z.input<typeof feiertagSchema>;

/** Feiertag hinzufügen oder ändern (Name, ganz/halb) — nur in einem übernommenen Jahr. */
export async function speichereFeiertagAction(eingabe: FeiertagEingabe): Promise<FeiertagResult> {
  if (!(await aktuellerBenutzerIstFreigeber())) return { success: false, message: NUR_FREIGEBER };
  const parsed = feiertagSchema.safeParse(eingabe);
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };
  const d = parsed.data;

  try {
    const jahr = await gepflegtesJahr(d.jahr);
    if (!jahr) return { success: false, message: "Dieses Jahr ist noch nicht übernommen." };
    if (d.id !== null) {
      if (!jahr.feiertage.some((f) => f.id === d.id)) {
        return { success: false, message: "Diesen Feiertag gibt es nicht mehr. Bitte die Seite neu laden." };
      }
      await aendereFeiertag(d.id, d);
    } else {
      if (!d.datum.startsWith(String(d.jahr))) return { success: false, message: `Das Datum muss im Jahr ${d.jahr} liegen.` };
      if (jahr.feiertage.some((f) => f.datum === d.datum)) {
        return { success: false, message: "An diesem Datum gibt es bereits einen Feiertag." };
      }
      await erstelleFeiertag(jahr.id, d);
    }
  } catch (error) {
    return fehler(error, "Der Feiertag konnte nicht gespeichert werden.");
  }
  erneuern();
  return { success: true };
}

export async function entferneFeiertagAction(jahr: number, id: string): Promise<FeiertagResult> {
  if (!(await aktuellerBenutzerIstFreigeber())) return { success: false, message: NUR_FREIGEBER };
  if (!jahrSchema.safeParse(jahr).success || !z.guid().safeParse(id).success) return { success: false, message: "Ungültige Anfrage." };

  try {
    const gepflegt = await gepflegtesJahr(jahr);
    // Nur Feiertage dieses Jahres; bereits entfernte gelten als erledigt.
    if (gepflegt?.feiertage.some((f) => f.id === id)) await loescheFeiertag(id);
  } catch (error) {
    if (!(error instanceof DataverseError && error.category === "not_found")) {
      return fehler(error, "Der Feiertag konnte nicht entfernt werden.");
    }
  }
  erneuern();
  return { success: true };
}

/**
 * Setzt ein Jahr auf den Vorschlag zurück: zuerst die Feiertage löschen, dann
 * das Jahr (Löschweitergabe in Dataverse ist "Verknüpfung entfernen").
 */
export async function setzeJahrZurueckAction(jahr: number): Promise<FeiertagResult> {
  if (!(await aktuellerBenutzerIstFreigeber())) return { success: false, message: NUR_FREIGEBER };
  if (!jahrSchema.safeParse(jahr).success) return { success: false, message: "Ungültiges Jahr." };

  try {
    const gepflegt = await gepflegtesJahr(jahr);
    if (gepflegt) {
      for (const f of gepflegt.feiertage) await loescheFeiertag(f.id);
      await loescheFeiertagsjahr(gepflegt.id);
    }
  } catch (error) {
    erneuern();
    return fehler(error, "Das Jahr konnte nicht zurückgesetzt werden.");
  }
  erneuern();
  return { success: true };
}
