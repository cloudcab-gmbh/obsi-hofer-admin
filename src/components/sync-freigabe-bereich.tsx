"use client";

import { useState } from "react";
import { hatZugangBeiFirma, type KundenportalKontakt } from "@/lib/dataverse/kontakte";
import type { SyncLauf } from "@/lib/dataverse/sync-laeufe";
import { wurdeBereitsUebertragen } from "@/lib/sync-lauf-regeln";
import { KundenportalKontakte } from "@/components/kundenportal-kontakte";
import { SyncAusloesen } from "@/components/sync-ausloesen";
import { SyncVerlauf } from "@/components/sync-verlauf";
import { ladeSyncLaeufeAction } from "@/app/(protected)/sync-freigabe/actions";

export interface InitialerVerlauf {
  laeufe: SyncLauf[];
  hatMehr: boolean;
  /** Fehlermeldung, wenn der Verlauf beim Laden der Seite nicht abrufbar war. */
  fehler: string | null;
}

// Gemeinsame Hülle für /sync-freigabe:
// - hält die live aktuelle Anzahl freigegebener Kontakte, damit der
//   Sync-Button (PROJ-5) nach dem ersten gespeicherten Häkchen (PROJ-8) ohne
//   Neuladen aktiv wird;
// - hält den Sync-Verlauf (PROJ-6), damit ein neuer Lauf sofort oben erscheint.
export function SyncFreigabeBereich({
  firmaId,
  firmaName,
  standortId,
  listenTitel,
  kontakte,
  fehlendeSyncEinstellungen,
  verlauf,
}: {
  firmaId: string;
  firmaName: string;
  /** PROJ-11: Standort, für den die Häkchen der Kontaktliste gelten. */
  standortId: string;
  /** Titel der Kontaktliste, z.B. "Firma · Standort". */
  listenTitel: string;
  kontakte: KundenportalKontakt[];
  /** Namen fehlender Sync-Einstellungen (leer = Sync bereit). */
  fehlendeSyncEinstellungen: string[];
  verlauf: InitialerVerlauf;
}) {
  const [anzahlZugriffe, setAnzahlZugriffe] = useState(
    () => kontakte.filter((k) => hatZugangBeiFirma(k) && k.email).length
  );
  const [laeufe, setLaeufe] = useState(verlauf.laeufe);
  const [hatMehr, setHatMehr] = useState(verlauf.hatMehr);
  const [verlaufFehler, setVerlaufFehler] = useState(verlauf.fehler);
  const [laedtMehr, setLaedtMehr] = useState(false);

  function neuerLauf(lauf: SyncLauf) {
    setLaeufe((bisher) => [lauf, ...bisher.filter((l) => l.id !== lauf.id)]);
  }

  async function mehrLaden() {
    const aeltester = laeufe[laeufe.length - 1];
    if (!aeltester) return;
    setLaedtMehr(true);
    setVerlaufFehler(null);
    try {
      const result = await ladeSyncLaeufeAction(firmaId, aeltester.gestartetAm);
      if (result.success) {
        setLaeufe((bisher) => [...bisher, ...result.laeufe.filter((l) => !bisher.some((b) => b.id === l.id))]);
        setHatMehr(result.hatMehr);
      } else {
        setVerlaufFehler(result.message);
      }
    } catch {
      setVerlaufFehler("Weitere Einträge konnten nicht geladen werden. Bitte die Seite neu laden.");
    } finally {
      setLaedtMehr(false);
    }
  }

  return (
    <div className="space-y-6">
      <KundenportalKontakte
        kontakte={kontakte}
        titel={listenTitel}
        standortId={standortId}
        onZugriffeChange={setAnzahlZugriffe}
      />
      <SyncAusloesen
        firmaId={firmaId}
        firmaName={firmaName}
        anzahlZugriffe={anzahlZugriffe}
        fehlendeSyncEinstellungen={fehlendeSyncEinstellungen}
        onNeuerLauf={neuerLauf}
        bereitsUebertragen={wurdeBereitsUebertragen(laeufe)}
      />
      <SyncVerlauf
        laeufe={laeufe}
        hatMehr={hatMehr}
        fehler={verlaufFehler}
        laedtMehr={laedtMehr}
        onMehrLaden={mehrLaden}
      />
    </div>
  );
}
