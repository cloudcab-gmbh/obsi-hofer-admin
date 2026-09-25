import { AppHeader } from "@/components/app-header";

// TEMPORÄR: Echte Zugriffsprüfung (Entra-ID-Session + Rollen-Check, Redirect
// zu /login bzw. /kein-zugang) folgt in /backend (siehe PROJ-1 Tech Design).
export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <AppHeader />
      {children}
    </div>
  );
}
