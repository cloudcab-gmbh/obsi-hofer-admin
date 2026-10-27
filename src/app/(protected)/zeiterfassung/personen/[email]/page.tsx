import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { aktuellerBenutzerIstFreigeber } from "@/lib/auth/freigeber";
import {
  ersterZeiteintrag,
  getPersonByEmail,
  listArbeitsmodelle,
  listZeiterfassungEmails,
  normalisiereEmail,
  type PersonArbeitsmodell,
  type ZeiterfassungPerson,
} from "@/lib/dataverse/zeiterfassung";
import { gueltigBis, sortiereVersionen } from "@/lib/zeiterfassung/soll";
import { PersonStammdatenForm } from "@/components/person-stammdaten-form";
import { ArbeitsmodellVerlauf } from "@/components/arbeitsmodell-verlauf";
import { NUR_FREIGEBER_HINWEIS, ZeiterfassungHinweis } from "@/components/zeiterfassung-hinweis";

const TITEL = "Zeiterfassung · Person";

function decodiere(wert: string): string {
  try {
    return decodeURIComponent(wert);
  } catch {
    return wert;
  }
}

export default async function ZeiterfassungPersonPage({ params }: { params: Promise<{ email: string }> }) {
  if (!(await aktuellerBenutzerIstFreigeber())) {
    return <ZeiterfassungHinweis titel={TITEL}>{NUR_FREIGEBER_HINWEIS}</ZeiterfassungHinweis>;
  }

  const email = normalisiereEmail(decodiere((await params).email));

  let person: ZeiterfassungPerson | null;
  let versionen: PersonArbeitsmodell[];
  let erster: string | null;
  let unbekannt = false;
  try {
    [person, erster] = await Promise.all([getPersonByEmail(email), ersterZeiteintrag(email)]);
    // Personen entstehen nur aus den Zeiteinträgen (oder sind bereits gespeichert).
    unbekannt = !person && !(await listZeiterfassungEmails()).includes(email);
    versionen = person ? await listArbeitsmodelle(person.id) : [];
  } catch {
    return <ZeiterfassungHinweis titel={TITEL}>Die Person konnte nicht geladen werden.</ZeiterfassungHinweis>;
  }
  if (unbekannt) notFound();

  const austrittAm = person?.austrittAm ?? null;
  const verlauf = sortiereVersionen(versionen).map((v) => ({ ...v, gueltigBis: gueltigBis(versionen, v, austrittAm) }));
  const ersteVersionAb = verlauf.at(-1)?.gueltigAb ?? null;

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <Link
        href="/zeiterfassung/personen"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zu den Personen
      </Link>
      <h1 className="text-xl font-semibold">{person?.name ?? email}</h1>
      <PersonStammdatenForm
        email={email}
        initial={{
          name: person?.name ?? "",
          nichtAuswerten: person?.nichtAuswerten ?? false,
          austrittAm: austrittAm ?? "",
          startsaldo: person?.startsaldo != null ? person.startsaldo.toFixed(2) : "",
          stichtag: person?.stichtag ?? "",
          ferienanspruch: person?.ferienanspruch != null ? String(person.ferienanspruch) : "",
          ferienStartsaldo: person?.ferienStartsaldo != null ? String(person.ferienStartsaldo) : "",
        }}
        ersteVersionAb={ersteVersionAb}
        ersterEintrag={erster}
      />
      <ArbeitsmodellVerlauf email={email} versionen={verlauf} />
    </main>
  );
}
