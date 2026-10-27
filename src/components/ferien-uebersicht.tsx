import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { FerienJahr, FerienZeitraum } from "@/lib/zeiterfassung/ferien";
import { formatKalenderdatum } from "@/lib/zeiterfassung/datum";
import { formatFerientage } from "@/lib/zeiterfassung/format";
import { FerienErfassen } from "@/components/ferien-erfassen";
import { AbwesenheitLoeschen } from "@/components/abwesenheit-loeschen";
import { cn } from "@/lib/utils";

export interface FerienZeile {
  email: string;
  anzeige: string;
  ohneArbeitsmodell: boolean;
  stand: FerienJahr;
}

export function ferienHref(jahr: number, person?: string | null): string {
  const params = new URLSearchParams({ jahr: String(jahr) });
  if (person) params.set("person", person);
  return `/zeiterfassung/ferien?${params}`;
}

function tage(wert: number | null): string {
  return wert === null ? "—" : String(wert);
}

/** PROJ-15: Jahresübersicht aller Personen. */
export function FerienJahresuebersicht({
  jahr,
  zeilen,
  gewaehlt,
}: {
  jahr: number;
  zeilen: FerienZeile[];
  gewaehlt: string | null;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="text-base">Ferien {jahr}</CardTitle>
          <CardDescription>
            Anspruch × Pensum, am 1. Januar gutgeschrieben. Bezogen = bis heute, geplant = ab morgen.
          </CardDescription>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button asChild variant="outline" size="icon" aria-label="Vorjahr">
            <Link href={ferienHref(jahr - 1, gewaehlt)}>
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="icon" aria-label="Folgejahr">
            <Link href={ferienHref(jahr + 1, gewaehlt)}>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {zeilen.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Es gibt noch keine Personen in der Zeiterfassung.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Person</TableHead>
                  <TableHead className="text-right">Saldo Vorjahr</TableHead>
                  <TableHead className="text-right">Anspruch</TableHead>
                  <TableHead className="text-right">bezogen</TableHead>
                  <TableHead className="text-right">geplant</TableHead>
                  <TableHead className="text-right">Saldo Ende Jahr</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {zeilen.map((z) => (
                  <TableRow key={z.email} className={cn(z.email === gewaehlt && "bg-muted/50")}>
                    <TableCell>
                      <Link
                        href={ferienHref(jahr, z.email)}
                        className="font-medium text-primary underline-offset-2 hover:underline"
                      >
                        {z.anzeige}
                      </Link>
                      {z.ohneArbeitsmodell && (
                        <Badge variant="destructive" className="ml-2">
                          kein Arbeitsmodell
                        </Badge>
                      )}
                    </TableCell>
                    {z.stand.vorBeginn ? (
                      <TableCell colSpan={5} className="text-right text-muted-foreground">
                        kein Feriensaldo in diesem Jahr
                      </TableCell>
                    ) : (
                      <>
                        <TableCell className="text-right tabular-nums">{tage(z.stand.saldoVorjahr)}</TableCell>
                        <TableCell className="text-right tabular-nums">{tage(z.stand.anspruch)}</TableCell>
                        <TableCell className="text-right tabular-nums">{tage(z.stand.bezogen)}</TableCell>
                        <TableCell className="text-right tabular-nums">{tage(z.stand.geplant)}</TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-medium tabular-nums",
                            (z.stand.saldoEnde ?? 0) < 0 && "text-destructive"
                          )}
                        >
                          {tage(z.stand.saldoEnde)}
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** PROJ-15: Ferienzeiträume einer Person im Jahr, mit Erfassen und Löschen. */
export function FerienDerPerson({
  email,
  personName,
  jahr,
  heute,
  zeitraeume,
}: {
  email: string;
  personName: string;
  jahr: number;
  heute: string;
  zeitraeume: FerienZeitraum[];
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="text-base">
            {personName} · Ferien {jahr}
          </CardTitle>
          <CardDescription>Aufeinanderfolgende Ferientage sind zu Zeiträumen zusammengefasst.</CardDescription>
        </div>
        <FerienErfassen email={email} personName={personName} />
      </CardHeader>
      <CardContent>
        {zeitraeume.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Keine Ferien in diesem Jahr erfasst.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Zeitraum</TableHead>
                  <TableHead className="text-right">Ferientage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>
                    <span className="sr-only">Aktionen</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {zeitraeume.map((z) => {
                  const text =
                    z.von === z.bis ? formatKalenderdatum(z.von) : `${formatKalenderdatum(z.von)} – ${formatKalenderdatum(z.bis)}`;
                  return (
                    <TableRow key={z.eintragIds[0]}>
                      <TableCell className="whitespace-nowrap tabular-nums">{text}</TableCell>
                      <TableCell className="text-right tabular-nums">{z.ferientage}</TableCell>
                      <TableCell>
                        <Badge variant={z.von > heute ? "outline" : "secondary"} className="font-normal">
                          {z.von > heute ? "geplant" : z.bis > heute ? "laufend" : "bezogen"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <AbwesenheitLoeschen
                          eintragIds={z.eintragIds}
                          beschreibung={`Ferien ${text} (${formatFerientage(z.ferientage)})`}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
