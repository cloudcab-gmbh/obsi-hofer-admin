"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { badgeVariants } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SyncErgebnisAnzeige } from "@/components/sync-ergebnis-anzeige";
import type { SyncStatus } from "@/lib/kundenportal-sync";
import type { SyncLauf } from "@/lib/dataverse/sync-laeufe";

const STATUS_BADGE: Record<SyncStatus, { label: string; variant: "success" | "warning" | "destructive" }> = {
  erfolg: { label: "Erfolg", variant: "success" },
  teilweise: { label: "Mit Problemen", variant: "warning" },
  fehler: { label: "Fehlgeschlagen", variant: "destructive" },
  unbekannt: { label: "Unbekannt", variant: "warning" },
};

// Explizite Zeitzone: identische Ausgabe beim Server-Rendering und im Browser.
const ZEIT_FORMAT = new Intl.DateTimeFormat("de-CH", {
  timeZone: "Europe/Zurich",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatZeit(iso: string): string {
  const datum = new Date(iso);
  return Number.isNaN(datum.getTime()) ? "—" : ZEIT_FORMAT.format(datum);
}

function formatDauer(sekunden: number | null): string | null {
  if (sekunden === null) return null;
  return sekunden < 60 ? `${sekunden} s` : `${Math.floor(sekunden / 60)} min ${sekunden % 60} s`;
}

// QA BUG-1: als <span> mit den Badge-Styles statt shadcn <Badge> (ein <div>) —
// das Badge steht auch innerhalb des Aufklapp-Buttons, und dort sind laut
// HTML-Inhaltsmodell nur Inline-Elemente erlaubt.
function StatusBadge({ status }: { status: SyncStatus }) {
  const { label, variant } = STATUS_BADGE[status];
  return <span className={badgeVariants({ variant })}>{label}</span>;
}

function LaufEintrag({ lauf }: { lauf: SyncLauf }) {
  const [offen, setOffen] = useState(false);
  const dauer = formatDauer(lauf.dauerSekunden);
  return (
    <Collapsible open={offen} onOpenChange={setOffen} className="rounded-md border">
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-left text-sm hover:bg-muted/50"
        >
          <span className="font-medium">{formatZeit(lauf.gestartetAm)}</span>
          <span className="text-muted-foreground">{lauf.ausgeloestVon ?? "—"}</span>
          {dauer && <span className="text-muted-foreground">{dauer}</span>}
          <span className="ml-auto flex items-center gap-2">
            <StatusBadge status={lauf.ergebnis.status} />
            <ChevronDown className={`h-4 w-4 transition-transform ${offen ? "rotate-180" : ""}`} aria-hidden />
          </span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t px-3 py-3">
        <SyncErgebnisAnzeige ergebnis={lauf.ergebnis} />
      </CollapsibleContent>
    </Collapsible>
  );
}

export function SyncVerlauf({
  laeufe,
  hatMehr,
  fehler,
  laedtMehr,
  onMehrLaden,
}: {
  laeufe: SyncLauf[];
  hatMehr: boolean;
  /** Verlauf konnte nicht geladen werden — der Rest der Seite bleibt bedienbar. */
  fehler: string | null;
  laedtMehr: boolean;
  onMehrLaden: () => void;
}) {
  const letzter = laeufe[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Sync-Verlauf</CardTitle>
        {letzter && (
          <CardDescription className="flex flex-wrap items-center gap-2">
            Letzter Sync: {formatZeit(letzter.gestartetAm)} <StatusBadge status={letzter.ergebnis.status} />
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {laeufe.length === 0 && !fehler && (
          <p className="py-4 text-center text-sm text-muted-foreground">Noch kein Sync für diese Firma.</p>
        )}
        {laeufe.map((lauf) => (
          <LaufEintrag key={lauf.id} lauf={lauf} />
        ))}
        {fehler && (
          <p role="alert" className="text-sm text-destructive">
            {fehler}
          </p>
        )}
        {hatMehr && (
          <Button type="button" variant="outline" size="sm" onClick={onMehrLaden} disabled={laedtMehr}>
            {laedtMehr ? "Lädt…" : "Mehr anzeigen"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
