import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getArtikel, getFirma, getGeraet, getStandort } from "@/lib/dataverse/geraete";
import { listPruefberichteForGeraet, type Pruefbericht } from "@/lib/dataverse/pruefberichte";
import { DataverseError } from "@/lib/dataverse/errors";
import { GeraetForm } from "@/components/geraet-form";
import { PruefberichtHistorie } from "@/components/pruefbericht-historie";
import { Card, CardContent } from "@/components/ui/card";

async function loadGeraetDetail(id: string) {
  try {
    const geraet = await getGeraet(id);
    const [standort, artikel, pruefberichte] = await Promise.all([
      geraet.standortId ? getStandort(geraet.standortId) : Promise.resolve(null),
      geraet.artikelId ? getArtikel(geraet.artikelId) : Promise.resolve(null),
      listPruefberichteForGeraet(id, { includeStorniert: true }),
    ]);
    const firma = standort ? await getFirma(standort.firmaId) : null;
    return { geraet, standort, artikel, firma, pruefberichte, error: null as string | null };
  } catch (error) {
    if (error instanceof DataverseError && error.category === "not_found") {
      notFound();
    }
    return {
      geraet: null,
      standort: null,
      artikel: null,
      firma: null,
      pruefberichte: [] as Pruefbericht[],
      error: "Das Gerät konnte nicht geladen werden.",
    };
  }
}

export default async function GeraetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { geraet, standort, artikel, firma, pruefberichte, error } = await loadGeraetDetail(id);

  // Die "aktuelle Firma" gilt jetzt global für die Session (siehe
  // src/lib/firma-session.ts) — die Geräteliste zeigt immer deren Geräte,
  // daher reicht hier ein fester Link zurück dorthin.
  const backHref = "/geraete";

  if (error || !geraet) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <Link href={backHref} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Zurück zur Liste
        </Link>
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">{error}</CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Link href={backHref} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Zurück zur Liste
      </Link>
      <h1 className="mb-6 text-xl font-semibold">{geraet.name ?? "Gerät"}</h1>
      <GeraetForm geraet={geraet} standort={standort} firma={firma} artikel={artikel} backHref={backHref} />
      <div className="mt-10">
        <PruefberichtHistorie geraetId={geraet.id} berichte={pruefberichte} />
      </div>
    </main>
  );
}
