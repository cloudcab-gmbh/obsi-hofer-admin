import type { Content, TableCell, TDocumentDefinitions } from "pdfmake/interfaces";
import { formatKalenderdatum, formatMonat, tageDesMonats, wochentagName } from "./datum";
import { formatGleitzeitTage, formatMinuten, formatMinutenMitVorzeichen } from "./format";
import { formatArbeitstage, formatPensum, sortiereVersionen, type ArbeitsmodellVersion } from "./soll";
import { artTexte } from "./anzeige";
import type { Tageszeile, Zeitnachweis } from "./zeitnachweis";

// PROJ-16: Druckansicht des Zeitnachweises (rein, ohne Datenzugriff). Gleiche
// Zahlen wie am Bildschirm; interne Prüfhinweise (Flow-Abgleich,
// Überschneidungen, unplausibel, "vor Arbeitsmodell") werden weggelassen,
// offene Einträge als "Gehen fehlt" markiert.

const SEITENRAND = 30;
const HINTERLEGT = "#f3f4f6";
const KOPF_HINTERGRUND = "#2563a8";

export interface ZeitnachweisPdfEingabe {
  zeitnachweis: Zeitnachweis;
  personName: string;
  versionen: readonly ArbeitsmodellVersion[];
  heute: string;
  erstelltVon: string;
  logoDataUrl: string | null;
}

/** "Zeitnachweis Anna Muster 2026-10.pdf" — in Dateinamen unzulässige Zeichen werden ersetzt. */
export function zeitnachweisDateiname(name: string, monat: string): string {
  const sauber = name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").replace(/\s+/g, " ").trim() || "Person";
  return `Zeitnachweis ${sauber} ${monat}.pdf`;
}

/** Arbeitsmodell-Versionen, die im Monat gelten (bei einem Wechsel mehrere). */
export function versionenImMonat<T extends ArbeitsmodellVersion>(versionen: readonly T[], monat: string): T[] {
  const beginn = `${monat}-01`;
  const ende = tageDesMonats(monat).at(-1)!;
  const sortiert = sortiereVersionen(versionen).reverse(); // älteste zuerst
  return sortiert.filter((v, i) => {
    const naechste = sortiert[i + 1];
    return v.gueltigAb <= ende && (!naechste || naechste.gueltigAb > beginn);
  });
}

function zeitenText(t: Tageszeile): string {
  return t.auswertung.paare
    .map((p) => `${p.kommen}–${p.gehen ?? "… (Gehen fehlt)"}${p.folgetag ? " (+1)" : ""}`)
    .join(", ");
}

function zelle(text: string, extra: Partial<Exclude<TableCell, string>> = {}): TableCell {
  return { text, ...extra } as TableCell;
}

function tageszeile(t: Tageszeile): TableCell[] {
  const hinterlegt = t.grund?.art === "frei" || t.grund?.art === "feiertag" ? HINTERLEGT : undefined;
  const zaehlt = !t.zukunft;
  const zellen: TableCell[] = [
    zelle(`${wochentagName(t.datum).slice(0, 2)} ${formatKalenderdatum(t.datum).slice(0, 6)}`, { noWrap: true }),
    zelle(zeitenText(t)),
    zelle(artTexte(t).join(", ")),
    zelle(zaehlt && t.istMinuten !== null ? formatMinuten(t.istMinuten) : "", { alignment: "right" }),
    zelle(zaehlt && t.sollMinuten !== null ? formatMinuten(t.sollMinuten) : "", { alignment: "right" }),
    zelle(zaehlt && !t.vorBeginn && t.abweichungMinuten !== null ? formatMinutenMitVorzeichen(t.abweichungMinuten) : "", {
      alignment: "right",
    }),
    zelle(t.saldoMinuten !== null ? formatMinutenMitVorzeichen(t.saldoMinuten) : "", { alignment: "right" }),
    zelle([t.auswertung.mittagessen && "Mittag", t.auswertung.abendessen && "Abend"].filter(Boolean).join(", ")),
    zelle(t.auswertung.bemerkungen.join(" · ")),
  ];
  return hinterlegt ? zellen.map((z) => ({ ...(z as object), fillColor: hinterlegt }) as TableCell) : zellen;
}

function tage(wert: number): string {
  return `${wert} ${wert === 1 ? "Tag" : "Tage"}`;
}

function summen(z: Zeitnachweis): Content {
  const saldoTitel = z.beginnGleitzeit && z.beginnGleitzeit.startsWith(z.monat) ? "Startsaldo" : "Saldo Vormonat";
  const gleitzeitTitel = z.laufenderMonat ? "Gleitzeit Stand heute" : "Gleitzeit Monatsende";
  const zeilen: [string, string][] = [
    [saldoTitel, z.saldoVormonatMinuten === null ? "—" : formatMinutenMitVorzeichen(z.saldoVormonatMinuten)],
    ["Ist", formatMinuten(z.summeIstMinuten)],
    ["Soll", formatMinuten(z.summeSollMinuten)],
    ["Abweichung", formatMinutenMitVorzeichen(z.abweichungMinuten)],
    [
      gleitzeitTitel,
      z.saldoEndeMinuten === null
        ? "—"
        : `${formatMinutenMitVorzeichen(z.saldoEndeMinuten)} (${formatGleitzeitTage(z.saldoEndeMinuten)})`,
    ],
    ["Ferien im Monat", z.ferienGeplantMonat > 0 ? `${tage(z.ferienBezogenMonat)} bezogen, ${tage(z.ferienGeplantMonat)} geplant` : `${tage(z.ferienBezogenMonat)} bezogen`],
    ["Feriensaldo Monatsende", z.feriensaldoEnde === null ? "—" : tage(z.feriensaldoEnde)],
  ];
  return {
    margin: [0, 12, 0, 0],
    table: {
      widths: [130, "auto"],
      body: zeilen.map(([titel, wert]) => [{ text: titel, color: "#52514e" }, { text: wert, bold: true, alignment: "right" }]),
    },
    layout: "noBorders",
  };
}

function vermerke(z: Zeitnachweis): Content[] {
  const texte: string[] = [];
  if (z.keineEintraege) texte.push("Keine Zeiteinträge in diesem Monat.");
  if (z.ohneArbeitsmodell) texte.push("Kein Arbeitsmodell erfasst — ohne Arbeitsmodell gibt es kein Soll.");
  else if (z.vorBeginn) texte.push("Für diesen Monat gibt es keine Gleitzeit-Auswertung (vor Beginn der Gleitzeit).");
  return texte.map((text) => ({ text, italics: true, color: "#52514e", margin: [0, 2, 0, 0] }) as Content);
}

export function bauePdfDokument(e: ZeitnachweisPdfEingabe): TDocumentDefinitions {
  const z = e.zeitnachweis;
  const modelle = versionenImMonat(e.versionen, z.monat);
  const modellText =
    modelle.length === 0
      ? "Kein Arbeitsmodell"
      : modelle
          .map((v) => `${formatPensum(v.pensum)} · ${formatArbeitstage(v.arbeitstage)}${modelle.length > 1 ? ` (ab ${formatKalenderdatum(v.gueltigAb)})` : ""}`)
          .join("; ");

  const kopf: Content = {
    columns: [
      ...(e.logoDataUrl ? [{ image: e.logoDataUrl, width: 28 }] : []),
      {
        width: "*",
        stack: [
          { text: "Zeitnachweis", bold: true, fontSize: 14 },
          { text: e.personName, bold: true, fontSize: 11, margin: [0, 4, 0, 0] },
          {
            text: `${formatMonat(z.monat)}${z.laufenderMonat ? ` · Stand ${formatKalenderdatum(e.heute)}` : ""}`,
            margin: [0, 2, 0, 0],
          },
          { text: `Arbeitsmodell: ${modellText}`, color: "#52514e", margin: [0, 2, 0, 0] },
        ],
      },
    ],
    columnGap: 10,
  } as Content;

  const kopfzeile: TableCell[] = ["Datum", "Zeiten", "Art", "Ist", "Soll", "Abw.", "Gleitzeit", "Essen", "Bemerkung"].map((text, i) => ({
    text,
    bold: true,
    color: "#ffffff",
    fillColor: KOPF_HINTERGRUND,
    alignment: i >= 3 && i <= 6 ? "right" : "left",
  }));

  return {
    pageSize: "A4",
    pageOrientation: "portrait",
    pageMargins: [SEITENRAND, SEITENRAND, SEITENRAND, 40],
    defaultStyle: { font: "Roboto", fontSize: 7.5 },
    info: { title: `Zeitnachweis ${e.personName} ${z.monat}` },
    footer: (aktuelleSeite: number, seitenzahl: number): Content => ({
      columns: [
        { width: "*", text: `Erstellt am ${formatKalenderdatum(e.heute)} von ${e.erstelltVon}`, fontSize: 7, color: "#52514e" },
        { width: "auto", text: `Seite ${aktuelleSeite} von ${seitenzahl}`, fontSize: 7 },
        { width: "*", text: "" },
      ],
      margin: [SEITENRAND, 12, SEITENRAND, 0],
    }),
    content: [
      kopf,
      ...vermerke(z),
      {
        margin: [0, 10, 0, 0],
        table: {
          // Kopfzeile wiederholt sich auf jeder Seite; eine Tageszeile wird nicht geteilt.
          headerRows: 1,
          dontBreakRows: true,
          widths: [36, "*", 62, 30, 30, 34, 38, 30, 80],
          body: [kopfzeile, ...z.tage.map(tageszeile)],
        },
        layout: {
          hLineWidth: (i: number) => (i === 0 ? 0 : 0.5),
          vLineWidth: () => 0,
          hLineColor: () => "#d4d4d4",
          paddingTop: () => 2,
          paddingBottom: () => 2,
          paddingLeft: () => 3,
          paddingRight: () => 3,
        },
      },
      summen(z),
    ],
  };
}
