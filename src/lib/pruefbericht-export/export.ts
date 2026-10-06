import type { ArtikelInfo, Geraet } from "@/lib/dataverse/geraete";
import { listArtikelByIds } from "@/lib/dataverse/geraete";
import { getAktuellstePruefberichteForGeraete, type Pruefbericht } from "@/lib/dataverse/pruefberichte";
import { downloadKundenDatei, findeNeuesteExcelDatei, uploadKundenDatei } from "@/lib/sharepoint/kunden-drive";
import { erzeugePdf } from "./pdf-generator";
import type { ExportZeile } from "./feld-mapping";

export class ExportFehler extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExportFehler";
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

/** Bereinigt einen Wert für die Verwendung als Datei-/Ordnernamen-Bestandteil (SharePoint verbietet u.a. / \\ : * ? " < > |). */
function bereinigeFuerDateinamen(wert: string): string {
  return wert.replace(/[\\/:*?"<>|]/g, "-").trim();
}

function heutigesDatum(): string {
  const heute = new Date();
  const jahr = heute.getFullYear();
  const monat = String(heute.getMonth() + 1).padStart(2, "0");
  const tag = String(heute.getDate()).padStart(2, "0");
  return `${jahr}-${monat}-${tag}`;
}

function buildDateiname(firmaName: string, lagerortFilter: string | null): string {
  const zusatz = lagerortFilter ? ` - ${bereinigeFuerDateinamen(lagerortFilter)}` : "";
  return `${heutigesDatum()} Prüfbericht Absturzsicherungen - ${bereinigeFuerDateinamen(firmaName)}${zusatz}.pdf`;
}

// Live-Fund (2026-10-06): Dataverse liefert Datumsfelder als volle ISO-
// Zeitstempel ("2014-10-31T00:00:00Z"), die unformatiert roh im PDF
// erschienen. Wird als gültiges Datum erkannt → de-CH-Format (31.10.2014,
// gleiche Konvention wie formatDatum() im übrigen Tool); alles andere
// (z.B. ein bereits anders formatierter Legacy-Wert wie "01.2017")
// unverändert übernehmen, statt es fälschlich zu verwerfen.
function formatiereDatum(wert: string | null): string | null {
  if (!wert) return null;
  const datum = new Date(wert);
  if (Number.isNaN(datum.getTime())) return wert;
  // UTC-Getter statt toLocaleDateString(): Dataverse liefert reine
  // Kalenderdaten als Mitternacht-UTC-Zeitstempel — mit lokalen Gettern
  // könnte der Servertimezone das Datum je nach Offset auf den Vor-/Folgetag
  // verschieben, und toLocaleDateString füllte einstellige Tage/Monate
  // inkonsistent nicht mit führender Null auf ("3.3.2026" statt "03.03.2026").
  const tag = String(datum.getUTCDate()).padStart(2, "0");
  const monat = String(datum.getUTCMonth() + 1).padStart(2, "0");
  return `${tag}.${monat}.${datum.getUTCFullYear()}`;
}

function zuExportZeile(geraet: Geraet, pruefbericht: Pruefbericht, artikel: ArtikelInfo | undefined): ExportZeile {
  return {
    lagerort: geraet.lagerort,
    invNr: geraet.name,
    artikel: artikel?.bezeichnung ?? null,
    typ: artikel?.typ ?? null,
    dimension: artikel?.dimension ?? null,
    serienummer: geraet.serienummer,
    barcode: geraet.barcode,
    hersteller: artikel?.hersteller ?? null,
    herstelljahr: formatiereDatum(geraet.herstelljahr),
    erstgebrauch: formatiereDatum(geraet.erstgebrauch),
    ablegereife: formatiereDatum(geraet.ablegereife),
    zubehoer: geraet.zubehoer,
    kundenId: geraet.kundenId,
    geprueft: formatiereDatum(pruefbericht.pruefdatum),
    pruefer: pruefbericht.pruefer,
    pruefergebnis: pruefbericht.ergebnis,
    bemerkungen: pruefbericht.bemerkungen,
  };
}

async function ladeVorlage(ordnerPfad: string): Promise<ArrayBuffer> {
  const vorlagenDatei = await findeNeuesteExcelDatei(ordnerPfad);
  if (vorlagenDatei) {
    return downloadKundenDatei(`${ordnerPfad}/${vorlagenDatei.name}`);
  }
  // Keine firmenspezifische Vorlage im aktuellen Jahresordner gefunden —
  // zentrale Standard-Vorlage verwenden (siehe PROJ-7 Product Decisions).
  return downloadKundenDatei(requireEnv("SHAREPOINT_STANDARD_VORLAGE_PFAD"));
}

export interface GeneratePdfParams {
  firmaName: string;
  geraete: Geraet[];
  lagerortFilter: string | null;
}

export interface GeneratePdfResult {
  pdfBuffer: Buffer;
  dateiname: string;
}

export async function generatePruefberichtPdf(params: GeneratePdfParams): Promise<GeneratePdfResult> {
  const { firmaName, geraete, lagerortFilter } = params;
  if (geraete.length === 0) {
    throw new ExportFehler("Keine Geräte für diesen Export gefunden.");
  }

  const pruefberichte = await getAktuellstePruefberichteForGeraete(geraete.map((g) => g.id));
  const geraeteMitPruefbericht = geraete.filter((g) => pruefberichte.has(g.id));
  if (geraeteMitPruefbericht.length === 0) {
    throw new ExportFehler("Keine Geräte für diesen Export gefunden.");
  }

  const artikelIds = geraeteMitPruefbericht.map((g) => g.artikelId).filter((id): id is string => !!id);
  const artikelMap = await listArtikelByIds(artikelIds);

  const zeilen = geraeteMitPruefbericht.map((geraet) =>
    zuExportZeile(
      geraet,
      // Vorhandensein bereits oben via `geraeteMitPruefbericht`-Filter sichergestellt.
      pruefberichte.get(geraet.id)!,
      geraet.artikelId ? artikelMap.get(geraet.artikelId) : undefined
    )
  );

  const jahr = new Date().getFullYear();
  const ordnerPfad = `${bereinigeFuerDateinamen(firmaName)}/Prüfberichte/${jahr}`;

  const vorlageBuffer = await ladeVorlage(ordnerPfad);
  const pdfBuffer = await erzeugePdf(vorlageBuffer, zeilen, firmaName);

  const dateiname = buildDateiname(firmaName, lagerortFilter);
  try {
    // QA BUG-3: Ein Fehler bei der zusätzlichen Archiv-Ablage darf dem
    // Bearbeiter nicht den bereits fertig generierten Download verwehren.
    // `uploadKundenDatei` erwartet einen ArrayBuffer; pdfmakes `getBuffer()`
    // liefert einen Node-`Buffer`, dessen zugrundeliegender ArrayBuffer bei
    // einem gepoolten Buffer grösser als die eigentlichen Daten sein kann —
    // deshalb explizit auf den tatsächlich belegten Bereich einschränken.
    const archivBuffer = pdfBuffer.buffer.slice(
      pdfBuffer.byteOffset,
      pdfBuffer.byteOffset + pdfBuffer.byteLength
    ) as ArrayBuffer;
    await uploadKundenDatei(`${ordnerPfad}/${dateiname}`, archivBuffer);
  } catch (error) {
    console.error(`PDF konnte nicht im Archiv abgelegt werden (${ordnerPfad}/${dateiname}):`, error);
  }

  return { pdfBuffer, dateiname };
}
