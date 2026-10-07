import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { auth } from "@/auth";
import { signOutEverywhere } from "@/lib/auth/sign-out";
import { getCurrentFirmaId } from "@/lib/firma-session";
import { getFirma } from "@/lib/dataverse/geraete";
import { MobileNav, type NavLink } from "@/components/mobile-nav";

// "Sync-Freigabe" ist nur für Freigeber sichtbar (Freigeber ist eine
// Erweiterung von Bearbeiter, siehe PROJ-1 Product Decisions).
export async function AppHeader() {
  const session = await auth();
  const istFreigeber = session?.user?.roles?.includes("freigeber") ?? false;
  const currentFirmaId = await getCurrentFirmaId();
  const currentFirma = currentFirmaId ? await getFirma(currentFirmaId).catch(() => null) : null;

  const links: NavLink[] = [
    { href: "/geraete", label: "Geräte" },
    { href: "/pruefberichte", label: "Prüfberichte" },
    ...(istFreigeber ? [{ href: "/sync-freigabe", label: "Freigabe" }] : []),
  ];

  // Unterhalb von lg: nur Logo, Dark-Mode-Schalter und Menü-Button (MobileNav);
  // ab lg die bisherige einzeilige Darstellung. Kein flex-wrap mehr — das liess
  // umgebrochene Zeilen aus der festen Höhe h-14 in den Seiteninhalt ragen.
  return (
    <header className="flex h-14 items-center justify-between gap-3 border-b bg-background px-4 sm:px-6">
      <div className="flex shrink-0 items-center gap-3">
        <Image src="/logo_small.png" alt="OBSI Hofer GmbH" width={386} height={500} className="h-9 w-auto shrink-0" priority />
        <span className="text-lg font-semibold">Admin</span>
      </div>
      <nav className="hidden items-center gap-4 text-sm lg:flex">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="text-muted-foreground hover:text-foreground">
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="flex min-w-0 items-center gap-3">
        <Link
          href="/start"
          className="hidden max-w-56 truncate text-sm text-muted-foreground hover:text-foreground lg:inline"
          title={currentFirma?.name ?? undefined}
        >
          Firma: {currentFirma?.name ?? "keine ausgewählt"}
        </Link>
        {session?.user?.name && (
          <span className="hidden text-sm text-muted-foreground xl:inline">{session.user.name}</span>
        )}
        <form action={signOutEverywhere} className="hidden lg:block">
          <Button type="submit" variant="outline" size="sm">
            Abmelden
          </Button>
        </form>
        <ThemeToggle />
        <div className="lg:hidden">
          <MobileNav links={links} firmaName={currentFirma?.name ?? null} userName={session?.user?.name ?? null} />
        </div>
      </div>
    </header>
  );
}
