"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { speicherePersonAction, type StammdatenEingabe } from "@/app/(protected)/zeiterfassung/personen/actions";
import { formatKalenderdatum } from "@/lib/zeiterfassung/datum";

export function PersonStammdatenForm({
  email,
  initial,
  ersteVersionAb,
  neuesteVersionAb = null,
  ersterEintrag,
}: {
  email: string;
  initial: StammdatenEingabe;
  /** "gültig ab" der ersten Arbeitsmodell-Version (Eintritt), für den Hinweis zum Stichtag. */
  ersteVersionAb: string | null;
  /** "gültig ab" der neuesten Version, für den Hinweis zum Austritt (QA BUG-1). */
  neuesteVersionAb?: string | null;
  /** Datum des ersten Zeiteintrags, für den Hinweis zum Stichtag. */
  ersterEintrag: string | null;
}) {
  const [werte, setWerte] = useState<StammdatenEingabe>(initial);
  const [fehler, setFehler] = useState<string | null>(null);
  const [gespeichert, setGespeichert] = useState(false);
  const [isPending, startTransition] = useTransition();

  function setze<K extends keyof StammdatenEingabe>(feld: K, wert: StammdatenEingabe[K]) {
    setWerte((w) => ({ ...w, [feld]: wert }));
    setGespeichert(false);
  }

  function speichern(event: React.FormEvent) {
    event.preventDefault();
    setFehler(null);
    setGespeichert(false);
    startTransition(async () => {
      try {
        const result = await speicherePersonAction(email, werte);
        if (result.success) setGespeichert(true);
        else setFehler(result.message);
      } catch {
        // Eingaben bleiben im Formular erhalten.
        setFehler("Die Angaben konnten nicht gespeichert werden. Bitte die Seite neu laden und erneut versuchen.");
      }
    });
  }

  // Edge Cases: Hinweis, aber erlaubt (Stände aus Excel müssen nicht exakt zum Modell passen).
  const hinweise: string[] = [];
  if (werte.stichtag && ersteVersionAb && werte.stichtag < ersteVersionAb) {
    hinweise.push(`Der Stichtag liegt vor dem Eintritt (erste Version ab ${formatKalenderdatum(ersteVersionAb)}).`);
  }
  if (werte.austrittAm && neuesteVersionAb && werte.austrittAm < neuesteVersionAb) {
    hinweise.push(
      `Der Austritt liegt vor der Arbeitsmodell-Version ab ${formatKalenderdatum(neuesteVersionAb)} — diese Version hat dann keine Wirkung.`
    );
  }
  if (werte.stichtag && ersterEintrag && werte.stichtag >= ersterEintrag) {
    hinweise.push(
      `Es gibt Zeiteinträge bis zum Stichtag (erster am ${formatKalenderdatum(ersterEintrag)}). Sie zählen nicht zur Gleitzeit — der Startsaldo enthält sie bereits.`
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Angaben zur Person</CardTitle>
        <CardDescription>{email}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={speichern} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={werte.name}
                maxLength={100}
                placeholder="leer = E-Mail anzeigen"
                onChange={(e) => setze("name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="austritt">Austritt am (letzter Tag mit Soll)</Label>
              <Input
                id="austritt"
                type="date"
                value={werte.austrittAm}
                onChange={(e) => setze("austrittAm", e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              id="nicht-auswerten"
              checked={werte.nichtAuswerten}
              onCheckedChange={(wert) => setze("nichtAuswerten", wert === true)}
              className="mt-0.5"
            />
            <div className="space-y-1">
              <Label htmlFor="nicht-auswerten">nicht auswerten</Label>
              <p className="text-xs text-muted-foreground">
                z.B. Testkonten: erscheinen nicht in der Liste und nicht im Zeitnachweis.
              </p>
            </div>
          </div>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">Gleitzeit-Startsaldo</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startsaldo">Stunden (auch negativ)</Label>
                <Input
                  id="startsaldo"
                  inputMode="decimal"
                  value={werte.startsaldo}
                  placeholder="z.B. 12.50"
                  onChange={(e) => setze("startsaldo", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stichtag">Stichtag (Saldo am Ende dieses Tages)</Label>
                <Input
                  id="stichtag"
                  type="date"
                  value={werte.stichtag}
                  onChange={(e) => setze("stichtag", e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Ohne Startsaldo beginnt die Gleitzeit mit der ersten Arbeitsmodell-Version bei 0. Der Stichtag gilt auch für
              den Ferien-Startsaldo.
            </p>
            {hinweise.map((h) => (
              <p key={h} className="text-sm text-status-warning">
                {h}
              </p>
            ))}
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">Ferien</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ferienanspruch">Anspruch (Tage pro Jahr bei 100 %)</Label>
                <Input
                  id="ferienanspruch"
                  inputMode="decimal"
                  value={werte.ferienanspruch}
                  placeholder="leer = 25"
                  onChange={(e) => setze("ferienanspruch", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ferienstartsaldo">Ferien-Startsaldo (Tage am Stichtag)</Label>
                <Input
                  id="ferienstartsaldo"
                  inputMode="decimal"
                  value={werte.ferienStartsaldo}
                  placeholder="z.B. 4.5"
                  onChange={(e) => setze("ferienStartsaldo", e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Der Jahresanspruch wird am 1. Januar gutgeschrieben (× Pensum, anteilig bei Eintritt und Pensumswechsel).
            </p>
          </fieldset>

          {fehler && (
            <p role="alert" className="text-sm text-destructive">
              {fehler}
            </p>
          )}
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Speichert…" : "Speichern"}
            </Button>
            {gespeichert && (
              <span className="text-sm text-status-success" role="status">
                Gespeichert.
              </span>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
