"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ERGEBNIS_OPTIONEN, type Pruefbericht } from "@/lib/dataverse/pruefberichte";
import {
  createPruefberichtAction,
  stornierePruefberichtAction,
  updatePruefberichtAction,
} from "@/app/(protected)/pruefberichte/actions";

const schema = z.object({
  pruefdatum: z.string().trim().min(1, "Prüfdatum darf nicht leer sein."),
  ergebnis: z.string().trim().min(1, "Bitte ein Ergebnis auswählen."),
  bemerkungen: z.string(),
});

type FormValues = z.infer<typeof schema>;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function PruefberichtForm({
  mode,
  geraetId,
  pruefbericht,
  pruefer,
  backHref,
}: {
  mode: "create" | "edit";
  geraetId: string;
  pruefbericht?: Pruefbericht;
  /** Nur für `mode: "create"` — der automatisch berechnete Prüfer-Kürzel. */
  pruefer?: string;
  backHref: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const storniert = pruefbericht?.storniert ?? false;
  const [ergebnis, setErgebnis] = useState(pruefbericht?.ergebnis ?? "");

  const { register, handleSubmit, setValue } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      pruefdatum: pruefbericht?.pruefdatum?.slice(0, 10) ?? todayIso(),
      ergebnis: pruefbericht?.ergebnis ?? "",
      bemerkungen: pruefbericht?.bemerkungen ?? "",
    },
  });

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    setSaved(false);
    const formData = new FormData();
    formData.set("pruefdatum", values.pruefdatum);
    formData.set("ergebnis", values.ergebnis);
    formData.set("bemerkungen", values.bemerkungen);

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createPruefberichtAction(geraetId, formData)
          : await updatePruefberichtAction(pruefbericht!.id, formData);

      if (!result.success) {
        setServerError(result.message);
      } else if (mode === "create") {
        router.push(backHref);
      } else {
        setSaved(true);
      }
    });
  });

  const onStornieren = () => {
    setServerError(null);
    startTransition(async () => {
      const result = await stornierePruefberichtAction(pruefbericht!.id);
      if (!result.success) {
        setServerError(result.message);
      } else {
        router.push(backHref);
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="pruefdatum">Prüfdatum</Label>
        <Input id="pruefdatum" type="date" disabled={storniert} {...register("pruefdatum")} />
      </div>
      <div>
        <Label htmlFor="ergebnis">Ergebnis</Label>
        <Select
          value={ergebnis}
          onValueChange={(v) => {
            setErgebnis(v);
            setValue("ergebnis", v, { shouldValidate: true });
          }}
          disabled={storniert}
        >
          <SelectTrigger id="ergebnis">
            <SelectValue placeholder="Ergebnis wählen..." />
          </SelectTrigger>
          <SelectContent>
            {ERGEBNIS_OPTIONEN.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="bemerkungen">Bemerkungen</Label>
        <Input id="bemerkungen" disabled={storniert} {...register("bemerkungen")} />
      </div>
      <div>
        <Label>Prüfer</Label>
        <p className="text-sm text-muted-foreground">{mode === "create" ? pruefer : (pruefbericht?.pruefer ?? "—")}</p>
      </div>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}
      {saved && <p className="text-sm text-status-success">Gespeichert.</p>}

      <div className="flex gap-2">
        {!storniert && (
          <Button type="submit" disabled={isPending}>
            {isPending ? "Speichern..." : "Speichern"}
          </Button>
        )}
        <Button type="button" variant="outline" asChild>
          <Link href={backHref}>Zurück</Link>
        </Button>
        {mode === "edit" && !storniert && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="destructive" disabled={isPending}>
                Stornieren
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Prüfbericht stornieren?</AlertDialogTitle>
                <AlertDialogDescription>
                  Das kann nicht rückgängig gemacht werden. Der Prüfbericht wird als ungültig markiert und ist danach
                  nur noch lesbar.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                <AlertDialogAction onClick={onStornieren}>Stornieren</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </form>
  );
}
