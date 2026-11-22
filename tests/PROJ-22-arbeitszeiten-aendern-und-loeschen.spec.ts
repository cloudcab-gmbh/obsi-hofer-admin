import { test, expect } from "@playwright/test";

// Wie bei PROJ-13/PROJ-20: Der echte Microsoft-Login lässt sich nicht
// automatisiert durchspielen, und Ändern/Löschen schreibt in Dataverse.
// Automatisiert ist daher der Zugriffsschutz. Dialog, Prüfregeln, Markierung
// und Rechte der Server-Aktionen sind per Unit-Test abgedeckt; Korrektur und
// Schutz vor dem SharePoint-Flow hat der Nutzer am 2026-11-22 lokal geprüft
// (siehe QA Test Results in features/PROJ-22-arbeitszeiten-aendern-und-loeschen.md).

test.describe("PROJ-22: Arbeitszeiten ändern und löschen — Zugriffsschutz", () => {
  test("the Freigeber Zeitnachweis (where entries are edited) redirects to /login without a session", async ({ page }) => {
    await page.goto("/zeiterfassung/zeitnachweis?person=anna%40example.ch&monat=2026-11");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("Mein Zeitnachweis (shows only 'korrigiert') redirects to /login without a session", async ({ page }) => {
    await page.goto("/mein-zeitnachweis?monat=2026-11");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("a forged server action request without a session does not reach the action", async ({ request }) => {
    const res = await request.post("/zeiterfassung/zeitnachweis", {
      headers: { "Next-Action": "0000000000000000000000000000000000000000", "Content-Type": "text/plain;charset=UTF-8" },
      data: JSON.stringify([{ eintragId: "37b3cb61-90c0-f111-aaaf-70a8a5061d7a", kommen: "07:00", gehen: "16:00", bemerkung: "" }]),
      maxRedirects: 0,
    });
    // Der Proxy leitet ohne Sitzung auf /login um, bevor eine Aktion läuft.
    expect(res.status()).toBe(307);
    expect(res.headers()["location"]).toMatch(/\/login$/);
  });
});
