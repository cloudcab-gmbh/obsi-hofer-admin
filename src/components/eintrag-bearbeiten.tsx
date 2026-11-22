"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { aendereZeiteintragAction, loescheAbwesenheitenAction } from "@/app/(protected)/zeiterfassung/actions";
import { formatKalenderdatum, wochentagName } from "@/lib/zeiterfassung/datum";

const BEMERKUNG_MAX = 500;

/**
 * PROJ-22: Dialog „Eintrag bearbeiten“ für ein Zeitpaar (nur Freigeber).
 * Ändert Kommen, Gehen und Bemerkung oder löscht den Eintrag nach einer
 * Bestätigung. Ersetzt „Gehen nachtragen“ (PROJ-13).
 */
export function EintragBearbeiten({
  eintragId,
  datum,
  kommen,
  gehen,
  folgetag = false,
  bemerkung,
  personName,
  children,
}: {
  eintragId: string;
  datum: string;
  /** "HH:MM" */
  kommen: string;
  /** "HH:MM"; `null` = offen. */
  gehen: string | null;
  /** Bestehendes Gehen am Folgetag (über Mitternacht). */
  folgetag?: boolean;
  bemerkung: string | null;
  personName: string;
  /** Beschriftung des Auslösers (das Zeitpaar). */
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [offen, setOffen] = useState(false);
  const [ansicht, setAnsicht] = useState<"bearbeiten" | "loeschen">("bearbeiten");
  const [kommenWert, setKommenWert] = useState(kommen);
  const [gehenWert, setGehenWert] = useState(gehen ?? "");
  const [amFolgetag, setAmFolgetag] = useState(folgetag);
  const [bemerkungWert, setBemerkungWert] = useState(bemerkung ?? "");
  const [fehler, setFehler] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  // Doppelklick-Schutz: isPending greift erst nach dem ersten Rendern.
  const laeuft = useRef(false);

  const paar = `${kommen}–${gehen ?? "offen"}${folgetag ? " (+1)" : ""}`;
  const tag = `${wochentagName(datum)}, ${formatKalenderdatum(datum)}`;

  function zuruecksetzen() {
    setAnsicht("bearbeiten");
    setKommenWert(kommen);
    setGehenWert(gehen ?? "");
    setAmFolgetag(folgetag);
    setBemerkungWert(bemerkung ?? "");
    setFehler(null);
  }

  function ausfuehren(aktion: () => Promise<{ success: true } | { success: false; message: string }>, fallback: string) {
    if (laeuft.current) return;
    laeuft.current = true;
    setFehler(null);
    startTransition(async () => {
      try {
        const result = await aktion();
        if (!result.success) {
          setFehler(result.message);
          return;
        }
        setOffen(false);
        router.refresh();
      } catch {
        setFehler(fallback);
      } finally {
        laeuft.current = false;
      }
    });
  }

  function speichern(event: React.FormEvent) {
    event.preventDefault();
    if (gehen !== null && !gehenWert) {
      setFehler("„Gehen“ darf nicht leer sein — der Eintrag hatte bereits ein „Gehen“. Zum Entfernen den Eintrag löschen.");
      return;
    }
    ausfuehren(
      () =>
        aendereZeiteintragAction({
          eintragId,
          kommen: kommenWert,
          gehen: gehenWert,
          bemerkung: bemerkungWert,
          gehenAmFolgetag: amFolgetag && gehenWert !== "",
        }),
      "Der Eintrag konnte nicht gespeichert werden. Bitte die Seite neu laden und erneut versuchen."
    );
  }

  function loeschen() {
    ausfuehren(async () => {
      const result = await loescheAbwesenheitenAction([eintragId]);
      return result.success ? { success: true } : result;
    }, "Das Löschen ist fehlgeschlagen. Bitte die Seite neu laden und erneut versuchen.");
  }

  return (
    <Dialog
      open={offen}
      onOpenChange={(neu) => {
        if (isPending) return;
        setOffen(neu);
        if (neu) zuruecksetzen();
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className="rounded-sm tabular-nums underline decoration-dotted underline-offset-4 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Eintrag ${paar} vom ${formatKalenderdatum(datum)} bearbeiten`}
        >
          {children}
        </button>
      </DialogTrigger>
      <DialogContent>
        {ansicht === "loeschen" ? (
          <>
            <DialogHeader>
              <DialogTitle>Eintrag löschen?</DialogTitle>
              <DialogDescription>
                {personName}, {tag}: Der Eintrag {paar} wird gelöscht und zählt danach nicht mehr. Saldo und Zeitnachweis
                rechnen neu.
              </DialogDescription>
            </DialogHeader>
            {fehler && (
              <p role="alert" className="text-sm text-destructive">
                {fehler}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" disabled={isPending} onClick={() => { setAnsicht("bearbeiten"); setFehler(null); }}>
                Abbrechen
              </Button>
              <Button type="button" variant="destructive" disabled={isPending} onClick={loeschen}>
                {isPending ? "Löscht…" : "Löschen"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={speichern} className="space-y-5">
            <DialogHeader>
              <DialogTitle>Eintrag bearbeiten</DialogTitle>
              <DialogDescription>
                {personName}, {tag} · bisher {paar}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-wrap gap-4">
              <div className="space-y-2">
                <Label htmlFor={`kommen-${eintragId}`}>Kommen</Label>
                <Input
                  id={`kommen-${eintragId}`}
                  type="time"
                  required
                  className="w-32"
                  value={kommenWert}
                  onChange={(e) => setKommenWert(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`gehen-${eintragId}`}>Gehen{gehen === null && <span className="font-normal text-muted-foreground"> (optional)</span>}</Label>
                <Input
                  id={`gehen-${eintragId}`}
                  type="time"
                  required={gehen !== null}
                  className="w-32"
                  value={gehenWert}
                  onChange={(e) => setGehenWert(e.target.value)}
                />
              </div>
            </div>
            {/* QA BUG-1: Einsatz über Mitternacht. */}
            <div className="flex items-center gap-2">
              <Checkbox
                id={`folgetag-${eintragId}`}
                checked={amFolgetag}
                disabled={!gehenWert}
                onCheckedChange={(wert) => setAmFolgetag(wert === true)}
              />
              <Label htmlFor={`folgetag-${eintragId}`} className="font-normal">
                Gehen am Folgetag (nach Mitternacht)
              </Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`bemerkung-${eintragId}`}>
                Bemerkung <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id={`bemerkung-${eintragId}`}
                rows={2}
                maxLength={BEMERKUNG_MAX}
                value={bemerkungWert}
                onChange={(e) => setBemerkungWert(e.target.value)}
              />
            </div>
            {fehler && (
              <p role="alert" className="text-sm text-destructive">
                {fehler}
              </p>
            )}
            <DialogFooter className="gap-2 sm:justify-between">
              <Button
                type="button"
                variant="outline"
                className="text-destructive hover:text-destructive"
                disabled={isPending}
                onClick={() => {
                  setAnsicht("loeschen");
                  setFehler(null);
                }}
              >
                Löschen
              </Button>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button type="button" variant="outline" disabled={isPending} onClick={() => setOffen(false)}>
                  Abbrechen
                </Button>
                <Button type="submit" disabled={isPending || !kommenWert}>
                  {isPending ? "Speichert…" : "Speichern"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
