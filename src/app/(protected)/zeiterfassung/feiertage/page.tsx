import { aktuellerBenutzerIstFreigeber } from "@/lib/auth/freigeber";
import { listFeiertagsjahre } from "@/lib/dataverse/feiertage";
import { heuteSchweiz } from "@/lib/zeiterfassung/datum";
import { vorschlagListe } from "@/lib/zeiterfassung/feiertage";
import { FeiertageVerwaltung, type FeiertagZeile } from "@/components/feiertage-verwaltung";
import { NUR_FREIGEBER_HINWEIS, ZeiterfassungHinweis } from "@/components/zeiterfassung-hinweis";

const TITEL = "Zeiterfassung · Feiertage";

export default async function FeiertagePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // PROJ-18: Feiertage wirken auf alle Zeitnachweise — nur Freigeber (serverseitig).
  if (!(await aktuellerBenutzerIstFreigeber())) {
    return <ZeiterfassungHinweis titel={TITEL}>{NUR_FREIGEBER_HINWEIS}</ZeiterfassungHinweis>;
  }

  const params = await searchParams;
  const heute = heuteSchweiz();
  const aktuellesJahr = Number(heute.slice(0, 4));
  const angefragt = typeof params.jahr === "string" ? Number(params.jahr) : NaN;
  const jahr = Number.isInteger(angefragt) && angefragt >= 2000 && angefragt <= 2100 ? angefragt : aktuellesJahr;

  let gepflegt: Awaited<ReturnType<typeof listFeiertagsjahre>>[number] | null;
  try {
    gepflegt = (await listFeiertagsjahre(jahr, jahr))[0] ?? null;
  } catch {
    return <ZeiterfassungHinweis titel={TITEL}>Die Feiertage konnten nicht geladen werden.</ZeiterfassungHinweis>;
  }

  const feiertage: FeiertagZeile[] = gepflegt
    ? gepflegt.feiertage.map((f) => ({ id: f.id, datum: f.datum, name: f.name, halb: f.halb }))
    : vorschlagListe(jahr).map((f) => ({ id: null, ...f }));

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <h1 className="text-xl font-semibold">{TITEL}</h1>
      <FeiertageVerwaltung jahr={jahr} gepflegt={gepflegt !== null} feiertage={feiertage} vergangen={jahr < aktuellesJahr} />
    </main>
  );
}
