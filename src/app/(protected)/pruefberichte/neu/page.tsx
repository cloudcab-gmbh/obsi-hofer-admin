import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { getGeraet } from "@/lib/dataverse/geraete";
import { computePrueferKuerzel } from "@/lib/pruefer-kuerzel";
import { PruefberichtForm } from "@/components/pruefbericht-form";
import { Card, CardContent } from "@/components/ui/card";

export default async function NeuerPruefberichtPage({
  searchParams,
}: {
  searchParams: Promise<{ geraetId?: string }>;
}) {
  const { geraetId } = await searchParams;

  if (!geraetId) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Kein Gerät angegeben. Bitte über die Gerät-Detailseite einen neuen Prüfbericht anlegen.
          </CardContent>
        </Card>
      </main>
    );
  }

  const backHref = `/geraete/${geraetId}`;
  const [session, geraet] = await Promise.all([
    auth(),
    getGeraet(geraetId).catch(() => null),
  ]);

  if (!geraet) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Das Gerät konnte nicht geladen werden.
          </CardContent>
        </Card>
      </main>
    );
  }

  const pruefer = computePrueferKuerzel(session?.user?.name ?? "");

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Link href={backHref} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Zurück zum Gerät
      </Link>
      <h1 className="mb-6 text-xl font-semibold">Neuer Prüfbericht — {geraet.name ?? "Gerät"}</h1>
      <PruefberichtForm mode="create" geraetId={geraetId} pruefer={pruefer} backHref={backHref} />
    </main>
  );
}
