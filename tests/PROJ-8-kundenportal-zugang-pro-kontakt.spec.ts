import { test, expect } from "@playwright/test";

// Wie bei PROJ-1/PROJ-4: der echte Microsoft-Login lässt sich nicht
// automatisiert durchspielen, und das Häkchen schreibt in die produktive
// Dataverse-Umgebung. Automatisiert ist daher der Zugriffsschutz; Freigeben
// und Entziehen wurden am 2026-10-06 vom Nutzer im Browser durchgeführt und
// anhand des Dataverse-Datensatzes verifiziert — siehe QA Test Results in
// features/PROJ-8-kundenportal-zugang-pro-kontakt.md. Die Freigeber-Sperre
// für eingeloggte Bearbeiter ist per Unit-Test (sync-freigabe/actions.test.ts)
// abgedeckt.

test.describe("PROJ-8: Kundenportal-Zugang pro Kontakt — Zugriffsschutz", () => {
  test("/sync-freigabe redirects to /login without a session", async ({ page }) => {
    await page.goto("/sync-freigabe");
    await expect(page).toHaveURL(/\/login$/);
  });
});
