import { aktuelleVersion, sollProArbeitstag, type Arbeitstage } from "./soll";

// PROJ-14: Personenliste = alle E-Mails aus den Zeiteinträgen plus allfällige
// gespeicherte Personen (z.B. deren Einträge gelöscht wurden), je einmal.

export interface PersonUebersicht {
  email: string;
  /** Name, sonst die E-Mail. */
  anzeige: string;
  hatName: boolean;
  nichtAuswerten: boolean;
  austrittAm: string | null;
  ausgetreten: boolean;
  startsaldo: number | null;
  stichtag: string | null;
  version: {
    gueltigAb: string;
    pensum: number;
    arbeitstage: Arbeitstage;
    sollProArbeitstag: number;
    /** Version beginnt erst nach heute. */
    kuenftig: boolean;
  } | null;
}

interface PersonQuelle {
  id: string;
  email: string;
  name: string | null;
  nichtAuswerten: boolean;
  austrittAm: string | null;
  startsaldo: number | null;
  stichtag: string | null;
}

interface VersionQuelle {
  personId: string;
  gueltigAb: string;
  pensum: number;
  arbeitstage: Arbeitstage;
}

const sortierung = new Intl.Collator("de-CH", { sensitivity: "base" });

export function bauePersonenUebersicht(
  emails: readonly string[],
  personen: readonly PersonQuelle[],
  versionen: readonly VersionQuelle[],
  heute: string
): PersonUebersicht[] {
  const personNachEmail = new Map(personen.map((p) => [p.email, p]));
  const alleEmails = new Set([...emails, ...personen.map((p) => p.email)]);

  return [...alleEmails]
    .filter(Boolean)
    .map((email): PersonUebersicht => {
      const person = personNachEmail.get(email);
      const eigene = person ? versionen.filter((v) => v.personId === person.id) : [];
      const version = aktuelleVersion(eigene, heute);
      return {
        email,
        anzeige: person?.name ?? email,
        hatName: Boolean(person?.name),
        nichtAuswerten: person?.nichtAuswerten ?? false,
        austrittAm: person?.austrittAm ?? null,
        ausgetreten: Boolean(person?.austrittAm && person.austrittAm < heute),
        startsaldo: person?.startsaldo ?? null,
        stichtag: person?.stichtag ?? null,
        version: version && {
          gueltigAb: version.gueltigAb,
          pensum: version.pensum,
          arbeitstage: version.arbeitstage,
          sollProArbeitstag: sollProArbeitstag(version.pensum, version.arbeitstage),
          kuenftig: version.gueltigAb > heute,
        },
      };
    })
    .sort((a, b) => sortierung.compare(a.anzeige, b.anzeige));
}
