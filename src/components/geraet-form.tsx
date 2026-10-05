"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getStatusBadgeVariant } from "@/lib/status-badge";
import { saveGeraetStammdaten } from "@/app/(protected)/geraete/actions";
import type { ArtikelInfo, Firma, Geraet, Standort } from "@/lib/dataverse/geraete";

const schema = z.object({
  serienummer: z.string(),
  barcode: z.string(),
  lagerort: z.string(),
  bemerkungen: z.string(),
  zubehoer: z.string(),
  herstelljahr: z.string(),
  erstgebrauch: z.string(),
  ablegereife: z.string(),
  kundenId: z.string(),
});

type FormValues = z.infer<typeof schema>;

function formatDatum(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("de-CH");
}

// Manche Dataverse-Datumsfelder liefern einen vollen ISO-Zeitstempel
// (z.B. "2020-03-14T23:00:00Z") statt eines reinen Datums — <input
// type="date"> akzeptiert nur exakt "YYYY-MM-DD" und zeigt sonst nichts an.
function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export function GeraetForm({
  geraet,
  standort,
  firma,
  artikel,
  backHref,
}: {
  geraet: Geraet;
  standort: Standort | null;
  firma: Firma | null;
  backHref: string;
  artikel: ArtikelInfo | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const { register, handleSubmit } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      serienummer: geraet.serienummer ?? "",
      barcode: geraet.barcode ?? "",
      lagerort: geraet.lagerort ?? "",
      bemerkungen: geraet.bemerkungen ?? "",
      zubehoer: geraet.zubehoer ?? "",
      herstelljahr: toDateInputValue(geraet.herstelljahr),
      erstgebrauch: toDateInputValue(geraet.erstgebrauch),
      ablegereife: toDateInputValue(geraet.ablegereife),
      kundenId: geraet.kundenId ?? "",
    },
  });

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    setSaved(false);
    const formData = new FormData();
    (Object.entries(values) as [keyof FormValues, string][]).forEach(([key, value]) => formData.set(key, value));

    startTransition(async () => {
      const result = await saveGeraetStammdaten(geraet.id, formData);
      if (!result.success) {
        setServerError(result.message);
      } else {
        setSaved(true);
      }
    });
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="grid grid-cols-1 gap-4 py-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground">Gerätename</p>
            <p>{geraet.name ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Status</p>
            {geraet.status ? <Badge variant={getStatusBadgeVariant(geraet.status)}>{geraet.status}</Badge> : "—"}
          </div>
          <div>
            <p className="text-muted-foreground">Letzte Prüfung</p>
            <p>{formatDatum(geraet.letztePruefung)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Prüfer</p>
            <p>{geraet.pruefer ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Firma</p>
            <p>{firma?.name ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Standort</p>
            <p>{standort?.name ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Artikel</p>
            <p>{artikel?.bezeichnung ?? "—"}</p>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="barcode">Barcode</Label>
          <Input id="barcode" {...register("barcode")} />
        </div>
        <div>
          <Label htmlFor="serienummer">Seriennummer</Label>
          <Input id="serienummer" {...register("serienummer")} />
        </div>
        <div>
          <Label htmlFor="lagerort">Lagerort</Label>
          <Input id="lagerort" {...register("lagerort")} />
        </div>
        <div>
          <Label htmlFor="zubehoer">Zubehör</Label>
          <Input id="zubehoer" {...register("zubehoer")} />
        </div>
        <div>
          <Label htmlFor="herstelljahr">Herstelljahr</Label>
          <Input id="herstelljahr" type="date" {...register("herstelljahr")} />
        </div>
        <div>
          <Label htmlFor="erstgebrauch">Erstgebrauch</Label>
          <Input id="erstgebrauch" type="date" {...register("erstgebrauch")} />
        </div>
        <div>
          <Label htmlFor="ablegereife">Ablegereife</Label>
          <Input id="ablegereife" type="date" {...register("ablegereife")} />
        </div>
        <div>
          <Label htmlFor="bemerkungen">Bemerkungen</Label>
          <Input id="bemerkungen" {...register("bemerkungen")} />
        </div>
        <div>
          <Label htmlFor="kundenId">Kunden-eigene Gerätebezeichnung</Label>
          <Input id="kundenId" {...register("kundenId")} />
        </div>

        {serverError && <p className="text-sm text-destructive">{serverError}</p>}
        {saved && <p className="text-sm text-status-success">Gespeichert.</p>}

        <div className="flex gap-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Speichern..." : "Speichern"}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href={backHref}>Zurück</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
