import Link from "next/link";
import { listStandorteForFirma, listGeraeteForStandorte, type Geraet, type Standort } from "@/lib/dataverse/geraete";
import { getCurrentFirmaId } from "@/lib/firma-session";
import { getGeraeteFilterState } from "@/lib/geraete-filter-session";
import { GeraeteListe } from "@/components/geraete-liste";
import { Card, CardContent } from "@/components/ui/card";

export default async function GeraetePage() {
  const [firmaId, initialFilter] = await Promise.all([getCurrentFirmaId(), getGeraeteFilterState()]);

  if (!firmaId) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-6 text-xl font-semibold">Geräte-Verwaltung</h1>
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Bitte zuerst auf der{" "}
            <Link href="/start" className="font-medium text-primary underline-offset-2 hover:underline">
              Startseite
            </Link>{" "}
            eine Firma auswählen.
          </CardContent>
        </Card>
      </main>
    );
  }

  let standorte: Standort[] = [];
  let geraete: Geraet[] = [];
  let loadError: string | null = null;

  try {
    standorte = await listStandorteForFirma(firmaId);
    geraete = await listGeraeteForStandorte(standorte.map((s) => s.id));
  } catch {
    loadError = "Die Gerätedaten konnten nicht geladen werden.";
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold">Geräte-Verwaltung</h1>

      {loadError ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">{loadError}</CardContent>
        </Card>
      ) : (
        <GeraeteListe geraete={geraete} standorte={standorte} initialFilter={initialFilter} />
      )}
    </main>
  );
}
