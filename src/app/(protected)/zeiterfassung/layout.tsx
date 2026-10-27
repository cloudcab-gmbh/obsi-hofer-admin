import { aktuellerBenutzerIstFreigeber } from "@/lib/auth/freigeber";
import { ZeiterfassungNav } from "@/components/zeiterfassung-nav";

export default async function ZeiterfassungLayout({ children }: { children: React.ReactNode }) {
  // Unterseiten-Leiste nur für Freigeber; die Seiten prüfen den Zugriff selbst.
  const freigeber = await aktuellerBenutzerIstFreigeber();
  return (
    <>
      {freigeber && (
        <div className="mx-auto max-w-6xl px-4 pt-6">
          <ZeiterfassungNav />
        </div>
      )}
      {children}
    </>
  );
}
