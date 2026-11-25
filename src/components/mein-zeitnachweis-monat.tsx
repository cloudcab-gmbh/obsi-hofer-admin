"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMonat, istGueltigerMonat, verschiebeMonat } from "@/lib/zeiterfassung/datum";

/** PROJ-20: Monatswahl im eigenen Zeitnachweis, begrenzt auf die erlaubten Monate. */
export function MeinZeitnachweisMonat({ monat, von, bis }: { monat: string; von: string; bis: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function wechsle(neuerMonat: string) {
    if (!istGueltigerMonat(neuerMonat) || neuerMonat < von || neuerMonat > bis) return;
    startTransition(() => router.push(`/mein-zeitnachweis?monat=${neuerMonat}`));
  }

  return (
    <div className="min-w-0 max-w-full space-y-2">
      <Label htmlFor="monat">Monat</Label>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0"
          aria-label="Vormonat"
          disabled={isPending || monat <= von}
          onClick={() => wechsle(verschiebeMonat(monat, -1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Input
          id="monat"
          type="month"
          className="h-10 w-44 min-w-0"
          value={monat}
          min={von}
          max={bis}
          // Firefox/Safari zeigen statt der Monatsauswahl ein Textfeld.
          placeholder="JJJJ-MM"
          title={formatMonat(monat)}
          disabled={isPending || von === bis}
          onChange={(e) => {
            if (e.target.value) wechsle(e.target.value);
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0"
          aria-label="Folgemonat"
          disabled={isPending || monat >= bis}
          onClick={() => wechsle(verschiebeMonat(monat, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
