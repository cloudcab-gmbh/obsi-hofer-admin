"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { erfasseTagAction } from "@/app/(protected)/zeiterfassung/actions";
import { formatKalenderdatum, wochentagName } from "@/lib/zeiterfassung/datum";
import { formatMinuten } from "@/lib/zeiterfassung/format";

type Typ = "arbeitszeit" | "krankheit" | "komp-glz";

const TYPEN: { wert: Typ; label: string }[] = [
  { wert: "arbeitszeit", label: "Arbeitszeit" },
  { wert: "krankheit", label: "Krankheit (ganzer Tag)" },
  { wert: "komp-glz", label: "Komp. GLZ (ganzer Tag)" },
];

const LEERES_PAAR = { kommen: "", gehen: "" };

function minuten(uhrzeit: string): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(uhrzeit);
  return m ? +m[1] * 60 + +m[2] : null;
}

/** PROJ-13: Einträge für einen Tag erfassen (vergessenes Stempeln, Krankheit, Komp. GLZ). */
export function TagErfassen({
  email,
  datum,
  personName,
  children,
}: {
  email: string;
  datum: string;
  personName: string;
  /** Beschriftung des Auslösers (das Datum der Zeile). */
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [offen, setOffen] = useState(false);
  const [typ, setTyp] = useState<Typ>("arbeitszeit");
  const [paare, setPaare] = useState([LEERES_PAAR]);
  const [mittagessen, setMittagessen] = useState(false);
  const [abendessen, setAbendessen] = useState(false);
  const [bemerkung, setBemerkung] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function zuruecksetzen() {
    setTyp("arbeitszeit");
    setPaare([LEERES_PAAR]);
    setMittagessen(false);
    setAbendessen(false);
    setBemerkung("");
    setFehler(null);
  }

  function setzePaar(index: number, feld: "kommen" | "gehen", wert: string) {
    setPaare((liste) => liste.map((p, i) => (i === index ? { ...p, [feld]: wert } : p)));
  }

  const total = paare.reduce((summe, p) => {
    const von = minuten(p.kommen);
    const bis = minuten(p.gehen);
    return von !== null && bis !== null && bis > von ? summe + bis - von : summe;
  }, 0);

  function speichern(event: React.FormEvent) {
    event.preventDefault();
    setFehler(null);
    startTransition(async () => {
      try {
        const result = await erfasseTagAction({
          email,
          datum,
          typ,
          paare: typ === "arbeitszeit" ? paare : [],
          mittagessen,
          abendessen,
          bemerkung,
        });
        if (!result.success) {
          setFehler(result.message);
          router.refresh();
          return;
        }
        setOffen(false);
        zuruecksetzen();
        router.refresh();
      } catch {
        setFehler("Der Eintrag konnte nicht gespeichert werden. Bitte die Seite neu laden und erneut versuchen.");
      }
    });
  }

  return (
    <Dialog
      open={offen}
      onOpenChange={(neu) => {
        if (isPending) return;
        setOffen(neu);
        if (!neu) zuruecksetzen();
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="link"
          className="h-auto p-0 font-normal text-foreground"
          aria-label={`Eintrag erfassen am ${formatKalenderdatum(datum)}`}
          title="Eintrag erfassen"
        >
          {children}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={speichern} className="space-y-5">
          <DialogHeader>
            <DialogTitle>Eintrag erfassen</DialogTitle>
            <DialogDescription>
              {personName}, {wochentagName(datum)} {formatKalenderdatum(datum)}. Die Einträge werden in Dataverse
              gespeichert wie aus der Erfassungs-App.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor={`typ-${datum}`}>Art</Label>
            <Select value={typ} onValueChange={(wert) => setTyp(wert as Typ)}>
              <SelectTrigger id={`typ-${datum}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPEN.map((t) => (
                  <SelectItem key={t.wert} value={t.wert}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {typ === "arbeitszeit" && (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Kommen – Gehen</legend>
              {paare.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    type="time"
                    required
                    className="w-32"
                    aria-label={`Kommen ${i + 1}`}
                    value={p.kommen}
                    onChange={(e) => setzePaar(i, "kommen", e.target.value)}
                  />
                  <span aria-hidden>–</span>
                  <Input
                    type="time"
                    required
                    className="w-32"
                    aria-label={`Gehen ${i + 1}`}
                    value={p.gehen}
                    onChange={(e) => setzePaar(i, "gehen", e.target.value)}
                  />
                  {paare.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Paar ${i + 1} entfernen`}
                      onClick={() => setPaare((liste) => liste.filter((_, j) => j !== i))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={paare.length >= 10}
                  onClick={() => setPaare((liste) => [...liste, LEERES_PAAR])}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  weiteres Paar
                </Button>
                <span className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
                  Total {formatMinuten(total)}
                </span>
              </div>
            </fieldset>
          )}

          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id={`mittag-${datum}`}
                checked={mittagessen}
                onCheckedChange={(wert) => setMittagessen(wert === true)}
              />
              <Label htmlFor={`mittag-${datum}`} className="font-normal">
                Mittagessen
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id={`abend-${datum}`}
                checked={abendessen}
                onCheckedChange={(wert) => setAbendessen(wert === true)}
              />
              <Label htmlFor={`abend-${datum}`} className="font-normal">
                Abendessen
              </Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`bemerkung-${datum}`}>Bemerkung</Label>
            <Input
              id={`bemerkung-${datum}`}
              maxLength={500}
              value={bemerkung}
              placeholder="z.B. Stempeln vergessen"
              onChange={(e) => setBemerkung(e.target.value)}
            />
          </div>

          {fehler && (
            <p role="alert" className="text-sm text-destructive">
              {fehler}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => {
                setOffen(false);
                zuruecksetzen();
              }}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Speichert…" : "Speichern"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
