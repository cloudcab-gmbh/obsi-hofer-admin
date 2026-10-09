# PROJ-12: Sync-Freigabe und -Verlauf pro Standort

## Status: Planned
**Created:** 2026-10-09
**Last Updated:** 2026-10-09

## Dependencies
- Requires: PROJ-5 (Sync-Freigabe pro Firma) — Button, Bestätigungsdialog, Aufruf des Kundenportal-Syncs
- Requires: PROJ-6 (Sync-Status/-Verlauf) — Verlauf und Dataverse-Tabelle `bmvcc_synclauf`
- Requires: PROJ-10 (Standort als Arbeitskontext) — der aktuelle Standort
- Requires: PROJ-11 (Kundenportal-Zugang pro Standort) — Zugänge pro Standort als Voraussetzung
- **Cross-Repo (Kundenportal, dort separat einzuplanen, zuerst):** Der Sync-Endpoint muss zusätzlich einen Standort annehmen und dann nur diesen Standort übertragen, ohne die übrigen Standorte der Firma im Portal zu verändern
- **Dataverse (vom Nutzer anzulegen):** In der Tabelle der Sync-Läufe eine Spalte "Standort" (Verweis auf Standort) + Rechte für den App-Benutzer
- Hinweis aus dem Kundenportal (2026-10-09): Wechselt ein Standort die Firma, wirkt ein Zugang zu ihm erst wieder, wenn die neue Firma synchronisiert ist

## User Stories
- Als Freigeber möchte ich einen Standort ins Kundenportal übertragen, sobald dessen Prüfungen fertig sind, ohne halbfertige Daten anderer Standorte derselben Firma mitzuschicken.
- Als Freigeber möchte ich im Verlauf sehen, wann der aktuelle Standort zuletzt übertragen wurde und mit welchem Ergebnis — einschliesslich der früheren Übertragungen der ganzen Firma.
- Als Freigeber möchte ich bei Firmen mit nur einem Standort genauso arbeiten wie bisher.
- Als Freigeber möchte ich im Bestätigungsdialog eindeutig sehen, welcher Standort welcher Firma übertragen wird.
- Als OBSI Hofer möchte ich, dass ein Standort nur übertragen wird, wenn dort jemand Zugang hat (oder ein entzogener Zugang ins Portal gebracht werden muss).

## Out of Scope
- "Ganze Firma übertragen" als zusätzliche Option — bewusst nicht; es wird immer der aktuelle Standort übertragen (Nutzer-Entscheidung)
- Mehrere Standorte auf einmal übertragen
- Automatische oder geplante Übertragung (PRD Non-Goal)
- Umbau des Kundenportal-Syncs selbst — eigenes Feature im Kundenportal-Repo
- Nachträgliche Zuordnung alter Firmen-Läufe zu Standorten (sie bleiben "ganze Firma")

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

**Übertragen**
- [ ] Angenommen ein Freigeber hat Firma und Standort gewählt, wenn er "Freigeben & synchronisieren" bestätigt, dann werden nur die Daten dieses Standorts (Geräte, Prüfberichte, Portal-Zugänge zu diesem Standort) samt Firmen-Stammdaten und Artikeln ins Kundenportal übertragen
- [ ] Angenommen ein Standort wird übertragen, dann bleiben die Daten der übrigen Standorte derselben Firma im Kundenportal unverändert
- [ ] Angenommen der Freigeber öffnet den Bestätigungsdialog, dann nennt er Firma und Standort (z.B. "Die Daten von „Bilfinger … AG · Pratteln“ werden übertragen"; bei Firmen mit einem Standort wie bisher nur die Firma)
- [ ] Angenommen die Firma hat genau einen Standort, dann verhält sich der Sync für den Freigeber wie bisher

**Voraussetzung**
- [ ] Angenommen mindestens ein Kontakt mit E-Mail hat Zugang zu diesem Standort, dann ist "Freigeben & synchronisieren" aktiv
- [ ] Angenommen kein Kontakt hat Zugang zu diesem Standort, aber der Standort wurde schon einmal übertragen (durch einen Standort-Lauf oder einen früheren Lauf der ganzen Firma, der nicht vollständig fehlschlug), dann ist der Sync trotzdem möglich — damit ein entzogener letzter Zugang ins Portal gelangt
- [ ] Angenommen kein Kontakt hat Zugang zu diesem Standort und er wurde nie übertragen, dann ist der Button gesperrt mit dem Hinweis, zuerst einen Kontakt für diesen Standort freizugeben
- [ ] Die Voraussetzungen werden serverseitig erneut geprüft (z.B. letzter Zugang in einem anderen Tab entzogen)
- [ ] Angenommen der Standort wurde inzwischen gewechselt (anderer Tab), wenn der Freigeber bestätigt, dann wird nicht übertragen und er wird aufgefordert, die Seite neu zu laden

**Verlauf**
- [ ] Angenommen ein Standort-Lauf wird ausgeführt, dann wird er im Verlauf mit Firma **und** Standort gespeichert (Zeitpunkt, Dauer, Freigeber, Ergebnis wie PROJ-6)
- [ ] Angenommen der Freigeber betrachtet den Verlauf, dann sieht er die Läufe des aktuellen Standorts sowie die früheren Läufe der ganzen Firma (vor PROJ-12), letztere gekennzeichnet als "ganze Firma"; Läufe anderer Standorte erscheinen nicht
- [ ] Angenommen eine Firma ohne Standort (PROJ-11 BUG-2), dann bleibt der bisherige Firmen-Sync für sie möglich (nur Firmen-Stammdaten/Kontakte; Voraussetzung: schon einmal übertragen) und wird als "ganze Firma" protokolliert

**Übergang**
- [ ] Angenommen das Kundenportal unterstützt den Sync pro Standort noch nicht, dann darf das Admin-Tool keinen Standort-Sync auslösen (Reihenfolge: Kundenportal zuerst; Absicherung wie bei PROJ-5, damit ein veraltetes Portal nicht stillschweigend die ganze Firma überträgt)

## Edge Cases
- **Standort wechselt in Dataverse die Firma** → Zugänge zu ihm wirken im Portal erst nach einem Sync bei der neuen Firma (Hinweis Kundenportal); im Admin-Tool erscheint er bei der neuen Firma
- **Gleichnamige Firmen** (Bilfinger) → Dialog und Verlauf nennen den Anzeigenamen mit Standort (PROJ-10)
- **Sync läuft, Freigeber wechselt den Standort** → der bestätigte Standort wird zu Ende übertragen und protokolliert (wie Firmenwechsel in PROJ-5)
- **Sync-Dauer / Zeitüberschreitung** → wie PROJ-5 ("Ergebnis unbekannt"), Verlaufseintrag mit Standort
- **Verlaufseintrag kann nicht gespeichert werden** → Sync-Ergebnis wird trotzdem angezeigt (wie PROJ-6)
- **Alter Firmen-Lauf mit Ergebnis "fehler"** → zählt nicht als "schon übertragen" (Regel aus PROJ-6)
- **Zwei Freigeber übertragen gleichzeitig verschiedene Standorte derselben Firma** → beide Läufe unabhängig, je ein Verlaufseintrag

## Technical Requirements (optional)
- Security: Standort serverseitig gegen den Arbeitskontext geprüft; nur Freigeber
- Der Standort-Parameter darf nie dazu führen, dass mehr als die gewählte Firma übertragen wird (bestehende Absicherungen aus PROJ-5 bleiben)

## Open Questions
- [ ] Kundenportal: Schnittstelle für den Standort (Parametername, Antwortformat, Bestätigung des Umfangs im Ergebnis) — mit dem Kundenportal-Repo abstimmen; Auftrag wie bei PROJ-11 formulieren
- [ ] Werden Kontakte/Zugänge anderer Standorte bei einem Standort-Lauf im Portal unverändert gelassen? (Erwartung: ja) — mit Kundenportal klären
- [ ] Exakter Name der neuen Verlaufsspalte nach dem Anlegen in Dataverse

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Sync überträgt immer nur den aktuellen Standort; keine Option "ganze Firma" | Freigabe genau dann, wenn ein Standort fertig ist; einfache Bedienung (Nutzer-Entscheidung) | 2026-10-09 |
| Verlauf zeigt Läufe des aktuellen Standorts + frühere Firmen-Läufe (gekennzeichnet) | Vollständige Historie, ohne Läufe anderer Standorte (Nutzer-Entscheidung) | 2026-10-09 |
| Voraussetzung: Zugang zu genau diesem Standort, Ausnahme "schon einmal übertragen" (auch durch alten Firmen-Lauf) | Kein Übertragen von Standorten, die niemand sieht; Entzug des letzten Zugangs bleibt übertragbar (Nutzer-Entscheidung, Regel aus PROJ-5/6 übertragen) | 2026-10-09 |
| Kundenportal zuerst, Admin-Tool schaltet danach um; Absicherung gegen ein Portal, das den Standort ignoriert | Gleiche Lehre wie PROJ-5 (Live-Vorfall Gesamt-Sync 2026-10-07) | 2026-10-09 |
| Firmen ohne Standort behalten den Firmen-Sync | Konsistent mit PROJ-11 BUG-2-Fix | 2026-10-09 |

### Technical Decisions
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
