"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getStatusBadgeVariant } from "@/lib/status-badge";
import { formatDatum } from "@/lib/format";
import { matchesGeraeteFilter, type Geraet, type Standort } from "@/lib/dataverse/geraete";
import { setGeraeteFilterState, type GeraeteFilterState } from "@/lib/geraete-filter-session";

const ALLE = "__alle__";

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
      });
    }, 400);
    return () => clearTimeout(timeout);
  }, [suche, lagerort, standortId, letztePruefungTage]);

  const standortName = useMemo(() => {
    const map = new Map(standorte.map((s) => [s.id, s.name]));
    return (id: string | null) => (id ? (map.get(id) ?? "—") : "—");
  }, [standorte]);

  const lagerortOptionen = useMemo(() => {
    const set = new Set(geraete.map((g) => g.lagerort).filter((v): v is string => !!v));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [geraete]);

  const gefiltert = useMemo(() => {
    return geraete.filter((g) =>
      matchesGeraeteFilter(g, {
        suche,
        lagerort: lagerort === ALLE ? "" : lagerort,
        standortId: standortId === ALLE ? "" : standortId,
        letztePruefungTage,
      })
    );
  }, [geraete, suche, lagerort, standortId, letztePruefungTage]);

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
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
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
      </div>

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
                  <TableHead>Gerät</TableHead>
                  <TableHead>Kunden-ID</TableHead>
                  <TableHead>Barcode</TableHead>
                  {zeigeStandortSpalte && <TableHead>Standort</TableHead>}
                  <TableHead>Lagerort</TableHead>
                  <TableHead>Letzte Prüfung</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Bemerkung</TableHead>
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
                    {zeigeStandortSpalte && <TableCell>{standortName(g.standortId)}</TableCell>}
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
