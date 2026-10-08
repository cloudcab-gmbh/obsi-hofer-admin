import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { auth } from "@/auth";
import { signOutEverywhere } from "@/lib/auth/sign-out";
import { ladeArbeitskontext, kontextBezeichnung } from "@/lib/arbeitskontext";
import { MobileNav, type NavLink } from "@/components/mobile-nav";

// "Sync-Freigabe" ist nur für Freigeber sichtbar (Freigeber ist eine
// Erweiterung von Bearbeiter, siehe PROJ-1 Product Decisions).
export async function AppHeader() {
  const session = await auth();
  const istFreigeber = session?.user?.roles?.includes("freigeber") ?? false;
  // PROJ-10: "Firma · Standort" (bei nur einem Standort nur die Firma).
  const kontext = await ladeArbeitskontext().catch(() => null);
  const bezeichnung = kontext ? kontextBezeichnung(kontext) : null;

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
      <nav className="hidden min-w-0 items-center gap-4 text-sm lg:flex">
        {/* Nutzerwunsch 2026-10-08: aktuelle Firma vor den Menüpunkten, fett. */}
        <Link
          href="/start"
          className="max-w-72 truncate font-semibold text-foreground hover:underline underline-offset-2"
          title={bezeichnung ?? undefined}
        >
          Firma: {bezeichnung ?? "keine ausgewählt"}
        </Link>
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="shrink-0 text-muted-foreground hover:text-foreground">
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="flex shrink-0 items-center gap-3">
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
          <MobileNav links={links} firmaName={bezeichnung} userName={session?.user?.name ?? null} />
        </div>
      </div>
    </header>
  );
}
