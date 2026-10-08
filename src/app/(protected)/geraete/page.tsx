import { listGeraeteForStandorte, type Geraet } from "@/lib/dataverse/geraete";
import { getAktuelleBemerkungenForGeraete } from "@/lib/dataverse/pruefberichte";
import { ladeArbeitskontext, type Arbeitskontext } from "@/lib/arbeitskontext";
import { getGeraeteFilterState } from "@/lib/geraete-filter-session";
import { GeraeteListe } from "@/components/geraete-liste";
import { KontextHinweis } from "@/components/kontext-hinweis";
import { Card, CardContent } from "@/components/ui/card";

export default async function GeraetePage() {
  let kontext: Arbeitskontext | null = null;
  let geraete: Geraet[] = [];
  let pruefberichtBemerkungen = new Map<string, string | null>();
  let loadError: string | null = null;

  const initialFilter = await getGeraeteFilterState();
  try {
    kontext = await ladeArbeitskontext();
    // PROJ-10: nur die Geräte des aktuellen Standorts.
    if (kontext.zustand === "bereit") {
      geraete = await listGeraeteForStandorte([kontext.standort.id]);
      pruefberichtBemerkungen = await getAktuelleBemerkungenForGeraete(geraete.map((g) => g.id));
    }
  } catch {
    loadError = "Die Gerätedaten konnten nicht geladen werden.";
  }

  if (kontext && kontext.zustand !== "bereit") {
    return <KontextHinweis titel="Geräte-Verwaltung" kontext={kontext} />;
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold">Geräte-Verwaltung</h1>

      {loadError || !kontext ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">{loadError}</CardContent>
        </Card>
      ) : (
        <GeraeteListe
          // Neu aufbauen bei Standortwechsel, sonst behält der Client-State die
          // Filter des vorherigen Standorts (der Cookie wird serverseitig geleert).
          key={kontext.standort.id}
          geraete={geraete}
          initialFilter={initialFilter}
          pruefberichtBemerkungen={pruefberichtBemerkungen}
        />
      )}
    </main>
  );
}
