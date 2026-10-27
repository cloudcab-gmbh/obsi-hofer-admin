import { ladeFeiertagskalender } from "@/lib/dataverse/feiertage";
import {
  listArbeitsmodelle,
  listPersonen,
  listZeiteintraege,
  listZeiterfassungEmails,
  normalisiereEmail,
  type PersonArbeitsmodell,
  type ZeiterfassungPerson,
} from "@/lib/dataverse/zeiterfassung";
import { tageDesMonats } from "./datum";
import { bauePersonenUebersicht, type PersonUebersicht } from "./personen-uebersicht";
import { berechneZeitnachweis, ladebeginn, type Zeitnachweis } from "./zeitnachweis";

// PROJ-16: Laden und Rechnen des Zeitnachweises an einer Stelle — die Seite
// (PROJ-13) und das PDF nutzen denselben Weg, damit die Zahlen identisch sind.

export interface GeladenerZeitnachweis {
  person: { email: string; anzeige: string };
  zeitnachweis: Zeitnachweis;
  /** Arbeitsmodell-Versionen der Person (für den Kopf des PDFs). */
  versionen: PersonArbeitsmodell[];
}

/** Personen der Zeiterfassung ausser "nicht auswerten" (Auswahl im Zeitnachweis). */
export async function ladeAuswertbarePersonen(heute: string): Promise<{
  personen: PersonUebersicht[];
  gespeichert: ZeiterfassungPerson[];
}> {
  const [emails, gespeichert] = await Promise.all([listZeiterfassungEmails(), listPersonen()]);
  return { personen: bauePersonenUebersicht(emails, gespeichert, [], heute).filter((p) => !p.nichtAuswerten), gespeichert };
}

/**
 * Zeitnachweis einer Person für einen Monat; `null`, wenn die Person nicht
 * (mehr) zur Auswahl gehört (unbekannt oder "nicht auswerten").
 */
export async function ladeZeitnachweis(
  email: string,
  monat: string,
  heute: string,
  vorgeladen?: Awaited<ReturnType<typeof ladeAuswertbarePersonen>>
): Promise<GeladenerZeitnachweis | null> {
  const { personen, gespeichert } = vorgeladen ?? (await ladeAuswertbarePersonen(heute));
  const gewaehlt = personen.find((p) => p.email === normalisiereEmail(email));
  if (!gewaehlt) return null;

  const daten = gespeichert.find((p) => p.email === gewaehlt.email) ?? null;
  const versionen = daten ? await listArbeitsmodelle(daten.id) : [];
  const person = {
    versionen,
    austrittAm: daten?.austrittAm ?? null,
    startsaldoStunden: daten?.startsaldo ?? null,
    stichtag: daten?.stichtag ?? null,
    ferienanspruch: daten?.ferienanspruch ?? null,
    ferienStartsaldo: daten?.ferienStartsaldo ?? null,
  };
  const von = ladebeginn(monat, person);
  const bis = tageDesMonats(monat).at(-1)!;
  // PROJ-18: gepflegte Feiertage der betroffenen Jahre, einmal pro Aufruf.
  const [eintraege, feiertage] = await Promise.all([listZeiteintraege(gewaehlt.email, von, bis), ladeFeiertagskalender(von, bis)]);
  return {
    person: { email: gewaehlt.email, anzeige: gewaehlt.anzeige },
    zeitnachweis: berechneZeitnachweis({ ...person, monat, heute, eintraege, feiertage }),
    versionen,
  };
}
