"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PruefberichtTabelle } from "@/components/pruefbericht-tabelle";
import type { Pruefbericht } from "@/lib/dataverse/pruefberichte";

export function PruefberichtHistorie({ geraetId, berichte }: { geraetId: string; berichte: Pruefbericht[] }) {
  const [zeigeStorniert, setZeigeStorniert] = useState(false);

  const stornierteVorhanden = berichte.some((b) => b.storniert);
  const sichtbar = zeigeStorniert ? berichte : berichte.filter((b) => !b.storniert);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Prüfberichte</h2>
        <Button asChild size="sm">
          <Link href={`/pruefberichte/neu?geraetId=${geraetId}`}>Neuer Prüfbericht</Link>
        </Button>
      </div>

      {stornierteVorhanden && (
        <div className="flex items-center gap-2">
          <Checkbox id="zeige-storniert" checked={zeigeStorniert} onCheckedChange={(v) => setZeigeStorniert(v === true)} />
          <Label htmlFor="zeige-storniert" className="text-sm font-normal text-muted-foreground">
            Auch stornierte anzeigen
          </Label>
        </div>
      )}

      {sichtbar.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Noch keine Prüfberichte für dieses Gerät.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <PruefberichtTabelle berichte={sichtbar} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
