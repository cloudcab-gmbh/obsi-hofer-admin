import Link from "next/link";
import { auth } from "@/auth";
import { getCurrentFirmaId } from "@/lib/firma-session";
import { listFirmen, getFirma } from "@/lib/dataverse/geraete";
import { FirmaCombobox } from "@/components/firma-combobox";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function ProtectedHomePage() {
  const session = await auth();
  const [firmen, currentFirmaId] = await Promise.all([listFirmen(), getCurrentFirmaId()]);
  const currentFirma = currentFirmaId ? await getFirma(currentFirmaId).catch(() => null) : null;

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
            <FirmaCombobox firmen={firmen} selectedFirmaId={currentFirmaId ?? undefined} />
          </div>
          {currentFirma && (
            <Button asChild className="w-full">
              <Link href="/geraete">Weiter zu Geräte ({currentFirma.name})</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
