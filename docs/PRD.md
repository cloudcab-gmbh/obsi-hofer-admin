# Product Requirements Document

## Vision
Internes Admin-Tool für OBSI Hofer GmbH, mit dem mehrere Mitarbeitende Geräte- und Prüfbericht-Daten direkt in Dataverse erfassen und pflegen können, und mit dem der Sync zum Kunden-Self-Service-Portal gezielt pro Firma per Freigabe statt automatisch nachts ausgelöst wird — als Ersatz für die bisherige direkte Bearbeitung in Dataverse/Dynamics.

## Target Users
Mehrere interne Mitarbeitende der OBSI Hofer GmbH, in zwei Rollen:
- **Bearbeiter:** erfassen/pflegen Geräte und Prüfberichte
- **Freigeber/Admin:** zusätzlich berechtigt, den Sync pro Firma auszulösen

Anmeldung über das bestehende Microsoft-365-/Entra-ID-Konto (interner Firmen-Tenant, nicht der externe Kunden-CIAM-Tenant).

## Core Features (Roadmap)

| Priority | Feature | Status |
|----------|---------|--------|
| P0 (MVP) | Microsoft-Entra-ID-Login mit Rollen (Bearbeiter/Freigeber via App Roles) | Deployed |
| P0 (MVP) | Dataverse-Web-API-Anbindung (Auth + generische Read/Write-Hilfsfunktionen) | Roadmap |
| P0 (MVP) | Geräte-Verwaltung (Anzeigen, Bearbeiten, Neuanlage, live gegen Dataverse) | Roadmap |
| P0 (MVP) | Prüfberichte-Verwaltung (Erfassen, Bearbeiten, Stornieren statt Löschen) | Roadmap |
| P0 (MVP) | Sync-Freigabe pro Firma (löst den angepassten Kundenportal-Sync-Endpoint gezielt für eine Firma aus) | Roadmap |
| P1 | Sync-Status/-Verlauf einsehen (letzter Lauf pro Firma, Erfolg/Fehler, Zeitpunkt) | Roadmap |

## Success Metrics
- Keine direkte Dateneingabe mehr in Dataverse/Dynamics nötig für Geräte/Prüfberichte
- Sync läuft zuverlässig genau dann, wenn die Daten einer Firma aktuell/fertig bearbeitet sind
- Reduzierte Fehleranfälligkeit bei der Dateneingabe gegenüber direkter Dataverse-Bearbeitung

## Constraints
- Team: 1 Entwickler (Nutzer selbst), mehrere interne Nutzer (Bearbeiter/Freigeber)
- Backend: Dataverse Web API direkt, kein eigenes Supabase-Projekt — Rollen über Entra-ID-App-Roles, keine eigene Datenbank
- Sync-Trigger ruft den bestehenden `/api/cron/sync-dataverse`-Endpoint des Kundenportal-Repos auf (mit `CRON_SECRET`) — keine Duplikation der Sync-Logik
- **Cross-Repo-Abhängigkeit:** Der bestehende Sync-Endpoint muss im Kundenportal-Repo (separates Projekt) um einen optionalen Firma-Filter erweitert werden (aktuell synct er global) — Voraussetzung für die Sync-Freigabe-Feature. Artikel (`dv_artikel`, firmenübergreifende Stammdaten) werden bei jeder Firma-Freigabe der Einfachheit halber mitsynchronisiert (kleine Datenmenge)
- Der bisherige automatische nächtliche Cron-Trigger (`vercel.json`, 03:00 Uhr) im Kundenportal-Repo entfällt vollständig
- Design: übernimmt das bestehende Design-System des Kundenportals (`globals.css`, Stahlblau-Palette) sowie shadcn/ui-Komponenten
- Auth: Microsoft Entra ID, interner OBSI-Hofer-Firmen-Tenant

## Non-Goals
- Keine Bearbeitung von Firmen/Kontakten/Artikeln (bleiben Stammdaten, weiterhin direkt in Dataverse gepflegt)
- Kein echtes Löschen von Prüfberichten (nur Stornieren/Ungültig-Markierung)
- Kein Kundenzugriff — rein internes Tool
- Keine eigene Datenbank/kein Supabase-Projekt für dieses Tool
- Keine automatische/geplante Ausführung des Syncs — ausschliesslich manuell per Firma-Freigabe

---

Use `/write-spec` to create detailed feature specifications for each item in the roadmap above.
