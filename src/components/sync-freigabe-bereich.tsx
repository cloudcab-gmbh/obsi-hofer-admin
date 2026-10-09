"use client";

import { useState } from "react";
import { hatZugangBeiFirma, type KundenportalKontakt } from "@/lib/dataverse/kontakte";
import type { SyncLauf } from "@/lib/dataverse/sync-laeufe";
import { wurdeBereitsUebertragen } from "@/lib/sync-lauf-regeln";
import { KundenportalKontakte } from "@/components/kundenportal-kontakte";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  standortSync = false,
  kontakte,
  fehlendeSyncEinstellungen,
  verlauf,
}: {
  firmaId: string;
  firmaName: string;
  /**
   * PROJ-11: Standort, für den die Häkchen der Kontaktliste gelten.
   * `null` = Firma ohne Standort (QA BUG-2): Hinweis statt Kontaktliste,
   * Sync und Verlauf bleiben nutzbar.
   */
  standortId: string | null;
  /** Titel der Kontaktliste, z.B. "Firma · Standort". */
  listenTitel: string;
  /** PROJ-12: Sync überträgt nur den aktuellen Standort (Schalter aktiv). */
  standortSync?: boolean;
  kontakte: KundenportalKontakt[];
  /** Namen fehlender Sync-Einstellungen (leer = Sync bereit). */
  fehlendeSyncEinstellungen: string[];
  verlauf: InitialerVerlauf;
}) {
  const [anzahlZugriffe, setAnzahlZugriffe] = useState(
    () => kontakte.filter((k) => (standortSync ? k.freigegeben : hatZugangBeiFirma(k)) && k.email).length
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
      const result = await ladeSyncLaeufeAction(firmaId, aeltester.gestartetAm, standortId);
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
      {standortId ? (
        <KundenportalKontakte
          kontakte={kontakte}
          titel={listenTitel}
          standortId={standortId}
          zaehltNurStandort={standortSync}
          onZugriffeChange={setAnzahlZugriffe}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Kundenportal-Zugang — {listenTitel}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Für diese Firma sind keine Standorte erfasst. Portal-Zugänge werden pro Standort vergeben und sind erst
              möglich, sobald ein Standort existiert.
            </p>
          </CardContent>
        </Card>
      )}
      <SyncAusloesen
        firmaId={firmaId}
        // PROJ-12: beim Standort-Sync "Firma · Standort", sonst die Firma.
        firmaName={standortSync ? listenTitel : firmaName}
        standortId={standortSync ? standortId : null}
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
        kennzeichneGanzeFirma={standortSync}
      />
    </div>
  );
}
