"use client";

import { useRouter } from "next/navigation";
import { DurchsuchbareAuswahl, type AuswahlOption } from "@/components/durchsuchbare-auswahl";
import { setCurrentFirmaId } from "@/lib/firma-session";

export type FirmaOption = AuswahlOption;

export function FirmaCombobox({ firmen, selectedFirmaId }: { firmen: FirmaOption[]; selectedFirmaId?: string }) {
  const router = useRouter();

  return (
    <DurchsuchbareAuswahl
      optionen={firmen}
      ausgewaehltId={selectedFirmaId}
      platzhalter="Firma auswählen..."
      suchPlatzhalter="Firma suchen..."
      leerText="Keine Firma gefunden."
      ariaLabel="Aktuelle Firma"
      onAuswahl={async (firmaId) => {
        const { standortWaehlen } = await setCurrentFirmaId(firmaId);
        // PROJ-10: Bei mehreren Standorten bleibt der Nutzer auf der
        // Startseite, um den Standort zu wählen; sonst direkt zu den Geräten.
        if (!standortWaehlen) router.push("/geraete");
        router.refresh();
      }}
    />
  );
}
