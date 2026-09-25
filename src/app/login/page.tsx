import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// TEMPORÄR: Der Button navigiert direkt weiter, statt Auth.js/Entra ID
// aufzurufen — echte Anmeldung folgt in /backend (siehe PROJ-1 Tech Design).
export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>OBSI Hofer Admin</CardTitle>
          <CardDescription>
            Melden Sie sich mit Ihrem Microsoft-365-Konto an.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/start">Mit Microsoft anmelden</Link>
          </Button>
        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted-foreground">
            Nur für Mitarbeitende der OBSI Hofer GmbH.
          </p>
        </CardFooter>
      </Card>
    </main>
  );
}
