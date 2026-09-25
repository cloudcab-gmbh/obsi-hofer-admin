import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { signIn } from "@/auth";

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
          <form
            action={async () => {
              "use server";
              await signIn("microsoft-entra-id", { redirectTo: "/start" });
            }}
          >
            <Button type="submit" className="w-full">
              Mit Microsoft anmelden
            </Button>
          </form>
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
