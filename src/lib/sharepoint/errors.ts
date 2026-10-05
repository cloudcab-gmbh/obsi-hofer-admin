export type SharePointErrorCategory = "not_found" | "permission_denied" | "unavailable" | "unknown";

const FRIENDLY_MESSAGE: Record<SharePointErrorCategory, string> = {
  not_found: "Die angeforderte Datei/der angeforderte Ordner wurde in SharePoint nicht gefunden.",
  permission_denied: "Keine ausreichende Berechtigung für diesen SharePoint-Zugriff.",
  unavailable: "SharePoint/Microsoft Graph ist aktuell nicht erreichbar. Bitte später erneut versuchen.",
  unknown: "Unbekannter Fehler bei der Kommunikation mit SharePoint.",
};

export class SharePointError extends Error {
  readonly category: SharePointErrorCategory;

  constructor(category: SharePointErrorCategory, message: string) {
    super(message);
    this.name = "SharePointError";
    this.category = category;
  }
}

function categoryForStatus(status: number): SharePointErrorCategory {
  if (status === 404) return "not_found";
  if (status === 401 || status === 403) return "permission_denied";
  if (status === 429 || status >= 500) return "unavailable";
  return "unknown";
}

export async function sharePointErrorFromResponse(res: Response): Promise<SharePointError> {
  const category = categoryForStatus(res.status);
  let detail: string | undefined;
  try {
    const body: { error?: { message?: string } } = await res.json();
    detail = body?.error?.message;
  } catch {
    // Antwort war kein (gültiges) JSON — kein zusätzliches Detail verfügbar.
  }
  const message = detail ? `${FRIENDLY_MESSAGE[category]} (${detail})` : FRIENDLY_MESSAGE[category];
  return new SharePointError(category, message);
}

export function sharePointErrorFromNetworkFailure(): SharePointError {
  return new SharePointError(
    "unavailable",
    "SharePoint/Microsoft Graph ist aktuell nicht erreichbar (Netzwerkfehler oder Zeitüberschreitung)."
  );
}
