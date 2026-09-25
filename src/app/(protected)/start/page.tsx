import { getMockSession } from "@/lib/auth/mock-session";

export default function ProtectedHomePage() {
  const session = getMockSession();

  return (
    <main className="flex flex-col items-center justify-center gap-2 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">Willkommen, {session?.name}</h1>
      <p className="text-muted-foreground">
        Ihre Rollen: {session?.rollen.join(", ")}
      </p>
    </main>
  );
}
