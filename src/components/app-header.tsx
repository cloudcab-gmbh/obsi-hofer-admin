import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { getMockSession, hatRolle } from "@/lib/auth/mock-session";

// TEMPORÄR: nutzt getMockSession() statt einer echten Entra-ID-Session,
// siehe PROJ-1 Tech Design. "Sync-Freigabe" ist nur für Freigeber sichtbar
// (Freigeber ist eine Erweiterung von Bearbeiter, siehe Product Decisions).
export function AppHeader() {
  const session = getMockSession();
  const istFreigeber = hatRolle(session, "freigeber");

  return (
    <header className="flex h-14 flex-wrap items-center justify-between gap-3 border-b bg-background px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <Image src="/logo_small.png" alt="OBSI Hofer GmbH" width={386} height={500} className="h-9 w-auto shrink-0" priority />
        <span className="text-lg font-semibold">Admin</span>
      </div>
      <nav className="flex items-center gap-4 text-sm">
        <Link href="/geraete" className="text-muted-foreground hover:text-foreground">
          Geräte
        </Link>
        <Link href="/pruefberichte" className="text-muted-foreground hover:text-foreground">
          Prüfberichte
        </Link>
        {istFreigeber && (
          <Link href="/sync-freigabe" className="text-muted-foreground hover:text-foreground">
            Sync-Freigabe
          </Link>
        )}
      </nav>
      <div className="flex items-center gap-3">
        {session && (
          <span className="hidden text-sm text-muted-foreground sm:inline">{session.name}</span>
        )}
        <Button asChild variant="outline" size="sm">
          <Link href="/login">Abmelden</Link>
        </Button>
        <ThemeToggle />
      </div>
    </header>
  );
}
