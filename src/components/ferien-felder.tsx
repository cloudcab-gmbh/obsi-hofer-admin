"use client";

import { useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { planeFerienAction } from "@/app/(protected)/zeiterfassung/actions";
import { vorschauText } from "@/lib/zeiterfassung/format";

export interface FerienWerte {
  von: string;
  bis: string;
  halberTag: boolean;
}

/**
 * PROJ-15: Felder von–bis / halber Tag mit laufender Vorschau vom Server
 * (gleiche Regeln wie beim Speichern). Gemeinsam genutzt vom Dialog
 * "Ferien erfassen" und vom Dialog "Eintrag erfassen" im Zeitnachweis.
 */
export function FerienFelder({
  email,
  werte,
  onChange,
  vonFest = false,
  idPrefix,
}: {
  email: string;
  werte: FerienWerte;
  onChange: (werte: FerienWerte) => void;
  /** Im Zeitnachweis ist "von" der angeklickte Tag. */
  vonFest?: boolean;
  idPrefix: string;
}) {
  // Vorschau gehört zu genau einer Eingabe; veraltete Ergebnisse werden nicht angezeigt.
  const [vorschau, setVorschau] = useState<{ fuer: string; text: string; fehler: boolean } | null>(null);
  const gueltig = werte.von !== "" && werte.bis !== "" && werte.bis >= werte.von;
  const schluessel = JSON.stringify(werte);
  const einzelnerTag = werte.von !== "" && (werte.bis === "" || werte.bis === werte.von);

  useEffect(() => {
    if (!gueltig) return;
    let abgebrochen = false;
    // Kurz warten, damit nicht jeder Tastendruck eine Anfrage auslöst.
    const timer = setTimeout(async () => {
      try {
        const result = await planeFerienAction({ email, ...werte, bemerkung: "" });
        if (abgebrochen) return;
        setVorschau(
          result.success
            ? { fuer: schluessel, text: vorschauText(result.plan), fehler: false }
            : { fuer: schluessel, text: result.message, fehler: true }
        );
      } catch {
        if (!abgebrochen) setVorschau({ fuer: schluessel, text: "Vorschau nicht verfügbar.", fehler: true });
      }
    }, 300);
    return () => {
      abgebrochen = true;
      clearTimeout(timer);
    };
  }, [email, werte, gueltig, schluessel]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-von`}>von</Label>
          <Input
            id={`${idPrefix}-von`}
            type="date"
            required
            className="w-40"
            value={werte.von}
            disabled={vonFest}
            onChange={(e) => onChange({ ...werte, von: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-bis`}>bis</Label>
          <Input
            id={`${idPrefix}-bis`}
            type="date"
            required
            className="w-40"
            value={werte.bis}
            min={werte.von || undefined}
            onChange={(e) => onChange({ ...werte, bis: e.target.value, halberTag: e.target.value === werte.von && werte.halberTag })}
          />
        </div>
        <div className="flex items-center gap-2 pb-2">
          <Checkbox
            id={`${idPrefix}-halb`}
            checked={werte.halberTag && einzelnerTag}
            disabled={!einzelnerTag}
            onCheckedChange={(wert) => onChange({ ...werte, halberTag: wert === true })}
          />
          <Label htmlFor={`${idPrefix}-halb`} className="font-normal">
            halber Tag
          </Label>
        </div>
      </div>
      {gueltig && vorschau?.fuer === schluessel && (
        <p
          className={vorschau.fehler ? "text-sm text-destructive" : "rounded-md bg-muted px-3 py-2 text-sm"}
          aria-live="polite"
        >
          {vorschau.text}
        </p>
      )}
    </div>
  );
}
