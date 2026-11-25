import Link from "next/link";
import { AlertTriangle, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Tageszeile, Zeitnachweis } from "@/lib/zeiterfassung/zeitnachweis";
import { formatKalenderdatum, formatMonat, wochentagName, zuSchweizerDatum } from "@/lib/zeiterfassung/datum";
import { formatGleitzeitTage, formatMinuten, formatMinutenMitVorzeichen } from "@/lib/zeiterfassung/format";
import { cn } from "@/lib/utils";
import { grundText, korrekturTexte } from "@/lib/zeiterfassung/anzeige";
import { EintragBearbeiten } from "@/components/eintrag-bearbeiten";
import { TagErfassen } from "@/components/tag-erfassen";
import { AbwesenheitLoeschen } from "@/components/abwesenheit-loeschen";
import { ohneHerkunftsvermerk } from "@/lib/zeiterfassung/mein-zeitnachweis";
import { bisherigeZeiten, darfAnfragen, type AnfrageZeitraum, type KorrekturAnfrage } from "@/lib/zeiterfassung/korrektur";
import { KorrekturAnfrage as KorrekturAnfrageDialog } from "@/components/korrektur-anfrage";

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

// PROJ-20: Spalten, die auf dem Handy beim seitlichen Wischen stehen bleiben
// (feste Breite für das Datum, damit die Zeiten direkt daneben haften).
// Nutzerwunsch 2026-11-25: Auf dem Handy bleibt nur das Datum stehen; mit den Zeiten
// war die stehende Fläche fast so breit wie der Bildschirm.
const DATUM_SPALTE = "max-md:sticky max-md:left-0 max-md:z-[1] max-md:w-[5.5rem] max-md:min-w-[5.5rem] max-md:border-r";

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


/** PROJ-15: Ferien- und Frei-Einträge eines Tages (im Tool löschbar). */
function loeschbar(t: Tageszeile): string[] {
  // Ganztägige Einträge (Ferien, Frei, Krankheit, Komp. GLZ) des Tages.
  return t.auswertung.abwesenheiten.map((a) => a.eintragId);
}

function tageshinweise(t: Tageszeile, beginnArt: Zeitnachweis["beginnArt"], nurLesen: boolean): { text: string; warnung: boolean }[] {
  const a = t.auswertung;
  const liste: { text: string; warnung: boolean }[] = [];
  if (a.offen) liste.push({ text: "offen – Gehen fehlt", warnung: t.offenWarnung });
  if (a.ueberschneidung) liste.push({ text: "Einträge überschneiden sich", warnung: true });
  if (a.unplausibel) liste.push({ text: "unplausibler Eintrag zählt nicht", warnung: true });
  if (t.ferienMitArbeit) liste.push({ text: "Ferien und Arbeitszeit am selben Tag", warnung: true });
  if (t.krankheitInFerien) liste.push({ text: "Krankheit während der Ferien — kein Ferientag", warnung: false });
  if (a.unbekannt) liste.push({ text: "Eintrag mit unbekanntem Typ — zählt nicht", warnung: true });
  if (t.ferienOhneSoll) liste.push({ text: "Ferien an einem Tag ohne Soll — zählt nicht", warnung: true });
  // PROJ-20: Abgleich mit dem Tagestotal der App ist ein technischer Hinweis für Freigeber.
  if (!nurLesen && t.flowAbweichung && a.flowTagestotal !== null) {
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
  nurLesen = false,
  anfragen = {},
  anfragenFehler = false,
  anfrageZeitraum = null,
}: {
  zeitnachweis: Zeitnachweis;
  personName: string;
  /** Für das Erfassen von Einträgen. */
  personEmail: string;
  /** Link zur Pflege der Person (PROJ-14). */
  personHref: string;
  /**
   * PROJ-20: Mitarbeiteransicht — ohne Erfassen, Nachtragen und Löschen, ohne
   * Link auf die Personen-Seite, ohne technische Abgleiche und ohne den Vermerk
   * „aus SharePoint“.
   */
  nurLesen?: boolean;
  /** PROJ-21: Korrektur-Anfragen der Person pro Tag (neueste zuerst). */
  anfragen?: Record<string, KorrekturAnfrage[]>;
  /** PROJ-21: Anfragen konnten nicht geladen werden. */
  anfragenFehler?: boolean;
  /** PROJ-21 (nur Mitarbeiteransicht): Tage, für die eine Korrektur angefragt werden darf. */
  anfrageZeitraum?: AnfrageZeitraum | null;
}) {
  const gleitzeitTitel = z.laufenderMonat ? "Gleitzeit Stand heute" : "Gleitzeit Monatsende";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="space-y-2">
        {z.ohneArbeitsmodell && nurLesen && (
          <Hinweis warnung>Arbeitsmodell noch nicht erfasst – bitte an die Personalverantwortung wenden.</Hinweis>
        )}
        {z.ohneArbeitsmodell && !nurLesen && (
          <Hinweis warnung>
            Für {personName} ist kein Arbeitsmodell erfasst —{" "}
            {/* QA BUG-1: mit Startsaldo läuft die Gleitzeit trotzdem (Ist ohne Soll). */}
            {z.saldoEndeMinuten === null
              ? "ohne Arbeitsmodell gibt es kein Soll und keine Gleitzeit."
              : "ohne Arbeitsmodell gibt es kein Soll; die Gleitzeit läuft ab dem Startsaldo nur mit der Ist-Zeit weiter."}{" "}
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
        {anfragenFehler && <Hinweis>Korrektur-Anfragen konnten nicht geladen werden.</Hinweis>}
        {z.offeneTage > 0 && nurLesen && (
          <Hinweis warnung>
            {z.offeneTage === 1 ? "An 1 Tag fehlt" : `An ${z.offeneTage} Tagen fehlt`} ein „Gehen“ — diese Einträge zählen
            nicht ins Ist. Bitte in der SharePoint-Zeiterfassung ergänzen:{" "}
            {z.offeneEintraege
              .map((o) => `${wochentagName(o.datum).slice(0, 2)} ${formatKalenderdatum(o.datum).slice(0, 6)} ${o.kommen}`)
              .join(", ")}
          </Hinweis>
        )}
        {z.offeneTage > 0 && !nurLesen && (
          <Hinweis warnung>
            {z.offeneTage === 1 ? "An 1 Tag fehlt" : `An ${z.offeneTage} Tagen fehlt`} ein „Gehen“ — diese Einträge zählen
            nicht ins Ist. Zum Nachtragen anklicken:{" "}
            {z.offeneEintraege.map((o, i) => (
              <span key={o.eintragId}>
                {i > 0 && ", "}
                <EintragBearbeiten
                  eintragId={o.eintragId}
                  datum={o.datum}
                  kommen={o.kommen}
                  gehen={null}
                  bemerkung={o.bemerkung}
                  personName={personName}
                >
                  {wochentagName(o.datum).slice(0, 2)} {formatKalenderdatum(o.datum).slice(0, 6)} {o.kommen}
                </EintragBearbeiten>
              </span>
            ))}
          </Hinweis>
        )}
        {!nurLesen && z.flowMonatsAbweichung && z.flowMonatstotal !== null && (
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

      {/* Mindesthöhe, damit die Tabelle auch auf kleinen Bildschirmen nutzbar bleibt (dann scrollt die Seite). */}
      <Card className="flex min-h-[24rem] flex-1 flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {personName} · {formatMonat(z.monat)}
          </CardTitle>
        </CardHeader>
        <CardContent className="min-h-0 flex-1">
          <div className="h-full">
            <Table containerClassName="h-full">
              <TableHeader className="sticky top-0 z-10 bg-card shadow-[inset_0_-1px_0_hsl(var(--border))]">
                <TableRow>
                  {/* PROJ-20: Auf dem Handy bleibt das Datum beim seitlichen Wischen stehen. */}
                  <TableHead className={cn(DATUM_SPALTE, "max-md:bg-card")}>Datum</TableHead>
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
                  const hinweise = tageshinweise(t, z.beginnArt, nurLesen);
                  const bemerkungen = nurLesen
                    ? t.auswertung.bemerkungen.map(ohneHerkunftsvermerk).filter((b): b is string => b !== null)
                    : t.auswertung.bemerkungen;
                  const grau = t.grund?.art === "frei" || t.grund?.art === "feiertag";
                  // Deckender Hintergrund für die stehenbleibenden Spalten (Handy).
                  const stehendBg = grau ? "max-md:bg-muted" : "max-md:bg-card";
                  const essen = [t.auswertung.mittagessen && "Mittag", t.auswertung.abendessen && "Abend"].filter(Boolean);
                  const grund = grundText(t);
                  return (
                    <TableRow
                      key={t.datum}
                      className={cn(
                        grau && "bg-muted/40",
                        (t.zukunft || t.vorBeginn) && "text-muted-foreground"
                      )}
                    >
                      <TableCell className={cn("whitespace-nowrap", DATUM_SPALTE, stehendBg)}>
                        {nurLesen ? (
                          <span className="tabular-nums">{formatKalenderdatum(t.datum).slice(0, 6)}</span>
                        ) : (
                          /* Klick auf den Tag erfasst einen Eintrag; an künftigen Tagen nur Ferien und Frei (PROJ-15). */
                          <TagErfassen email={personEmail} datum={t.datum} personName={personName} nurAbwesenheit={t.zukunft}>
                            <span className="tabular-nums underline decoration-dotted underline-offset-4">
                              {formatKalenderdatum(t.datum).slice(0, 6)}
                            </span>
                          </TagErfassen>
                        )}{" "}
                        <span className="text-muted-foreground">{wochentagName(t.datum).slice(0, 2)}</span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums">
                        {/* Nutzerwunsch 2026-11-13: höchstens zwei Einträge pro Zeile, weitere darunter. */}
                        <div className="grid grid-cols-[auto_auto] justify-start gap-y-0.5">
                          {t.auswertung.paare.map((p, i) => {
                            const text = (
                              <>
                                {p.kommen}–{p.gehen ?? "…"}
                                {p.folgetag && " (+1)"}
                              </>
                            );
                            return (
                              <span key={p.eintragId} className={cn(p.unplausibel && "text-destructive line-through")}>
                                {i % 2 === 1 && ", "}
                                {/* PROJ-22: Zeitpaar anklicken → ändern oder löschen. */}
                                {nurLesen ? (
                                  text
                                ) : (
                                  <EintragBearbeiten
                                    eintragId={p.eintragId}
                                    datum={t.datum}
                                    kommen={p.kommen}
                                    gehen={p.gehen}
                                    folgetag={p.folgetag}
                                    bemerkung={p.bemerkung}
                                    personName={personName}
                                  >
                                    {text}
                                  </EintragBearbeiten>
                                )}
                              </span>
                            );
                          })}
                          {/* PROJ-22: im Tool gelöschte Einträge (nur Freigeber), zählen nicht. */}
                          {!nurLesen &&
                            t.auswertung.geloeschte.map((g, i) => (
                              <span key={g.eintragId} className="text-muted-foreground">
                                {(t.auswertung.paare.length + i) % 2 === 1 && ", "}
                                <s aria-label={`gelöscht: ${g.text}`}>{g.text}</s>
                              </span>
                            ))}
                        </div>
                        {/* PROJ-21: Korrektur anfragen (aktueller/vorheriger Monat, bis heute). */}
                        {nurLesen && darfAnfragen(t.datum, anfrageZeitraum) && (
                          <div className="mt-0.5">
                            <KorrekturAnfrageDialog datum={t.datum} zeiten={{ [t.datum]: bisherigeZeiten(t) }} />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {grund && (
                          <Badge variant={t.auswertung.krankheit || t.auswertung.kompGlz ? "secondary" : "outline"} className="font-normal">
                            {grund}
                          </Badge>
                        )}
                        {t.halberFeiertag && (
                          <Badge variant="outline" className="ml-1 font-normal">
                            ½ Feiertag: {t.halberFeiertag}
                          </Badge>
                        )}
                        {t.auswertung.frei && (
                          <Badge variant="outline" className="ml-1 font-normal">
                            Frei
                          </Badge>
                        )}
                        {!nurLesen && loeschbar(t).length > 0 && (
                          <>
                            {" "}
                            <AbwesenheitLoeschen
                              eintragIds={loeschbar(t)}
                              beschreibung={`Der ganztägige Eintrag (${grund ?? "Frei"}) vom ${formatKalenderdatum(t.datum)}`}
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
                        {bemerkungen.length > 0 && <div>{bemerkungen.join(" · ")}</div>}
                        {/* PROJ-22: Markierung der Korrekturen im Tool. */}
                        {korrekturTexte(t.auswertung, nurLesen).map((text) => (
                          <div key={text} className="text-xs font-medium text-primary">
                            {text}
                          </div>
                        ))}
                        {/* PROJ-21: Mitarbeitende sehen den Status der neuesten Anfrage, Freigeber alle mit Text. */}
                        {nurLesen && anfragen[t.datum]?.[0] && (
                          <div className="text-xs font-medium text-primary">
                            {anfragen[t.datum][0].status === "erledigt" ? "Korrektur erledigt" : "Korrektur angefragt (offen)"}
                          </div>
                        )}
                        {!nurLesen &&
                          anfragen[t.datum]?.map((a) => (
                            <div key={a.id} className="whitespace-pre-line text-xs">
                              <span className="font-medium text-primary">
                                Korrektur angefragt {a.erstelltAm ? formatKalenderdatum(zuSchweizerDatum(a.erstelltAm) ?? a.erstelltAm.slice(0, 10)).slice(0, 6) : ""} ({a.status}):
                              </span>{" "}
                              {a.nachricht}
                            </div>
                          ))}
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
              <TableFooter className="sticky bottom-0 z-10 bg-muted">
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
