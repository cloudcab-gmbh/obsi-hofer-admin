"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { KundenportalKontakt } from "@/lib/dataverse/kontakte";
import { setKundenportalFreigabeAction } from "@/app/(protected)/sync-freigabe/actions";

export function KundenportalKontakte({
  kontakte,
  titel,
  standortId,
  zaehltNurStandort = false,
  onZugriffeChange,
}: {
  kontakte: KundenportalKontakt[];
  /** Firma bzw. "Firma · Standort" (PROJ-11). */
  titel: string;
  /** PROJ-11: Standort, für den die Häkchen gelten. */
  standortId: string;
  /** PROJ-12: Sync-Voraussetzung zählt nur Zugänge zu DIESEM Standort. */
  zaehltNurStandort?: boolean;
  /**
   * PROJ-5: meldet die Anzahl Kontakte MIT E-Mail, die für irgendeinen
   * Standort der Firma freigegeben sind (PROJ-11) — der Sync-Button wird
   * darüber live freigeschaltet, ohne Neuladen.
   */
  onZugriffeChange?: (anzahl: number) => void;
}) {
  const [freigaben, setFreigaben] = useState(() => new Map(kontakte.map((k) => [k.id, k.freigegeben])));
  const [speichernd, setSpeichernd] = useState<Set<string>>(new Set());
  const [fehler, setFehler] = useState<string | null>(null);

  const anzahlFreigegeben = [...freigaben.values()].filter(Boolean).length;
  const anzahlZugriffe = kontakte.filter(
    (k) => k.email && (freigaben.get(k.id) || (!zaehltNurStandort && k.weitereStandorte.length > 0))
  ).length;

  useEffect(() => {
    onZugriffeChange?.(anzahlZugriffe);
  }, [anzahlZugriffe, onZugriffeChange]);

  async function aendereFreigabe(kontakt: KundenportalKontakt, neu: boolean) {
    const vorher = freigaben.get(kontakt.id) ?? false;
    setFehler(null);
    // Sofort anzeigen; schlägt das Speichern fehl, zurück auf den gespeicherten Zustand.
    setFreigaben((m) => new Map(m).set(kontakt.id, neu));
    setSpeichernd((s) => new Set(s).add(kontakt.id));

    // QA BUG-1: Der Aufruf selbst kann werfen (Verbindungsabbruch, oder nach
    // einem Vercel-Deploy ist die Server-Action-ID der offenen Seite
    // ungültig) — dann ebenfalls zurücksetzen, statt einen nicht
    // gespeicherten Zustand dauerhaft gesperrt anzuzeigen.
    let fehlermeldung: string | null = null;
    try {
      const result = await setKundenportalFreigabeAction(kontakt.id, standortId, neu);
      if (!result.success) fehlermeldung = result.message;
    } catch {
      fehlermeldung = "Die Änderung konnte nicht gespeichert werden. Bitte die Seite neu laden und erneut versuchen.";
    } finally {
      setSpeichernd((s) => {
        const next = new Set(s);
        next.delete(kontakt.id);
        return next;
      });
    }

    if (fehlermeldung) {
      setFreigaben((m) => new Map(m).set(kontakt.id, vorher));
      setFehler(`${kontakt.name}: ${fehlermeldung}`);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Kundenportal-Zugang — {titel}</CardTitle>
        <CardDescription>
          Änderungen werden sofort gespeichert und mit dem nächsten Sync im Kundenportal wirksam.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {kontakte.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Dieser Firma sind in Bexio keine aktiven Kontakte zugeordnet.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {anzahlFreigegeben} von {kontakte.length} Kontakten freigegeben
            </p>
            {fehler && (
              <p role="alert" className="text-sm text-destructive">
                {fehler}
              </p>
            )}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>E-Mail</TableHead>
                    <TableHead>Rolle</TableHead>
                    <TableHead className="text-center">Kundenportal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kontakte.map((kontakt) => {
                    const freigegeben = freigaben.get(kontakt.id) ?? false;
                    // Ohne E-Mail nicht freigebbar — ein bereits gesetztes Häkchen bleibt aber entfernbar.
                    const gesperrt = speichernd.has(kontakt.id) || (!kontakt.email && !freigegeben);
                    return (
                      <TableRow key={kontakt.id}>
                        <TableCell>
                          <div className="font-medium">{kontakt.name}</div>
                          {/* PROJ-11: Zugänge zu anderen Standorten derselben Firma. */}
                          {kontakt.weitereStandorte.length > 0 && (
                            <Badge variant="secondary" className="mt-1 whitespace-normal text-left font-normal">
                              auch freigegeben für: {kontakt.weitereStandorte.join(", ")}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {kontakt.email ?? (
                            <span className="text-muted-foreground">Keine E-Mail-Adresse hinterlegt</span>
                          )}
                        </TableCell>
                        <TableCell>{kontakt.rollen.length > 0 ? kontakt.rollen.join(", ") : "—"}</TableCell>
                        <TableCell>
                          {/* Checkbox ist ein Block-Element (grid) und ignoriert text-center — daher flex. */}
                          <div className="flex justify-center">
                            <Checkbox
                              checked={freigegeben}
                              disabled={gesperrt}
                              onCheckedChange={(wert) => aendereFreigabe(kontakt, wert === true)}
                              aria-label={`Kundenportal-Zugang für ${kontakt.name}`}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
