import { aktuellerBenutzerIstFreigeber } from "@/lib/auth/freigeber";
import { listArbeitsmodelle, listPersonen, listZeiterfassungEmails } from "@/lib/dataverse/zeiterfassung";
import { bauePersonenUebersicht, type PersonUebersicht } from "@/lib/zeiterfassung/personen-uebersicht";
import { heuteSchweiz } from "@/lib/zeiterfassung/datum";
import { ZeiterfassungPersonenListe } from "@/components/zeiterfassung-personen-liste";
import { NUR_FREIGEBER_HINWEIS, ZeiterfassungHinweis } from "@/components/zeiterfassung-hinweis";

const TITEL = "Zeiterfassung · Personen";

export default async function ZeiterfassungPersonenPage() {
  // PROJ-14: Pensen und Salden sind vertraulich — nur Freigeber (serverseitig,
  // proxy.ts lässt auch Bearbeiter auf jede Seite).
  if (!(await aktuellerBenutzerIstFreigeber())) {
    return <ZeiterfassungHinweis titel={TITEL}>{NUR_FREIGEBER_HINWEIS}</ZeiterfassungHinweis>;
  }

  let personen: PersonUebersicht[];
  try {
    const [emails, gespeichert, versionen] = await Promise.all([
      listZeiterfassungEmails(),
      listPersonen(),
      listArbeitsmodelle(),
    ]);
    personen = bauePersonenUebersicht(emails, gespeichert, versionen, heuteSchweiz());
  } catch {
    return <ZeiterfassungHinweis titel={TITEL}>Die Personen konnten nicht geladen werden.</ZeiterfassungHinweis>;
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <h1 className="text-xl font-semibold">{TITEL}</h1>
      <ZeiterfassungPersonenListe personen={personen} />
    </main>
  );
}
