"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getStatusBadgeVariant } from "@/lib/status-badge";
import { saveGeraetStammdaten } from "@/app/(protected)/geraete/actions";
import type { ArtikelInfo, Firma, Geraet, Standort } from "@/lib/dataverse/geraete";

const schema = z.object({
  name: z.string().trim().min(1, "Gerätename darf nicht leer sein."),
  serienummer: z.string(),
  barcode: z.string(),
  lagerort: z.string(),
  bemerkungen: z.string(),
  zubehoer: z.string(),
  herstelljahr: z.string(),
  erstgebrauch: z.string(),
  ablegereife: z.string(),
});

type FormValues = z.infer<typeof schema>;

function formatDatum(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("de-CH");
}

export function GeraetForm({
  geraet,
  standort,
  firma,
  artikel,
}: {
  geraet: Geraet;
  standort: Standort | null;
  firma: Firma | null;
  artikel: ArtikelInfo | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: geraet.name ?? "",
      serienummer: geraet.serienummer ?? "",
      barcode: geraet.barcode ?? "",
      lagerort: geraet.lagerort ?? "",
      bemerkungen: geraet.bemerkungen ?? "",
      zubehoer: geraet.zubehoer ?? "",
      herstelljahr: geraet.herstelljahr ?? "",
      erstgebrauch: geraet.erstgebrauch ?? "",
      ablegereife: geraet.ablegereife ?? "",
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
          <Label htmlFor="name">Gerätename</Label>
          <Input id="name" {...register("name")} />
          {errors.name && <p className="mt-1 text-sm text-destructive">{errors.name.message}</p>}
        </div>
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
          <Input id="herstelljahr" {...register("herstelljahr")} />
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

        {serverError && <p className="text-sm text-destructive">{serverError}</p>}
        {saved && <p className="text-sm text-status-success">Gespeichert.</p>}

        <Button type="submit" disabled={isPending}>
          {isPending ? "Speichern..." : "Speichern"}
        </Button>
      </form>
    </div>
  );
}
