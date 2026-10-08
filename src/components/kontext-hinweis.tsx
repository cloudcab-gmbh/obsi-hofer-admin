import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import type { Arbeitskontext } from "@/lib/arbeitskontext";

/**
 * PROJ-10: Hinweis statt Liste, solange kein Standort feststeht — gemeinsam
 * für Geräteliste und Prüfberichte-Übersicht.
 */
export function KontextHinweis({
  titel,
  kontext,
}: {
  titel: string;
  kontext: Exclude<Arbeitskontext, { zustand: "bereit" }>;
}) {
  const startseite = (
    <Link href="/start" className="font-medium text-primary underline-offset-2 hover:underline">
      Startseite
    </Link>
  );

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold">{titel}</h1>
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          {kontext.zustand === "keine-firma" && <>Bitte zuerst auf der {startseite} eine Firma auswählen.</>}
          {kontext.zustand === "standort-waehlen" && (
            <>
              Bitte zuerst auf der {startseite} einen Standort von {kontext.firma.name} auswählen.
            </>
          )}
          {kontext.zustand === "firma-ohne-standort" && (
            <>
              Für {kontext.firma.name} sind keine Standorte erfasst. Auf der {startseite} kann eine andere Firma
              gewählt werden.
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
