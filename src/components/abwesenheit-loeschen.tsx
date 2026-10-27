"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
import { loescheAbwesenheitenAction } from "@/app/(protected)/zeiterfassung/actions";

/** PROJ-13/15: Zeiteinträge (Ferien, Frei, Krankheit, Komp. GLZ, einzelne Kommen/Gehen) nach Bestätigung löschen. */
export function AbwesenheitLoeschen({
  eintragIds,
  beschreibung,
  label = "löschen",
  ariaLabel,
}: {
  eintragIds: string[];
  /** z.B. "Ferien 22.12.2026–02.01.2027 (6 Ferientage)". */
  beschreibung: string;
  label?: React.ReactNode;
  /** Für Auslöser ohne Text (Symbol). */
  ariaLabel?: string;
}) {
  const router = useRouter();
  const [offen, setOffen] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Doppelklick-Schutz: isPending greift erst nach dem ersten Rendern (Nutzer-Test 2026-10-27).
  const laeuft = useRef(false);

  function loeschen() {
    if (laeuft.current) return;
    laeuft.current = true;
    setFehler(null);
    startTransition(async () => {
      try {
        const result = await loescheAbwesenheitenAction(eintragIds);
        router.refresh();
        if (!result.success) {
          setFehler(result.message);
          return;
        }
        setOffen(false);
      } catch {
        setFehler("Das Löschen ist fehlgeschlagen. Bitte die Seite neu laden und erneut versuchen.");
      } finally {
        laeuft.current = false;
      }
    });
  }

  return (
    <AlertDialog
      open={offen}
      onOpenChange={(neu) => {
        if (isPending) return;
        setOffen(neu);
        setFehler(null);
      }}
    >
      <AlertDialogTrigger asChild>
        <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs text-destructive" aria-label={ariaLabel}>
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eintrag löschen?</AlertDialogTitle>
          <AlertDialogDescription>
            {beschreibung} wird in Dataverse gelöscht. Saldo und Zeitnachweis rechnen danach neu.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {fehler && (
          <p role="alert" className="text-sm text-destructive">
            {fehler}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Abbrechen</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={(e) => {
              e.preventDefault();
              loeschen();
            }}
          >
            {isPending ? "Löscht…" : "Löschen"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
