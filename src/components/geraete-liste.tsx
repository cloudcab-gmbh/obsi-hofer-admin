"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getStatusBadgeVariant } from "@/lib/status-badge";
import { formatDatum, formatGeraeteAnzahl } from "@/lib/format";
import {
  matchesGeraeteFilter,
  sortiereGeraete,
  type Geraet,
  type GeraeteSortSpalte,
  type GeraeteSortierung,
  type Standort,
} from "@/lib/dataverse/geraete";
import { setGeraeteFilterState, type GeraeteFilterState } from "@/lib/geraete-filter-session";
import { generatePdfAction } from "@/app/(protected)/geraete/actions";

const ALLE = "__alle__";

function SortierbarerKopf({
  spalte,
  label,
  sortierung,
  onSortieren,
}: {
  spalte: GeraeteSortSpalte;
  label: string;
  sortierung: GeraeteSortierung | null;
  onSortieren: (spalte: GeraeteSortSpalte) => void;
}) {
  const aktiv = sortierung?.spalte === spalte ? sortierung.richtung : null;
  const Icon = aktiv === "asc" ? ArrowUp : aktiv === "desc" ? ArrowDown : ArrowUpDown;
  return (
    <TableHead aria-sort={aktiv === "asc" ? "ascending" : aktiv === "desc" ? "descending" : "none"}>
      <button
        type="button"
        onClick={() => onSortieren(spalte)}
        className="-mx-1 inline-flex items-center gap-1 rounded px-1 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {label}
        <Icon className={aktiv ? "size-3.5" : "size-3.5 opacity-40"} aria-hidden />
      </button>
    </TableHead>
  );
}

export function GeraeteListe({
  geraete,
  standorte,
  initialFilter,
  pruefberichtBemerkungen,
}: {
  geraete: Geraet[];
  standorte: Standort[];
  initialFilter: GeraeteFilterState;
  /** Bemerkung des jeweils aktuellsten aktiven Prüfberichts, pro Gerät-ID. */
  pruefberichtBemerkungen: Map<string, string | null>;
}) {
  const [suche, setSuche] = useState(initialFilter.suche);
  const [lagerort, setLagerort] = useState(initialFilter.lagerort || ALLE);
  const [standortId, setStandortId] = useState(initialFilter.standortId || ALLE);
  const [letztePruefungTage, setLetztePruefungTage] = useState(initialFilter.letztePruefungTage);
  const [sortierung, setSortierung] = useState<GeraeteSortierung | null>(initialFilter.sortierung);
  const [pdfPending, startPdfTransition] = useTransition();
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Der Filter gilt session-weit (siehe geraete-filter-session.ts), damit er
  // beim Wechsel zu /pruefberichte erhalten bleibt — verzögert geschrieben,
  // damit nicht bei jedem Tastendruck in der Suche eine eigene Anfrage läuft.
  useEffect(() => {
    const timeout = setTimeout(() => {
      void setGeraeteFilterState({
        suche,
        lagerort: lagerort === ALLE ? "" : lagerort,
        standortId: standortId === ALLE ? "" : standortId,
        letztePruefungTage,
        sortierung,
      });
    }, 400);
    return () => clearTimeout(timeout);
  }, [suche, lagerort, standortId, letztePruefungTage, sortierung]);

  const standortName = useMemo(() => {
    const map = new Map(standorte.map((s) => [s.id, s.name]));
    return (id: string | null) => (id ? (map.get(id) ?? null) : null);
  }, [standorte]);

  const lagerortOptionen = useMemo(() => {
    const set = new Set(geraete.map((g) => g.lagerort).filter((v): v is string => !!v));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [geraete]);

  // Gefiltert UND sortiert — die Reihenfolge bestimmt auch die Reihenfolge im PDF-Export.
  const gefiltert = useMemo(() => {
    const treffer = geraete.filter((g) =>
      matchesGeraeteFilter(g, {
        suche,
        lagerort: lagerort === ALLE ? "" : lagerort,
        standortId: standortId === ALLE ? "" : standortId,
        letztePruefungTage,
      })
    );
    if (!sortierung) return treffer;
    return sortiereGeraete(treffer, sortierung, {
      standortName,
      pbBemerkung: (id) => pruefberichtBemerkungen.get(id) ?? null,
    });
  }, [geraete, suche, lagerort, standortId, letztePruefungTage, sortierung, standortName, pruefberichtBemerkungen]);

  // Erster Klick auf eine Spalte sortiert aufsteigend, jeder weitere kehrt die Richtung um.
  function handleSortieren(spalte: GeraeteSortSpalte) {
    setSortierung((aktuell) =>
      aktuell?.spalte === spalte
        ? { spalte, richtung: aktuell.richtung === "asc" ? "desc" : "asc" }
        : { spalte, richtung: "asc" }
    );
  }
  const kopf = (spalte: GeraeteSortSpalte, label: string) => (
    <SortierbarerKopf spalte={spalte} label={label} sortierung={sortierung} onSortieren={handleSortieren} />
  );

  function handleGeneratePdf() {
    setPdfError(null);
    startPdfTransition(async () => {
      const result = await generatePdfAction(
        gefiltert.map((g) => g.id),
        lagerort === ALLE ? null : lagerort
      );
      if (!result.success) {
        setPdfError(result.message);
        return;
      }
      const bytes = Uint8Array.from(atob(result.pdfBase64), (c) => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = result.dateiname;
      link.click();
      URL.revokeObjectURL(url);
    });
  }

  if (geraete.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Keine Geräte für diese Firma gefunden.
        </CardContent>
      </Card>
    );
  }

  const zeigeStandortSpalte = standorte.length > 1;

  return (
    <div>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end">
        <Input
          placeholder="Suche nach Name, Barcode, Seriennummer, Kunden-ID..."
          value={suche}
          onChange={(e) => setSuche(e.target.value)}
          className="sm:max-w-xs"
        />
        {zeigeStandortSpalte && (
          <Select value={standortId} onValueChange={setStandortId}>
            <SelectTrigger className="sm:w-48">
              <SelectValue placeholder="Standort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALLE}>Alle Standorte</SelectItem>
              {standorte.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {lagerortOptionen.length > 0 && (
          <Select value={lagerort} onValueChange={setLagerort}>
            <SelectTrigger className="sm:w-48">
              <SelectValue placeholder="Lagerort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALLE}>Alle Lagerorte</SelectItem>
              {lagerortOptionen.map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="flex items-center gap-2">
          <Label htmlFor="letzte-pruefung-tage" className="whitespace-nowrap text-sm text-muted-foreground">
            Letzte Prüfung (Tage)
          </Label>
          <Input
            id="letzte-pruefung-tage"
            type="number"
            min={1}
            placeholder="z.B. 7"
            value={letztePruefungTage}
            onChange={(e) => setLetztePruefungTage(e.target.value)}
            className="w-24"
          />
        </div>
        {/* Anzahl der gefilterten Geräte = Geräte, die ins PDF kommen (Nutzerwunsch 2026-10-08). */}
        <div className="flex flex-col gap-1">
          <span className="text-center text-xs font-semibold" aria-live="polite">
            {formatGeraeteAnzahl(gefiltert.length, geraete.length)}
          </span>
          <Button
            type="button"
            variant="outline"
            onClick={handleGeneratePdf}
            disabled={pdfPending || gefiltert.length === 0}
          >
            {pdfPending ? "PDF wird generiert..." : "PDF generieren"}
          </Button>
        </div>
      </div>
      {pdfError && <p className="mb-4 text-sm text-destructive">{pdfError}</p>}

      {gefiltert.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">Keine Geräte gefunden.</CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  {kopf("name", "Gerät")}
                  {kopf("kundenId", "Kunden-ID")}
                  {kopf("barcode", "Barcode")}
                  {zeigeStandortSpalte && kopf("standort", "Standort")}
                  {kopf("lagerort", "Lagerort")}
                  {kopf("letztePruefung", "Letzte Prüfung")}
                  {kopf("status", "Status")}
                  {kopf("pbBemerkung", "PB_Bemerkung")}
                </TableRow>
              </TableHeader>
              <TableBody>
                {gefiltert.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell>
                      <Link
                        href={`/geraete/${g.id}`}
                        className="font-medium text-primary underline-offset-2 hover:underline"
                      >
                        {g.name ?? "(ohne Name)"}
                      </Link>
                    </TableCell>
                    <TableCell>{g.kundenId ?? "—"}</TableCell>
                    <TableCell>{g.barcode ?? "—"}</TableCell>
                    {zeigeStandortSpalte && <TableCell>{standortName(g.standortId) ?? "—"}</TableCell>}
                    <TableCell>{g.lagerort ?? "—"}</TableCell>
                    <TableCell>{formatDatum(g.letztePruefung)}</TableCell>
                    <TableCell>
                      {g.status ? <Badge variant={getStatusBadgeVariant(g.status)}>{g.status}</Badge> : "—"}
                    </TableCell>
                    <TableCell>{pruefberichtBemerkungen.get(g.id) ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
