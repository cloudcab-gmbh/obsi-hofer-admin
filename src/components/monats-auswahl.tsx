"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMonat, istGueltigerMonat, verschiebeMonat } from "@/lib/zeiterfassung/datum";
import { uebersichtHref } from "@/lib/zeiterfassung/links";

/** PROJ-17: Monat der Übersicht wählen (Vor/Zurück + Monatsfeld); steht in der Adresse. */
export function MonatsAuswahl({ monat }: { monat: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function wechsle(neu: string) {
    if (istGueltigerMonat(neu)) startTransition(() => router.push(uebersichtHref(neu)));
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="uebersicht-monat">Monat</Label>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Vormonat"
          disabled={isPending}
          onClick={() => wechsle(verschiebeMonat(monat, -1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Input
          id="uebersicht-monat"
          type="month"
          className="w-44"
          value={monat}
          placeholder="JJJJ-MM"
          title={formatMonat(monat)}
          disabled={isPending}
          onChange={(e) => e.target.value && wechsle(e.target.value)}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Folgemonat"
          disabled={isPending}
          onClick={() => wechsle(verschiebeMonat(monat, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
