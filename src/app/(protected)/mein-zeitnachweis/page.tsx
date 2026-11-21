import { Info } from "lucide-react";
import { aktuellerMitarbeiter } from "@/lib/auth/mitarbeiter";
import { heuteSchweiz, istGueltigerMonat } from "@/lib/zeiterfassung/datum";
import { ladeEigenenZeitnachweis, type EigenerZeitnachweis } from "@/lib/zeiterfassung/zeitnachweis-laden";
import { ZeitnachweisAnsicht } from "@/components/zeitnachweis-ansicht";
import { ZeitnachweisPdfKnopf } from "@/components/zeitnachweis-pdf-knopf";
import { MeinZeitnachweisMonat } from "@/components/mein-zeitnachweis-monat";
import { Card, CardContent } from "@/components/ui/card";

const TITEL = "Mein Zeitnachweis";

function Meldung({ children, fehler = false }: { children: React.ReactNode; fehler?: boolean }) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-6 text-xl font-semibold">{TITEL}</h1>
      <Card>
        <CardContent
          role={fehler ? "alert" : undefined}
          className={fehler ? "py-10 text-center text-sm text-destructive" : "py-10 text-center text-sm text-muted-foreground"}
        >
          {children}
        </CardContent>
      </Card>
    </main>
  );
}

/**
 * PROJ-20: Eigener Zeitnachweis der angemeldeten Person (nur lesen, mit PDF).
 * Die Person kommt ausschliesslich aus der Anmeldung — die Seite nimmt keine
 * Person aus der Adresse entgegen.
 */
export default async function MeinZeitnachweisPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const mitarbeiter = await aktuellerMitarbeiter();
  if (!mitarbeiter) {
    return <Meldung>Diese Seite ist nur für Benutzer mit der Rolle „Mitarbeiter“ verfügbar.</Meldung>;
  }
  if (!mitarbeiter.email) {
    return <Meldung>Für dein Konto ist keine E-Mail-Adresse hinterlegt. Bitte wende dich an die Personalverantwortung.</Meldung>;
  }

  const params = await searchParams;
  const angefragt = typeof params.monat === "string" && istGueltigerMonat(params.monat) ? params.monat : null;

  let eigener: EigenerZeitnachweis;
  try {
    eigener = await ladeEigenenZeitnachweis(mitarbeiter.email, angefragt, heuteSchweiz());
  } catch {
    // Keine Zeitdaten in der Meldung oder im Log.
    return (
      <Meldung fehler>Dein Zeitnachweis konnte nicht geladen werden. Bitte später erneut versuchen.</Meldung>
    );
  }

  if (eigener.art === "unbekannt") {
    return (
      <Meldung>
        Für dein Konto ({mitarbeiter.email}) wurden keine Zeiteinträge gefunden. Bitte wende dich an die
        Personalverantwortung.
      </Meldung>
    );
  }
  if (eigener.art === "nicht-auswerten") {
    return <Meldung>Für dich wird kein Zeitnachweis geführt.</Meldung>;
  }

  const { geladen, monat, bereich } = eigener;
  // Volle Höhe unter der Kopfzeile (h-14): die Tabelle nimmt den Rest ein und scrollt selbst.
  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <main className="mx-auto flex h-full max-w-6xl flex-col gap-4 px-4 py-6">
          <h1 className="text-xl font-semibold">
            {TITEL} <span className="font-normal text-muted-foreground">· {geladen.person.anzeige}</span>
          </h1>
          <p className="flex items-start gap-2 rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>Korrekturen bitte in der SharePoint-Zeiterfassung erfassen. Änderungen erscheinen hier am nächsten Morgen.</span>
          </p>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <MeinZeitnachweisMonat monat={monat} von={bereich.von} bis={bereich.bis} />
            <ZeitnachweisPdfKnopf monat={monat} />
          </div>
          <ZeitnachweisAnsicht
            zeitnachweis={geladen.zeitnachweis}
            personName={geladen.person.anzeige}
            personEmail={geladen.person.email}
            personHref="/mein-zeitnachweis"
            nurLesen
          />
        </main>
      </div>
    </div>
  );
}
