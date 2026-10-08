import { test, expect } from "@playwright/test";

// Wie bei PROJ-1/PROJ-4: der echte Microsoft-Login lässt sich nicht
// automatisiert durchspielen, und Firma/Standort kommen aus der produktiven
// Dataverse-Umgebung. Diese Suite deckt den Routen-Schutz der von PROJ-10
// betroffenen Seiten ab; Auswahl, Header, Listen und PDF wurden am 2026-10-08
// vom Nutzer im Browser geprüft bzw. sind durch Unit-Tests abgedeckt — siehe
// QA Test Results in features/PROJ-10-standort-als-arbeitskontext.md.

test.describe("PROJ-10: Standort als Arbeitskontext — Zugriffsschutz", () => {
  test("the start page with the Firma and Standort selection redirects to /login without a session", async ({ page }) => {
    await page.goto("/start");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("the Standort-scoped device list redirects to /login without a session", async ({ page }) => {
    await page.goto("/geraete");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("the Standort-scoped Prüfberichte overview redirects to /login without a session", async ({ page }) => {
    await page.goto("/pruefberichte");
    await expect(page).toHaveURL(/\/login$/);
  });
});
