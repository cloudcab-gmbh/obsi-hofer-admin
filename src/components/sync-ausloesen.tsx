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
import { SyncErgebnisAnzeige } from "@/components/sync-ergebnis-anzeige";
import type { SyncErgebnis } from "@/lib/kundenportal-sync";
import type { SyncLauf } from "@/lib/dataverse/sync-laeufe";
import { syncFirmaAction } from "@/app/(protected)/sync-freigabe/actions";

export function SyncAusloesen({
  firmaId,
  firmaName,
  anzahlZugriffe,
  fehlendeSyncEinstellungen,
  onNeuerLauf,
}: {
  firmaId: string;
  firmaName: string;
  /** Freigegebene Kontakte mit E-Mail (live aus dem Kontakt-Bereich). */
  anzahlZugriffe: number;
  /** Namen fehlender Sync-Einstellungen in Vercel (leer = Sync bereit) — nie Werte. */
  fehlendeSyncEinstellungen: string[];
  /** PROJ-6: neuer, gespeicherter Verlaufseintrag — erscheint ohne Neuladen oben im Verlauf. */
  onNeuerLauf?: (lauf: SyncLauf) => void;
}) {
  const syncAktiv = fehlendeSyncEinstellungen.length === 0;
  const [laeuft, setLaeuft] = useState(false);
  const [ergebnis, setErgebnis] = useState<SyncErgebnis | null>(null);
  const [verlaufNichtGespeichert, setVerlaufNichtGespeichert] = useState(false);

  const gesperrt = !syncAktiv || anzahlZugriffe === 0 || laeuft;

  async function synchronisieren() {
    setLaeuft(true);
    setErgebnis(null);
    setVerlaufNichtGespeichert(false);
    try {
      const result = await syncFirmaAction(firmaId);
      if (result.success) {
        setErgebnis(result.ergebnis);
        if (result.lauf) onNeuerLauf?.(result.lauf);
        else setVerlaufNichtGespeichert(true);
      } else {
        setErgebnis({ status: "fehler", meldung: result.message, bereiche: [], probleme: [] });
      }
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
          <div role="status" className="space-y-2">
            <SyncErgebnisAnzeige ergebnis={ergebnis} />
            {verlaufNichtGespeichert && (
              <p className="text-sm text-muted-foreground">
                Hinweis: Dieser Lauf konnte nicht im Sync-Verlauf gespeichert werden.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
