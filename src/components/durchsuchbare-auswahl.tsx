"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

export interface AuswahlOption {
  id: string;
  name: string;
}

/**
 * Durchsuchbare Auswahl für Firma und Standort (PROJ-3, ab PROJ-10 gemeinsam
 * genutzt). `onAuswahl` läuft in einer Transition; währenddessen ist das Feld
 * gesperrt.
 */
export function DurchsuchbareAuswahl({
  optionen,
  ausgewaehltId,
  platzhalter,
  suchPlatzhalter,
  leerText,
  onAuswahl,
  ariaLabel,
}: {
  optionen: AuswahlOption[];
  ausgewaehltId?: string;
  platzhalter: string;
  suchPlatzhalter: string;
  leerText: string;
  onAuswahl: (id: string) => Promise<void>;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [suche, setSuche] = useState("");
  const [isPending, startTransition] = useTransition();
  const ausgewaehlt = optionen.find((o) => o.id === ausgewaehltId);

  // cmdks eingebaute Fuzzy-Suche vergibt bei vielen, ähnlich langen
  // Namen oft auch auf offensichtlich unpassende Treffer einen Score > 0 und
  // blendet sie dadurch nicht aus — der gesuchte Eintrag landet dann weit
  // unten in der Scrollliste. Stattdessen hier eine einfache, vorhersagbare
  // Teilstring-Suche selbst filtern.
  const gefiltert = useMemo(() => {
    const suchbegriff = suche.trim().toLowerCase();
    if (!suchbegriff) return optionen;
    return optionen.filter((o) => o.name.toLowerCase().includes(suchbegriff));
  }, [optionen, suche]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          className="w-full justify-between"
          disabled={isPending}
        >
          <span className="truncate">{ausgewaehlt ? ausgewaehlt.name : platzhalter}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command shouldFilter={false}>
          <CommandInput placeholder={suchPlatzhalter} value={suche} onValueChange={setSuche} />
          <CommandList>
            <CommandEmpty>{leerText}</CommandEmpty>
            <CommandGroup>
              {gefiltert.map((option) => (
                <CommandItem
                  key={option.id}
                  value={option.id}
                  onSelect={() => {
                    setOpen(false);
                    startTransition(() => onAuswahl(option.id));
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", option.id === ausgewaehltId ? "opacity-100" : "opacity-0")} />
                  {option.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
