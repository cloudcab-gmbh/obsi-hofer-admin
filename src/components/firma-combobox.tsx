"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { setCurrentFirmaId } from "@/lib/firma-session";

export interface FirmaOption {
  id: string;
  name: string;
}

export function FirmaCombobox({
  firmen,
  selectedFirmaId,
}: {
  firmen: FirmaOption[];
  selectedFirmaId?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [suche, setSuche] = useState("");
  const [isPending, startTransition] = useTransition();
  const selected = firmen.find((f) => f.id === selectedFirmaId);

  // cmdks eingebaute Fuzzy-Suche vergibt bei vielen, ähnlich langen
  // Firmennamen oft auch auf offensichtlich unpassende Treffer einen
  // Score > 0 und blendet sie dadurch nicht aus — der gesuchte Eintrag
  // landet dann weit unten in der Scrollliste. Stattdessen hier eine
  // einfache, vorhersagbare Teilstring-Suche selbst filtern.
  const gefiltert = useMemo(() => {
    const suchbegriff = suche.trim().toLowerCase();
    if (!suchbegriff) return firmen;
    return firmen.filter((f) => f.name.toLowerCase().includes(suchbegriff));
  }, [firmen, suche]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={isPending}
        >
          {selected ? selected.name : "Firma auswählen..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Firma suchen..." value={suche} onValueChange={setSuche} />
          <CommandList>
            <CommandEmpty>Keine Firma gefunden.</CommandEmpty>
            <CommandGroup>
              {gefiltert.map((firma) => (
                <CommandItem
                  key={firma.id}
                  value={firma.id}
                  onSelect={() => {
                    setOpen(false);
                    startTransition(async () => {
                      await setCurrentFirmaId(firma.id);
                      router.push("/geraete");
                      router.refresh();
                    });
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", firma.id === selectedFirmaId ? "opacity-100" : "opacity-0")} />
                  {firma.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
