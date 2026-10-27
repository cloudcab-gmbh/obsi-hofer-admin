import { aktuellerBenutzerIstFreigeber } from "@/lib/auth/freigeber";
import { ZeiterfassungNav } from "@/components/zeiterfassung-nav";

export default async function ZeiterfassungLayout({ children }: { children: React.ReactNode }) {
  // Unterseiten-Leiste nur für Freigeber; die Seiten prüfen den Zugriff selbst.
  const freigeber = await aktuellerBenutzerIstFreigeber();
  // Nutzerwunsch 2026-10-27: Die Zeiterfassung füllt genau das Fenster unter der
  // Kopfzeile (h-14); gescrollt wird im Inhaltsbereich — der Zeitnachweis nutzt
  // das, damit nur seine Tabelle scrollt.
  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col">
      {freigeber && (
        <div className="mx-auto w-full max-w-6xl shrink-0 px-4 pt-6">
          <ZeiterfassungNav />
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
