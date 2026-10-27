import { test, expect } from "@playwright/test";

// Wie bei PROJ-13–15: Login nicht automatisierbar — automatisiert ist der
// Zugriffsschutz der Übersicht und des umgezogenen Zeitnachweises. Inhalte hat
// der Nutzer lokal im Browser geprüft (siehe QA Test Results in
// features/PROJ-17-zeiterfassung-uebersicht.md).

test.describe("PROJ-17: Zeiterfassung-Übersicht — Zugriffsschutz", () => {
  for (const pfad of ["/zeiterfassung?monat=2026-10", "/zeiterfassung/zeitnachweis?person=anna%40example.ch&monat=2026-10"]) {
    test(`${pfad} redirects to /login without a session`, async ({ page }) => {
      await page.goto(pfad);
      await expect(page).toHaveURL(/\/login$/);
    });
  }
});
