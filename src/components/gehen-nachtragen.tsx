"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { trageGehenNachAction } from "@/app/(protected)/zeiterfassung/actions";
import { formatKalenderdatum, wochentagName } from "@/lib/zeiterfassung/datum";

/** PROJ-13: Dialog, um bei einem offenen Eintrag das fehlende "Gehen" nachzutragen. */
export function GehenNachtragen({
  eintragId,
  datum,
  kommen,
  personName,
  children,
}: {
  eintragId: string;
  datum: string;
  /** "HH:MM" */
  kommen: string;
  personName: string;
  /** Beschriftung des Auslösers. */
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [offen, setOffen] = useState(false);
  const [uhrzeit, setUhrzeit] = useState("");
  const [amFolgetag, setAmFolgetag] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function speichern(event: React.FormEvent) {
    event.preventDefault();
    setFehler(null);
    startTransition(async () => {
      try {
        const result = await trageGehenNachAction(eintragId, uhrzeit, amFolgetag);
        if (!result.success) {
          setFehler(result.message);
          return;
        }
        setOffen(false);
        router.refresh();
      } catch {
        setFehler("Das „Gehen“ konnte nicht gespeichert werden. Bitte die Seite neu laden und erneut versuchen.");
      }
    });
  }

  return (
    <Dialog
      open={offen}
      onOpenChange={(neu) => {
        if (isPending) return;
        setOffen(neu);
        if (neu) setFehler(null);
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs">
          {children}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={speichern} className="space-y-5">
          <DialogHeader>
            <DialogTitle>„Gehen“ nachtragen</DialogTitle>
            <DialogDescription>
              {personName}, {wochentagName(datum)} {formatKalenderdatum(datum)}: Kommen {kommen}, Gehen fehlt. Der Eintrag
              wird in Dataverse ergänzt und zählt danach ins Ist.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor={`gehen-${eintragId}`}>Gehen</Label>
              <Input
                id={`gehen-${eintragId}`}
                type="time"
                required
                className="w-32"
                value={uhrzeit}
                onChange={(e) => setUhrzeit(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 pb-2">
              <Checkbox
                id={`folgetag-${eintragId}`}
                checked={amFolgetag}
                onCheckedChange={(wert) => setAmFolgetag(wert === true)}
              />
              <Label htmlFor={`folgetag-${eintragId}`} className="font-normal">
                am Folgetag (nach Mitternacht)
              </Label>
            </div>
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
            <Button type="submit" disabled={isPending || !uhrzeit}>
              {isPending ? "Speichert…" : "Speichern"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
