import { test, expect } from "@playwright/test";

// Wie bei PROJ-1: der echte Microsoft-Login lässt sich nicht automatisiert
// durchspielen, und die Funktionen selbst schreiben in die produktive
// Dataverse-Umgebung. Diese Suite deckt daher den Routen-Schutz aller
// PROJ-4-Seiten ab. Anlegen, Bearbeiten und Stornieren wurden am 2026-10-06
// vom Nutzer im Browser durchgeführt und anhand der resultierenden
// Dataverse-Datensätze verifiziert — siehe QA Test Results in
// features/PROJ-4-pruefberichte-verwaltung.md.

const BEISPIEL_ID = "00000000-0000-0000-0000-000000000000";

test.describe("PROJ-4: Prüfberichte-Verwaltung — Zugriffsschutz", () => {
  test("the firmenweite Übersicht /pruefberichte redirects to /login without a session", async ({ page }) => {
    await page.goto("/pruefberichte");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("the form for a new Prüfbericht redirects to /login without a session", async ({ page }) => {
    await page.goto(`/pruefberichte/neu?geraetId=${BEISPIEL_ID}`);
    await expect(page).toHaveURL(/\/login$/);
  });

  test("a Prüfbericht detail page redirects to /login without a session", async ({ page }) => {
    await page.goto(`/pruefberichte/${BEISPIEL_ID}`);
    await expect(page).toHaveURL(/\/login$/);
  });

  test("the Gerät detail page with its Prüfbericht-Historie redirects to /login without a session", async ({ page }) => {
    await page.goto(`/geraete/${BEISPIEL_ID}`);
    await expect(page).toHaveURL(/\/login$/);
  });
});
