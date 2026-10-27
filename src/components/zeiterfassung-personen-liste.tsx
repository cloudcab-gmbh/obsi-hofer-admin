"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { PersonUebersicht } from "@/lib/zeiterfassung/personen-uebersicht";
import { formatKalenderdatum } from "@/lib/zeiterfassung/datum";
import { formatArbeitstage, formatPensum, formatStunden } from "@/lib/zeiterfassung/soll";
import { personHref } from "@/lib/zeiterfassung/links";

export function ZeiterfassungPersonenListe({ personen }: { personen: PersonUebersicht[] }) {
  const [nurOhneModell, setNurOhneModell] = useState(false);
  const [ausgeblendeteAnzeigen, setAusgeblendeteAnzeigen] = useState(false);

  const sichtbare = personen.filter((p) => ausgeblendeteAnzeigen || !p.nichtAuswerten);
  const angezeigt = sichtbare.filter((p) => !nurOhneModell || p.version === null);
  // Ausgeblendete zählen nicht als "ohne Arbeitsmodell" (Acceptance Criteria).
  const ohneModell = personen.filter((p) => !p.nichtAuswerten && p.version === null).length;
  const ausgeblendet = personen.filter((p) => p.nichtAuswerten).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Personen</CardTitle>
        <CardDescription>
          Alle Personen aus der Zeiterfassung. Das Soll pro Arbeitstag ergibt sich aus 40 h × Pensum ÷ Anzahl
          Arbeitstage.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {personen.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Es gibt noch keine Zeiteinträge — sobald jemand stempelt, erscheint die Person hier.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="nur-ohne-modell"
                  checked={nurOhneModell}
                  onCheckedChange={(wert) => setNurOhneModell(wert === true)}
                />
                <Label htmlFor="nur-ohne-modell" className="font-normal">
                  nur ohne Arbeitsmodell ({ohneModell})
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="ausgeblendete-anzeigen"
                  checked={ausgeblendeteAnzeigen}
                  onCheckedChange={(wert) => setAusgeblendeteAnzeigen(wert === true)}
                />
                <Label htmlFor="ausgeblendete-anzeigen" className="font-normal">
                  ausgeblendete anzeigen ({ausgeblendet})
                </Label>
              </div>
            </div>

            {ohneModell > 0 && !nurOhneModell && (
              <p className="text-sm text-destructive" role="status">
                {ohneModell === 1 ? "1 Person hat" : `${ohneModell} Personen haben`} noch kein Arbeitsmodell.
              </p>
            )}

            {angezeigt.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Keine Personen für diese Auswahl.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Person</TableHead>
                      <TableHead>Arbeitsmodell</TableHead>
                      <TableHead className="text-right">Soll pro Arbeitstag</TableHead>
                      <TableHead>Gleitzeit-Startsaldo</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {angezeigt.map((p) => (
                      <TableRow key={p.email}>
                        <TableCell>
                          <Link
                            href={personHref(p.email)}
                            className="font-medium text-primary underline-offset-2 hover:underline"
                          >
                            {p.anzeige}
                          </Link>
                          {p.hatName && <div className="text-xs text-muted-foreground">{p.email}</div>}
                        </TableCell>
                        <TableCell>
                          {p.version ? (
                            <>
                              {formatPensum(p.version.pensum)} · {formatArbeitstage(p.version.arbeitstage)}
                              {p.version.kuenftig && (
                                <div className="text-xs text-muted-foreground">
                                  ab {formatKalenderdatum(p.version.gueltigAb)}
                                </div>
                              )}
                            </>
                          ) : (
                            <Badge variant="destructive">kein Arbeitsmodell</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {p.version ? formatStunden(p.version.sollProArbeitstag) : "—"}
                        </TableCell>
                        <TableCell>
                          {p.startsaldo !== null ? (
                            <span className="tabular-nums">
                              {formatStunden(p.startsaldo)}{" "}
                              <span className="text-muted-foreground">per {formatKalenderdatum(p.stichtag)}</span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground">kein Startsaldo</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {p.ausgetreten && (
                              <Badge variant="secondary">ausgetreten {formatKalenderdatum(p.austrittAm)}</Badge>
                            )}
                            {/* QA BUG-3: künftiger Austritt schon vorher sichtbar. */}
                            {!p.ausgetreten && p.austrittAm && (
                              <Badge variant="outline">Austritt {formatKalenderdatum(p.austrittAm)}</Badge>
                            )}
                            {p.nichtAuswerten && <Badge variant="outline">nicht auswerten</Badge>}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
