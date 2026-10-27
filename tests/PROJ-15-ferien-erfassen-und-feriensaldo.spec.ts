import { test, expect } from "@playwright/test";

// Wie bei PROJ-13/14: der Microsoft-Login lässt sich nicht automatisiert
// durchspielen, und Erfassen/Löschen schreibt in Dataverse. Automatisiert ist
// der Zugriffsschutz; Erfassen, Vorschau, halber Tag, Frei und Löschen hat der
// Nutzer am 2026-10-27 lokal im Browser geprüft — siehe QA Test Results in
// features/PROJ-15-ferien-erfassen-und-feriensaldo.md. Regeln und
// Freigeber-Sperre der Aktionen sind per Unit-Test abgedeckt.

test.describe("PROJ-15: Ferien erfassen und Feriensaldo — Zugriffsschutz", () => {
  test("the Ferien page redirects to /login without a session", async ({ page }) => {
    await page.goto("/zeiterfassung/ferien?jahr=2026&person=anna%40example.ch");
    await expect(page).toHaveURL(/\/login$/);
  });
});
