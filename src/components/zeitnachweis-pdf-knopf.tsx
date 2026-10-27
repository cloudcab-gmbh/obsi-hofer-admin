"use client";

import { useState, useTransition } from "react";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { erzeugeZeitnachweisPdfAction } from "@/app/(protected)/zeiterfassung/actions";

/** PROJ-16: Zeitnachweis der gewählten Person und des Monats als PDF herunterladen. */
export function ZeitnachweisPdfKnopf({ email, monat }: { email: string; monat: string }) {
  const [fehler, setFehler] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function herunterladen() {
    setFehler(null);
    startTransition(async () => {
      try {
        const result = await erzeugeZeitnachweisPdfAction(email, monat);
        if (!result.success) {
          setFehler(result.message);
          return;
        }
        // Gleiches Vorgehen wie beim Prüfbericht-Export (PROJ-7): Datei nur im Browser.
        const bytes = Uint8Array.from(atob(result.pdfBase64), (c) => c.charCodeAt(0));
        const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
        const link = document.createElement("a");
        link.href = url;
        link.download = result.dateiname;
        link.click();
        URL.revokeObjectURL(url);
      } catch {
        setFehler("Das PDF konnte nicht erzeugt werden. Bitte die Seite neu laden und erneut versuchen.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" variant="outline" onClick={herunterladen} disabled={isPending}>
        <FileDown className="mr-2 h-4 w-4" />
        {isPending ? "Erzeugt …" : "PDF herunterladen"}
      </Button>
      {fehler && (
        <p role="alert" className="max-w-xs text-right text-xs text-destructive">
          {fehler}
        </p>
      )}
    </div>
  );
}
