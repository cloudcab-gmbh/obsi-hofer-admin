"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { erfasseFerienAction } from "@/app/(protected)/zeiterfassung/actions";
import { FerienFelder, formatFerientage, type FerienWerte } from "@/components/ferien-felder";

/** PROJ-15: Ferien einer Person für einen Zeitraum erfassen (Ferien-Seite). */
export function FerienErfassen({ email, personName }: { email: string; personName: string }) {
  const router = useRouter();
  const [offen, setOffen] = useState(false);
  const [werte, setWerte] = useState<FerienWerte>({ von: "", bis: "", halberTag: false });
  const [bemerkung, setBemerkung] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [meldung, setMeldung] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function zuruecksetzen() {
    setWerte({ von: "", bis: "", halberTag: false });
    setBemerkung("");
    setFehler(null);
  }

  function speichern(event: React.FormEvent) {
    event.preventDefault();
    setFehler(null);
    startTransition(async () => {
      try {
        const result = await erfasseFerienAction({ email, ...werte, bemerkung });
        router.refresh();
        if (!result.success) {
          setFehler(result.message);
          return;
        }
        setMeldung(`${formatFerientage(result.angelegt * (werte.halberTag ? 0.5 : 1))} erfasst.`);
        setOffen(false);
        zuruecksetzen();
      } catch {
        setFehler("Die Ferien konnten nicht gespeichert werden. Bitte die Seite neu laden und erneut versuchen.");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Dialog
        open={offen}
        onOpenChange={(neu) => {
          if (isPending) return;
          setOffen(neu);
          setMeldung(null);
          if (!neu) zuruecksetzen();
        }}
      >
        <DialogTrigger asChild>
          <Button type="button" size="sm">
            <Plus className="mr-1 h-4 w-4" />
            Ferien erfassen
          </Button>
        </DialogTrigger>
        <DialogContent>
          <form onSubmit={speichern} className="space-y-5">
            <DialogHeader>
              <DialogTitle>Ferien erfassen</DialogTitle>
              <DialogDescription>
                {personName}: Es werden nur Tage mit Soll laut Arbeitsmodell angelegt — Wochenenden, freie Tage und
                Feiertage werden übersprungen.
              </DialogDescription>
            </DialogHeader>
            <FerienFelder email={email} werte={werte} onChange={setWerte} idPrefix="ferien-neu" />
            <div className="space-y-2">
              <Label htmlFor="ferien-bemerkung">Bemerkung</Label>
              <Input
                id="ferien-bemerkung"
                maxLength={500}
                value={bemerkung}
                onChange={(e) => setBemerkung(e.target.value)}
              />
            </div>
            {fehler && (
              <p role="alert" className="text-sm text-destructive">
                {fehler}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => {
                  setOffen(false);
                  zuruecksetzen();
                }}
              >
                Abbrechen
              </Button>
              <Button type="submit" disabled={isPending || !werte.von || !werte.bis}>
                {isPending ? "Speichert…" : "Speichern"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {meldung && (
        <span role="status" className="text-sm text-status-success">
          {meldung}
        </span>
      )}
    </div>
  );
}
