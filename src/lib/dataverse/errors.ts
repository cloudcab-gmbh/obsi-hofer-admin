export type DataverseErrorCategory =
  | "not_found"
  | "permission_denied"
  | "validation_error"
  | "unavailable"
  | "unknown";

const FRIENDLY_MESSAGE: Record<DataverseErrorCategory, string> = {
  not_found: "Der angeforderte Datensatz wurde in Dataverse nicht gefunden.",
  permission_denied: "Keine ausreichende Berechtigung für diesen Dataverse-Zugriff.",
  validation_error: "Die übermittelten Daten wurden von Dataverse abgelehnt (ungültige Eingabe).",
  unavailable: "Dataverse ist aktuell nicht erreichbar. Bitte später erneut versuchen.",
  unknown: "Unbekannter Fehler bei der Kommunikation mit Dataverse.",
};

export class DataverseError extends Error {
  readonly category: DataverseErrorCategory;

  constructor(category: DataverseErrorCategory, message: string) {
    super(message);
    this.name = "DataverseError";
    this.category = category;
  }
}

function categoryForStatus(status: number): DataverseErrorCategory {
  if (status === 404) return "not_found";
  if (status === 401 || status === 403) return "permission_denied";
  if (status === 400) return "validation_error";
  if (status === 429 || status >= 500) return "unavailable";
  return "unknown";
}

export async function dataverseErrorFromResponse(res: Response): Promise<DataverseError> {
  const category = categoryForStatus(res.status);
  let detail: string | undefined;
  try {
    const body: { error?: { message?: string } } = await res.json();
    detail = body?.error?.message;
  } catch {
    // Antwort war kein (gültiges) JSON — kein zusätzliches Detail verfügbar.
  }
  const message = detail ? `${FRIENDLY_MESSAGE[category]} (${detail})` : FRIENDLY_MESSAGE[category];
  return new DataverseError(category, message);
}

export function dataverseErrorFromNetworkFailure(): DataverseError {
  return new DataverseError(
    "unavailable",
    "Dataverse ist aktuell nicht erreichbar (Netzwerkfehler oder Zeitüberschreitung)."
  );
}
