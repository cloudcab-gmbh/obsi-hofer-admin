import Link from "next/link";
import { aktuellerBenutzerIstFreigeber } from "@/lib/auth/freigeber";
import { getCurrentFirmaId } from "@/lib/firma-session";
import { getFirma } from "@/lib/dataverse/geraete";
import { listKundenportalKontakteForFirma, type KundenportalKontakt } from "@/lib/dataverse/kontakte";
import { SyncFreigabeBereich } from "@/components/sync-freigabe-bereich";
import { istSyncKonfiguriert } from "@/lib/kundenportal-sync";
import { Card, CardContent } from "@/components/ui/card";

function Hinweis({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold">Sync-Freigabe</h1>
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">{children}</CardContent>
      </Card>
    </main>
  );
}

// PROJ-5: gilt laut Next.js-Doku auch für die Server Actions dieser Seite —
// der Kundenportal-Sync darf dort ebenfalls bis 300 s laufen.
export const maxDuration = 300;

export default async function SyncFreigabePage() {
  // Keine Weiterleitung auf /kein-zugang: proxy.ts leitet Benutzer MIT einer
  // gültigen Rolle (also auch Bearbeiter) von dort sofort auf /start zurück.
  if (!(await aktuellerBenutzerIstFreigeber())) {
    return <Hinweis>Diese Seite ist nur für Benutzer mit der Rolle „Freigeber“ verfügbar.</Hinweis>;
  }

  const firmaId = await getCurrentFirmaId();
  if (!firmaId) {
    return (
      <Hinweis>
        Bitte zuerst auf der{" "}
        <Link href="/start" className="font-medium text-primary underline-offset-2 hover:underline">
          Startseite
        </Link>{" "}
        eine Firma auswählen.
      </Hinweis>
    );
  }

  let firmaName = "";
  let kontakte: KundenportalKontakt[] = [];
  try {
    const [firma, geladeneKontakte] = await Promise.all([getFirma(firmaId), listKundenportalKontakteForFirma(firmaId)]);
    firmaName = firma.name;
    kontakte = geladeneKontakte;
  } catch {
    return <Hinweis>Die Kontakte konnten nicht geladen werden.</Hinweis>;
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <h1 className="text-xl font-semibold">Sync-Freigabe</h1>
      {/* Neu aufbauen bei Firmenwechsel, damit kein Client-State der vorherigen Firma bleibt. */}
      <SyncFreigabeBereich
        key={firmaId}
        firmaId={firmaId}
        firmaName={firmaName}
        kontakte={kontakte}
        syncAktiv={istSyncKonfiguriert()}
      />
    </main>
  );
}
