import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
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

export default async function GeraetDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ firmaId?: string }>;
}) {
  const { id } = await params;
  const { firmaId: firmaIdFromQuery } = await searchParams;
  const { geraet, standort, artikel, firma, error } = await loadGeraetDetail(id);

  // Zurück-Link bevorzugt den Query-Parameter (falls von der Liste aus
  // geöffnet), fällt sonst auf die über das Gerät aufgelöste Firma zurück
  // (z.B. bei einem direkten Lesezeichen) — vermeidet eine erneute
  // Firma-Auswahl, wo immer möglich.
  const backFirmaId = firmaIdFromQuery ?? standort?.firmaId;
  const backHref = backFirmaId ? `/geraete?firmaId=${backFirmaId}` : "/geraete";

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
      <GeraetForm geraet={geraet} standort={standort} firma={firma} artikel={artikel} />
    </main>
  );
}
