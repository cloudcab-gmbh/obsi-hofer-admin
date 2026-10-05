import { test, expect } from "@playwright/test";

// Der echte Microsoft-Login (Benutzername/Passwort/MFA) lässt sich nicht
// automatisiert durchspielen — Microsoft erkennt und blockiert automatisierte
// Logins, und es wären ohnehin echte Zugangsdaten nötig. Diese Suite deckt
// ab, was ohne echte Session automatisierbar ist: Login-Seiten-Inhalt und
// Routen-Schutz. Der komplette Happy Path (Login → Rollen-Check → Redirect)
// wurde am 2026-10-05 manuell mit einem echten Microsoft-Konto verifiziert —
// siehe QA Test Results in features/PROJ-1-entra-id-login.md.

test.describe("PROJ-1: Entra-ID-Login mit Rollen", () => {
  test("login page shows the Microsoft sign-in button, no technical jargon", async ({ page }) => {
    await page.goto("/login");
    // shadcn's CardTitle rendert ein <div>, keine semantische Überschrift —
    // daher getByText statt getByRole("heading").
    await expect(page.getByText("OBSI Hofer Admin")).toBeVisible();
    await expect(page.getByRole("button", { name: "Mit Microsoft anmelden" })).toBeVisible();
  });

  test("visiting a protected page without a session redirects to /login", async ({ page }) => {
    await page.goto("/start");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("/kein-zugang is reachable without a session (so a denied user can still see why)", async ({ page }) => {
    await page.goto("/kein-zugang");
    await expect(page).toHaveURL(/\/kein-zugang$/);
    await expect(page.getByText("Kein Zugang")).toBeVisible();
  });

  test("/login itself is never redirected away without a session", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/\/login$/);
  });
});
