import { test, expect } from "@playwright/test";

// Wie bei PROJ-8/PROJ-14: der echte Microsoft-Login lässt sich nicht
// automatisiert durchspielen, und Nachtragen schreibt in Dataverse.
// Automatisiert ist daher der Zugriffsschutz; Auswahl, Tageszeilen, Hinweise
// und das Nachtragen von "Gehen" hat der Nutzer am 2026-10-27 lokal im
// Browser geprüft — siehe QA Test Results in
// features/PROJ-13-zeitnachweis-pro-monat.md. Die Rechenregeln und die
// Freigeber-Sperre der Aktion sind per Unit-Test abgedeckt.

test.describe("PROJ-13: Zeitnachweis pro Monat — Zugriffsschutz", () => {
  test("the Zeitnachweis with person and month redirects to /login without a session", async ({ page }) => {
    await page.goto("/zeiterfassung?person=anna%40example.ch&monat=2026-10");
    await expect(page).toHaveURL(/\/login$/);
  });
});
