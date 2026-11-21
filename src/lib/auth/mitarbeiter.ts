import type { Session } from "next-auth";
import { auth } from "@/auth";

// PROJ-20: Rolle „Mitarbeiter“ — sieht nur den eigenen Zeitnachweis. Die
// Person ergibt sich ausschliesslich aus der Anmeldung, nie aus der Anfrage.

export function istMitarbeiter(session: Session | null): boolean {
  return session?.user?.roles?.includes("mitarbeiter") ?? false;
}

/** E-Mail der angemeldeten Person (klein geschrieben), `null` ohne E-Mail im Konto. */
export function anmeldeEmail(session: Session | null): string | null {
  const email = session?.user?.email?.trim().toLowerCase();
  return email ? email : null;
}

/** Angemeldete Person mit Rolle Mitarbeiter, sonst `null`. */
export async function aktuellerMitarbeiter(): Promise<{ email: string | null; name: string } | null> {
  const session = await auth();
  if (!istMitarbeiter(session)) return null;
  return { email: anmeldeEmail(session), name: session?.user?.name ?? "" };
}
