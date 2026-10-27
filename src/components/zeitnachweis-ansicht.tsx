import Link from "next/link";
import { AlertTriangle, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Tageszeile, Zeitnachweis } from "@/lib/zeiterfassung/zeitnachweis";
import { formatKalenderdatum, formatMonat, wochentagName } from "@/lib/zeiterfassung/datum";
import { formatGleitzeitTage, formatMinuten, formatMinutenMitVorzeichen } from "@/lib/zeiterfassung/format";
import { cn } from "@/lib/utils";
import { GehenNachtragen } from "@/components/gehen-nachtragen";
import { TagErfassen } from "@/components/tag-erfassen";
import { AbwesenheitLoeschen } from "@/components/abwesenheit-loeschen";

function Hinweis({ warnung = false, children }: { warnung?: boolean; children: React.ReactNode }) {
  const Icon = warnung ? AlertTriangle : Info;
  return (
    <p
      className={cn(
        "flex items-start gap-2 rounded-md border px-3 py-2 text-sm",
        warnung ? "border-status-warning text-foreground" : "text-muted-foreground"
      )}
    >
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", warnung && "text-status-warning")} />
      <span>{children}</span>
    </p>
  );
}

function formatTage(tage: number): string {
  return `${tage} ${tage === 1 ? "Tag" : "Tage"}`;
}

function Kennzahl({ titel, wert, zusatz, warnung = false }: { titel: string; wert: string; zusatz?: string; warnung?: boolean }) {
  return (
    <div className="rounded-md border bg-card px-3 py-2">
      <div className="text-xs text-muted-foreground">{titel}</div>
      <div className={cn("text-lg font-semibold tabular-nums", warnung && "text-destructive")}>{wert}</div>
      {zusatz && <div className="text-xs text-muted-foreground tabular-nums">{zusatz}</div>}
    </div>
  );
}

function grundText(t: Tageszeile): string | null {
  if (t.auswertung.krankheit) return "Krankheit";
  if (t.auswertung.kompGlz) return "Komp. GLZ";
  if (t.ferientag === 0.5) return "½ Ferien";
  switch (t.grund?.art) {
    case "feiertag":
      return `Feiertag: ${t.grund.name}`;
    case "ferien":
      return "Ferien";
    case "frei":
      return "frei";
    case "kein-arbeitsmodell":
      return "kein Arbeitsmodell";
    case "nicht-angestellt":
      return "nicht angestellt";
    default:
      return null;
  }
}

/** PROJ-15: Ferien- und Frei-Einträge eines Tages (im Tool löschbar). */
function loeschbar(t: Tageszeile): string[] {
  return t.auswertung.abwesenheiten.filter((a) => a.typ === "ferien" || a.typ === "frei").map((a) => a.eintragId);
}

function tageshinweise(t: Tageszeile, beginnArt: Zeitnachweis["beginnArt"]): { text: string; warnung: boolean }[] {
  const a = t.auswertung;
  const liste: { text: string; warnung: boolean }[] = [];
  if (a.offen) liste.push({ text: "offen – Gehen fehlt", warnung: t.offenWarnung });
  if (a.ueberschneidung) liste.push({ text: "Einträge überschneiden sich", warnung: true });
  if (a.unplausibel) liste.push({ text: "unplausibler Eintrag zählt nicht", warnung: true });
  if (t.ferienMitArbeit) liste.push({ text: "Ferien und Arbeitszeit am selben Tag", warnung: true });
  if (t.krankheitInFerien) liste.push({ text: "Krankheit während der Ferien — kein Ferientag", warnung: false });
  if (t.ferienOhneSoll) liste.push({ text: "Ferien an einem Tag ohne Soll — zählt nicht", warnung: true });
  if (t.flowAbweichung && a.flowTagestotal !== null) {
    liste.push({
      text: `Tagestotal laut App ${formatMinuten(a.flowTagestotal)} statt ${formatMinuten(a.arbeitszeitMinuten)}`,
      warnung: false,
    });
  }
  if (t.vorBeginn && (a.hatArbeitszeit || a.krankheit || a.kompGlz || a.ferien)) {
    liste.push({ text: beginnArt === "startsaldo" ? "vor Startsaldo (Excel-Zeitraum)" : "vor Arbeitsmodell", warnung: false });
  }
  return liste;
}

export function ZeitnachweisAnsicht({
  zeitnachweis: z,
  personName,
  personEmail,
  personHref,
}: {
  zeitnachweis: Zeitnachweis;
  personName: string;
  /** Für das Erfassen von Einträgen. */
  personEmail: string;
  /** Link zur Pflege der Person (PROJ-14). */
  personHref: string;
}) {
  const gleitzeitTitel = z.laufenderMonat ? "Gleitzeit Stand heute" : "Gleitzeit Monatsende";

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {z.ohneArbeitsmodell && (
          <Hinweis warnung>
            Für {personName} ist kein Arbeitsmodell erfasst — ohne Arbeitsmodell gibt es kein Soll und keine Gleitzeit.{" "}
            <Link href={personHref} className="font-medium text-primary underline-offset-2 hover:underline">
              Arbeitsmodell erfassen
            </Link>
          </Hinweis>
        )}
        {!z.ohneArbeitsmodell && z.vorBeginn && (
          <Hinweis>
            {z.beginnArt === "startsaldo"
              ? `${formatMonat(z.monat)} liegt vor dem Stichtag des Startsaldos — für diesen Zeitraum gibt es keine Auswertung im Tool (Excel-Zeitraum).`
              : `${formatMonat(z.monat)} liegt vor dem ersten Arbeitsmodell — die Gleitzeit beginnt am ${formatKalenderdatum(z.beginnGleitzeit)}.`}
          </Hinweis>
        )}
        {z.keineEintraege && <Hinweis>Keine Zeiteinträge in diesem Monat.</Hinweis>}
        {z.offeneTage > 0 && (
          <Hinweis warnung>
            {z.offeneTage === 1 ? "An 1 Tag fehlt" : `An ${z.offeneTage} Tagen fehlt`} ein „Gehen“ — diese Einträge zählen
            nicht ins Ist. Zum Nachtragen anklicken:{" "}
            {z.offeneEintraege.map((o, i) => (
              <span key={o.eintragId}>
                {i > 0 && ", "}
                <GehenNachtragen eintragId={o.eintragId} datum={o.datum} kommen={o.kommen} personName={personName}>
                  {wochentagName(o.datum).slice(0, 2)} {formatKalenderdatum(o.datum).slice(0, 6)} {o.kommen}
                </GehenNachtragen>
              </span>
            ))}
          </Hinweis>
        )}
        {z.flowMonatsAbweichung && z.flowMonatstotal !== null && (
          <Hinweis>
            Monatstotal laut App {formatMinuten(z.flowMonatstotal)}, berechnete Arbeitszeit{" "}
            {formatMinuten(z.arbeitszeitMonatMinuten)}. Massgeblich ist die Berechnung aus Kommen/Gehen.
          </Hinweis>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
        <Kennzahl
          titel={z.beginnGleitzeit && z.beginnGleitzeit.startsWith(z.monat) ? "Startsaldo" : "Saldo Vormonat"}
          wert={z.saldoVormonatMinuten === null ? "—" : formatMinutenMitVorzeichen(z.saldoVormonatMinuten)}
        />
        <Kennzahl titel="Ist" wert={formatMinuten(z.summeIstMinuten)} />
        <Kennzahl titel="Soll" wert={formatMinuten(z.summeSollMinuten)} />
        <Kennzahl titel="Abweichung" wert={formatMinutenMitVorzeichen(z.abweichungMinuten)} />
        <Kennzahl
          titel={gleitzeitTitel}
          wert={z.saldoEndeMinuten === null ? "—" : formatMinutenMitVorzeichen(z.saldoEndeMinuten)}
          zusatz={z.saldoEndeMinuten === null ? undefined : formatGleitzeitTage(z.saldoEndeMinuten)}
        />
        {/* PROJ-15 */}
        <Kennzahl
          titel="Ferien im Monat"
          wert={formatTage(z.ferienBezogenMonat)}
          zusatz={z.ferienGeplantMonat > 0 ? `+ ${formatTage(z.ferienGeplantMonat)} geplant` : "bezogen"}
        />
        <Kennzahl
          titel="Feriensaldo Monatsende"
          wert={z.feriensaldoEnde === null ? "—" : formatTage(z.feriensaldoEnde)}
          zusatz={z.feriensaldoEnde !== null && z.feriensaldoEnde < 0 ? "negativ" : undefined}
          warnung={z.feriensaldoEnde !== null && z.feriensaldoEnde < 0}
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {personName} · {formatMonat(z.monat)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Zeiten</TableHead>
                  <TableHead>Art</TableHead>
                  <TableHead className="text-right">Ist</TableHead>
                  <TableHead className="text-right">Soll</TableHead>
                  <TableHead className="text-right">Abw.</TableHead>
                  <TableHead className="text-right">Gleitzeit</TableHead>
                  <TableHead>Essen</TableHead>
                  <TableHead>Bemerkung / Hinweise</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {z.tage.map((t) => {
                  const hinweise = tageshinweise(t, z.beginnArt);
                  const essen = [t.auswertung.mittagessen && "Mittag", t.auswertung.abendessen && "Abend"].filter(Boolean);
                  const grund = grundText(t);
                  return (
                    <TableRow
                      key={t.datum}
                      className={cn(
                        (t.grund?.art === "frei" || t.grund?.art === "feiertag") && "bg-muted/40",
                        (t.zukunft || t.vorBeginn) && "text-muted-foreground"
                      )}
                    >
                      <TableCell className="whitespace-nowrap">
                        {/* Klick auf den Tag erfasst einen Eintrag; an künftigen Tagen nur Ferien und Frei (PROJ-15). */}
                        <TagErfassen email={personEmail} datum={t.datum} personName={personName} nurAbwesenheit={t.zukunft}>
                          <span className="tabular-nums underline decoration-dotted underline-offset-4">
                            {formatKalenderdatum(t.datum).slice(0, 6)}
                          </span>
                        </TagErfassen>{" "}
                        <span className="text-muted-foreground">{wochentagName(t.datum).slice(0, 2)}</span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums">
                        {t.auswertung.paare.length === 0
                          ? ""
                          : t.auswertung.paare.map((p, i) => (
                              <span key={p.eintragId} className={cn(p.unplausibel && "text-destructive line-through")}>
                                {i > 0 && ", "}
                                {p.kommen}–{p.gehen ?? "…"}
                                {p.folgetag && " (+1)"}
                                {p.gehen === null && !t.zukunft && (
                                  <>
                                    {" "}
                                    <GehenNachtragen eintragId={p.eintragId} datum={t.datum} kommen={p.kommen} personName={personName}>
                                      nachtragen
                                    </GehenNachtragen>
                                  </>
                                )}
                              </span>
                            ))}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {grund && (
                          <Badge variant={t.auswertung.krankheit || t.auswertung.kompGlz ? "secondary" : "outline"} className="font-normal">
                            {grund}
                          </Badge>
                        )}
                        {t.auswertung.frei && (
                          <Badge variant="outline" className="ml-1 font-normal">
                            Frei
                          </Badge>
                        )}
                        {loeschbar(t).length > 0 && (
                          <>
                            {" "}
                            <AbwesenheitLoeschen
                              eintragIds={loeschbar(t)}
                              beschreibung={`Ferien/Frei am ${formatKalenderdatum(t.datum)}`}
                            />
                          </>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right tabular-nums">
                        {t.istMinuten === null ? "" : formatMinuten(t.istMinuten)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right tabular-nums">
                        {t.sollMinuten === null ? "" : formatMinuten(t.sollMinuten)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "whitespace-nowrap text-right tabular-nums",
                          (t.abweichungMinuten ?? 0) < 0 && "text-destructive"
                        )}
                      >
                        {t.abweichungMinuten === null || t.vorBeginn ? "" : formatMinutenMitVorzeichen(t.abweichungMinuten)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right tabular-nums">
                        {t.saldoMinuten === null ? "" : formatMinutenMitVorzeichen(t.saldoMinuten)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{essen.join(", ")}</TableCell>
                      <TableCell className="min-w-48 text-sm">
                        {t.auswertung.bemerkungen.length > 0 && <div>{t.auswertung.bemerkungen.join(" · ")}</div>}
                        {hinweise.map((h) => (
                          <div
                            key={h.text}
                            className={cn("text-xs", h.warnung ? "text-status-warning" : "text-muted-foreground")}
                          >
                            {h.text}
                          </div>
                        ))}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter>
                <TableRow className="font-medium">
                  <TableCell colSpan={3}>Summe</TableCell>
                  <TableCell className="whitespace-nowrap text-right tabular-nums">{formatMinuten(z.summeIstMinuten)}</TableCell>
                  <TableCell className="whitespace-nowrap text-right tabular-nums">{formatMinuten(z.summeSollMinuten)}</TableCell>
                  <TableCell className="whitespace-nowrap text-right tabular-nums">{formatMinutenMitVorzeichen(z.abweichungMinuten)}</TableCell>
                  <TableCell className="whitespace-nowrap text-right tabular-nums">
                    {z.saldoEndeMinuten === null ? "" : formatMinutenMitVorzeichen(z.saldoEndeMinuten)}
                  </TableCell>
                  <TableCell colSpan={2} />
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
