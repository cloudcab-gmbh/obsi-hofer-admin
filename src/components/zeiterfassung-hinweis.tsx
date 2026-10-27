import { Card, CardContent } from "@/components/ui/card";

/** Seitenrahmen mit einer Meldung statt Inhalt (kein Zugriff, Ladefehler). */
export function ZeiterfassungHinweis({ titel, children }: { titel: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-6 text-xl font-semibold">{titel}</h1>
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">{children}</CardContent>
      </Card>
    </main>
  );
}

export const NUR_FREIGEBER_HINWEIS = "Diese Seite ist nur für Benutzer mit der Rolle „Freigeber“ verfügbar.";
