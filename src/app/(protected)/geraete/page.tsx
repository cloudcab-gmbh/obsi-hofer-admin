import { listFirmen, listStandorteForFirma, listGeraeteForStandorte, type Geraet, type Standort } from "@/lib/dataverse/geraete";
import { FirmaCombobox } from "@/components/firma-combobox";
import { GeraeteListe } from "@/components/geraete-liste";
import { Card, CardContent } from "@/components/ui/card";

export default async function GeraetePage({
  searchParams,
}: {
  searchParams: Promise<{ firmaId?: string }>;
}) {
  const { firmaId } = await searchParams;
  const firmen = await listFirmen();

  let standorte: Standort[] = [];
  let geraete: Geraet[] = [];
  let loadError: string | null = null;

  if (firmaId) {
    try {
      standorte = await listStandorteForFirma(firmaId);
      geraete = await listGeraeteForStandorte(standorte.map((s) => s.id));
    } catch {
      loadError = "Die Gerätedaten konnten nicht geladen werden.";
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold">Geräte-Verwaltung</h1>
      <div className="mb-6 max-w-sm">
        <FirmaCombobox firmen={firmen} selectedFirmaId={firmaId} />
      </div>

      {!firmaId ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Bitte zuerst eine Firma auswählen.
          </CardContent>
        </Card>
      ) : loadError ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">{loadError}</CardContent>
        </Card>
      ) : (
        <GeraeteListe geraete={geraete} standorte={standorte} />
      )}
    </main>
  );
}
