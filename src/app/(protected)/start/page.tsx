import { auth } from "@/auth";

export default async function ProtectedHomePage() {
  const session = await auth();

  return (
    <main className="flex flex-col items-center justify-center gap-2 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">Willkommen, {session?.user?.name}</h1>
      <p className="text-muted-foreground">
        Ihre Rollen: {session?.user?.roles?.join(", ") || "keine"}
      </p>
    </main>
  );
}
