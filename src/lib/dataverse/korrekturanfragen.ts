import { createRecord, listAllRecords } from "./records";
import { normalisiereEmail, odataString } from "./zeiterfassung";
import type { AnfrageStatus, KorrekturAnfrage } from "@/lib/zeiterfassung/korrektur";

// PROJ-21: Tabelle "Korrektur-Anfrage" (vom Nutzer angelegt). Das Tool legt
// Anfragen an und liest sie (App-Benutzer: Erstellen + Lesen); den Status
// "erledigt" setzt ausschliesslich der Power-Automate-Flow des Nutzers.
// "Datum" ist "Nur Datum, zeitzonenunabhängig" — ohne Umrechnung "YYYY-MM-DD".
const ENTITY = "bmvcc_korrekturanfrages";
const STATUS: Record<number, AnfrageStatus> = { 0: "offen", 1: "erledigt" };

function zuDatum(wert: unknown): string | null {
  return typeof wert === "string" && /^\d{4}-\d{2}-\d{2}/.test(wert) ? wert.slice(0, 10) : null;
}

/** Anfragen einer Person für Tage von `von` bis `bis` (je "YYYY-MM-DD"). */
export async function listKorrekturAnfragen(email: string, von: string, bis: string): Promise<KorrekturAnfrage[]> {
  const records = await listAllRecords<Record<string, unknown>>(ENTITY, {
    select: ["bmvcc_korrekturanfrageid", "bmvcc_datum", "bmvcc_nachricht", "bmvcc_status", "createdon"],
    filter: `bmvcc_mitarbeiteremail eq ${odataString(normalisiereEmail(email))} and bmvcc_datum ge ${von} and bmvcc_datum le ${bis}`,
  });
  return records.flatMap((r) => {
    const datum = zuDatum(r.bmvcc_datum);
    if (!datum) return [];
    return [
      {
        id: String(r.bmvcc_korrekturanfrageid),
        datum,
        nachricht: typeof r.bmvcc_nachricht === "string" ? r.bmvcc_nachricht : "",
        // Unbekannter oder leerer Status gilt als offen.
        status: STATUS[r.bmvcc_status as number] ?? "offen",
        erstelltAm: typeof r.createdon === "string" ? r.createdon : "",
      },
    ];
  });
}

export interface NeueKorrekturAnfrage {
  email: string;
  name: string;
  datum: string;
  nachricht: string;
  bisherigeZeiten: string;
  link: string;
}

/** Legt eine Anfrage mit Status "offen" an. */
export async function erstelleKorrekturAnfrage(a: NeueKorrekturAnfrage): Promise<string> {
  const [jahr, monat, tag] = a.datum.split("-");
  const { id } = await createRecord(ENTITY, {
    bmvcc_titel: `Korrektur ${tag}.${monat}.${jahr} · ${a.name}`.slice(0, 850),
    bmvcc_mitarbeiteremail: normalisiereEmail(a.email).slice(0, 100),
    bmvcc_mitarbeitername: a.name.slice(0, 100),
    bmvcc_datum: a.datum,
    bmvcc_nachricht: a.nachricht.slice(0, 1000),
    bmvcc_bisherigezeiten: a.bisherigeZeiten.slice(0, 200),
    bmvcc_link: a.link.slice(0, 500),
    bmvcc_status: 0,
  });
  return id;
}
