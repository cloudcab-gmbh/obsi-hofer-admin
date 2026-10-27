import { aktuellerBenutzerIstFreigeber } from "@/lib/auth/freigeber";
import {
  listArbeitsmodelle,
  listFerienUndKrankheit,
  listPersonen,
  listZeiterfassungEmails,
  normalisiereEmail,
} from "@/lib/dataverse/zeiterfassung";
import { bauePersonenUebersicht } from "@/lib/zeiterfassung/personen-uebersicht";
import { heuteSchweiz } from "@/lib/zeiterfassung/datum";
import { ferienBeginn, ferienJahr, ferienZeitraeumeImJahr, type FerienPerson } from "@/lib/zeiterfassung/ferien";
import type { Zeiteintrag } from "@/lib/zeiterfassung/tagesauswertung";
import { FerienDerPerson, FerienJahresuebersicht, type FerienZeile } from "@/components/ferien-uebersicht";
import { NUR_FREIGEBER_HINWEIS, ZeiterfassungHinweis } from "@/components/zeiterfassung-hinweis";

const TITEL = "Zeiterfassung · Ferien";

function einzeln(wert: string | string[] | undefined): string | null {
  return typeof wert === "string" && wert ? wert : null;
}

export default async function FerienPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // PROJ-15: Ferien sind Personendaten — nur Freigeber (serverseitig).
  if (!(await aktuellerBenutzerIstFreigeber())) {
    return <ZeiterfassungHinweis titel={TITEL}>{NUR_FREIGEBER_HINWEIS}</ZeiterfassungHinweis>;
  }

  const params = await searchParams;
  const heute = heuteSchweiz();
  const angefragtesJahr = Number(einzeln(params.jahr));
  const jahr = Number.isInteger(angefragtesJahr) && angefragtesJahr >= 2000 && angefragtesJahr <= 2100 ? angefragtesJahr : Number(heute.slice(0, 4));
  const angefragtePerson = einzeln(params.person);

  let zeilen: FerienZeile[];
  let auswahl: { email: string; anzeige: string; person: FerienPerson; eintraege: Zeiteintrag[] } | null = null;
  try {
    const [emails, personen, versionen] = await Promise.all([listZeiterfassungEmails(), listPersonen(), listArbeitsmodelle()]);
    const uebersicht = bauePersonenUebersicht(emails, personen, [], heute).filter((p) => !p.nichtAuswerten);
    const ferienPersonen = new Map(
      uebersicht.map((p) => {
        const gespeichert = personen.find((x) => x.email === p.email);
        const person: FerienPerson = {
          versionen: gespeichert ? versionen.filter((v) => v.personId === gespeichert.id) : [],
          austrittAm: gespeichert?.austrittAm ?? null,
          ferienanspruch: gespeichert?.ferienanspruch ?? null,
          ferienStartsaldo: gespeichert?.ferienStartsaldo ?? null,
          stichtag: gespeichert?.stichtag ?? null,
        };
        return [p.email, person];
      })
    );

    // Ferien und Krankheit aller Personen in einer Abfrage: ab dem frühesten Beginn (Saldo)
    // und Vor-/Folgejahr, damit Zeiträume über den Jahreswechsel ganz erscheinen (QA BUG-2).
    const beginne = [...ferienPersonen.values()].map(ferienBeginn).filter((b): b is string => b !== null).sort();
    const vorjahr = `${jahr - 1}-01-01`;
    const von = beginne[0] && beginne[0] < vorjahr ? beginne[0] : vorjahr;
    const nachEmail = new Map<string, Zeiteintrag[]>();
    for (const { email, eintrag } of await listFerienUndKrankheit(von, `${jahr + 1}-12-31`)) {
      nachEmail.set(email, [...(nachEmail.get(email) ?? []), eintrag]);
    }

    zeilen = uebersicht.map((p) => {
      const person = ferienPersonen.get(p.email)!;
      return {
        email: p.email,
        anzeige: p.anzeige,
        ohneArbeitsmodell: person.versionen.length === 0,
        stand: ferienJahr(person, nachEmail.get(p.email) ?? [], jahr, heute),
      };
    });

    const email = angefragtePerson ? normalisiereEmail(angefragtePerson) : null;
    const gewaehlt = uebersicht.find((p) => p.email === email);
    if (gewaehlt) {
      auswahl = {
        email: gewaehlt.email,
        anzeige: gewaehlt.anzeige,
        person: ferienPersonen.get(gewaehlt.email)!,
        eintraege: nachEmail.get(gewaehlt.email) ?? [],
      };
    }
  } catch {
    return <ZeiterfassungHinweis titel={TITEL}>Die Ferien konnten nicht geladen werden.</ZeiterfassungHinweis>;
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <h1 className="text-xl font-semibold">{TITEL}</h1>
      <FerienJahresuebersicht jahr={jahr} zeilen={zeilen} gewaehlt={auswahl?.email ?? null} />
      {auswahl && (
        <FerienDerPerson
          email={auswahl.email}
          personName={auswahl.anzeige}
          jahr={jahr}
          heute={heute}
          zeitraeume={ferienZeitraeumeImJahr(auswahl.person, auswahl.eintraege, jahr)}
        />
      )}
    </main>
  );
}
