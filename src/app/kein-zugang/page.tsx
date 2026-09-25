import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { signOutEverywhere } from "@/lib/auth/sign-out";

// Wird gezeigt, wenn die Anmeldung erfolgreich war, aber weder die Rolle
// "Bearbeiter" noch "Freigeber" im Entra-ID-Token steht (siehe PROJ-1
// Acceptance Criteria). Rollen werden ausschliesslich manuell über Entra-ID
// App Roles vergeben, siehe Product Decisions.
export default function KeinZugangPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Kein Zugang</CardTitle>
          <CardDescription>
            Ihrem Konto ist noch keine Rolle für dieses Tool zugewiesen.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            Bitten Sie einen Administrator, Ihnen die Rolle „Bearbeiter“ oder
            „Freigeber“ in Entra ID zuzuweisen.
          </p>
        </CardContent>
        <CardFooter>
          <form action={signOutEverywhere} className="w-full">
            <Button type="submit" variant="outline" className="w-full">
              Abmelden
            </Button>
          </form>
        </CardFooter>
      </Card>
    </main>
  );
}
