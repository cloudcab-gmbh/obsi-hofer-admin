"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  entferneFeiertagAction,
  setzeJahrZurueckAction,
  speichereFeiertagAction,
  uebernehmeJahrAction,
  type FeiertagResult,
} from "@/app/(protected)/zeiterfassung/feiertage/actions";
import { formatKalenderdatum, wochentagName } from "@/lib/zeiterfassung/datum";

export interface FeiertagZeile {
  /** `null` beim Vorschlag (noch nicht gespeichert). */
  id: string | null;
  datum: string;
  name: string;
  halb: boolean;
}

type Bestaetigung = { titel: string; text: string; aktion: () => Promise<FeiertagResult>; knopf: string };

/** PROJ-18: Feiertage eines Jahres anzeigen, übernehmen und pflegen. */
export function FeiertageVerwaltung({
  jahr,
  gepflegt,
  feiertage,
  vergangen,
}: {
  jahr: number;
  gepflegt: boolean;
  feiertage: FeiertagZeile[];
  /** Jahr liegt vor dem aktuellen — Änderungen rechnen bestehende Monate neu. */
  vergangen: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [fehler, setFehler] = useState<string | null>(null);
  const [dialog, setDialog] = useState<FeiertagZeile | null>(null);
  const [dialogFehler, setDialogFehler] = useState<string | null>(null);
  const [bestaetigung, setBestaetigung] = useState<Bestaetigung | null>(null);

  function ausfuehren(aktion: () => Promise<FeiertagResult>, danach?: () => void) {
    setFehler(null);
    startTransition(async () => {
      try {
        const result = await aktion();
        router.refresh();
        if (!result.success) setFehler(result.message);
        else danach?.();
      } catch {
        setFehler("Die Änderung konnte nicht gespeichert werden. Bitte die Seite neu laden und erneut versuchen.");
      }
    });
  }

  function speichern(event: React.FormEvent) {
    event.preventDefault();
    if (!dialog) return;
    setDialogFehler(null);
    startTransition(async () => {
      try {
        const result = await speichereFeiertagAction({ jahr, id: dialog.id, datum: dialog.datum, name: dialog.name, halb: dialog.halb });
        if (!result.success) {
          setDialogFehler(result.message);
          return;
        }
        setDialog(null);
        router.refresh();
      } catch {
        setDialogFehler("Der Feiertag konnte nicht gespeichert werden. Bitte die Seite neu laden und erneut versuchen.");
      }
    });
  }

  const rueckwirkend = vergangen ? " Das Jahr liegt in der Vergangenheit: Gleitzeit- und Feriensalden der Folgemonate rechnen danach neu." : "";

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2 text-base">
            Feiertage {jahr}
            <Badge variant={gepflegt ? "secondary" : "outline"} className="font-normal">
              {gepflegt ? "gepflegt" : "automatischer Vorschlag"}
            </Badge>
          </CardTitle>
          <CardDescription>
            {gepflegt
              ? "Diese Liste gilt für Zeitnachweis, Ferien und Übersicht."
              : "Nicht übernommen: Es gelten die berechneten gesetzlichen Feiertage. Zum Anpassen das Jahr übernehmen."}
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="icon" aria-label="Vorjahr">
            <Link href={`/zeiterfassung/feiertage?jahr=${jahr - 1}`}>
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="icon" aria-label="Folgejahr">
            <Link href={`/zeiterfassung/feiertage?jahr=${jahr + 1}`}>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
          {gepflegt ? (
            <>
              <Button
                type="button"
                size="sm"
                disabled={isPending}
                onClick={() => {
                  setDialogFehler(null);
                  setDialog({ id: null, datum: "", name: "", halb: false });
                }}
              >
                <Plus className="mr-1 h-4 w-4" />
                Feiertag hinzufügen
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={() =>
                  setBestaetigung({
                    titel: "Auf Vorschlag zurücksetzen?",
                    text: `Die gepflegte Liste ${jahr} wird gelöscht; danach gelten wieder die berechneten gesetzlichen Feiertage.${rueckwirkend}`,
                    aktion: () => setzeJahrZurueckAction(jahr),
                    knopf: "Zurücksetzen",
                  })
                }
              >
                Auf Vorschlag zurücksetzen
              </Button>
            </>
          ) : (
            <Button
              type="button"
              size="sm"
              disabled={isPending}
              onClick={() =>
                vergangen
                  ? setBestaetigung({
                      titel: `Jahr ${jahr} übernehmen?`,
                      text: `Der Vorschlag wird als Liste gespeichert und ist danach änderbar.${rueckwirkend}`,
                      aktion: () => uebernehmeJahrAction(jahr),
                      knopf: "Übernehmen",
                    })
                  : ausfuehren(() => uebernehmeJahrAction(jahr))
              }
            >
              Jahr übernehmen
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {fehler && (
          <p role="alert" className="text-sm text-destructive">
            {fehler}
          </p>
        )}
        {feiertage.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Für dieses Jahr sind keine Feiertage erfasst — kein Tag hat ein Feiertags-Soll von 0.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Datum</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Umfang</TableHead>
                {gepflegt && (
                  <TableHead className="w-24">
                    <span className="sr-only">Aktionen</span>
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {feiertage.map((f) => (
                <TableRow key={f.datum}>
                  <TableCell className="whitespace-nowrap tabular-nums">
                    {wochentagName(f.datum).slice(0, 2)} {formatKalenderdatum(f.datum)}
                  </TableCell>
                  <TableCell>{f.name}</TableCell>
                  <TableCell>{f.halb ? "halber Tag" : "ganzer Tag"}</TableCell>
                  {gepflegt && f.id && (
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`${f.name} bearbeiten`}
                          disabled={isPending}
                          onClick={() => {
                            setDialogFehler(null);
                            setDialog(f);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`${f.name} entfernen`}
                          disabled={isPending}
                          onClick={() =>
                            setBestaetigung({
                              titel: "Feiertag entfernen?",
                              text: `${f.name} (${formatKalenderdatum(f.datum)}) wird entfernt; der Tag hat danach das normale Soll.${rueckwirkend}`,
                              aktion: () => entferneFeiertagAction(jahr, f.id!),
                              knopf: "Entfernen",
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={dialog !== null} onOpenChange={(offen) => !offen && !isPending && setDialog(null)}>
        <DialogContent>
          <form onSubmit={speichern} className="space-y-5">
            <DialogHeader>
              <DialogTitle>{dialog?.id ? "Feiertag bearbeiten" : "Feiertag hinzufügen"}</DialogTitle>
              <DialogDescription>
                Gilt für alle Mitarbeitenden. Ein halber Feiertag halbiert das Soll des Tages.
              </DialogDescription>
            </DialogHeader>
            {dialog && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="feiertag-datum">Datum</Label>
                    <Input
                      id="feiertag-datum"
                      type="date"
                      required
                      min={`${jahr}-01-01`}
                      max={`${jahr}-12-31`}
                      disabled={dialog.id !== null}
                      value={dialog.datum}
                      onChange={(e) => setDialog({ ...dialog, datum: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="feiertag-name">Name</Label>
                    <Input
                      id="feiertag-name"
                      required
                      maxLength={100}
                      placeholder="z.B. Heiligabend"
                      value={dialog.name}
                      onChange={(e) => setDialog({ ...dialog, name: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="feiertag-halb"
                    checked={dialog.halb}
                    onCheckedChange={(wert) => setDialog({ ...dialog, halb: wert === true })}
                  />
                  <Label htmlFor="feiertag-halb" className="font-normal">
                    halber Tag (z.B. nachmittags frei)
                  </Label>
                </div>
              </div>
            )}
            {dialogFehler && (
              <p role="alert" className="text-sm text-destructive">
                {dialogFehler}
              </p>
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

      <AlertDialog open={bestaetigung !== null} onOpenChange={(offen) => !offen && !isPending && setBestaetigung(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{bestaetigung?.titel}</AlertDialogTitle>
            <AlertDialogDescription>{bestaetigung?.text}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={(e) => {
                e.preventDefault();
                if (bestaetigung) ausfuehren(bestaetigung.aktion, () => setBestaetigung(null));
              }}
            >
              {bestaetigung?.knopf}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
