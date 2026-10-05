import { graphFetch } from "./client";
import { SharePointError } from "./errors";

// "Kunden" ist eine bestehende Dokumentbibliothek auf der SharePoint-Haupt-
// Site (https://obsihofer.sharepoint.com/Kunden) mit einem Ordner pro Firma
// und darin "Prüfberichte/{Jahr}/" — siehe PROJ-7-Spec. Der Hostname ist
// bewusst eine Konstante (kein Env-Var), da er Teil der fachlichen
// Architektur ist, nicht einer Umgebungs-Konfiguration.
const SHAREPOINT_HOSTNAME = "obsihofer.sharepoint.com";
const KUNDEN_LIBRARY_NAME = "Kunden";

interface DriveItem {
  id: string;
  name: string;
  lastModifiedDateTime: string;
  folder?: unknown;
}

let cachedDriveId: string | null = null;

/** Nur für Tests: erzwingt eine erneute Auflösung der Drive-ID beim nächsten Aufruf. */
export function resetKundenDriveCache(): void {
  cachedDriveId = null;
}

async function resolveKundenDriveId(): Promise<string> {
  if (cachedDriveId) return cachedDriveId;

  const siteRes = await graphFetch(`/sites/${SHAREPOINT_HOSTNAME}`);
  const site: { id: string } = await siteRes.json();

  const drivesRes = await graphFetch(`/sites/${site.id}/drives`);
  const drives: { value: { id: string; name: string }[] } = await drivesRes.json();
  const kundenDrive = drives.value.find((d) => d.name === KUNDEN_LIBRARY_NAME);
  if (!kundenDrive) {
    throw new SharePointError(
      "not_found",
      `Dokumentbibliothek "${KUNDEN_LIBRARY_NAME}" wurde auf der Site "${SHAREPOINT_HOSTNAME}" nicht gefunden.`
    );
  }

  cachedDriveId = kundenDrive.id;
  return cachedDriveId;
}

/** Jedes Pfadsegment einzeln kodiert, Schrägstriche als Trenner erhalten. */
function encodeGraphPath(path: string): string {
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

/** Listet die direkten Kind-Elemente eines Ordners in "Kunden" (Pfad relativ zur Bibliothek). Leer, falls der Ordner nicht existiert. */
export async function listKundenOrdner(path: string): Promise<DriveItem[]> {
  const driveId = await resolveKundenDriveId();
  try {
    const res = await graphFetch(`/drives/${driveId}/root:/${encodeGraphPath(path)}:/children`);
    const body: { value: DriveItem[] } = await res.json();
    return body.value;
  } catch (error) {
    if (error instanceof SharePointError && error.category === "not_found") return [];
    throw error;
  }
}

/** Lädt den Inhalt einer Datei in "Kunden" anhand ihres Pfads als ArrayBuffer. */
export async function downloadKundenDatei(path: string): Promise<ArrayBuffer> {
  const driveId = await resolveKundenDriveId();
  const res = await graphFetch(`/drives/${driveId}/root:/${encodeGraphPath(path)}:/content`);
  return res.arrayBuffer();
}

/** Legt/überschreibt eine Datei in "Kunden" anhand ihres Pfads und liefert die neue Item-ID zurück. */
export async function uploadKundenDatei(path: string, content: ArrayBuffer): Promise<string> {
  const driveId = await resolveKundenDriveId();
  const res = await graphFetch(`/drives/${driveId}/root:/${encodeGraphPath(path)}:/content`, {
    method: "PUT",
    headers: { "Content-Type": "application/octet-stream" },
    body: content,
  });
  const item: { id: string } = await res.json();
  return item.id;
}

/** Wandelt ein bereits in "Kunden" abgelegtes Element (per Item-ID) über die eingebaute Microsoft-Graph-Konvertierung in ein PDF um. */
export async function konvertiereZuPdf(itemId: string): Promise<ArrayBuffer> {
  const driveId = await resolveKundenDriveId();
  const res = await graphFetch(`/drives/${driveId}/items/${itemId}/content?format=pdf`);
  return res.arrayBuffer();
}

/** Löscht ein Element (z.B. die temporäre Arbeitskopie) anhand seiner Item-ID. */
export async function loescheKundenDatei(itemId: string): Promise<void> {
  const driveId = await resolveKundenDriveId();
  await graphFetch(`/drives/${driveId}/items/${itemId}`, { method: "DELETE" });
}

/** Findet die zuletzt geänderte Excel-Datei in einem Ordner, oder `null`, falls keine existiert. */
export async function findeNeuesteExcelDatei(path: string): Promise<DriveItem | null> {
  const children = await listKundenOrdner(path);
  const excelDateien = children.filter((c) => !c.folder && c.name.toLowerCase().endsWith(".xlsx"));
  if (excelDateien.length === 0) return null;

  return excelDateien.reduce((newest, current) =>
    current.lastModifiedDateTime > newest.lastModifiedDateTime ? current : newest
  );
}
