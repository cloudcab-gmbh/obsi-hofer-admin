import { notFound } from "next/navigation";
import { getArtikel, getFirma, getGeraet, getStandort } from "@/lib/dataverse/geraete";
import { DataverseError } from "@/lib/dataverse/errors";
import { GeraetForm } from "@/components/geraet-form";
import { Card, CardContent } from "@/components/ui/card";

async function loadGeraetDetail(id: string) {
  try {
    const geraet = await getGeraet(id);
    const [standort, artikel] = await Promise.all([
      geraet.standortId ? getStandort(geraet.standortId) : Promise.resolve(null),
      geraet.artikelId ? getArtikel(geraet.artikelId) : Promise.resolve(null),
    ]);
    const firma = standort ? await getFirma(standort.firmaId) : null;
    return { geraet, standort, artikel, firma, error: null as string | null };
  } catch (error) {
    if (error instanceof DataverseError && error.category === "not_found") {
      notFound();
    }
    return { geraet: null, standort: null, artikel: null, firma: null, error: "Das Gerät konnte nicht geladen werden." };
  }
}

export default async function GeraetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { geraet, standort, artikel, firma, error } = await loadGeraetDetail(id);

  if (error || !geraet) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">{error}</CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold">{geraet.name ?? "Gerät"}</h1>
      <GeraetForm geraet={geraet} standort={standort} firma={firma} artikel={artikel} />
    </main>
  );
}
