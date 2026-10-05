# PROJ-2: Dataverse-Web-API-Anbindung

## Status: Planned
**Created:** 2026-10-05
**Last Updated:** 2026-10-05

## Dependencies
- None (nutzt dieselbe Azure-App-Registrierung wie PROJ-1, technisch aber unabhängig davon)

## User Stories
- Als Backend-Entwickler (für PROJ-3/PROJ-4) möchte ich generische Funktionen zum Lesen, Auflisten, Erstellen und Aktualisieren von Dataverse-Datensätzen haben, damit ich nicht für jede Funktion eigene Authentifizierungs-/Fehlerbehandlungs-Logik schreiben muss.
- Als Bearbeiter/Freigeber (indirekt, über PROJ-3/PROJ-4) möchte ich, dass meine Eingaben bei einem Speicherfehler erhalten bleiben, damit ich nicht von vorne anfangen muss.
- Als Betreiber möchte ich, dass die Schreibrechte des Admin-Tools auf Dataverse klar von den Leserechten des bestehenden Sync-Service (Kundenportal-Projekt) getrennt sind, damit ein Fehler im einen System nicht automatisch Schreibzugriff im anderen bedeutet.

## Out of Scope
- Entity-spezifische Validierung/Business-Regeln (z.B. Pflichtfelder für einen Prüfbericht) — Sache von PROJ-3/PROJ-4
- Löschen von Datensätzen — generell nicht vorgesehen (siehe PRD: kein echtes Löschen, nur Stornieren als Statusänderung)
- Automatisches Retry bei Fehlern — bewusst nicht, siehe Product Decisions
- Separate Azure-App-Registrierung für Dataverse-Zugriff — bewusst dieselbe wie PROJ-1 (Login), siehe Product Decisions
- Direkte Firma/Standort-Verknüpfung am Prüfbericht — nur über das Gerät, siehe Product Decisions
- Caching/Zwischenspeicherung von Dataverse-Daten — bewusst live, siehe PRD Constraints ("live aus Dataverse lesen")
- Konfliktschutz bei gleichzeitiger Bearbeitung — siehe Open Questions

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

- [ ] Angenommen ein gültiger Tabellen-Name und eine ID werden übergeben, wenn ein einzelner Datensatz abgerufen wird, dann werden dessen Felder korrekt zurückgegeben
- [ ] Angenommen ein Filter (z.B. "alle Geräte einer Firma") wird übergeben, wenn Datensätze aufgelistet werden, dann werden nur die passenden Datensätze zurückgegeben
- [ ] Angenommen gültige Daten für ein neues Gerät/einen neuen Prüfbericht werden übergeben, wenn ein Datensatz erstellt wird, dann wird er in Dataverse angelegt und die neue ID zurückgegeben
- [ ] Angenommen gültige Änderungen an einem bestehenden Datensatz werden übergeben, wenn er aktualisiert wird, dann werden die Änderungen in Dataverse übernommen
- [ ] Angenommen Dataverse ist nicht erreichbar oder antwortet mit einem Fehler, wenn ein Lese- oder Schreibvorgang versucht wird, dann wird eine verständliche Fehlermeldung zurückgegeben, ohne dass bereits eingegebene Daten verloren gehen
- [ ] Angenommen der Applikationsbenutzer hat keine ausreichenden Rechte für eine Operation, wenn sie versucht wird, dann wird ein klarer Berechtigungsfehler zurückgegeben statt eines kryptischen Dataverse-Fehlercodes

## Edge Cases
- Zugriffstoken (Client-Credentials-Flow) läuft während eines Vorgangs ab → wird automatisch erneuert, für die aufrufende Stelle transparent
- Dataverse liefert mehr Datensätze zurück als eine einzelne Antwort fasst (Paging) → generische Listen-Funktion muss das handhaben (technisches Detail, siehe Open Questions/`/architecture`)
- Gleichzeitiges Bearbeiten desselben Datensatzes durch zwei Nutzer → kein spezieller Konfliktschutz in dieser Spec vorgesehen (siehe Open Questions)
- Ein referenziertes Gerät existiert nicht (mehr) in Dataverse (z.B. dort gelöscht) → verständliche Fehlermeldung beim Erstellen eines Prüfberichts, kein Absturz

## Technical Requirements (optional)
- Security: Zugangsdaten (Client-ID/Secret) ausschliesslich serverseitig, nie im Client-Bundle
- Security: Applikationsbenutzer-Rechte strikt auf die benötigten Tabellen (Geräte, Prüfberichte) beschränkt — bereits eingerichtet (eigene Security Role, Create/Read/Write auf Organisationsebene)

## Open Questions
- [ ] Soll ein Konfliktschutz für gleichzeitiges Bearbeiten desselben Datensatzes eingebaut werden (z.B. optimistic locking über Dataverse-eigene ETags)? Aktuell nicht vorgesehen, bei wenigen gleichzeitigen internen Nutzern unwahrscheinlich — bei Bedarf in `/refine PROJ-2` nachziehen
- [ ] Wie soll Paging bei grossen Ergebnismengen gehandhabt werden? Technische Entscheidung, wird in `/architecture` geklärt

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Dieselbe Azure-App-Registrierung wie PROJ-1 (Login) wird auch als Dataverse-Applikationsbenutzer verwendet | Technisch möglich (Client-Credentials-Flow parallel zum interaktiven Login); spart eine zweite App-Registrierung/Secret-Verwaltung — der Sicherheitsgewinn einer Trennung wäre bei einem internen 1-Personen-Tool gering, da beide Secrets ohnehin in denselben Vercel-Umgebungsvariablen liegen | 2026-10-05 |
| Eigene, neue Security Role für den Applikationsbenutzer (bestehende Lese-Rolle des Sync-Service bleibt unangetastet) | Hält Schreibrechte des Admin-Tools von den Leserechten des bestehenden Kundenportal-Sync-Service getrennt | 2026-10-05 |
| Prüfberichte referenzieren nur das Gerät, nicht zusätzlich direkt Firma/Standort | Standort/Firma sind über das Gerät eindeutig bestimmt; eine zusätzliche direkte Auswahl wäre redundant und könnte zu Inkonsistenzen führen | 2026-10-05 |
| Fehler werden verständlich an die aufrufende Stelle weitergegeben, kein automatisches Retry | Weniger Komplexität bei einem internen Tool mit wenigen gleichzeitigen Nutzern; eingegebene Daten dürfen dabei nie verloren gehen | 2026-10-05 |
| Generische Listen-/Filter-Funktion ist Teil von PROJ-2, nicht erst PROJ-3/PROJ-4 | Wird von beiden Folge-Features gebraucht, gehört daher zur gemeinsamen Dataverse-Anbindung | 2026-10-05 |
| Keine Löschfunktion | Konsistent mit der projektweiten Entscheidung, Dataverse-Datensätze nie echt zu löschen (nur Stornieren als Statusänderung) | 2026-10-05 |

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
