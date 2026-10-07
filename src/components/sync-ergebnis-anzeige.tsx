import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SyncErgebnis, SyncStatus } from "@/lib/kundenportal-sync";
import { cn } from "@/lib/utils";

export const STATUS_FARBE: Record<SyncStatus, string> = {
  erfolg: "text-status-success",
  teilweise: "text-status-warning",
  fehler: "text-destructive",
  unbekannt: "text-status-warning",
};

// Gemeinsame Darstellung eines Sync-Ergebnisses: direkt nach dem Sync
// (PROJ-5) und aufgeklappt im Verlauf (PROJ-6) — die Spec verlangt dieselbe
// Darstellung an beiden Stellen.
export function SyncErgebnisAnzeige({ ergebnis }: { ergebnis: SyncErgebnis }) {
  return (
    <div className="space-y-3">
      <p className={cn("text-sm font-medium", STATUS_FARBE[ergebnis.status])}>{ergebnis.meldung}</p>
      {ergebnis.probleme.length > 0 && (
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {ergebnis.probleme.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      )}
      {ergebnis.bereiche.length > 0 && (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bereich</TableHead>
                <TableHead className="text-right">Geladen</TableHead>
                <TableHead className="text-right">Neu</TableHead>
                {/* Das Kundenportal zählt jeden geschriebenen Datensatz, auch unveränderte — daher "Abgeglichen". */}
                <TableHead className="text-right">Abgeglichen</TableHead>
                <TableHead className="text-right">Gelöscht</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ergebnis.bereiche.map((b) => (
                <TableRow key={b.bereich}>
                  <TableCell>{b.bereich}</TableCell>
                  <TableCell className="text-right">{b.geladen}</TableCell>
                  <TableCell className="text-right">{b.neu}</TableCell>
                  <TableCell className="text-right">{b.aktualisiert}</TableCell>
                  <TableCell className="text-right">{b.geloescht}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
