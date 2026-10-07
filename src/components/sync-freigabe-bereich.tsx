"use client";

import { useState } from "react";
import type { KundenportalKontakt } from "@/lib/dataverse/kontakte";
import { KundenportalKontakte } from "@/components/kundenportal-kontakte";
import { SyncAusloesen } from "@/components/sync-ausloesen";

// Gemeinsame Hülle für /sync-freigabe: hält die live aktuelle Anzahl
// freigegebener Kontakte, damit der Sync-Button (PROJ-5) nach dem ersten
// gespeicherten Häkchen (PROJ-8) ohne Neuladen aktiv wird.
export function SyncFreigabeBereich({
  firmaId,
  firmaName,
  kontakte,
  fehlendeSyncEinstellungen,
}: {
  firmaId: string;
  firmaName: string;
  kontakte: KundenportalKontakt[];
  /** Namen fehlender Sync-Einstellungen (leer = Sync bereit). */
  fehlendeSyncEinstellungen: string[];
}) {
  const [anzahlZugriffe, setAnzahlZugriffe] = useState(
    () => kontakte.filter((k) => k.freigegeben && k.email).length
  );

  return (
    <div className="space-y-6">
      <KundenportalKontakte kontakte={kontakte} firmaName={firmaName} onZugriffeChange={setAnzahlZugriffe} />
      <SyncAusloesen firmaId={firmaId} firmaName={firmaName} anzahlZugriffe={anzahlZugriffe}
        fehlendeSyncEinstellungen={fehlendeSyncEinstellungen}
      />
    </div>
  );
}
