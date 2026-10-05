import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getStatusBadgeVariant } from "@/lib/status-badge";
import { formatDatum } from "@/lib/format";
import type { Pruefbericht } from "@/lib/dataverse/pruefberichte";

export function PruefberichtTabelle({
  berichte,
  geraetName,
}: {
  berichte: Pruefbericht[];
  /** Wenn gesetzt, wird zusätzlich eine "Gerät"-Spalte angezeigt (für die firmenweite Übersicht). */
  geraetName?: (geraetId: string) => string;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {geraetName && <TableHead>Gerät</TableHead>}
          <TableHead>Datum</TableHead>
          <TableHead>Ergebnis</TableHead>
          <TableHead>Prüfer</TableHead>
          <TableHead>Bemerkungen</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {berichte.map((b) => (
          <TableRow key={b.id}>
            {geraetName && <TableCell>{geraetName(b.geraetId)}</TableCell>}
            <TableCell>
              <Link
                href={`/pruefberichte/${b.id}`}
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                {formatDatum(b.pruefdatum)}
              </Link>
            </TableCell>
            <TableCell>
              {b.ergebnis && <Badge variant={getStatusBadgeVariant(b.ergebnis)}>{b.ergebnis}</Badge>}
              {b.storniert && (
                <Badge variant="secondary" className="ml-2">
                  storniert
                </Badge>
              )}
              {!b.ergebnis && !b.storniert && "—"}
            </TableCell>
            <TableCell>{b.pruefer ?? "—"}</TableCell>
            <TableCell>{b.bemerkungen ?? "—"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
