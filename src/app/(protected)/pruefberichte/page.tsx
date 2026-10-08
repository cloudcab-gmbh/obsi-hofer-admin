import Link from "next/link";
import { listGeraeteForStandorte, matchesGeraeteFilter } from "@/lib/dataverse/geraete";
import { listPruefberichteForGeraete, type Pruefbericht } from "@/lib/dataverse/pruefberichte";
import { ladeArbeitskontext, type Arbeitskontext } from "@/lib/arbeitskontext";
import { getGeraeteFilterState } from "@/lib/geraete-filter-session";
import { PruefberichteUebersicht } from "@/components/pruefberichte-uebersicht";
import { KontextHinweis } from "@/components/kontext-hinweis";
import { Card, CardContent } from "@/components/ui/card";

export default async function PruefberichteUebersichtPage() {
  const filter = await getGeraeteFilterState();

  let kontext: Arbeitskontext | null = null;
  let berichte: Pruefbericht[] = [];
  let geraetNamen = new Map<string, string>();
  let loadError: string | null = null;

  // Lagerort/Letzte-Prüfung aus dem auf /geraete gewählten Filter schränken
  // auch hier die betroffenen Geräte ein (Nutzerwunsch 2026-10-05) — die
  // Suche selbst wird stattdessen nur als Vorschlagswert ins eigene Suchfeld
  // der Übersicht übernommen, da dort (anders als die übrigen) ohnehin ein
  // eigenes, unabhängig änderbares Suchfeld existiert.
  const geraeteEingeschraenkt = Boolean(filter.lagerort || filter.letztePruefungTage);

  try {
    kontext = await ladeArbeitskontext();
    // PROJ-10: nur Prüfberichte von Geräten des aktuellen Standorts.
    if (kontext.zustand === "bereit") {
      const geraete = (await listGeraeteForStandorte([kontext.standort.id])).filter((g) =>
        matchesGeraeteFilter(g, {
          suche: "",
          lagerort: filter.lagerort,
          letztePruefungTage: filter.letztePruefungTage,
        })
      );
      geraetNamen = new Map(geraete.map((g) => [g.id, g.name ?? "(ohne Name)"]));
      berichte = await listPruefberichteForGeraete(
        geraete.map((g) => g.id),
        { includeStorniert: true }
      );
    }
  } catch {
    loadError = "Die Prüfberichte konnten nicht geladen werden.";
  }

  if (kontext && kontext.zustand !== "bereit") {
    return <KontextHinweis titel="Prüfberichte" kontext={kontext} />;
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold">Prüfberichte</h1>

      {geraeteEingeschraenkt && !loadError && (
        <p className="mb-4 text-sm text-muted-foreground">
          Eingeschränkt auf den aktuell auf{" "}
          <Link href="/geraete" className="font-medium text-primary underline-offset-2 hover:underline">
            Geräte
          </Link>{" "}
          gewählten Filter (Lagerort/Letzte Prüfung).
        </p>
      )}

      {loadError || !kontext ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">{loadError}</CardContent>
        </Card>
      ) : (
        <PruefberichteUebersicht
          key={kontext.standort.id}
          berichte={berichte}
          geraetNamen={geraetNamen}
          initialSuche={filter.suche}
        />
      )}
    </main>
  );
}
