// PROJ-11: Einmalige Übernahme der bisherigen Firmen-Freigaben (bmvcc_kundenportal,
// PROJ-8) in Portalzugänge pro Standort. Reine Planung, unit-testbar; das
// Skript scripts/portalzugaenge-uebernehmen.ts lädt die Daten und führt aus.
//
// Regel (Spec): Wer heute freigegeben ist, erhält Zugang zu ALLEN Standorten
// ALLER seiner Firmen (aktive Bexio-Relationen) — niemand verliert seinen Zugang.
// Bereits vorhandene Portalzugänge werden nicht doppelt angelegt (wiederholbar).

export interface UebernahmeEingabe {
  /** Kontakte mit gesetztem bmvcc_kundenportal. */
  freigegebeneKontakte: { id: string; name: string }[];
  /** Aktive Relationen Kontakt → Firma. */
  relationen: { kontaktId: string; firmaId: string }[];
  standorte: { id: string; name: string; firmaId: string }[];
  bestehendeZugaenge: { kontaktId: string; standortId: string }[];
}

export interface GeplanterZugang {
  kontaktId: string;
  standortId: string;
  /** Datensatzname, z.B. "Max Muster – Pratteln". */
  name: string;
}

export interface UebernahmePlan {
  anzulegen: GeplanterZugang[];
  bereitsVorhanden: number;
  /** Freigegebene Kontakte ohne aktive Firmen-Relation (PROJ-8: Zuordnung fehlt in Bexio). */
  kontakteOhneFirma: string[];
  /** Freigegebene Kontakte, deren Firmen keinen Standort haben. */
  kontakteOhneStandort: string[];
}

export function planeUebernahme(eingabe: UebernahmeEingabe): UebernahmePlan {
  const firmenProKontakt = new Map<string, Set<string>>();
  for (const r of eingabe.relationen) {
    firmenProKontakt.set(r.kontaktId, (firmenProKontakt.get(r.kontaktId) ?? new Set()).add(r.firmaId));
  }
  const standorteProFirma = new Map<string, { id: string; name: string }[]>();
  for (const s of eingabe.standorte) {
    standorteProFirma.set(s.firmaId, [...(standorteProFirma.get(s.firmaId) ?? []), s]);
  }
  const vorhanden = new Set(eingabe.bestehendeZugaenge.map((z) => `${z.kontaktId}|${z.standortId}`));

  const plan: UebernahmePlan = { anzulegen: [], bereitsVorhanden: 0, kontakteOhneFirma: [], kontakteOhneStandort: [] };
  for (const kontakt of eingabe.freigegebeneKontakte) {
    const firmen = firmenProKontakt.get(kontakt.id);
    if (!firmen || firmen.size === 0) {
      plan.kontakteOhneFirma.push(kontakt.name);
      continue;
    }
    const standorte = [...firmen].flatMap((f) => standorteProFirma.get(f) ?? []);
    if (standorte.length === 0) {
      plan.kontakteOhneStandort.push(kontakt.name);
      continue;
    }
    for (const standort of standorte) {
      if (vorhanden.has(`${kontakt.id}|${standort.id}`)) {
        plan.bereitsVorhanden++;
        continue;
      }
      vorhanden.add(`${kontakt.id}|${standort.id}`);
      plan.anzulegen.push({ kontaktId: kontakt.id, standortId: standort.id, name: `${kontakt.name} – ${standort.name}` });
    }
  }
  return plan;
}
