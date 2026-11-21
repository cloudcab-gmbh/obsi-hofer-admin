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
import { auswertungsBeginn, berechneZeitnachweis, ladebeginn, type Zeitnachweis } from "./zeitnachweis";
import { begrenzeMonat, erlaubteMonate, type MonatsBereich } from "./mein-zeitnachweis";

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

/** PROJ-20: Ergebnis für „Mein Zeitnachweis“ der angemeldeten Person. */
export type EigenerZeitnachweis =
  | { art: "unbekannt" }
  | { art: "nicht-auswerten"; anzeige: string }
  | {
      art: "ok";
      /** Tatsächlich gezeigter Monat (auf den erlaubten Bereich begrenzt). */
      monat: string;
      bereich: MonatsBereich;
      /** Kein Beginn der Auswertung (kein Arbeitsmodell, kein Startsaldo). */
      ohneBeginn: boolean;
      geladen: GeladenerZeitnachweis;
    };

/**
 * PROJ-20: Zeitnachweis der angemeldeten Person. Die E-Mail kommt immer aus der
 * Anmeldung, nie aus der Anfrage; ein Monat ausserhalb des erlaubten Bereichs
 * wird auf den nächstgelegenen erlaubten Monat gesetzt.
 */
export async function ladeEigenenZeitnachweis(
  anmeldeEmail: string,
  angefragterMonat: string | null,
  heute: string
): Promise<EigenerZeitnachweis> {
  const email = normalisiereEmail(anmeldeEmail);
  const [emails, gespeichert] = await Promise.all([listZeiterfassungEmails(), listPersonen()]);
  const person = bauePersonenUebersicht(emails, gespeichert, [], heute).find((p) => p.email === email);
  if (!person) return { art: "unbekannt" };
  if (person.nichtAuswerten) return { art: "nicht-auswerten", anzeige: person.anzeige };

  const daten = gespeichert.find((p) => p.email === email) ?? null;
  const versionen = daten ? await listArbeitsmodelle(daten.id) : [];
  const beginn = auswertungsBeginn({ startsaldoStunden: daten?.startsaldo ?? null, stichtag: daten?.stichtag ?? null, versionen });
  const bereich = erlaubteMonate({ beginn, austrittAm: daten?.austrittAm ?? null, heute });
  const monat = begrenzeMonat(angefragterMonat, bereich);
  const geladen = await ladeZeitnachweis(email, monat, heute, { personen: [person], gespeichert });
  if (!geladen) return { art: "unbekannt" };
  return { art: "ok", monat, bereich, ohneBeginn: beginn === null, geladen };
}
