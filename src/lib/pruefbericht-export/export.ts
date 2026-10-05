import type { ArtikelInfo, Geraet } from "@/lib/dataverse/geraete";
import { listArtikelByIds } from "@/lib/dataverse/geraete";
import { getAktuellstePruefberichteForGeraete, type Pruefbericht } from "@/lib/dataverse/pruefberichte";
import {
  downloadKundenDatei,
  findeNeuesteExcelDatei,
  konvertiereZuPdf,
  loescheKundenDatei,
  uploadKundenDatei,
} from "@/lib/sharepoint/kunden-drive";
import { erzeugeArbeitskopie } from "./arbeitskopie";
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
    herstelljahr: geraet.herstelljahr,
    erstgebrauch: geraet.erstgebrauch,
    ablegereife: geraet.ablegereife,
    zubehoer: geraet.zubehoer,
    kundenId: geraet.kundenId,
    geprueft: pruefbericht.pruefdatum,
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
  pdfBuffer: ArrayBuffer;
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
  const arbeitskopieBuffer = await erzeugeArbeitskopie(vorlageBuffer, zeilen);

  const tempPfad = `${ordnerPfad}/_temp-${crypto.randomUUID()}.xlsx`;
  const tempItemId = await uploadKundenDatei(tempPfad, arbeitskopieBuffer);
  let pdfBuffer: ArrayBuffer;
  try {
    pdfBuffer = await konvertiereZuPdf(tempItemId);
  } finally {
    await loescheKundenDatei(tempItemId);
  }

  const dateiname = buildDateiname(firmaName, lagerortFilter);
  await uploadKundenDatei(`${ordnerPfad}/${dateiname}`, pdfBuffer);

  return { pdfBuffer, dateiname };
}
