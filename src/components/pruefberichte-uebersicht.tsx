"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PruefberichtTabelle } from "@/components/pruefbericht-tabelle";
import { ERGEBNIS_OPTIONEN, type Pruefbericht } from "@/lib/dataverse/pruefberichte";

const ALLE = "__alle__";

export function PruefberichteUebersicht({
  berichte,
  geraetNamen,
}: {
  berichte: Pruefbericht[];
  geraetNamen: Map<string, string>;
}) {
  const [suche, setSuche] = useState("");
  const [ergebnis, setErgebnis] = useState(ALLE);
  const [zeigeStorniert, setZeigeStorniert] = useState(false);

  const geraetName = (id: string) => geraetNamen.get(id) ?? "—";

  const gefiltert = useMemo(() => {
    const suchbegriff = suche.trim().toLowerCase();
    return berichte.filter((b) => {
      if (!zeigeStorniert && b.storniert) return false;
      if (ergebnis !== ALLE && b.ergebnis !== ergebnis) return false;
      if (!suchbegriff) return true;
      return (geraetNamen.get(b.geraetId) ?? "—").toLowerCase().includes(suchbegriff);
    });
  }, [berichte, suche, ergebnis, zeigeStorniert, geraetNamen]);

  if (berichte.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Keine Prüfberichte für diese Firma gefunden.
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          placeholder="Suche nach Gerät..."
          value={suche}
          onChange={(e) => setSuche(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select value={ergebnis} onValueChange={setErgebnis}>
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="Ergebnis" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALLE}>Alle Ergebnisse</SelectItem>
            {ERGEBNIS_OPTIONEN.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Checkbox
            id="zeige-storniert-uebersicht"
            checked={zeigeStorniert}
            onCheckedChange={(v) => setZeigeStorniert(v === true)}
          />
          <Label htmlFor="zeige-storniert-uebersicht" className="text-sm font-normal text-muted-foreground">
            Auch stornierte
          </Label>
        </div>
      </div>

      {gefiltert.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Keine Prüfberichte gefunden.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <PruefberichtTabelle berichte={gefiltert} geraetName={geraetName} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
