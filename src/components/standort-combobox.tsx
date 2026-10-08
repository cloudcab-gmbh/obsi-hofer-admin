"use client";

import { useRouter } from "next/navigation";
import { DurchsuchbareAuswahl, type AuswahlOption } from "@/components/durchsuchbare-auswahl";
import { setCurrentStandortId } from "@/lib/firma-session";

// PROJ-10: Standort der aktuellen Firma, nur bei Firmen mit mehreren Standorten angezeigt.
export function StandortCombobox({
  standorte,
  selectedStandortId,
}: {
  standorte: AuswahlOption[];
  selectedStandortId?: string;
}) {
  const router = useRouter();

  return (
    <DurchsuchbareAuswahl
      optionen={standorte}
      ausgewaehltId={selectedStandortId}
      platzhalter="Standort auswählen..."
      suchPlatzhalter="Standort suchen..."
      leerText="Kein Standort gefunden."
      ariaLabel="Aktueller Standort"
      onAuswahl={async (standortId) => {
        const { ok } = await setCurrentStandortId(standortId);
        if (ok) router.push("/geraete");
        router.refresh();
      }}
    />
  );
}
