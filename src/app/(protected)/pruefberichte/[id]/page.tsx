import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getGeraet } from "@/lib/dataverse/geraete";
import { getPruefbericht } from "@/lib/dataverse/pruefberichte";
import { DataverseError } from "@/lib/dataverse/errors";
import { PruefberichtForm } from "@/components/pruefbericht-form";
import { Card, CardContent } from "@/components/ui/card";

async function loadPruefberichtDetail(id: string) {
  try {
    const pruefbericht = await getPruefbericht(id);
    const geraet = await getGeraet(pruefbericht.geraetId).catch(() => null);
    return { pruefbericht, geraet, error: null as string | null };
  } catch (error) {
    if (error instanceof DataverseError && error.category === "not_found") {
      notFound();
    }
    return { pruefbericht: null, geraet: null, error: "Der Prüfbericht konnte nicht geladen werden." };
  }
}

export default async function PruefberichtDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { pruefbericht, geraet, error } = await loadPruefberichtDetail(id);

  const backHref = geraet ? `/geraete/${geraet.id}` : "/pruefberichte";

  if (error || !pruefbericht) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <Link href={backHref} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Zurück
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
        Zurück zum Gerät
      </Link>
      <h1 className="mb-6 text-xl font-semibold">Prüfbericht — {geraet?.name ?? "Gerät"}</h1>
      <PruefberichtForm mode="edit" geraetId={pruefbericht.geraetId} pruefbericht={pruefbericht} backHref={backHref} />
    </main>
  );
}
