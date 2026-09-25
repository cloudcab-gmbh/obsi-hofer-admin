# PROJ-1: Entra-ID-Login mit Rollen (Bearbeiter/Freigeber)

## Status: In Progress
**Created:** 2026-09-25
**Last Updated:** 2026-09-25

## Dependencies
- None

## User Stories
- Als Bearbeiter möchte ich mich mit meinem bestehenden Microsoft-365-Konto anmelden können, ohne ein zusätzliches Passwort verwalten zu müssen.
- Als Freigeber möchte ich dieselbe Anmeldung nutzen können wie ein Bearbeiter, zusätzlich aber Zugriff auf die Sync-Freigabe-Funktion haben.
- Als Admin (Betreiber) möchte ich Rollen zentral über Entra-ID-App-Roles vergeben/entziehen, ohne eine eigene Nutzerverwaltung im Tool pflegen zu müssen.
- Als Nutzer mit einem gültigen OBSI-Hofer-Konto, aber ohne zugewiesene Rolle, möchte ich eine klare Meldung sehen, warum ich keinen Zugriff habe, statt eines kryptischen Fehlers.

## Out of Scope
- Externe/persönliche Microsoft-Konten oder andere Tenants — nur der interne OBSI-Hofer-Firmen-Tenant ist zugelassen
- Selbstregistrierung oder Rollen-Selbstzuweisung — Rollen werden ausschliesslich manuell von einem Entra-ID-Admin vergeben
- Getrennte, sich nicht überschneidende Rollen — bewusst nicht so, siehe Product Decisions (Freigeber ist eine Erweiterung von Bearbeiter)
- Sofortige (Echtzeit-)Sperrung bei Rollenentzug — greift erst beim nächsten Token-Refresh
- E-Mail-Einmalcode oder Passkey-Login (wie im Kunden-Self-Service-Portal) — hier ausschliesslich Entra-ID-SSO, da interne Konten ohnehin existieren
- Dritte Rolle für reinen Lesezugriff — aktuell nicht benötigt, siehe Open Questions

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

- [ ] Angenommen ein Mitarbeiter mit einem OBSI-Hofer-Microsoft-365-Konto meldet sich an, wenn die Anmeldung erfolgreich ist und eine Rolle zugewiesen ist, dann wird er ins Tool eingeloggt
- [ ] Angenommen ein Mitarbeiter hat die Rolle "Freigeber", wenn er eingeloggt ist, dann hat er sowohl Zugriff auf Bearbeiter-Funktionen als auch auf die Sync-Freigabe
- [ ] Angenommen ein Mitarbeiter hat nur die Rolle "Bearbeiter", wenn er eingeloggt ist, dann sieht/nutzt er keine Sync-Freigabe-Funktion
- [ ] Angenommen ein Konto hat weder die Rolle Bearbeiter noch Freigeber, wenn die Anmeldung erfolgreich verläuft, dann landet der Nutzer auf einer "Kein Zugang"-Seite statt im Tool
- [ ] Angenommen jemand versucht sich mit einem Konto ausserhalb des OBSI-Hofer-Tenants anzumelden, wenn die Anmeldung versucht wird, dann wird sie abgelehnt
- [ ] Angenommen ein Nutzer klickt auf "Abmelden", wenn das passiert, dann wird sowohl die lokale Sitzung als auch die Microsoft-Sitzung beendet (federated logout)
- [ ] Angenommen eine Rolle wird einem Nutzer entzogen, während er eingeloggt ist, wenn sein Token das nächste Mal erneuert wird, dann verliert er den entsprechenden Zugriff

## Edge Cases
- Nutzer bricht den Microsoft-Login-Dialog ab → zurück auf die Login-Seite, keine Fehlermeldung nötig (normales Abbrechen)
- Nutzer hat sowohl Bearbeiter- als auch Freigeber-Rolle explizit zugewiesen → wird wie ein Freigeber behandelt (höhere Berechtigung gewinnt)
- Token läuft während einer aktiven Aktion ab (z.B. mitten im Ausfüllen eines Formulars) → automatischer Silent-Refresh im Hintergrund, bei Fehlschlag Redirect zur erneuten Anmeldung
- Erste Einrichtung: noch niemandem ist eine Rolle zugewiesen → jeder (auch der Betreiber selbst) landet zunächst auf "Kein Zugang", bis die App Roles in Entra konfiguriert sind

## Technical Requirements (optional)
- Security: nur Single-Tenant-App-Registrierung (OBSI-Hofer-eigener Firmen-Tenant), Standard-OAuth2/OIDC-Flow
- Security: Rollenprüfung basiert auf Entra-ID-App-Role-Claims im Token, keine eigene Rollen-Datenbank (siehe PRD Constraints: keine eigene Datenbank für dieses Projekt)
- Security: Federated Logout (beendet auch die Microsoft-eigene Sitzung, nicht nur die lokale) — siehe Product Decisions für den Hintergrund

## Open Questions
- [ ] Wird künftig eine dritte Rolle (z.B. reiner Lesezugriff) benötigt? Aktuell nicht vorgesehen, bei Bedarf in `/refine PROJ-1` nachziehen
- [ ] Echter Login-Flow mit einem echten Microsoft-Konto steht noch aus — dafür muss der Nutzer zuerst die App-Registrierung im Entra Admin Center einrichten (siehe Implementation Notes, Setup-Schritte). Bis dahin bleibt der Happy Path nur strukturell (Redirect-Logik), nicht end-to-end verifiziert

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Freigeber ist eine Erweiterung von Bearbeiter, keine getrennten/exklusiven Rollen | Vermeidet unnötige Rollen-Kombinatorik bei einer kleinen, vertrauenswürdigen Nutzergruppe | 2026-09-25 |
| Kein Zugang ohne zugewiesene Rolle, auch bei gültigem Tenant-Konto | Konsistent mit dem "Kein Zugang"-Muster des Kunden-Self-Service-Portals; keine impliziten Standard-Rechte | 2026-09-25 |
| Rollenentzug wirkt erst beim nächsten Token-Refresh (typisch ~1h), nicht sofort | Vermeidet Live-Graph-API-Abfragen pro Request; akzeptables Risiko bei kleiner, vertrauenswürdiger Nutzergruppe | 2026-09-25 |
| Federated Logout von Anfang an eingeplant, nicht nachträglich | Gelernt aus dem separaten Kundenportal-Projekt (dortiges PROJ-2, Entra-External-ID-Phase): dieser Bug wurde dort erst nachträglich entdeckt und gefixt — hier gleich richtig umgesetzt | 2026-09-25 |
| Rollen ausschliesslich über Entra-ID-App-Roles, keine eigene Rollen-Tabelle | Konsistent mit der PRD-Entscheidung "keine eigene Datenbank für dieses Projekt" | 2026-09-25 |

### Technical Decisions
<!-- Added by /architecture -->
| Decision | Rationale | Date |
|----------|-----------|------|
| Auth.js mit Microsoft-Entra-ID-Provider (Single-Tenant, Workforce-Tenant) statt eigenem Login-Formular | OBSI-Hofer-Mitarbeitende haben bereits ein Microsoft-365-Konto; kein zusätzliches Passwort, keine eigene Nutzerverwaltung nötig | 2026-09-25 |
| Keine eigene Datenbank/Tabelle für Rollen — Rollen ausschliesslich aus dem Entra-ID-Token gelesen | Entra ID pflegt das bereits zuverlässig; eine zweite Datenquelle für dieselbe Information wäre nur ein Risiko für Widersprüche | 2026-09-25 |
| Federated Logout von Anfang an eingeplant (nicht nachträglich) | Vermeidet den im Kundenportal-Projekt (dortiges PROJ-2, Entra-External-ID-Phase) erst nachträglich gefundenen Bug, bei dem die Microsoft-Sitzung nach dem Abmelden weiterlief | 2026-09-25 |
| Zugriffsprüfung komplett in `src/proxy.ts` (kein zusätzlicher Server-Layout-Check) | Rollen stecken direkt im JWT, keine Datenbank-Abfrage nötig — anders als beim Kundenportal-Projekt, das dafür einen separaten `(protected)/layout.tsx`-Check brauchte, weil Middleware dort keine DB erreichen konnte | 2026-09-25 |
| Datei heisst `src/proxy.ts`, nicht `middleware.ts`, und liegt unter `src/`, nicht im Root | Next.js 16 hat `middleware.ts` durch `proxy.ts` ersetzt (alte Datei wird kommentarlos ignoriert); bei einem `src/`-Layout muss `proxy.ts` auf gleicher Ebene wie `src/app` liegen, sonst ebenfalls stillschweigend wirkungslos — beides live erprobt, siehe Implementation Notes | 2026-09-25 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### A) Komponentenstruktur
```
Login-Seite
└── "Mit Microsoft anmelden"-Button

Nach Anmeldung: geschützter Bereich (App-Rahmen)
├── Kopfzeile (Name des Nutzers, Abmelden-Button)
├── Navigation (Menüpunkt "Sync-Freigabe" nur sichtbar für Freigeber)
└── Seiteninhalt (je nach Bereich: Geräte, Prüfberichte, Sync-Freigabe)

Kein-Zugang-Seite (bei erfolgreicher Anmeldung, aber ohne zugewiesene Rolle)
└── Hinweistext + Abmelden-Button
```

### B) Datenmodell (in einfachen Worten)
Keine eigene Datenbank für Nutzer/Rollen. Alles, was die App über einen Nutzer weiss, kommt direkt aus dem Microsoft-Anmeldevorgang: Name, E-Mail-Adresse, und die Liste zugewiesener Rollen ("Bearbeiter", "Freigeber") — diese Liste wird ausschliesslich in Microsoft Entra ID gepflegt. Die App merkt sich pro Sitzung nur, ob die Person angemeldet ist und welche Rollen im Token stehen.

### C) Tech-Entscheidungen
Siehe Technical Decisions oben.

### D) Abhängigkeiten
Auth.js mit Microsoft-Entra-ID-Baustein (Single-Tenant) — keine weiteren neuen Pakete nötig.

## Implementation Notes (Frontend)

- Neue Seiten: `src/app/login/page.tsx` (Anmelde-Button), `src/app/kein-zugang/page.tsx`, `src/app/(protected)/start/page.tsx` (Platzhalter-Startseite, da Geräte-Verwaltung/PROJ-3 noch nicht existiert) mit `src/app/(protected)/layout.tsx` als umschliessendes Layout.
- Neue Komponente `src/components/app-header.tsx`: Logo, Navigation (Geräte/Prüfberichte immer sichtbar, "Sync-Freigabe" nur für Freigeber), Nutzername, Abmelden-Button, Dark-Mode-Toggle.
- **TEMPORÄR:** `src/lib/auth/mock-session.ts` liefert eine feste Fake-Session (Name, E-Mail, Rollen) für die visuelle Vorschau — echte Auth.js/Entra-ID-Session-Anbindung folgt in `/backend`. Wird dort vollständig ersetzt/gelöscht.
- Design-System (`docs/design-system.md`, `globals.css`, Logo-Assets) 1:1 vom Kundenportal-Projekt übernommen, keine Anpassungen nötig für diese Seiten.
- `src/app/page.tsx` (Root) leitet auf `/login` weiter, identisches Muster zum Kundenportal-Projekt.
- Stolperstein: `(protected)/page.tsx` (leere Route-Gruppe) hätte mit dem Root-`page.tsx` auf dieselbe URL `/` kollidiert — Next.js liess das ohne Fehlermeldung durchgehen, die Seite wäre aber nie erreichbar gewesen. Nach `src/app/(protected)/start/page.tsx` verschoben (eigener URL-Pfad `/start`).
- Visuell geprüft (Playwright-Skript, `chromium-cli` war in dieser Umgebung nicht verfügbar): `/login`, `/start`, `/kein-zugang` — alle drei rendern korrekt mit Design-System (Bergfoto-Hintergrund, Stahlblau-Button, korrekte Header-Navigation inkl. rollenabhängigem "Sync-Freigabe"-Link), keine Konsolen-Fehler.
- `npx tsc --noEmit`, `npx eslint .` und `npm run build` laufen fehlerfrei durch.

## Implementation Notes (Backend)

- `next-auth@beta` (Auth.js v5) installiert — passendes Werkzeug für App-Router-Anwendungen mit Microsoft-Entra-ID-SSO.
- `src/auth.ts`: NextAuth-Konfiguration mit `MicrosoftEntraID`-Provider (Single-Tenant, Issuer `https://login.microsoftonline.com/<TENANT_ID>/v2.0`). `jwt`/`session`-Callbacks übernehmen die `roles`-Claim aus dem ID-Token ins Session-Objekt (`session.user.roles`).
- `types/next-auth.d.ts`: Modul-Erweiterung, damit `session.user.roles` typsicher ist.
- `src/app/api/auth/[...nextauth]/route.ts`: exportiert `GET`/`POST` aus den Auth.js-`handlers`.
- **Wichtiger technischer Fund — Next.js 16 `proxy.ts` (zweiter Fall dieser Art im Projektumfeld):** Next.js 16 hat `middleware.ts` zu `proxy.ts` umbenannt (`middleware.ts` wird jetzt **kommentarlos ignoriert**, keine Fehlermeldung, keine Warnung — siehe `node_modules/next/dist/docs/.../middleware.md`). Zusätzlich muss `proxy.ts` bei einem Projekt mit `src/`-Verzeichnis **unter `src/proxy.ts`** liegen (auf gleicher Ebene wie `src/app`), **nicht im Projekt-Root** — anders als `middleware.ts` im separaten Kundenportal-Projekt, das bewusst im Root liegt (dort ein anderer, ebenfalls Next-16-spezifischer Namens-Stolperstein, siehe dessen PROJ-2 Decision Log). Beide Abweichungen (falscher Name, falscher Ort) scheitern **ohne jede Fehlermeldung** — die Datei wird einfach nie aufgerufen, was das Debuggen erschwert hat. Gefunden durch einen minimalen Test-Proxy mit unbedingtem Redirect + `console.error`-Debug-Ausgabe, die trotz Server-Neustart und geleertem `.next`-Cache nie erschien, bis die Datei nach `src/proxy.ts` verschoben wurde.
- `src/proxy.ts` (ehemals als `middleware.ts` geplant): grobe Zugriffsprüfung direkt über die JWT-Session (`auth()`-Wrapper von Auth.js) — kein Login → `/login`, Login ohne Rolle → `/kein-zugang`, bereits eingeloggt mit Rolle auf `/login`/`/kein-zugang` → `/start`. Keine Datenbank-Abhängigkeit nötig (anders als beim Kundenportal-Projekt), da die Rollen direkt im Token stecken.
- `src/lib/auth/sign-out.ts`: Federated Logout — `signOut({ redirect: false })` beendet die eigene Session, danach expliziter Redirect zu Microsofts `oauth2/v2.0/logout`-Endpoint mit `post_logout_redirect_uri` zurück auf `/login`. Von Anfang an eingeplant (siehe Product Decisions), nicht erst nachträglich gefunden wie im Kundenportal-Projekt.
- `login/page.tsx`, `app-header.tsx`, `(protected)/start/page.tsx`, `kein-zugang/page.tsx`: von der temporären Mock-Session (`src/lib/auth/mock-session.ts`, jetzt gelöscht) auf die echte Auth.js-Session (`auth()`) bzw. echten Sign-in/Sign-out umgestellt.
- `.env.local.example` bereinigt: die beim Projekt-Bootstrap unreflektiert vom Kundenportal-Repo mitkopierten Supabase-/`SYNC_API_KEY`-Variablen (dort PROJ-1 = Dataverse-Sync-Service, in diesem Projekt existiert kein eigenes Supabase — siehe PRD-Constraint) entfernt, dafür Auth.js/Entra-ID-Variablen sowie Platzhalter für die spätere Dataverse- und Sync-Freigabe-Anbindung (PROJ-2/PROJ-5) ergänzt.
- Zusätzlich fehlte `src/test/setup.ts` (von Vitest via `vitest.config.ts` referenziert, aber beim Bootstrap vergessen) — nachträglich vom Kundenportal-Repo ergänzt (`import '@testing-library/jest-dom'`), sonst hätte kein einziger Test gestartet.
- 9 neue Tests in `src/proxy.test.ts`: `@/auth`s `auth()`-Wrapper wird als Identitätsfunktion gemockt, damit der eigentliche Redirect-Callback direkt mit frei konstruierten Fake-Sessions (kein Login / Login ohne Rolle / Bearbeiter / Freigeber, auf verschiedenen Pfaden) geprüft werden kann — deckt alle Verzweigungen der Zugriffsprüfung ab.
- **Nicht automatisiert testbar:** der komplette echte OAuth-Redirect-/Callback-Flow mit einem echten Microsoft-Konto — dafür fehlt die Azure-App-Registrierung (siehe Open Questions/Setup-Schritte unten). Strukturell geprüft: unangemeldeter Zugriff auf eine geschützte Seite wird korrekt zu `/login` umgeleitet (lokaler Dev-Server, Platzhalter-Zugangsdaten in `.env.local`, echte Anmeldung damit nicht möglich, aber die Redirect-Logik selbst schon).
- `npx tsc --noEmit`, `npx eslint .`, `npx vitest run` (9 Tests) und `npm run build` laufen fehlerfrei durch.

### Setup-Schritte für den Nutzer (Azure Entra Admin Center, OBSI-Hofer-Firmen-Tenant)

1. **App registrations → New registration**
   - Name: z.B. "OBSI Hofer Admin"
   - Supported account types: "Accounts in this organizational directory only" (Single-Tenant)
   - Redirect URI (Web): `http://localhost:3000/api/auth/callback/microsoft-entra-id` für lokale Entwicklung; die Produktions-URL-Variante nach dem ersten Deploy ergänzen
2. **Certificates & secrets → New client secret** — den Wert sofort kopieren (wird nur einmal angezeigt)
3. Auf der Overview-Seite **Application (client) ID** und **Directory (tenant) ID** notieren
4. **App roles → Create app role** — zwei Rollen anlegen: "Bearbeiter" (Value: `bearbeiter`) und "Freigeber" (Value: `freigeber`), Allowed member types: Users/Groups
5. **Enterprise applications** → diese App suchen → **Users and groups** → einzelnen Personen die Rolle "Bearbeiter" bzw. "Freigeber" zuweisen
6. `.env.local` befüllen (siehe `.env.local.example`): `AUTH_SECRET` (z.B. via `npx auth secret` erzeugen), `AUTH_URL`, `AUTH_MICROSOFT_ENTRA_ID_ID`/`_SECRET`/`_TENANT_ID`

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
