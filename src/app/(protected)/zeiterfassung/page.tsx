import { redirect } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { aktuellerBenutzerIstFreigeber } from "@/lib/auth/freigeber";
import { ladeFeiertagskalender } from "@/lib/dataverse/feiertage";
import {
  listArbeitsmodelle,
  listPersonen,
  listZeiteintraege,
  listZeiterfassungEmails,
} from "@/lib/dataverse/zeiterfassung";
import { bauePersonenUebersicht } from "@/lib/zeiterfassung/personen-uebersicht";
import { heuteSchweiz, istGueltigerMonat, tageDesMonats } from "@/lib/zeiterfassung/datum";
import { berechneUebersichtWerte, GLEITZEIT_SCHWELLE_MINUTEN, uebersichtLadebeginn } from "@/lib/zeiterfassung/uebersicht";
import { MonatsAuswahl } from "@/components/monats-auswahl";
import { UebersichtTabelle, type UebersichtZeile } from "@/components/uebersicht-tabelle";
import { UebersichtGrafiken } from "@/components/uebersicht-grafiken";
import { NUR_FREIGEBER_HINWEIS, ZeiterfassungHinweis } from "@/components/zeiterfassung-hinweis";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const TITEL = "Zeiterfassung · Übersicht";

function einzeln(wert: string | string[] | undefined): string | null {
  return typeof wert === "string" && wert ? wert : null;
}

function anzahlPersonen(n: number, text: string): string {
  return `${n} ${n === 1 ? "Person" : "Personen"} ${text}`;
}

export default async function UebersichtPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  // Alte Adressen des Zeitnachweises (vor PROJ-17 unter /zeiterfassung) leiten weiter.
  if (einzeln(params.person)) {
    redirect(`/zeiterfassung/zeitnachweis?${new URLSearchParams(params as Record<string, string>)}`);
  }
  // PROJ-17: Personendaten aller Mitarbeitenden — nur Freigeber (serverseitig).
  if (!(await aktuellerBenutzerIstFreigeber())) {
    return <ZeiterfassungHinweis titel={TITEL}>{NUR_FREIGEBER_HINWEIS}</ZeiterfassungHinweis>;
  }

  const heute = heuteSchweiz();
  const angefragt = einzeln(params.monat);
  const monat = angefragt && istGueltigerMonat(angefragt) ? angefragt : heute.slice(0, 7);
  const jahr = Number(monat.slice(0, 4));

  let zeilen: UebersichtZeile[];
  try {
    const [emails, personen, versionen] = await Promise.all([listZeiterfassungEmails(), listPersonen(), listArbeitsmodelle()]);
    const uebersicht = bauePersonenUebersicht(emails, personen, [], heute).filter((p) => !p.nichtAuswerten);
    const monatsende = tageDesMonats(monat).at(-1)!;
    const personenDaten = uebersicht.map((p) => {
      const gespeichert = personen.find((x) => x.email === p.email);
      return {
        p,
        person: {
          versionen: gespeichert ? versionen.filter((v) => v.personId === gespeichert.id) : [],
          austrittAm: gespeichert?.austrittAm ?? null,
          startsaldoStunden: gespeichert?.startsaldo ?? null,
          stichtag: gespeichert?.stichtag ?? null,
          ferienanspruch: gespeichert?.ferienanspruch ?? null,
          ferienStartsaldo: gespeichert?.ferienStartsaldo ?? null,
        },
      };
    });
    // PROJ-18: gepflegte Feiertage einmal für den ganzen Zeitraum laden.
    const fruehester = personenDaten.map(({ person }) => uebersichtLadebeginn(monat, person)).sort()[0] ?? `${monat}-01`;
    const feiertage = await ladeFeiertagskalender(fruehester, monatsende);
    zeilen = await Promise.all(
      personenDaten.map(async ({ p, person }) => {
        const eintraege = await listZeiteintraege(p.email, uebersichtLadebeginn(monat, person), monatsende);
        return { email: p.email, anzeige: p.anzeige, ...berechneUebersichtWerte({ ...person, feiertage }, eintraege, monat, heute) };
      })
    );
  } catch {
    // Keine Personendaten in Meldung oder Log.
    return <ZeiterfassungHinweis titel={TITEL}>Die Übersicht konnte nicht geladen werden.</ZeiterfassungHinweis>;
  }

  const warnungen = [
    [zeilen.filter((z) => z.warnungen.keinArbeitsmodell).length, "ohne Arbeitsmodell"],
    [zeilen.filter((z) => z.warnungen.offeneEintraege).length, "mit offenen Einträgen (Gehen fehlt)"],
    [zeilen.filter((z) => z.warnungen.ferienNegativ).length, "mit negativem Feriensaldo"],
    [zeilen.filter((z) => z.warnungen.gleitzeitAusserhalb).length, `mit Gleitzeit über ±${GLEITZEIT_SCHWELLE_MINUTEN / 60} h`],
  ] as const;
  const aktiveWarnungen = warnungen.filter(([n]) => n > 0);

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <h1 className="text-xl font-semibold">{TITEL}</h1>
      <MonatsAuswahl monat={monat} />

      {zeilen.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Es gibt noch keine Personen in der Zeiterfassung.
          </CardContent>
        </Card>
      ) : (
        <>
          {aktiveWarnungen.length > 0 && (
            <div role="status" className="flex flex-wrap gap-x-6 gap-y-1 rounded-md border border-status-warning px-3 py-2 text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0 self-center text-status-warning" aria-hidden />
              {aktiveWarnungen.map(([n, text]) => (
                <span key={text}>{anzahlPersonen(n, text)}</span>
              ))}
            </div>
          )}
          <UebersichtGrafiken zeilen={zeilen} jahr={jahr} />
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Alle Mitarbeitenden</CardTitle>
            </CardHeader>
            <CardContent>
              <UebersichtTabelle zeilen={zeilen} monat={monat} jahr={jahr} />
            </CardContent>
          </Card>
        </>
      )}
    </main>
  );
}
