import { aktuellerBenutzerIstFreigeber } from "@/lib/auth/freigeber";
import {
  listArbeitsmodelle,
  listPersonen,
  listZeiteintraege,
  listZeiterfassungEmails,
  normalisiereEmail,
} from "@/lib/dataverse/zeiterfassung";
import { bauePersonenUebersicht } from "@/lib/zeiterfassung/personen-uebersicht";
import { heuteSchweiz, istGueltigerMonat, tageDesMonats } from "@/lib/zeiterfassung/datum";
import { berechneZeitnachweis, ladebeginn, type Zeitnachweis } from "@/lib/zeiterfassung/zeitnachweis";
import { getZeitnachweisAuswahl } from "@/lib/zeiterfassung/auswahl-session";
import { ZeitnachweisAuswahl } from "@/components/zeitnachweis-auswahl";
import { ZeitnachweisAnsicht } from "@/components/zeitnachweis-ansicht";
import { personHref } from "@/lib/zeiterfassung/links";
import { NUR_FREIGEBER_HINWEIS, ZeiterfassungHinweis } from "@/components/zeiterfassung-hinweis";
import { Card, CardContent } from "@/components/ui/card";

const TITEL = "Zeiterfassung · Zeitnachweis";

function einzeln(wert: string | string[] | undefined): string | null {
  return typeof wert === "string" && wert ? wert : null;
}

// PROJ-17: Der Zeitnachweis liegt seit der Übersicht unter /zeiterfassung/zeitnachweis.
export default async function ZeitnachweisPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // PROJ-13: Zeitdaten sind vertraulich — nur Freigeber (serverseitig).
  if (!(await aktuellerBenutzerIstFreigeber())) {
    return <ZeiterfassungHinweis titel={TITEL}>{NUR_FREIGEBER_HINWEIS}</ZeiterfassungHinweis>;
  }

  const params = await searchParams;
  const gemerkt = await getZeitnachweisAuswahl();
  const heute = heuteSchweiz();
  const angefragterMonat = einzeln(params.monat);
  const monat =
    angefragterMonat && istGueltigerMonat(angefragterMonat) ? angefragterMonat : (gemerkt.monat ?? heute.slice(0, 7));
  const angefragtePerson = einzeln(params.person) ?? gemerkt.person;

  let fehler: string | null = null;
  let optionen: { id: string; name: string }[] = [];
  let zeitnachweis: Zeitnachweis | null = null;
  let person: { email: string; anzeige: string } | null = null;
  try {
    const [emails, personen] = await Promise.all([listZeiterfassungEmails(), listPersonen()]);
    // Alle Personen aus PROJ-14 ausser "nicht auswerten".
    const uebersicht = bauePersonenUebersicht(emails, personen, [], heute).filter((p) => !p.nichtAuswerten);
    optionen = uebersicht.map((p) => ({ id: p.email, name: p.anzeige }));

    const email = angefragtePerson ? normalisiereEmail(angefragtePerson) : null;
    const gewaehlt = uebersicht.find((p) => p.email === email);
    if (gewaehlt) {
      person = { email: gewaehlt.email, anzeige: gewaehlt.anzeige };
      const gespeichert = personen.find((p) => p.email === gewaehlt.email) ?? null;
      const versionen = gespeichert ? await listArbeitsmodelle(gespeichert.id) : [];
      const daten = {
        versionen,
        austrittAm: gespeichert?.austrittAm ?? null,
        startsaldoStunden: gespeichert?.startsaldo ?? null,
        stichtag: gespeichert?.stichtag ?? null,
        ferienanspruch: gespeichert?.ferienanspruch ?? null,
        ferienStartsaldo: gespeichert?.ferienStartsaldo ?? null,
      };
      const eintraege = await listZeiteintraege(gewaehlt.email, ladebeginn(monat, daten), tageDesMonats(monat).at(-1)!);
      zeitnachweis = berechneZeitnachweis({ ...daten, monat, heute, eintraege });
    }
  } catch {
    // Keine Zeitdaten in der Meldung oder im Log (Technical Requirements).
    fehler = "Der Zeitnachweis konnte nicht geladen werden. Bitte später erneut versuchen.";
  }

  // Volle Höhe: die Tabelle des Zeitnachweises nimmt den Rest ein und scrollt selbst.
  return (
    <main className="mx-auto flex h-full max-w-6xl flex-col gap-6 px-4 py-6">
      <h1 className="text-xl font-semibold">{TITEL}</h1>
      <ZeitnachweisAuswahl personen={optionen} person={person?.email ?? null} monat={monat} />
      {fehler ? (
        <Card>
          <CardContent role="alert" className="py-10 text-center text-sm text-destructive">
            {fehler}
          </CardContent>
        </Card>
      ) : zeitnachweis && person ? (
        <ZeitnachweisAnsicht
          zeitnachweis={zeitnachweis}
          personName={person.anzeige}
          personEmail={person.email}
          personHref={personHref(person.email)}
        />
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {optionen.length === 0
              ? "Es gibt noch keine Zeiteinträge."
              : "Bitte eine Person wählen, um ihren Zeitnachweis zu sehen."}
          </CardContent>
        </Card>
      )}
    </main>
  );
}
