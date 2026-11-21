"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageSquareWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { sendeKorrekturAnfrageAction } from "@/app/(protected)/mein-zeitnachweis/actions";
import { formatKalenderdatum, wochentagName } from "@/lib/zeiterfassung/datum";
import { NACHRICHT_MAX, pruefeNachricht } from "@/lib/zeiterfassung/korrektur";

/**
 * PROJ-21: Korrektur-Anfrage an den Vorgesetzten. Aus einer Tageszeile mit
 * festem Datum, vom Knopf oben mit wählbarem Datum (`von`–`bis`). Die
 * bisherigen Zeiten zeigt der Dialog nur zur Kontrolle — gespeichert werden
 * die vom Server berechneten.
 */
export function KorrekturAnfrage({
  datum: festesDatum,
  von,
  bis,
  zeiten,
  alsKnopf = false,
}: {
  /** Festes Datum (Tageszeile); ohne Angabe ist das Datum wählbar. */
  datum?: string;
  /** Wählbarer Bereich "YYYY-MM-DD" (nur ohne festes Datum). */
  von?: string;
  bis?: string;
  /** Bisherige Zeiten pro Tag zur Anzeige. */
  zeiten: Record<string, string>;
  alsKnopf?: boolean;
}) {
  const router = useRouter();
  const [offen, setOffen] = useState(false);
  const [datum, setDatum] = useState(festesDatum ?? bis ?? "");
  const [nachricht, setNachricht] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [gesendet, setGesendet] = useState(false);
  const [isPending, startTransition] = useTransition();

  function senden(event: React.FormEvent) {
    event.preventDefault();
    setFehler(null);
    const pruefung = pruefeNachricht(nachricht);
    if (pruefung) {
      setFehler(pruefung);
      return;
    }
    startTransition(async () => {
      try {
        const result = await sendeKorrekturAnfrageAction(datum, nachricht);
        if (!result.success) {
          setFehler(result.message);
          return;
        }
        setGesendet(true);
        setNachricht("");
        router.refresh();
      } catch {
        setFehler("Die Anfrage konnte nicht gesendet werden. Bitte später erneut versuchen.");
      }
    });
  }

  const titelDatum = datum ? `${wochentagName(datum)}, ${formatKalenderdatum(datum)}` : "";

  return (
    <Dialog
      open={offen}
      onOpenChange={(neu) => {
        if (isPending) return;
        setOffen(neu);
        if (neu) {
          setFehler(null);
          setGesendet(false);
          setDatum(festesDatum ?? bis ?? "");
        }
      }}
    >
      <DialogTrigger asChild>
        {alsKnopf ? (
          <Button type="button" variant="outline" className="h-10">
            <MessageSquareWarning className="mr-2 h-4 w-4" aria-hidden />
            Korrektur anfragen
          </Button>
        ) : (
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs"
            aria-label={`Korrektur anfragen für ${festesDatum ? formatKalenderdatum(festesDatum) : "einen Tag"}`}
          >
            Korrektur anfragen
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        {gesendet ? (
          <>
            <DialogHeader>
              <DialogTitle>Anfrage gesendet</DialogTitle>
              <DialogDescription>Dein Vorgesetzter erhält sie in Teams.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" onClick={() => setOffen(false)}>
                Schliessen
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={senden} className="space-y-5">
            <DialogHeader>
              <DialogTitle>Korrektur anfragen</DialogTitle>
              <DialogDescription>
                Die Anfrage geht an deinen Vorgesetzten. Korrigiert wird in der SharePoint-Zeiterfassung; die Änderung
                erscheint hier am nächsten Morgen.
              </DialogDescription>
            </DialogHeader>
            {festesDatum ? (
              <p className="text-sm font-medium">{titelDatum}</p>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="korrektur-datum">Datum</Label>
                <Input
                  id="korrektur-datum"
                  type="date"
                  required
                  className="w-44"
                  min={von}
                  max={bis}
                  value={datum}
                  onChange={(e) => setDatum(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Bisher erfasst</p>
              <p className="text-sm tabular-nums">{(datum && zeiten[datum]) || "—"}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`korrektur-nachricht-${festesDatum ?? "frei"}`}>Nachricht</Label>
              <Textarea
                id={`korrektur-nachricht-${festesDatum ?? "frei"}`}
                required
                rows={4}
                maxLength={NACHRICHT_MAX}
                placeholder="z.B. Gehen war 17:30 statt 16:30"
                value={nachricht}
                onChange={(e) => setNachricht(e.target.value)}
              />
              <p className="text-right text-xs text-muted-foreground tabular-nums">
                {nachricht.length} / {NACHRICHT_MAX}
              </p>
            </div>
            {fehler && (
              <p role="alert" className="text-sm text-destructive">
                {fehler}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" disabled={isPending} onClick={() => setOffen(false)}>
                Abbrechen
              </Button>
              <Button type="submit" disabled={isPending || !datum}>
                {isPending ? "Sendet…" : "Senden"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
