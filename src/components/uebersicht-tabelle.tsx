"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { UebersichtWerte } from "@/lib/zeiterfassung/uebersicht";
import { formatGleitzeitTage, formatMinuten, formatMinutenMitVorzeichen } from "@/lib/zeiterfassung/format";
import { zeitnachweisHref } from "@/lib/zeiterfassung/links";
import { cn } from "@/lib/utils";

export interface UebersichtZeile extends UebersichtWerte {
  email: string;
  anzeige: string;
}

type Spalte =
  | "anzeige"
  | "gleitzeitMinuten"
  | "veraenderungMinuten"
  | "istMinuten"
  | "sollMinuten"
  | "abweichungMinuten"
  | "krankheitJahr"
  | "kompGlzJahr"
  | "feriensaldo"
  | "ferienBezogen"
  | "ferienGeplant";

const sortierung = new Intl.Collator("de-CH", { sensitivity: "base" });

function vergleiche(a: UebersichtZeile, b: UebersichtZeile, spalte: Spalte): number {
  if (spalte === "anzeige") return sortierung.compare(a.anzeige, b.anzeige);
  const x = a[spalte];
  const y = b[spalte];
  // Fehlende Werte ("—") immer ans Ende.
  if (x === null) return y === null ? 0 : 1;
  if (y === null) return -1;
  return x - y;
}

function Kopf({
  spalte,
  aktiv,
  richtung,
  onSort,
  rechts = true,
  children,
}: {
  spalte: Spalte;
  aktiv: Spalte;
  richtung: 1 | -1;
  onSort: (s: Spalte) => void;
  rechts?: boolean;
  children: React.ReactNode;
}) {
  const Icon = aktiv !== spalte ? ArrowUpDown : richtung === 1 ? ArrowUp : ArrowDown;
  return (
    <TableHead
      className={cn("whitespace-nowrap", rechts && "text-right")}
      aria-sort={aktiv === spalte ? (richtung === 1 ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={() => onSort(spalte)}
        className={cn("inline-flex items-center gap-1 hover:text-foreground", rechts && "flex-row-reverse")}
      >
        {children}
        <Icon className={cn("h-3 w-3", aktiv !== spalte && "opacity-40")} aria-hidden />
      </button>
    </TableHead>
  );
}

function Wert({ warnung, children }: { warnung?: boolean; children: React.ReactNode }) {
  return <span className={cn(warnung && "font-semibold text-destructive")}>{children}</span>;
}

/** PROJ-17: sortierbare Tabelle aller Mitarbeitenden für einen Monat. */
export function UebersichtTabelle({ zeilen, monat, jahr }: { zeilen: UebersichtZeile[]; monat: string; jahr: number }) {
  const [spalte, setSpalte] = useState<Spalte>("anzeige");
  const [richtung, setRichtung] = useState<1 | -1>(1);

  function sortiere(neu: Spalte) {
    if (neu === spalte) setRichtung((r) => (r === 1 ? -1 : 1));
    else {
      setSpalte(neu);
      setRichtung(1);
    }
  }

  const sortiert = [...zeilen].sort((a, b) => {
    const ergebnis = vergleiche(a, b, spalte);
    // Fehlende Werte bleiben auch absteigend am Ende.
    const fehlt = spalte !== "anzeige" && (a[spalte] === null || b[spalte] === null);
    return fehlt ? ergebnis : ergebnis * richtung;
  });
  const kopf = { aktiv: spalte, richtung, onSort: sortiere };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <Kopf spalte="anzeige" rechts={false} {...kopf}>
            Person
          </Kopf>
          <Kopf spalte="gleitzeitMinuten" {...kopf}>
            Gleitzeit
          </Kopf>
          <Kopf spalte="veraenderungMinuten" {...kopf}>
            Δ Monat
          </Kopf>
          <Kopf spalte="istMinuten" {...kopf}>
            Ist
          </Kopf>
          <Kopf spalte="sollMinuten" {...kopf}>
            Soll
          </Kopf>
          <Kopf spalte="abweichungMinuten" {...kopf}>
            Abw.
          </Kopf>
          <Kopf spalte="krankheitJahr" {...kopf}>
            Krank M/J
          </Kopf>
          <Kopf spalte="kompGlzJahr" {...kopf}>
            Komp. M/J
          </Kopf>
          <Kopf spalte="feriensaldo" {...kopf}>
            Feriensaldo
          </Kopf>
          <Kopf spalte="ferienBezogen" {...kopf}>
            {`Ferien bez. ${jahr}`}
          </Kopf>
          <Kopf spalte="ferienGeplant" {...kopf}>
            geplant
          </Kopf>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortiert.map((z) => (
          <TableRow key={z.email}>
            <TableCell className="whitespace-nowrap">
              <Link href={zeitnachweisHref(z.email, monat)} className="font-medium text-primary underline-offset-2 hover:underline">
                {z.anzeige}
              </Link>
              {z.ausgetreten && (
                <Badge variant="secondary" className="ml-2 font-normal">
                  ausgetreten
                </Badge>
              )}
              {z.warnungen.keinArbeitsmodell && (
                <Badge variant="destructive" className="ml-2 font-normal">
                  kein Arbeitsmodell
                </Badge>
              )}
              {z.warnungen.offeneEintraege && (
                <Badge variant="outline" className="ml-2 border-destructive font-normal text-destructive">
                  {z.offeneTage} offen
                </Badge>
              )}
            </TableCell>
            <TableCell className="whitespace-nowrap text-right tabular-nums">
              {z.gleitzeitMinuten === null ? (
                "—"
              ) : (
                <Wert warnung={z.warnungen.gleitzeitAusserhalb}>
                  {formatMinutenMitVorzeichen(z.gleitzeitMinuten)}
                  <div className="text-xs font-normal text-muted-foreground">{formatGleitzeitTage(z.gleitzeitMinuten)}</div>
                </Wert>
              )}
            </TableCell>
            <TableCell className="whitespace-nowrap text-right tabular-nums">
              {z.veraenderungMinuten === null ? "—" : formatMinutenMitVorzeichen(z.veraenderungMinuten)}
            </TableCell>
            <TableCell className="whitespace-nowrap text-right tabular-nums">{formatMinuten(z.istMinuten)}</TableCell>
            <TableCell className="whitespace-nowrap text-right tabular-nums">{formatMinuten(z.sollMinuten)}</TableCell>
            <TableCell className="whitespace-nowrap text-right tabular-nums">
              {formatMinutenMitVorzeichen(z.abweichungMinuten)}
            </TableCell>
            <TableCell className="whitespace-nowrap text-right tabular-nums">
              {z.krankheitMonat} / {z.krankheitJahr}
            </TableCell>
            <TableCell className="whitespace-nowrap text-right tabular-nums">
              {z.kompGlzMonat} / {z.kompGlzJahr}
            </TableCell>
            <TableCell className="whitespace-nowrap text-right tabular-nums">
              {z.feriensaldo === null ? "—" : <Wert warnung={z.warnungen.ferienNegativ}>{z.feriensaldo}</Wert>}
            </TableCell>
            <TableCell className="whitespace-nowrap text-right tabular-nums">{z.ferienBezogen}</TableCell>
            <TableCell className="whitespace-nowrap text-right tabular-nums">{z.ferienGeplant}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
