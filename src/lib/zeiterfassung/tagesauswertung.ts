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
  mittagessen: boolean;
  abendessen: boolean;
  bemerkungen: string[];
  /** Höchstes Tagestotal des Flows (ältere Einträge tragen Zwischenstände), `null` ohne Wert. */
  flowTagestotal: number | null;
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

export function werteTagAus(eintraege: readonly Zeiteintrag[]): Tagesauswertung {
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
    abwesenheiten: eintraege.flatMap((e): Abwesenheit[] =>
      e.typ === "arbeitszeit" || e.typ === "unbekannt" ? [] : [{ eintragId: e.id, typ: e.typ, halberTag: e.halberTag }]
    ),
    // Product Decision: "ja", sobald ein Eintrag des Tages "ja" hat.
    mittagessen: eintraege.some((e) => e.mittagessen),
    abendessen: eintraege.some((e) => e.abendessen),
    bemerkungen: eintraege.map((e) => e.bemerkung?.trim() ?? "").filter(Boolean),
    flowTagestotal: tagestotale.length > 0 ? Math.max(...tagestotale) : null,
  };
}
