/**
 * PROJ-19: Abbildung der SharePoint-Liste "Zeiterfassung" (ein Datensatz pro
 * Person und Tag) auf Zeiteinträge in Dataverse (ein Eintrag pro Kommen/Gehen).
 *
 * Reine Regeln ohne Dataverse-Zugriff — Referenz auch für den Flow, der neue
 * und geänderte SharePoint-Zeilen später laufend übernimmt.
 */
import { alsSchweizerZeitpunkt } from "./datum";

export const PFLICHTSPALTEN = [
  "Title",
  "AktivitaetsDatum",
  "AZNetto",
  "AStart",
  "AEnde",
  "PStart",
  "PEnde",
  "Mittagessen",
  "Bemerkung",
  "ID",
  "Aktivitaetstyp",
] as const;

export type Spalte = (typeof PFLICHTSPALTEN)[number];
export type SharePointZeile = Record<Spalte, string>;

/** Ein zu erstellender Zeiteintrag (Typ immer Arbeitszeit). */
export interface ImportEintrag {
  email: string;
  /** Aktivitätsdatum "JJJJ-MM-TT" (Tag des Kommens). */
  datum: string;
  /** UTC-Zeitpunkte für Dataverse. */
  kommen: string;
  gehen: string;
  mittagessen: boolean;
  bemerkung: string | null;
  sharepointId: number;
}

export type Abbildung =
  | { ok: true; eintraege: ImportEintrag[]; hinweise: string[] }
  | { ok: false; grund: string };

export interface ZeilenErgebnis {
  zeile: SharePointZeile;
  abbildung: Abbildung;
}

/** CSV im Format des SharePoint-Exports (Komma, doppelte Anführungszeichen). */
export function parseCsv(text: string): string[][] {
  const zeilen: string[][] = [];
  let zeile: string[] = [];
  let feld = "";
  let inAnfuehrung = false;
  const t = text.replace(/^﻿/, "");
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (inAnfuehrung) {
      if (c === '"') {
        if (t[i + 1] === '"') {
          feld += '"';
          i++;
        } else inAnfuehrung = false;
      } else feld += c;
    } else if (c === '"') inAnfuehrung = true;
    else if (c === ",") {
      zeile.push(feld);
      feld = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      zeile.push(feld);
      zeilen.push(zeile);
      zeile = [];
      feld = "";
    } else feld += c;
  }
  if (feld !== "" || zeile.length > 0) {
    zeile.push(feld);
    zeilen.push(zeile);
  }
  return zeilen.filter((z) => z.some((f) => f.trim() !== ""));
}

/** Liest die CSV; Spalten werden über die Überschrift gefunden. */
export function leseSharePointCsv(text: string): SharePointZeile[] {
  const [kopf, ...daten] = parseCsv(text);
  if (!kopf) throw new Error("Die CSV-Datei ist leer.");
  const index = new Map(kopf.map((name, i) => [name.trim(), i]));
  const fehlend = PFLICHTSPALTEN.filter((s) => !index.has(s));
  if (fehlend.length > 0) throw new Error(`Spalten fehlen in der CSV: ${fehlend.join(", ")}`);
  return daten.map((felder) => {
    const zeile = {} as SharePointZeile;
    for (const s of PFLICHTSPALTEN) zeile[s] = (felder[index.get(s)!] ?? "").trim();
    return zeile;
  });
}

const ZEITPUNKT = /^(\d{2})\.(\d{2})\.(\d{4}) (\d{2}:\d{2})$/;

/** "TT.MM.JJJJ HH:MM" (Schweizer Ortszeit) → Datum + UTC-Zeitpunkt; leer → null. */
function zeitpunkt(wert: string): { datum: string; iso: string; ms: number } | null {
  const m = ZEITPUNKT.exec(wert);
  if (!m) return null;
  const datum = `${m[3]}-${m[2]}-${m[1]}`;
  const iso = alsSchweizerZeitpunkt(datum, m[4]);
  return { datum, iso, ms: new Date(iso).getTime() };
}

const MAX_SPANNE_MS = 14 * 60 * 60000;

/** Herkunftsvermerk in der Bemerkung des ersten Eintrags eines Tages (Nutzerwunsch 2026-11-09). */
export const HERKUNFT = "aus SharePoint";

/** Bildet eine Zeile ab oder nennt den Grund, warum sie weggelassen wird. */
export function bildeZeileAb(zeile: SharePointZeile, ausgeschlossen: ReadonlySet<string> = new Set()): Abbildung {
  const email = zeile.Title.toLowerCase();
  if (!email || !ZEITPUNKT.test(zeile.AktivitaetsDatum)) return { ok: false, grund: "ohne E-Mail oder Datum" };
  if (ausgeschlossen.has(email)) return { ok: false, grund: "Person ausgeschlossen" };
  const sharepointId = Number.parseInt(zeile.ID, 10);
  if (!Number.isInteger(sharepointId) || String(sharepointId) !== zeile.ID) {
    return { ok: false, grund: "ohne gültige SharePoint-ID" };
  }
  if (zeile.Aktivitaetstyp !== "" && zeile.Aktivitaetstyp !== "Arbeitszeit") {
    return { ok: false, grund: `Typ ${zeile.Aktivitaetstyp}` };
  }

  const a = zeitpunkt(zeile.AStart);
  const e = zeitpunkt(zeile.AEnde);
  if (!a && !e) return { ok: false, grund: "nur AZNetto, keine Uhrzeiten" };
  if (!a) return { ok: false, grund: "kein AStart" };
  if (!e) return { ok: false, grund: "kein AEnde (offen)" };
  if (e.ms <= a.ms) return { ok: false, grund: "AEnde vor oder gleich AStart" };

  const ps = zeitpunkt(zeile.PStart);
  const pe = zeitpunkt(zeile.PEnde);
  const basis = {
    email,
    datum: a.datum,
    sharepointId,
  };
  const ersterEintrag = {
    mittagessen: zeile.Mittagessen.toLowerCase() === "true",
    bemerkung: zeile.Bemerkung ? `${zeile.Bemerkung} · ${HERKUNFT}` : HERKUNFT,
  };
  const folgeEintrag = { mittagessen: false, bemerkung: null };

  let eintraege: ImportEintrag[];
  const keinePause = !ps || !pe || ps.ms === pe.ms || (ps.ms <= a.ms && pe.ms <= a.ms);
  if (keinePause) {
    eintraege = [{ ...basis, ...ersterEintrag, kommen: a.iso, gehen: e.iso }];
  } else if (a.ms < ps.ms && ps.ms < pe.ms && pe.ms < e.ms) {
    eintraege = [
      { ...basis, ...ersterEintrag, kommen: a.iso, gehen: ps.iso },
      { ...basis, ...folgeEintrag, kommen: pe.iso, gehen: e.iso },
    ];
  } else if (a.ms < ps.ms && ps.ms < pe.ms && pe.ms === e.ms) {
    eintraege = [{ ...basis, ...ersterEintrag, kommen: a.iso, gehen: ps.iso }];
  } else {
    return { ok: false, grund: "Pause unplausibel" };
  }

  const hinweise: string[] = [];
  if (e.ms - a.ms > MAX_SPANNE_MS) hinweise.push("Spanne über 14 h");
  const nettoMinuten = eintraege.reduce((summe, x) => summe + (Date.parse(x.gehen) - Date.parse(x.kommen)) / 60000, 0);
  const azNetto = Number.parseFloat(zeile.AZNetto.replace(",", "."));
  if (Number.isFinite(azNetto) && Math.abs(azNetto * 60 - nettoMinuten) > 1) {
    hinweise.push(`AZNetto ${zeile.AZNetto} h weicht von den Uhrzeiten ab (${(nettoMinuten / 60).toFixed(2)} h)`);
  }
  return { ok: true, eintraege, hinweise };
}

export interface ImportPlan {
  ergebnisse: ZeilenErgebnis[];
  eintraege: ImportEintrag[];
  weggelassen: { zeile: SharePointZeile; grund: string }[];
  hinweise: { zeile: SharePointZeile; hinweis: string }[];
}

export function planeImport(zeilen: SharePointZeile[], ausgeschlossen: ReadonlySet<string> = new Set()): ImportPlan {
  const plan: ImportPlan = { ergebnisse: [], eintraege: [], weggelassen: [], hinweise: [] };
  for (const zeile of zeilen) {
    const abbildung = bildeZeileAb(zeile, ausgeschlossen);
    plan.ergebnisse.push({ zeile, abbildung });
    if (abbildung.ok) {
      plan.eintraege.push(...abbildung.eintraege);
      for (const hinweis of abbildung.hinweise) plan.hinweise.push({ zeile, hinweis });
    } else {
      plan.weggelassen.push({ zeile, grund: abbildung.grund });
    }
  }
  return plan;
}
