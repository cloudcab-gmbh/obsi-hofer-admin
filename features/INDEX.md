# Feature Index

> Central tracking for all features. Updated by skills automatically.

## Status Legend
- **Roadmap** - `/init` done, feature identified in feature map, no spec file yet
- **Planned** - `/write-spec` done, full spec written, architecture not yet designed
- **Architected** - `/architecture` done, tech design approved, ready to build
- **In Progress** - `/frontend` or `/backend` active or completed, not yet in QA
- **In Review** - `/qa` active, testing in progress
- **Approved** - `/qa` passed, no critical/high bugs, ready to deploy
- **Deployed** - `/deploy` done, live in production

## Features

| ID | Feature | Status | Spec | Created |
|----|---------|--------|------|---------|
| PROJ-1 | Entra-ID-Login mit Rollen (Bearbeiter/Freigeber) | Deployed | [Spec](../features/PROJ-1-entra-id-login.md) | 2026-09-25 |
| PROJ-2 | Dataverse-Web-API-Anbindung | Deployed | [Spec](../features/PROJ-2-dataverse-web-api-anbindung.md) | 2026-09-25 |
| PROJ-3 | Geräte-Verwaltung | Deployed | [Spec](../features/PROJ-3-geraete-verwaltung.md) | 2026-09-25 |
| PROJ-4 | Prüfberichte-Verwaltung | In Review | [Spec](../features/PROJ-4-pruefberichte-verwaltung.md) | 2026-09-25 |
| PROJ-5 | Sync-Freigabe pro Firma | Roadmap | — | 2026-09-25 |
| PROJ-6 | Sync-Status/-Verlauf einsehen | Roadmap | — | 2026-09-25 |
| PROJ-7 | PDF-Export Prüfberichte (kundenspezifisches Template) | Architected | [Spec](../features/PROJ-7-pdf-export-pruefberichte.md) | 2026-10-05 |

<!-- Add features above this line -->

## Next Available ID: PROJ-8

## Dependencies (für /write-spec)
- PROJ-1: None
- PROJ-2: None
- PROJ-3: Requires PROJ-1, PROJ-2
- PROJ-4: Requires PROJ-1, PROJ-2, PROJ-3 (Prüfbericht gehört zu einem Gerät)
- PROJ-5: Requires PROJ-1, PROJ-2 — zusätzlich Cross-Repo-Abhängigkeit: Firma-Filter-Erweiterung des Sync-Endpoints im Kundenportal-Repo (separates Projekt, dort separat einzuplanen)
- PROJ-6: Requires PROJ-5
- PROJ-7: Requires PROJ-3, PROJ-4 (braucht Geräte- und Prüfbericht-Daten als Quelle für den PDF-Export)

## Empfohlene Baureihenfolge
1. PROJ-1 und PROJ-2 parallel (beide unabhängig, beide Grundlage für alles Weitere)
2. PROJ-3 (Geräte-Verwaltung)
3. PROJ-4 (Prüfberichte-Verwaltung, baut auf Geräte auf)
4. PROJ-5 (Sync-Freigabe pro Firma) — vorher/parallel: Firma-Filter im Kundenportal-Repo umsetzen
5. PROJ-6 (Sync-Status/-Verlauf, P1, kann auch später folgen)
6. PROJ-7 (PDF-Export, kann unabhängig von PROJ-5/6 jederzeit nach PROJ-4 gebaut werden)
