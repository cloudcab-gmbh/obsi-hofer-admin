import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { auth } from "@/auth";
import { signOutEverywhere } from "@/lib/auth/sign-out";
import { getCurrentFirmaId } from "@/lib/firma-session";
import { getFirma } from "@/lib/dataverse/geraete";

// "Sync-Freigabe" ist nur für Freigeber sichtbar (Freigeber ist eine
// Erweiterung von Bearbeiter, siehe PROJ-1 Product Decisions).
export async function AppHeader() {
  const session = await auth();
  const istFreigeber = session?.user?.roles?.includes("freigeber") ?? false;
  const currentFirmaId = await getCurrentFirmaId();
  const currentFirma = currentFirmaId ? await getFirma(currentFirmaId).catch(() => null) : null;

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
            Freigabe
          </Link>
        )}
      </nav>
      <div className="flex items-center gap-3">
        <Link href="/start" className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline">
          Firma: {currentFirma?.name ?? "keine ausgewählt"}
        </Link>
        {session?.user?.name && (
          <span className="hidden text-sm text-muted-foreground sm:inline">{session.user.name}</span>
        )}
        <form action={signOutEverywhere}>
          <Button type="submit" variant="outline" size="sm">
            Abmelden
          </Button>
        </form>
        <ThemeToggle />
      </div>
    </header>
  );
}
