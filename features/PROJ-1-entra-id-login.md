# PROJ-1: Entra-ID-Login mit Rollen (Bearbeiter/Freigeber)

## Status: Planned
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

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
