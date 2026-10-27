"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DurchsuchbareAuswahl, type AuswahlOption } from "@/components/durchsuchbare-auswahl";
import { merkeZeitnachweisAuswahl } from "@/lib/zeiterfassung/auswahl-session";
import { formatMonat, istGueltigerMonat, verschiebeMonat } from "@/lib/zeiterfassung/datum";
import { zeitnachweisHref } from "@/lib/zeiterfassung/links";

/** Auswahl von Person und Monat; steht in der Adresse und wird zusätzlich gemerkt. */
export function ZeitnachweisAuswahl({
  personen,
  person,
  monat,
}: {
  /** id = E-Mail, name = Name bzw. E-Mail. */
  personen: AuswahlOption[];
  person: string | null;
  monat: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function wechsle(neuePerson: string | null, neuerMonat: string) {
    if (!istGueltigerMonat(neuerMonat)) return;
    await merkeZeitnachweisAuswahl(neuePerson, neuerMonat).catch(() => undefined);
    router.push(zeitnachweisHref(neuePerson, neuerMonat));
  }

  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
      <div className="space-y-2">
        <Label>Person</Label>
        <DurchsuchbareAuswahl
          optionen={personen}
          ausgewaehltId={person ?? undefined}
          platzhalter="Person auswählen..."
          suchPlatzhalter="Name oder E-Mail suchen..."
          leerText="Keine Person gefunden."
          ariaLabel="Person"
          onAuswahl={(id) => wechsle(id, monat)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="monat">Monat</Label>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Vormonat"
            disabled={isPending}
            onClick={() => startTransition(() => wechsle(person, verschiebeMonat(monat, -1)))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Input
            id="monat"
            type="month"
            className="w-44"
            value={monat}
            // Firefox/Safari zeigen statt der Monatsauswahl ein Textfeld.
            placeholder="JJJJ-MM"
            title={formatMonat(monat)}
            disabled={isPending}
            onChange={(e) => {
              const wert = e.target.value;
              if (wert) startTransition(() => wechsle(person, wert));
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Folgemonat"
            disabled={isPending}
            onClick={() => startTransition(() => wechsle(person, verschiebeMonat(monat, 1)))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
