"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const SEITEN = [
  // PROJ-17: Übersicht ist die Startseite der Zeiterfassung.
  { href: "/zeiterfassung", label: "Übersicht" },
  { href: "/zeiterfassung/zeitnachweis", label: "Zeitnachweis" },
  { href: "/zeiterfassung/personen", label: "Personen" },
  { href: "/zeiterfassung/ferien", label: "Ferien" },
  { href: "/zeiterfassung/feiertage", label: "Feiertage" },
];

/** Unterseiten der Zeiterfassung (PROJ-13/14/15/17/18). */
export function ZeiterfassungNav() {
  const pfad = usePathname();
  return (
    <nav aria-label="Zeiterfassung" className="flex gap-1 border-b">
      {SEITEN.map((seite) => {
        const aktiv = seite.href === "/zeiterfassung" ? pfad === seite.href : pfad.startsWith(seite.href);
        return (
          <Link
            key={seite.href}
            href={seite.href}
            aria-current={aktiv ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm",
              aktiv
                ? "border-primary font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {seite.label}
          </Link>
        );
      })}
    </nav>
  );
}
