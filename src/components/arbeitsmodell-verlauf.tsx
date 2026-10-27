"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  loescheArbeitsmodellAction,
  speichereArbeitsmodellAction,
  type ArbeitsmodellFormEingabe,
} from "@/app/(protected)/zeiterfassung/personen/actions";
import { formatKalenderdatum } from "@/lib/zeiterfassung/datum";
import {
  WOCHENTAGE_KURZ,
  formatArbeitstage,
  formatPensum,
  formatSollBeschreibung,
  formatStunden,
  sollProArbeitstag,
  type ArbeitsmodellVersion,
} from "@/lib/zeiterfassung/soll";

export interface VerlaufVersion extends ArbeitsmodellVersion {
  /** Abgeleitet: Vortag der nächsten Version bzw. Austritt, `null` = offen. */
  gueltigBis: string | null;
  /** Beginnt erst nach dem Austritt (QA BUG-1). */
  ohneWirkung?: boolean;
}

const LEERES_MODELL: ArbeitsmodellFormEingabe = {
  gueltigAb: "",
  pensum: "100",
  arbeitstage: [true, true, true, true, true, false, false],
};

/** Pensum aus dem Eingabefeld für die laufende Anzeige (Komma erlaubt). */
function pensumAusEingabe(wert: string): number | null {
  const n = Number(wert.trim().replace(",", "."));
  return wert.trim() !== "" && Number.isFinite(n) ? n : null;
}

export function ArbeitsmodellVerlauf({ email, versionen }: { email: string; versionen: VerlaufVersion[] }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<{ versionId: string | null; werte: ArbeitsmodellFormEingabe } | null>(null);
  const [zuLoeschen, setZuLoeschen] = useState<VerlaufVersion | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [loeschFehler, setLoeschFehler] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function oeffneNeu() {
    setFehler(null);
    // Neue Version übernimmt die Werte der neuesten als Vorschlag.
    const neueste = versionen[0];
    setDialog({
      versionId: null,
      werte: neueste
        ? { gueltigAb: "", pensum: String(neueste.pensum), arbeitstage: [...neueste.arbeitstage] }
        : LEERES_MODELL,
    });
  }

  function oeffneBearbeiten(v: VerlaufVersion) {
    setFehler(null);
    setDialog({
      versionId: v.id,
      werte: { gueltigAb: v.gueltigAb, pensum: String(v.pensum), arbeitstage: [...v.arbeitstage] },
    });
  }

  function setzeWerte(aenderung: Partial<ArbeitsmodellFormEingabe>) {
    setDialog((d) => d && { ...d, werte: { ...d.werte, ...aenderung } });
  }

  function speichern(event: React.FormEvent) {
    event.preventDefault();
    if (!dialog) return;
    setFehler(null);
    startTransition(async () => {
      try {
        const result = await speichereArbeitsmodellAction(email, dialog.versionId, dialog.werte);
        if (!result.success) {
          setFehler(result.message);
          return;
        }
        setDialog(null);
        router.refresh();
      } catch {
        // Dialog bleibt offen, Eingaben bleiben erhalten.
        setFehler("Das Arbeitsmodell konnte nicht gespeichert werden. Bitte die Seite neu laden und erneut versuchen.");
      }
    });
  }

  function loeschen() {
    if (!zuLoeschen) return;
    const version = zuLoeschen;
    setLoeschFehler(null);
    startTransition(async () => {
      try {
        const result = await loescheArbeitsmodellAction(email, version.id);
        if (!result.success) setLoeschFehler(result.message);
        else router.refresh();
      } catch {
        setLoeschFehler("Die Version konnte nicht gelöscht werden. Bitte die Seite neu laden und erneut versuchen.");
      } finally {
        setZuLoeschen(null);
      }
    });
  }

  const pensum = dialog ? pensumAusEingabe(dialog.werte.pensum) : null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="text-base">Arbeitsmodell</CardTitle>
          <CardDescription>
            Eine Version gilt bis zum Tag vor der nächsten. Pensumsänderungen als neue Version erfassen — frühere
            Monate bleiben dann unverändert.
          </CardDescription>
        </div>
        <Button type="button" size="sm" onClick={oeffneNeu} className="shrink-0">
          <Plus className="mr-1 h-4 w-4" />
          Neue Version
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {loeschFehler && (
          <p role="alert" className="text-sm text-destructive">
            {loeschFehler}
          </p>
        )}
        {versionen.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Noch kein Arbeitsmodell — ohne Arbeitsmodell entsteht kein Soll.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>gültig ab</TableHead>
                  <TableHead>gültig bis</TableHead>
                  <TableHead className="text-right">Pensum</TableHead>
                  <TableHead>Arbeitstage</TableHead>
                  <TableHead className="text-right">Soll pro Arbeitstag</TableHead>
                  <TableHead className="w-24">
                    <span className="sr-only">Aktionen</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {versionen.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>{formatKalenderdatum(v.gueltigAb)}</TableCell>
                    <TableCell>
                      {v.ohneWirkung ? (
                        <Badge variant="outline" className="font-normal text-status-warning">
                          nach Austritt – ohne Wirkung
                        </Badge>
                      ) : v.gueltigBis ? (
                        formatKalenderdatum(v.gueltigBis)
                      ) : (
                        "offen"
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatPensum(v.pensum)}</TableCell>
                    <TableCell>{formatArbeitstage(v.arbeitstage)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatStunden(sollProArbeitstag(v.pensum, v.arbeitstage))}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Version ab ${formatKalenderdatum(v.gueltigAb)} bearbeiten`}
                          onClick={() => oeffneBearbeiten(v)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Version ab ${formatKalenderdatum(v.gueltigAb)} löschen`}
                          onClick={() => {
                            setLoeschFehler(null);
                            setZuLoeschen(v);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={dialog !== null} onOpenChange={(offen) => !offen && !isPending && setDialog(null)}>
        <DialogContent>
          <form onSubmit={speichern} className="space-y-5">
            <DialogHeader>
              <DialogTitle>{dialog?.versionId ? "Version korrigieren" : "Neue Version"}</DialogTitle>
              <DialogDescription>
                {dialog?.versionId
                  ? "Die Korrektur wirkt rückwirkend auf alle Tage dieser Version."
                  : "Gilt ab dem gewählten Datum; die bisherige Version endet am Vortag."}
              </DialogDescription>
            </DialogHeader>

            {dialog && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="gueltig-ab">gültig ab</Label>
                    <Input
                      id="gueltig-ab"
                      type="date"
                      required
                      value={dialog.werte.gueltigAb}
                      onChange={(e) => setzeWerte({ gueltigAb: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pensum">Pensum in %</Label>
                    <Input
                      id="pensum"
                      inputMode="decimal"
                      required
                      value={dialog.werte.pensum}
                      onChange={(e) => setzeWerte({ pensum: e.target.value })}
                    />
                  </div>
                </div>

                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium">Arbeitstage</legend>
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {WOCHENTAGE_KURZ.map((tag, i) => (
                      <div key={tag} className="flex items-center gap-1.5">
                        <Checkbox
                          id={`arbeitstag-${i}`}
                          checked={dialog.werte.arbeitstage[i]}
                          onCheckedChange={(wert) =>
                            setzeWerte({
                              arbeitstage: dialog.werte.arbeitstage.map((t, j) => (j === i ? wert === true : t)),
                            })
                          }
                        />
                        <Label htmlFor={`arbeitstag-${i}`} className="font-normal">
                          {tag}
                        </Label>
                      </div>
                    ))}
                  </div>
                </fieldset>

                <p className="rounded-md bg-muted px-3 py-2 text-sm" aria-live="polite">
                  Soll:{" "}
                  <span className="font-medium">
                    {pensum === null ? "—" : formatSollBeschreibung(pensum, dialog.werte.arbeitstage)}
                  </span>
                </p>

                {fehler && (
                  <p role="alert" className="text-sm text-destructive">
                    {fehler}
                  </p>
                )}
              </>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" disabled={isPending} onClick={() => setDialog(null)}>
                Abbrechen
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Speichert…" : "Speichern"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={zuLoeschen !== null} onOpenChange={(offen) => !offen && !isPending && setZuLoeschen(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Version löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              {zuLoeschen &&
                `Die Version ab ${formatKalenderdatum(zuLoeschen.gueltigAb)} (${formatPensum(zuLoeschen.pensum)}, ${formatArbeitstage(zuLoeschen.arbeitstage)}) wird gelöscht. Der Zeitnachweis rechnet die betroffenen Tage mit der vorherigen Version bzw. ohne Soll neu.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={(e) => {
                e.preventDefault();
                loeschen();
              }}
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
