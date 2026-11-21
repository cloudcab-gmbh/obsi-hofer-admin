import { test, expect } from "@playwright/test";

// Wie bei PROJ-13–17: Der echte Entra-Login ist nicht automatisierbar —
// automatisiert ist der Zugriffsschutz ohne Sitzung. Rollen-Umleitungen
// (nur Mitarbeiter → /mein-zeitnachweis) prüfen die Unit-Tests von proxy.ts,
// Inhalte hat der Nutzer im Browser geprüft (siehe QA Test Results in
// features/PROJ-20-eigener-zeitnachweis-mitarbeitende.md).

test.describe("PROJ-20: Eigener Zeitnachweis — Zugriffsschutz", () => {
  for (const pfad of ["/mein-zeitnachweis", "/mein-zeitnachweis?monat=2026-10", "/mein-zeitnachweis?person=anna%40example.ch"]) {
    test(`${pfad} redirects to /login without a session`, async ({ page }) => {
      await page.goto(pfad);
      await expect(page).toHaveURL(/\/login$/);
    });
  }
});
