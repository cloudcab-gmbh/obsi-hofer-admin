/**
 * PROJ-19: Import der SharePoint-Zeiterfassung (CSV-Export) nach Dataverse.
 *
 *   npm run import:sharepoint -- <csv> [--modus=trockenlauf|erstbefuellung|ergaenzen] [--ohne=a@b.ch,c@d.ch]
 *
 * - trockenlauf (Standard): liest CSV und Dataverse, schreibt nichts, erstellt den Bericht
 * - erstbefuellung: löscht alle Einträge Arbeitszeit/Komp. GLZ/Krankheit und importiert;
 *   verweigert, sobald ein Eintrag schon eine SharePoint-ID trägt
 * - ergaenzen: löscht nichts, importiert nur Zeilen, deren SharePoint-ID fehlt oder unvollständig ist
 *
 * Der Bericht (Personendaten) wird neben der CSV abgelegt, nie im Repo.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { DataverseError } from "@/lib/dataverse/errors";
import {
  erstelleZeiteintrag,
  listAlleZeiteintraegeKurz,
  loescheZeiteintrag,
  type ZeiteintragKurz,
} from "@/lib/dataverse/zeiterfassung";
import { leseSharePointCsv, planeImport, type ImportEintrag } from "@/lib/zeiterfassung/sharepoint-import";

type Modus = "trockenlauf" | "erstbefuellung" | "ergaenzen";
const MODI: Modus[] = ["trockenlauf", "erstbefuellung", "ergaenzen"];
const ZU_LOESCHENDE_TYPEN = new Set<ZeiteintragKurz["typ"]>(["arbeitszeit", "komp-glz", "krankheit"]);
const PARALLEL = 4;

function leseArgumente(): { csv: string; modus: Modus; ohne: Set<string> } {
  const args = process.argv.slice(2);
  const csv = args.find((a) => !a.startsWith("--"));
  const modus = (args.find((a) => a.startsWith("--modus="))?.slice(8) ?? "trockenlauf") as Modus;
  const ohne = new Set(
    (args.find((a) => a.startsWith("--ohne="))?.slice(7) ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
  if (!csv) throw new Error("Pfad zur CSV-Datei fehlt.");
  if (!MODI.includes(modus)) throw new Error(`Unbekannter Modus "${modus}" — erlaubt: ${MODI.join(", ")}`);
  return { csv: resolve(csv), modus, ohne };
}

async function mitWiederholung<T>(aufgabe: () => Promise<T>): Promise<T> {
  for (let versuch = 1; ; versuch++) {
    try {
      return await aufgabe();
    } catch (fehler) {
      const drosselung = fehler instanceof DataverseError && fehler.category === "unavailable";
      if (!drosselung || versuch >= 5) throw fehler;
      await new Promise((r) => setTimeout(r, 2 ** versuch * 1000));
    }
  }
}

/** Führt die Aufgaben mit begrenzter Parallelität aus; Fehler werden gesammelt, nicht geworfen. */
async function arbeiteAb<T>(
  titel: string,
  elemente: T[],
  aufgabe: (element: T) => Promise<unknown>
): Promise<{ element: T; fehler: string }[]> {
  const fehler: { element: T; fehler: string }[] = [];
  let naechstes = 0;
  let fertig = 0;
  async function arbeiter() {
    while (naechstes < elemente.length) {
      const element = elemente[naechstes++];
      try {
        await mitWiederholung(() => aufgabe(element));
      } catch (e) {
        fehler.push({ element, fehler: e instanceof Error ? e.message : String(e) });
      }
      fertig++;
      if (fertig % 100 === 0 || fertig === elemente.length) {
        process.stdout.write(`\r  ${titel}: ${fertig}/${elemente.length}`);
      }
    }
  }
  await Promise.all(Array.from({ length: PARALLEL }, arbeiter));
  if (elemente.length > 0) process.stdout.write("\n");
  return fehler;
}

function csvFeld(wert: string | number): string {
  return `"${String(wert).replace(/"/g, '""')}"`;
}

function zaehle<T>(liste: T[], schluessel: (x: T) => string): [string, number][] {
  const m = new Map<string, number>();
  for (const x of liste) m.set(schluessel(x), (m.get(schluessel(x)) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

async function main() {
  const { csv, modus, ohne } = leseArgumente();
  console.log(`PROJ-19 Import — Modus: ${modus}\nCSV: ${csv}${ohne.size ? `\nOhne: ${[...ohne].join(", ")}` : ""}\n`);

  const zeilen = leseSharePointCsv(readFileSync(csv, "utf8"));
  const plan = planeImport(zeilen, ohne);
  const bestand = await listAlleZeiteintraegeKurz();

  const zuLoeschen = bestand.filter((e) => ZU_LOESCHENDE_TYPEN.has(e.typ));
  const mitSharepointId = bestand.filter((e) => e.sharepointId !== null);

  // Pro SharePoint-ID: erwartete Anzahl Einträge (Plan) vs. vorhandene (Dataverse)
  const erwartet = new Map<number, number>();
  for (const e of plan.eintraege) erwartet.set(e.sharepointId, (erwartet.get(e.sharepointId) ?? 0) + 1);
  const vorhanden = new Map<number, string[]>();
  for (const e of mitSharepointId) vorhanden.set(e.sharepointId!, [...(vorhanden.get(e.sharepointId!) ?? []), e.id]);
  const unvollstaendig = [...vorhanden.entries()].filter(([id, ids]) => erwartet.has(id) && ids.length !== erwartet.get(id));

  let zuErstellen: ImportEintrag[];
  let teilweiseLoeschen: string[] = [];
  if (modus === "ergaenzen") {
    const fehlend = new Set([...erwartet.keys()].filter((id) => !vorhanden.has(id)));
    for (const [id, ids] of unvollstaendig) {
      fehlend.add(id);
      teilweiseLoeschen.push(...ids);
    }
    zuErstellen = plan.eintraege.filter((e) => fehlend.has(e.sharepointId));
  } else {
    zuErstellen = plan.eintraege;
  }

  // --- Bericht -------------------------------------------------------------
  console.log(`CSV-Zeilen: ${zeilen.length}`);
  console.log(`  importierbar: ${plan.ergebnisse.filter((r) => r.abbildung.ok).length} Zeilen → ${plan.eintraege.length} Einträge`);
  console.log(`  weggelassen:  ${plan.weggelassen.length} Zeilen`);
  for (const [grund, n] of zaehle(plan.weggelassen, (w) => w.grund)) console.log(`    ${String(n).padStart(4)}  ${grund}`);
  console.log(`  Hinweise:     ${plan.hinweise.length} (Zeilen werden trotzdem importiert)`);
  console.log("\nEinträge pro Person:");
  for (const [email, n] of zaehle(plan.eintraege, (e) => e.email)) {
    const daten = plan.eintraege.filter((e) => e.email === email).map((e) => e.datum).sort();
    console.log(`  ${email.padEnd(36)} ${String(n).padStart(5)}  ${daten[0]} – ${daten[daten.length - 1]}`);
  }
  console.log("\nDataverse heute:");
  for (const [typ, n] of zaehle(bestand, (e) => e.typ)) {
    console.log(`  ${typ.padEnd(12)} ${String(n).padStart(5)}${ZU_LOESCHENDE_TYPEN.has(typ as ZeiteintragKurz["typ"]) ? "  → wird bei Erstbefüllung gelöscht" : "  → bleibt"}`);
  }
  console.log(`  mit SharePoint-ID: ${mitSharepointId.length}${unvollstaendig.length ? ` (davon ${unvollstaendig.length} Zeilen unvollständig)` : ""}`);
  if (modus === "ergaenzen") console.log(`\nErgänzen: ${zuErstellen.length} Einträge fehlen${teilweiseLoeschen.length ? `, ${teilweiseLoeschen.length} unvollständige werden ersetzt` : ""}`);

  const stempel = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const berichtPfad = join(dirname(csv), `${basename(csv, extname(csv))}-bericht-${modus}-${stempel}.csv`);
  const berichtZeilen = [
    ["Art", "SharePoint-ID", "Person", "Datum", "Grund"].map(csvFeld).join(";"),
    ...plan.weggelassen.map((w) => ["weggelassen", w.zeile.ID, w.zeile.Title, w.zeile.AktivitaetsDatum.slice(0, 10), w.grund].map(csvFeld).join(";")),
    ...plan.hinweise.map((h) => ["Hinweis", h.zeile.ID, h.zeile.Title, h.zeile.AktivitaetsDatum.slice(0, 10), h.hinweis].map(csvFeld).join(";")),
  ];
  writeFileSync(berichtPfad, "﻿" + berichtZeilen.join("\r\n") + "\r\n", "utf8");
  console.log(`\nBericht: ${berichtPfad}`);

  if (modus === "trockenlauf") {
    console.log("\nTrockenlauf — in Dataverse wurde nichts geändert.");
    return;
  }

  // --- Schreiben -----------------------------------------------------------
  if (modus === "erstbefuellung") {
    if (mitSharepointId.length > 0) {
      throw new Error(
        `Erstbefüllung verweigert: ${mitSharepointId.length} Einträge tragen bereits eine SharePoint-ID ` +
          `(schon importiert oder vom Flow erstellt). Nur noch --modus=ergaenzen ist möglich.`
      );
    }
    console.log(`\nLösche ${zuLoeschen.length} Einträge …`);
    const fehler = await arbeiteAb("gelöscht", zuLoeschen, (e) => loescheZeiteintrag(e.id));
    if (fehler.length > 0) {
      for (const f of fehler.slice(0, 10)) console.error(`  ${f.element.id}: ${f.fehler}`);
      throw new Error(`${fehler.length} Einträge konnten nicht gelöscht werden — Import abgebrochen, nichts erstellt.`);
    }
  } else if (teilweiseLoeschen.length > 0) {
    console.log(`\nErsetze ${teilweiseLoeschen.length} unvollständige Einträge …`);
    const fehler = await arbeiteAb("gelöscht", teilweiseLoeschen, (id) => loescheZeiteintrag(id));
    if (fehler.length > 0) throw new Error(`${fehler.length} unvollständige Einträge konnten nicht gelöscht werden — abgebrochen.`);
  }

  console.log(`\nErstelle ${zuErstellen.length} Einträge …`);
  const fehler = await arbeiteAb("erstellt", zuErstellen, (e) =>
    erstelleZeiteintrag(e.email, e.datum, {
      typ: "arbeitszeit",
      kommen: e.kommen,
      gehen: e.gehen,
      mittagessen: e.mittagessen,
      abendessen: false,
      bemerkung: e.bemerkung,
      sharepointId: e.sharepointId,
    })
  );
  console.log(`\nFertig: ${zuErstellen.length - fehler.length} erstellt, ${fehler.length} Fehler.`);
  if (fehler.length > 0) {
    for (const f of fehler.slice(0, 20)) console.error(`  SharePoint-ID ${f.element.sharepointId} (${f.element.datum}): ${f.fehler}`);
    console.error("Mit --modus=ergaenzen lassen sich die fehlenden Einträge nachholen.");
    process.exitCode = 1;
  }
}

main().catch((fehler) => {
  console.error(`\nFehler: ${fehler instanceof Error ? fehler.message : String(fehler)}`);
  process.exitCode = 1;
});
