import { zuSchweizerDatum, zuSchweizerUhrzeit } from "./datum";

// PROJ-13: Auswertung der Zeiteinträge eines Tages (rein, ohne Datenzugriff).
// Jeder Eintrag ist ein Kommen/Gehen; die Pause ist die Lücke dazwischen.

// PROJ-15: 3 = Ferien, 4 = Frei (nur Kennzeichnung).
export type Eintragstyp = "arbeitszeit" | "komp-glz" | "krankheit" | "ferien" | "frei" | "unbekannt";

export interface Zeiteintrag {
  /** Dataverse-ID, für das Nachtragen von "Gehen". */
  id: string;
  /** Aktivitätsdatum in Schweizer Zeit ("YYYY-MM-DD") — bestimmt den Tag. */
  datum: string;
  typ: Eintragstyp;
  /** Zeitpunkte (ISO, UTC); `gehen` fehlt bei offenen Einträgen. */
  kommen: string | null;
  gehen: string | null;
  /** Tages-/Monatstotal des Power-Automate-Flows in Minuten (Abgleich). */
  tagestotal: number | null;
  monatstotal: number | null;
  mittagessen: boolean;
  abendessen: boolean;
  bemerkung: string | null;
  /** PROJ-15: halber Ferientag. */
  halberTag: boolean;
  /** PROJ-22: im Tool korrigiert bzw. gelöscht; `null`/fehlend = unverändert. */
  imTool?: ImToolMarkierung | null;
}

/** PROJ-22: Markierung eines im Tool geänderten Eintrags. */
export interface ImToolMarkierung {
  /** Zeitpunkt der letzten Korrektur bzw. der Löschung (ISO). */
  am: string;
  /** Name des Freigebers; `null`, wenn nicht geladen (Mitarbeiteransicht). */
  von: string | null;
  /** Zeiten vor der letzten Korrektur, z.B. "07:30–16:30"; `null`, wenn nicht geladen. */
  vorher: string | null;
  /** Im Tool gelöscht: zählt nicht mehr. */
  geloescht: boolean;
}

/** PROJ-22: im Tool gelöschter Eintrag — nur zur Anzeige (Freigeber), zählt nirgends. */
export interface GeloeschterEintrag {
  eintragId: string;
  /** z.B. "07:30–16:30" oder "Ferien". */
  text: string;
  am: string;
  von: string | null;
}

/** Ganztägiger Eintrag (Krankheit, Komp. GLZ, Ferien, Frei) — für Anzeige und Löschen. */
export interface Abwesenheit {
  eintragId: string;
  typ: Exclude<Eintragstyp, "arbeitszeit" | "unbekannt">;
  halberTag: boolean;
}

export interface Zeitpaar {
  eintragId: string;
  kommen: string;
  /** "HH:MM"; `null` = offen. */
  gehen: string | null;
  /** Gehen fällt auf einen späteren Kalendertag. */
  folgetag: boolean;
  unplausibel: boolean;
  /** PROJ-22: Bemerkung dieses Eintrags (für „Eintrag bearbeiten“). */
  bemerkung: string | null;
  /** PROJ-22: letzte Korrektur im Tool, sonst `null`. */
  korrektur: Omit<ImToolMarkierung, "geloescht"> | null;
}

export interface Tagesauswertung {
  paare: Zeitpaar[];
  /** Summe der vollständigen, plausiblen Arbeitszeit-Einträge in Minuten, Überschneidungen einmal. */
  arbeitszeitMinuten: number;
  hatArbeitszeit: boolean;
  offen: boolean;
  ueberschneidung: boolean;
  unplausibel: boolean;
  krankheit: boolean;
  kompGlz: boolean;
  /** PROJ-15: Ferien-Eintrag am Tag — "ganz", "halb" oder keiner (zählt erst mit Soll, siehe ferien.ts). */
  ferien: "ganz" | "halb" | null;
  /** PROJ-15: als "Frei" gekennzeichnet (ohne Rechenwirkung). */
  frei: boolean;
  abwesenheiten: Abwesenheit[];
  /** QA BUG-2: Eintrag mit unbekanntem Aktivitätstyp (zählt nicht). */
  unbekannt: boolean;
  mittagessen: boolean;
  abendessen: boolean;
  bemerkungen: string[];
  /** Höchstes Tagestotal des Flows (ältere Einträge tragen Zwischenstände), `null` ohne Wert. */
  flowTagestotal: number | null;
  /** PROJ-22: im Tool gelöschte Einträge des Tages (zählen nicht). */
  geloeschte: GeloeschterEintrag[];
}

const TYP_TEXT: Record<Eintragstyp, string> = {
  arbeitszeit: "Arbeitszeit",
  "komp-glz": "Komp. GLZ",
  krankheit: "Krankheit",
  ferien: "Ferien",
  frei: "Frei",
  unbekannt: "Eintrag",
};

/** PROJ-22: im Tool gelöscht — zählt nirgends mehr. */
export function istImToolGeloescht(e: Pick<Zeiteintrag, "imTool">): boolean {
  return e.imTool?.geloescht === true;
}

function geloeschterText(e: Zeiteintrag): string {
  if (e.typ !== "arbeitszeit" || !e.kommen) return TYP_TEXT[e.typ];
  return `${zuSchweizerUhrzeit(e.kommen)}–${e.gehen ? zuSchweizerUhrzeit(e.gehen) : "offen"}`;
}

/** Mehr als 14 h am Stück gilt als unplausibel (Edge Case). */
const MAX_DAUER_MINUTEN = 14 * 60;

function minute(iso: string): number {
  return Math.round(new Date(iso).getTime() / 60000);
}

/** Länge der Vereinigung von Intervallen [von, bis) in Minuten. */
function vereinigungsLaenge(intervalle: [number, number][]): { laenge: number; ueberschneidung: boolean } {
  const sortiert = [...intervalle].sort((a, b) => a[0] - b[0]);
  let laenge = 0;
  let ueberschneidung = false;
  let aktuell: [number, number] | null = null;
  for (const [von, bis] of sortiert) {
    if (aktuell && von < aktuell[1]) {
      ueberschneidung = true;
      aktuell[1] = Math.max(aktuell[1], bis);
    } else {
      if (aktuell) laenge += aktuell[1] - aktuell[0];
      aktuell = [von, bis];
    }
  }
  if (aktuell) laenge += aktuell[1] - aktuell[0];
  return { laenge, ueberschneidung };
}

export function werteTagAus(alle: readonly Zeiteintrag[]): Tagesauswertung {
  // PROJ-22: Gelöschte Einträge werden nur angezeigt, nie gerechnet.
  const eintraege = alle.filter((e) => !istImToolGeloescht(e));
  const geloeschte = alle
    .filter(istImToolGeloescht)
    .map((e) => ({ eintragId: e.id, text: geloeschterText(e), am: e.imTool!.am, von: e.imTool!.von }));
  const arbeitszeit = eintraege
    .filter((e) => e.typ === "arbeitszeit" && e.kommen)
    .sort((a, b) => a.kommen!.localeCompare(b.kommen!));

  const paare: Zeitpaar[] = [];
  const intervalle: [number, number][] = [];
  let offen = false;
  let unplausibel = false;
  for (const e of arbeitszeit) {
    const von = minute(e.kommen!);
    const bis = e.gehen ? minute(e.gehen) : null;
    const istUnplausibel = bis !== null && (bis < von || bis - von > MAX_DAUER_MINUTEN);
    if (bis === null) offen = true;
    else if (istUnplausibel) unplausibel = true;
    else intervalle.push([von, bis]);
    paare.push({
      eintragId: e.id,
      kommen: zuSchweizerUhrzeit(e.kommen!),
      gehen: e.gehen ? zuSchweizerUhrzeit(e.gehen) : null,
      folgetag: !!e.gehen && (zuSchweizerDatum(e.gehen) ?? "") > (zuSchweizerDatum(e.kommen) ?? ""),
      unplausibel: istUnplausibel,
      bemerkung: e.bemerkung?.trim() || null,
      korrektur: e.imTool ? { am: e.imTool.am, von: e.imTool.von, vorher: e.imTool.vorher } : null,
    });
  }
  const { laenge, ueberschneidung } = vereinigungsLaenge(intervalle);

  const tagestotale = eintraege.map((e) => e.tagestotal).filter((t): t is number => t !== null);
  const ferien = eintraege.filter((e) => e.typ === "ferien");
  return {
    paare,
    arbeitszeitMinuten: laenge,
    hatArbeitszeit: arbeitszeit.length > 0,
    offen,
    ueberschneidung,
    unplausibel,
    krankheit: eintraege.some((e) => e.typ === "krankheit"),
    kompGlz: eintraege.some((e) => e.typ === "komp-glz"),
    // Ein ganzer Ferien-Eintrag überwiegt einen halben.
    ferien: ferien.length === 0 ? null : ferien.some((e) => !e.halberTag) ? "ganz" : "halb",
    frei: eintraege.some((e) => e.typ === "frei"),
    unbekannt: eintraege.some((e) => e.typ === "unbekannt"),
    abwesenheiten: eintraege.flatMap((e): Abwesenheit[] =>
      e.typ === "arbeitszeit" || e.typ === "unbekannt" ? [] : [{ eintragId: e.id, typ: e.typ, halberTag: e.halberTag }]
    ),
    // Product Decision: "ja", sobald ein Eintrag des Tages "ja" hat.
    mittagessen: eintraege.some((e) => e.mittagessen),
    abendessen: eintraege.some((e) => e.abendessen),
    bemerkungen: eintraege.map((e) => e.bemerkung?.trim() ?? "").filter(Boolean),
    flowTagestotal: tagestotale.length > 0 ? Math.max(...tagestotale) : null,
    geloeschte,
  };
}
