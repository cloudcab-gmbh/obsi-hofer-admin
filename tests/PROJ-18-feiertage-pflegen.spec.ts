import { test, expect } from "@playwright/test";

// Wie bei PROJ-13–17: Login nicht automatisierbar — automatisiert ist der
// Zugriffsschutz; Übernehmen, Pflegen und Zurücksetzen prüft der Nutzer lokal.

test.describe("PROJ-18: Feiertage im Tool pflegen — Zugriffsschutz", () => {
  test("the Feiertage page redirects to /login without a session", async ({ page }) => {
    await page.goto("/zeiterfassung/feiertage?jahr=2027");
    await expect(page).toHaveURL(/\/login$/);
  });
});
