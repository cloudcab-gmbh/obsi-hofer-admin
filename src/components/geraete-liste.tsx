"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getStatusBadgeVariant } from "@/lib/status-badge";
import type { Geraet, Standort } from "@/lib/dataverse/geraete";

const ALLE = "__alle__";

export function GeraeteListe({ geraete, standorte }: { geraete: Geraet[]; standorte: Standort[] }) {
  const [suche, setSuche] = useState("");
  const [lagerort, setLagerort] = useState(ALLE);
  const [standortId, setStandortId] = useState(ALLE);

  const standortName = useMemo(() => {
    const map = new Map(standorte.map((s) => [s.id, s.name]));
    return (id: string | null) => (id ? (map.get(id) ?? "—") : "—");
  }, [standorte]);

  const lagerortOptionen = useMemo(() => {
    const set = new Set(geraete.map((g) => g.lagerort).filter((v): v is string => !!v));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [geraete]);

  const gefiltert = useMemo(() => {
    const suchbegriff = suche.trim().toLowerCase();
    return geraete.filter((g) => {
      if (standortId !== ALLE && g.standortId !== standortId) return false;
      if (lagerort !== ALLE && g.lagerort !== lagerort) return false;
      if (!suchbegriff) return true;
      return [g.name, g.barcode, g.serienummer, g.kundenId].some((v) => v?.toLowerCase().includes(suchbegriff));
    });
  }, [geraete, suche, lagerort, standortId]);

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
                  <TableHead>Status</TableHead>
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
                    <TableCell>
                      {g.status ? <Badge variant={getStatusBadgeVariant(g.status)}>{g.status}</Badge> : "—"}
                    </TableCell>
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
