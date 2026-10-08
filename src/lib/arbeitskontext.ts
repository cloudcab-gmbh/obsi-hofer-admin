import { cache } from "react";
import {
  eindeutigeStandortNamen,
  firmenAnzeigenamen,
  getFirma,
  listAktiveFirmenMitNamen,
  listStandorteForFirma,
  listStandorteForFirmen,
  standortKurzname,
  type Firma,
  type Standort,
} from "./dataverse/geraete";
import { DataverseError } from "./dataverse/errors";
import { getCurrentFirmaId, getCurrentStandortId } from "./firma-session";

/** Standort mit eindeutigem Anzeigenamen (gleichnamige Standorte mit " (2)" usw.). */
export interface StandortOption {
  id: string;
  name: string;
}

/**
 * Firma mit Anzeigename: bei gleichnamigen Firmen mit Standort-Zusatz
 * (z.B. "Bilfinger … AG · Pratteln"), sonst gleich `name`. `name` bleibt der
 * echte Firmenname (PDF-Dateiname und SharePoint-Ordner).
 */
export interface KontextFirma extends Firma {
  anzeigename: string;
  /** Weitere aktive Firmen heissen gleich (bewusst getrennte Niederlassungen, z.B. Bilfinger). */
  mehrdeutig?: boolean;
}

/**
 * PROJ-10: Woran der Bearbeiter gerade arbeitet. Startseite, Header,
 * Geräteliste, Prüfberichte und PDF-Export nutzen alle dieselbe Regel.
 */
export type Arbeitskontext =
  | { zustand: "keine-firma" }
  | { zustand: "firma-ohne-standort"; firma: KontextFirma }
  | { zustand: "standort-waehlen"; firma: KontextFirma; standorte: StandortOption[] }
  | {
      zustand: "bereit";
      firma: KontextFirma;
      standort: StandortOption;
      standorte: StandortOption[];
      /** Nur dann erscheint der Standort in Header, PDF-Dateiname, -Titel und -Ablage. */
      mehrereStandorte: boolean;
    };

/**
 * Reine Regel (unit-testbar):
 * - keine Firma → "keine-firma"
 * - Firma ohne Standorte → Hinweis
 * - gespeicherter Standort gehört zur Firma → "bereit"
 * - sonst genau ein Standort → automatisch "bereit" (auch für ältere Sitzungen ohne Standort)
 * - sonst → Standort muss gewählt werden (auch wenn der gespeicherte umgehängt/gelöscht wurde)
 */
export function bestimmeArbeitskontext(
  firma: KontextFirma | null,
  standorte: Standort[],
  gespeicherteStandortId: string | null
): Arbeitskontext {
  if (!firma) return { zustand: "keine-firma" };
  if (standorte.length === 0) return { zustand: "firma-ohne-standort", firma };

  const namen = eindeutigeStandortNamen(standorte);
  const optionen: StandortOption[] = standorte
    .map((s) => ({ id: s.id, name: namen.get(s.id) ?? s.name }))
    .sort((a, b) => a.name.localeCompare(b.name, "de-CH", { numeric: true, sensitivity: "base" }));
  const mehrereStandorte = optionen.length > 1;

  const gewaehlt = optionen.find((s) => s.id === gespeicherteStandortId) ?? (mehrereStandorte ? undefined : optionen[0]);
  if (!gewaehlt) return { zustand: "standort-waehlen", firma, standorte: optionen };
  return { zustand: "bereit", firma, standort: gewaehlt, standorte: optionen, mehrereStandorte };
}

/**
 * Lädt den Arbeitskontext der aktuellen Sitzung. Pro Seitenaufruf nur einmal
 * (React `cache`) — Header und Seite teilen sich das Ergebnis. Fehler beim
 * Laden aus Dataverse werden durchgereicht (die Seiten zeigen dann ihren
 * Ladefehler); eine nicht mehr existierende Firma gilt als "keine Firma".
 */
export const ladeArbeitskontext = cache(async (): Promise<Arbeitskontext> => {
  const [firmaId, standortId] = await Promise.all([getCurrentFirmaId(), getCurrentStandortId()]);
  if (!firmaId) return { zustand: "keine-firma" };

  let firma: Firma;
  try {
    firma = await getFirma(firmaId);
  } catch (error) {
    if (error instanceof DataverseError && error.category === "not_found") return { zustand: "keine-firma" };
    throw error;
  }
  const standorte = await listStandorteForFirma(firmaId);

  // Gleichnamige aktive Firmen (bewusst getrennte Niederlassungen) im Header
  // unterscheidbar machen — mit derselben Regel wie die Auswahl auf /start.
  let anzeigename = firma.name;
  const gleichnamige = await listAktiveFirmenMitNamen(firma.name);
  if (gleichnamige.length > 1) {
    const ids = gleichnamige.map((f) => f.id);
    const alleStandorte = [...standorte, ...(await listStandorteForFirmen(ids.filter((id) => id !== firma.id)))];
    anzeigename = firmenAnzeigenamen(gleichnamige, alleStandorte).get(firma.id) ?? firma.name;
  }
  return bestimmeArbeitskontext({ ...firma, anzeigename, mehrdeutig: gleichnamige.length > 1 }, standorte, standortId);
});

/** Bezeichnung für Header und mobiles Menü, z.B. "Rehaklinik Bellikon · Haupthaus". */
export function kontextBezeichnung(kontext: Arbeitskontext): string | null {
  switch (kontext.zustand) {
    case "keine-firma":
      return null;
    case "firma-ohne-standort":
      return kontext.firma.anzeigename;
    case "standort-waehlen":
      return `${kontext.firma.anzeigename} · Standort wählen`;
    case "bereit":
      return kontext.mehrereStandorte
        ? `${kontext.firma.anzeigename} · ${kontext.standort.name}`
        : kontext.firma.anzeigename;
  }
}

/**
 * Standort-Zusatz für den PDF-Export (Dateiname, Kopfbereich, Ablageordner
 * "Standort <Kurzname>"): bei Firmen mit mehreren Standorten und bei
 * gleichnamigen Firmen (Nutzer-Entscheidung 2026-10-08, bestehende SharePoint-
 * Konvention "<Firma>/Standort <Name>/Prüfberichte/"). `null`, wenn der
 * Standort keinen eigenen Zusatz hat (z.B. Hauptstandort, der wie die Firma heisst).
 */
export function pdfStandortZusatz(kontext: Extract<Arbeitskontext, { zustand: "bereit" }>): string | null {
  if (!kontext.mehrereStandorte && !kontext.firma.mehrdeutig) return null;
  return standortKurzname(kontext.standort.name, kontext.firma.name) || null;
}
