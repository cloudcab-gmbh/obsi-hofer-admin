// TEMPORÄR — Platzhalter für die Vorschau der Frontend-Komponenten, bevor
// Auth.js/Microsoft Entra ID angebunden ist (siehe PROJ-1 /backend). Liefert
// eine feste Fake-Session, damit Login/Kein-Zugang/geschützter Bereich schon
// jetzt visuell durchgespielt werden können. Wird komplett ersetzt, sobald
// echte Sessions aus dem Entra-ID-Token gelesen werden.

export type Rolle = "bearbeiter" | "freigeber";

export type MockSession = {
  name: string;
  email: string;
  rollen: Rolle[];
} | null;

export function getMockSession(): MockSession {
  return {
    name: "Vorname Nachname",
    email: "beispiel@obsi-hofer.ch",
    rollen: ["freigeber"],
  };
}

export function hatRolle(session: MockSession, rolle: Rolle): boolean {
  return session?.rollen.includes(rolle) ?? false;
}
