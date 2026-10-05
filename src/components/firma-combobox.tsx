"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

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
  const selected = firmen.find((f) => f.id === selectedFirmaId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
          {selected ? selected.name : "Firma auswählen..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Firma suchen..." />
          <CommandList>
            <CommandEmpty>Keine Firma gefunden.</CommandEmpty>
            <CommandGroup>
              {firmen.map((firma) => (
                <CommandItem
                  key={firma.id}
                  value={firma.name}
                  onSelect={() => {
                    setOpen(false);
                    router.push(`/geraete?firmaId=${firma.id}`);
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
