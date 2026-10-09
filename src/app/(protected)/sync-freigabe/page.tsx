import Link from "next/link";
import { aktuellerBenutzerIstFreigeber } from "@/lib/auth/freigeber";
import { getCurrentFirmaId } from "@/lib/firma-session";
import { ladeArbeitskontext, kontextBezeichnung, type Arbeitskontext } from "@/lib/arbeitskontext";
import { KontextHinweis } from "@/components/kontext-hinweis";
import { listKundenportalKontakteForFirma, type KundenportalKontakt } from "@/lib/dataverse/kontakte";
import { SyncFreigabeBereich, type InitialerVerlauf } from "@/components/sync-freigabe-bereich";
import { listSyncLaeufeForFirma } from "@/lib/dataverse/sync-laeufe";
import { fehlendeSyncEinstellungen } from "@/lib/kundenportal-sync";
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

  // PROJ-6: Verlauf parallel laden, aber mit eigenem Fehlerpfad — ist er nicht
  // abrufbar, bleiben Kontakt-Freigabe und Sync-Button trotzdem bedienbar.
  const verlaufPromise: Promise<InitialerVerlauf> = listSyncLaeufeForFirma(firmaId)
    .then((v) => ({ ...v, fehler: null }))
    .catch(() => ({ laeufe: [], hatMehr: false, fehler: "Der Sync-Verlauf konnte nicht geladen werden." }));

  let kontext: Arbeitskontext | null = null;
  let kontakte: KundenportalKontakt[] = [];
  let verlauf: InitialerVerlauf = { laeufe: [], hatMehr: false, fehler: null };
  let ladefehler = false;
  try {
    kontext = await ladeArbeitskontext();
    // PROJ-11: Freigaben gelten pro Standort — die Liste braucht einen feststehenden Standort.
    if (kontext.zustand === "bereit") {
      [kontakte, verlauf] = await Promise.all([
        listKundenportalKontakteForFirma(firmaId, kontext.standorte, kontext.standort.id),
        verlaufPromise,
      ]);
    }
  } catch {
    ladefehler = true;
  }

  // Firma existiert nicht mehr → wie bisher der Ladefehler.
  if (ladefehler || !kontext || kontext.zustand === "keine-firma") {
    return <Hinweis>Die Kontakte konnten nicht geladen werden.</Hinweis>;
  }
  if (kontext.zustand !== "bereit") {
    return <KontextHinweis titel="Sync-Freigabe" kontext={kontext} />;
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <h1 className="text-xl font-semibold">Sync-Freigabe</h1>
      {/* Neu aufbauen bei Firmen- oder Standortwechsel, damit kein Client-State des vorherigen bleibt. */}
      <SyncFreigabeBereich
        key={`${firmaId}-${kontext.standort.id}`}
        firmaId={firmaId}
        // PROJ-10 QA BUG-1: Anzeigename, damit gleichnamige Firmen im Sync-Dialog
        // unterscheidbar sind. Sync und Verlauf laufen über die Firmen-ID.
        firmaName={kontext.firma.anzeigename}
        // PROJ-11: Liste mit Standort (bei mehreren Standorten / gleichnamigen Firmen).
        standortId={kontext.standort.id}
        listenTitel={kontextBezeichnung(kontext) ?? kontext.firma.anzeigename}
        kontakte={kontakte}
        fehlendeSyncEinstellungen={fehlendeSyncEinstellungen()}
        verlauf={verlauf}
      />
    </main>
  );
}
