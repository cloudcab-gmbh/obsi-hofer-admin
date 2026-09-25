import { AppHeader } from "@/components/app-header";

// Die eigentliche Zugriffsprüfung (Session + Rollen-Check, Redirect zu
// /login bzw. /kein-zugang) läuft bereits in middleware.ts — hier nur noch
// der Seitenrahmen.
export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <AppHeader />
      {children}
    </div>
  );
}
