import { test, expect } from "@playwright/test";

// Wie bei PROJ-8: der echte Microsoft-Login lässt sich nicht automatisiert
// durchspielen, und Speichern schreibt in die Dataverse-Umgebung.
// Automatisiert ist daher der Zugriffsschutz; die Bedienung (Personenliste,
// Name/Startsaldo, Versionen anlegen/korrigieren/löschen) hat der Nutzer am
// 2026-10-27 lokal im Browser geprüft — siehe QA Test Results in
// features/PROJ-14-arbeitsmodell-pro-person.md. Die Freigeber-Sperre für
// eingeloggte Bearbeiter ist per Unit-Test (zeiterfassung/personen/actions.test.ts)
// abgedeckt.

test.describe("PROJ-14: Arbeitsmodell pro Person — Zugriffsschutz", () => {
  for (const pfad of ["/zeiterfassung", "/zeiterfassung/personen", "/zeiterfassung/personen/anna%40example.ch"]) {
    test(`${pfad} redirects to /login without a session`, async ({ page }) => {
      await page.goto(pfad);
      await expect(page).toHaveURL(/\/login$/);
    });
  }
});
