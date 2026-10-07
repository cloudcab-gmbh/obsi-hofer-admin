"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SyncErgebnis, SyncStatus } from "@/lib/kundenportal-sync";
import { syncFirmaAction } from "@/app/(protected)/sync-freigabe/actions";
import { cn } from "@/lib/utils";

const STATUS_FARBE: Record<SyncStatus, string> = {
  erfolg: "text-status-success",
  teilweise: "text-status-warning",
  fehler: "text-destructive",
  unbekannt: "text-status-warning",
};

export function SyncAusloesen({
  firmaId,
  firmaName,
  anzahlZugriffe,
  fehlendeSyncEinstellungen,
}: {
  firmaId: string;
  firmaName: string;
  /** Freigegebene Kontakte mit E-Mail (live aus dem Kontakt-Bereich). */
  anzahlZugriffe: number;
  /** Namen fehlender Sync-Einstellungen in Vercel (leer = Sync bereit) — nie Werte. */
  fehlendeSyncEinstellungen: string[];
}) {
  const syncAktiv = fehlendeSyncEinstellungen.length === 0;
  const [laeuft, setLaeuft] = useState(false);
  const [ergebnis, setErgebnis] = useState<SyncErgebnis | null>(null);

  const gesperrt = !syncAktiv || anzahlZugriffe === 0 || laeuft;

  async function synchronisieren() {
    setLaeuft(true);
    setErgebnis(null);
    try {
      const result = await syncFirmaAction(firmaId);
      setErgebnis(
        result.success ? result.ergebnis : { status: "fehler", meldung: result.message, bereiche: [], probleme: [] }
      );
    } catch {
      // Der Aufruf selbst kann werfen (Verbindungsabbruch, veraltete Action
      // nach einem Deploy) — gleiche Lehre wie PROJ-8 QA BUG-1.
      setErgebnis({
        status: "unbekannt",
        meldung: "Keine Antwort erhalten. Der Sync kann trotzdem durchgelaufen sein — bitte die Seite neu laden.",
        bereiche: [],
        probleme: [],
      });
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ins Kundenportal übertragen</CardTitle>
        <CardDescription>
          Überträgt Firma, Standorte, Geräte, Prüfberichte und Kontakte von {firmaName} sowie alle Artikel ins
          Kundenportal.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!syncAktiv ? (
          <p className="text-sm text-muted-foreground">
            Der Sync ist noch nicht aktiviert. Er wird freigeschaltet, sobald die Anpassung im Kundenportal ausgerollt
            ist. Fehlende Einstellung in Vercel:{" "}
            <span className="font-mono">{fehlendeSyncEinstellungen.join(", ")}</span>
          </p>
        ) : anzahlZugriffe === 0 ? (
          <p className="text-sm text-muted-foreground">
            Zuerst mindestens einen Kontakt mit E-Mail-Adresse fürs Kundenportal freigeben.
          </p>
        ) : null}

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" disabled={gesperrt}>
              {laeuft ? "Synchronisiere…" : "Freigeben & synchronisieren"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Daten ins Kundenportal übertragen?</AlertDialogTitle>
              <AlertDialogDescription>
                Die Daten von „{firmaName}“ werden ins Kundenportal übertragen.{" "}
                {anzahlZugriffe === 1 ? "1 Kontakt hat" : `${anzahlZugriffe} Kontakte haben`} danach Zugriff.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction onClick={synchronisieren}>Übertragen</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {ergebnis && (
          <div role="status" className="space-y-3">
            <p className={cn("text-sm font-medium", STATUS_FARBE[ergebnis.status])}>{ergebnis.meldung}</p>
            {ergebnis.probleme.length > 0 && (
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {ergebnis.probleme.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            )}
            {ergebnis.bereiche.length > 0 && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bereich</TableHead>
                      <TableHead className="text-right">Geladen</TableHead>
                      <TableHead className="text-right">Neu</TableHead>
                      <TableHead className="text-right">Aktualisiert</TableHead>
                      <TableHead className="text-right">Gelöscht</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ergebnis.bereiche.map((b) => (
                      <TableRow key={b.bereich}>
                        <TableCell>{b.bereich}</TableCell>
                        <TableCell className="text-right">{b.geladen}</TableCell>
                        <TableCell className="text-right">{b.neu}</TableCell>
                        <TableCell className="text-right">{b.aktualisiert}</TableCell>
                        <TableCell className="text-right">{b.geloescht}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
