"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { signOutEverywhere } from "@/lib/auth/sign-out";

export interface NavLink {
  href: string;
  label: string;
}

// Mobiles Menü (unterhalb von lg): Auf schmalen Bildschirmen passten Logo,
// Menüpunkte, Firma, Name und Abmelden nicht in die feste Header-Höhe — die
// umgebrochene Zeile überlappte den Seiteninhalt, und Firma/Firmenwechsel
// waren auf dem Handy gar nicht erreichbar.
export function MobileNav({
  links,
  firmaName,
  userName,
}: {
  links: NavLink[];
  firmaName: string | null;
  userName: string | null;
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button type="button" variant="ghost" size="icon" aria-label="Menü öffnen">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-72 flex-col gap-6">
        <SheetHeader>
          <SheetTitle>Menü</SheetTitle>
          {userName && <SheetDescription>{userName}</SheetDescription>}
        </SheetHeader>

        <nav className="flex flex-col gap-1">
          {links.map((link) => (
            <SheetClose asChild key={link.href}>
              <Link href={link.href} className="rounded-md px-2 py-2 text-sm hover:bg-muted">
                {link.label}
              </Link>
            </SheetClose>
          ))}
        </nav>

        <div className="border-t pt-4">
          <p className="px-2 text-xs text-muted-foreground">Firma</p>
          <SheetClose asChild>
            <Link href="/start" className="block rounded-md px-2 py-2 text-sm hover:bg-muted">
              {firmaName ?? "keine ausgewählt"} <span className="text-muted-foreground">· wechseln</span>
            </Link>
          </SheetClose>
        </div>

        <form action={signOutEverywhere} className="mt-auto">
          <Button type="submit" variant="outline" className="w-full">
            Abmelden
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
