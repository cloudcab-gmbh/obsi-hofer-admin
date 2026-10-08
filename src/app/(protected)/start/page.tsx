import Link from "next/link";
import { auth } from "@/auth";
import { ladeArbeitskontext, kontextBezeichnung, type Arbeitskontext } from "@/lib/arbeitskontext";
import { firmenAnzeigenamen, listAlleStandorte, listFirmen } from "@/lib/dataverse/geraete";
import { FirmaCombobox } from "@/components/firma-combobox";
import { StandortCombobox } from "@/components/standort-combobox";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function ProtectedHomePage() {
  const session = await auth();
  const [firmen, alleStandorte, kontext] = await Promise.all([
    listFirmen(),
    listAlleStandorte(),
    ladeArbeitskontext().catch((): Arbeitskontext | null => null),
  ]);
  // Gleichnamige Firmen mit Standort-Zusatz unterscheidbar (z.B. "Bilfinger … AG · Pratteln").
  const anzeigenamen = firmenAnzeigenamen(firmen, alleStandorte);
  const firmenOptionen = firmen.map((f) => ({ id: f.id, name: anzeigenamen.get(f.id) ?? f.name }));
  const firma = kontext && kontext.zustand !== "keine-firma" ? kontext.firma : null;
  // PROJ-10: Standort-Auswahl nur bei Firmen mit mehreren Standorten.
  const standortAuswahl =
    kontext?.zustand === "standort-waehlen" || (kontext?.zustand === "bereit" && kontext.mehrereStandorte)
      ? kontext
      : null;

  return (
    <main className="flex flex-col items-center gap-8 px-4 py-16">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Willkommen, {session?.user?.name}</h1>
        <p className="text-muted-foreground">Ihre Rollen: {session?.user?.roles?.join(", ") || "keine"}</p>
      </div>

      <Card className="w-full max-w-sm">
        <CardContent className="space-y-4 py-6">
          <div>
            <p className="mb-1 text-sm font-medium">Aktuelle Firma</p>
            <FirmaCombobox firmen={firmenOptionen} selectedFirmaId={firma?.id} />
          </div>
          {standortAuswahl && (
            <div>
              <p className="mb-1 text-sm font-medium">Aktueller Standort</p>
              <StandortCombobox
                standorte={standortAuswahl.standorte}
                selectedStandortId={standortAuswahl.zustand === "bereit" ? standortAuswahl.standort.id : undefined}
              />
            </div>
          )}
          {kontext?.zustand === "firma-ohne-standort" && (
            <p className="text-sm text-muted-foreground">Für diese Firma sind keine Standorte erfasst.</p>
          )}
          {kontext === null && (
            <p className="text-sm text-destructive">Die Standorte der Firma konnten nicht geladen werden.</p>
          )}
          {kontext?.zustand === "bereit" && (
            <Button asChild className="w-full">
              <Link href="/geraete">Weiter zu Geräte ({kontextBezeichnung(kontext)})</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
