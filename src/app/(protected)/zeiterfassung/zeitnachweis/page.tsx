import { aktuellerBenutzerIstFreigeber } from "@/lib/auth/freigeber";
import { heuteSchweiz, istGueltigerMonat } from "@/lib/zeiterfassung/datum";
import type { Zeitnachweis } from "@/lib/zeiterfassung/zeitnachweis";
import { ladeAuswertbarePersonen, ladeZeitnachweis } from "@/lib/zeiterfassung/zeitnachweis-laden";
import { ZeitnachweisPdfKnopf } from "@/components/zeitnachweis-pdf-knopf";
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
    // Alle Personen aus PROJ-14 ausser "nicht auswerten".
    const auswertbar = await ladeAuswertbarePersonen(heute);
    optionen = auswertbar.personen.map((p) => ({ id: p.email, name: p.anzeige }));
    // PROJ-16: derselbe Lade- und Rechenweg wie für das PDF.
    const geladen = angefragtePerson ? await ladeZeitnachweis(angefragtePerson, monat, heute, auswertbar) : null;
    if (geladen) {
      person = geladen.person;
      zeitnachweis = geladen.zeitnachweis;
    }
  } catch {
    // Keine Zeitdaten in der Meldung oder im Log (Technical Requirements).
    fehler = "Der Zeitnachweis konnte nicht geladen werden. Bitte später erneut versuchen.";
  }

  // Volle Höhe: die Tabelle des Zeitnachweises nimmt den Rest ein und scrollt selbst.
  return (
    <main className="mx-auto flex h-full max-w-6xl flex-col gap-6 px-4 py-6">
      <h1 className="text-xl font-semibold">{TITEL}</h1>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          <ZeitnachweisAuswahl personen={optionen} person={person?.email ?? null} monat={monat} />
        </div>
        {/* PROJ-16: nur mit gewählter Person. */}
        {person && zeitnachweis && !fehler && <ZeitnachweisPdfKnopf email={person.email} monat={monat} />}
      </div>
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
