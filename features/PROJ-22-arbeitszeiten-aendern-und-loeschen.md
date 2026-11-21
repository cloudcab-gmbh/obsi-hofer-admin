# PROJ-22: Arbeitszeiten im Zeitnachweis ändern und löschen

## Status: Planned
**Created:** 2026-11-21
**Last Updated:** 2026-11-21

## Dependencies
- Requires: PROJ-13 (Zeitnachweis für Freigeber) — dort wird geändert und gelöscht
- Requires: PROJ-1 (Rolle Freigeber)
- Betrifft: PROJ-19 (der tägliche SharePoint-Flow des Nutzers schreibt dieselben Einträge und muss geschützte Einträge auslassen), PROJ-15 (Abwesenheiten löschen), PROJ-16 (PDF), PROJ-17 (Übersicht), PROJ-20 (Anzeige „korrigiert“ für Mitarbeitende), PROJ-21 (Korrektur-Anfragen werden hier erledigt; Link der Teams-Karte)
- **Extern (Nutzer):** täglichen SharePoint-Flow anpassen, damit er im Tool korrigierte und im Tool gelöschte Einträge auslässt
- **Reihenfolge:** PROJ-20 und PROJ-21 gehen vor PROJ-22 live (Nutzer-Entscheid 2026-11-21); bis dahin wird direkt in der Dataverse-Tabelle korrigiert

## Ausgangslage
Der Zeitnachweis für Freigeber kann heute nur Einträge hinzufügen („Tag erfassen“), bei offenen Einträgen „Gehen“ nachtragen und Abwesenheiten löschen. Falsch erfasste Arbeitszeiten lassen sich weder ändern noch löschen — weder bei der normalen Pflege noch beim Erledigen einer Korrektur-Anfrage (PROJ-21, QA BUG-1). Die meisten Einträge stammen aus SharePoint und werden vom täglichen Flow übernommen; eine Korrektur in Dataverse darf dabei nicht verloren gehen.

## User Stories
- Als Freigeber möchte ich Kommen und Gehen eines falsch erfassten Arbeitszeit-Eintrags ändern, damit Ist und Gleitzeit stimmen.
- Als Freigeber möchte ich einen falschen Eintrag (Arbeitszeit oder Abwesenheit) löschen, damit er nicht mehr zählt.
- Als Vorgesetzter mit Rolle Freigeber möchte ich eine Korrektur-Anfrage direkt im Zeitnachweis erledigen, auf den der Link in Teams führt.
- Als Freigeber möchte ich sehen, wer wann was korrigiert oder gelöscht hat, damit Änderungen nachvollziehbar bleiben.
- Als Freigeber möchte ich mich darauf verlassen, dass der tägliche SharePoint-Flow eine Korrektur nicht wieder überschreibt.
- Als Mitarbeitender möchte ich in „Mein Zeitnachweis“ sehen, dass ein Eintrag korrigiert wurde.

## Out of Scope
- Ändern durch Bearbeiter oder Mitarbeitende — nur Freigeber
- Ändern von Datum, Person, Art des Eintrags, Mittag-/Abendessen — dafür löschen und mit „Tag erfassen“ neu erfassen
- „Gehen am Folgetag“ (über Mitternacht) beim Ändern (Nutzer-Entscheid: nicht nötig)
- Wiederherstellen gelöschter Einträge — bei Bedarf neu erfassen
- Eigene Änderungshistorie mit allen Versionen — nur letzte Korrektur mit vorherigen Zeiten
- Sperre abgeschlossener Monate
- Zurückschreiben der Korrektur nach SharePoint
- Status einer Korrektur-Anfrage im Tool setzen (bleibt in Teams, PROJ-21)
- Sperre bei gleichzeitigem Bearbeiten — die letzte Speicherung gilt

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

**Ändern**
- [ ] Angenommen ein Freigeber sieht den Zeitnachweis einer Person, wenn er ein Zeitpaar in der Spalte „Zeiten“ anklickt bzw. antippt, dann öffnet sich der Dialog „Eintrag bearbeiten“ mit Kommen, Gehen, optionaler Bemerkung sowie „Speichern“ und „Löschen“
- [ ] Angenommen der Freigeber ändert Kommen und/oder Gehen gültig, wenn er speichert, dann wird der Eintrag geändert, Ist/Soll/Gleitzeit werden neu berechnet und der Eintrag gilt als „im Tool korrigiert“
- [ ] Angenommen der Eintrag ist offen (ohne Gehen), wenn der Freigeber ihn anklickt, dann kann er im selben Dialog das Gehen nachtragen (ersetzt „Gehen nachtragen“); das Gehen darf leer bleiben
- [ ] Angenommen der Eintrag hat ein Gehen, wenn der Freigeber das Gehen leert, dann erscheint eine Fehlermeldung und nichts wird gespeichert
- [ ] Angenommen Gehen liegt nicht nach Kommen, die Dauer übersteigt 14 Stunden, eine Zeit liegt in der Zukunft oder das Paar überschneidet sich mit einem anderen Arbeitszeit-Eintrag des Tages, wenn der Freigeber speichert, dann erscheint eine passende Fehlermeldung, nichts wird gespeichert und die Eingaben bleiben im Dialog erhalten
- [ ] Angenommen der Freigeber gibt eine Bemerkung ein, wenn er speichert, dann erscheint sie beim Tag in „Bemerkung / Hinweise“

**Löschen**
- [ ] Angenommen der Freigeber wählt im Dialog „Löschen“ oder bei einer Abwesenheit das ×, dann erscheint eine Bestätigung, und erst danach wird gelöscht
- [ ] Angenommen der Eintrag stammt aus SharePoint, wenn er gelöscht wird, dann wird er als „im Tool gelöscht“ markiert statt entfernt: Er zählt nirgends mehr (Ist, Gleitzeit, Ferien, Übersicht, PDF) und erscheint nicht in „Mein Zeitnachweis“
- [ ] Angenommen der Eintrag wurde im Tool erfasst (ohne SharePoint-Herkunft), wenn er gelöscht wird, dann wird er endgültig entfernt (wie heute bei Abwesenheiten)

**Nachvollziehbarkeit**
- [ ] Angenommen ein Eintrag wurde im Tool geändert, dann sehen Freigeber beim Tag z.B. „korrigiert 21.11. von Robert Bienz (vorher 07:30–16:30)“
- [ ] Angenommen ein Eintrag aus SharePoint wurde im Tool gelöscht, dann sehen Freigeber ihn durchgestrichen mit z.B. „gelöscht 21.11. von Robert Bienz“
- [ ] Angenommen ein Eintrag wurde korrigiert, dann sieht die Person in „Mein Zeitnachweis“ beim Tag nur „korrigiert“, ohne Namen und alte Zeiten
- [ ] Angenommen ein Eintrag wurde mehrfach korrigiert, dann zeigt die Markierung die letzte Korrektur und als „vorher“ die Zeiten vor dieser Korrektur

**Schutz vor dem SharePoint-Flow**
- [ ] Angenommen ein Eintrag ist im Tool korrigiert oder gelöscht, wenn die Person den zugehörigen SharePoint-Eintrag später ändert, dann übernimmt der tägliche Flow diese Änderung nicht, und die Korrektur bleibt bestehen (Flow-Anpassung durch den Nutzer)

**Berechtigung**
- [ ] Angenommen jemand ohne Rolle Freigeber ruft Ändern oder Löschen auf (auch direkt, ohne Oberfläche), dann wird es abgelehnt und nichts geändert

## Edge Cases
- **Eintrag über Mitternacht** (bestehend, aus SharePoint): Beim Ändern gilt Gehen am selben Tag; soll er über Mitternacht bleiben, wird er gelöscht und neu erfasst bzw. in SharePoint belassen
- **Eintrag wurde inzwischen gelöscht oder geändert** (anderer Freigeber, Flow): Meldung „Diesen Eintrag gibt es nicht mehr. Bitte die Seite neu laden.“ bzw. die letzte Speicherung gilt
- **Korrektur ergibt Überschneidung** mit einem anderen Eintrag: abgelehnt; erst den anderen Eintrag ändern oder löschen
- **Freigeber korrigiert eigene Einträge:** erlaubt, mit Markierung wie bei allen
- **Ältere Monate:** ohne Sperre änderbar; Saldo der Folgemonate ändert sich entsprechend
- **Gelöschte Abwesenheit aus SharePoint** (Ferien/Krankheit): zählt nicht mehr für Ferien und Soll
- **Tagestotal / Monatstotal aus dem Flow:** werden nach der Änderung wie bei den bestehenden Korrekturen neu angestossen
- **Dataverse nicht erreichbar:** Fehlermeldung im Dialog, Eingaben bleiben erhalten

## Technical Requirements (optional)
- Sicherheit: Rolle Freigeber wird serverseitig bei jeder Änderung geprüft
- Datenschutz: Name des Korrigierenden und frühere Zeiten nur für Freigeber sichtbar
- Bedienbar auf dem Handy (Antippen eines Zeitpaars)

## Open Questions
- [ ] Ist das Auditing von Dataverse für die Zeiteinträge eingeschaltet (zusätzliche Nachvollziehbarkeit beim endgültigen Löschen)? (Nutzer)
- [ ] Woran erkennt der Flow geschützte Einträge, und wie wird er angepasst? (/architecture, danach Nutzer)
- [ ] Wie werden die Markierungen in Dataverse abgelegt (neue Spalten auf den Zeiteinträgen)? (/architecture, Spalten vom Nutzer anzulegen)

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Im Tool korrigierte Einträge sind vor dem SharePoint-Flow geschützt | Keine Korrektur darf unbemerkt verloren gehen; die Korrektur im Tool ist verbindlich (Nutzer-Entscheid) | 2026-11-21 |
| Änderbar: Kommen, Gehen, Bemerkung; löschbar: jeder Eintrag | Deckt falsche Zeiten und falsche Einträge ab; Art/Datum über Löschen + „Tag erfassen“ (Nutzer-Entscheid) | 2026-11-21 |
| Nur Freigeber | Nur Freigeber sehen Zeitnachweise aller Personen; Manager, die Anfragen erledigen, brauchen die Rolle Freigeber (Nutzer-Entscheid) | 2026-11-21 |
| Keine Sperre abgeschlossener Monate | Wie „Tag erfassen“ und „Gehen nachtragen“; Korrekturen auch nach dem Monatsabschluss nötig; Änderungen nachvollziehbar (Nutzer-Entscheid) | 2026-11-21 |
| Markierung „korrigiert … von … (vorher …)“ für Freigeber, nur „korrigiert“ für Mitarbeitende | Nachvollziehbar ohne eigene Historie; Mitarbeitende sehen, dass etwas geändert wurde (Nutzer-Entscheid) | 2026-11-21 |
| Einträge aus SharePoint werden beim Löschen markiert statt entfernt, im Tool erfasste endgültig gelöscht | Sonst legt der Flow gelöschte Einträge wieder an; Löschen bleibt nachvollziehbar (Nutzer-Entscheid) | 2026-11-21 |
| Gleiche Prüfungen wie „Tag erfassen“; Gehen nur leer, wenn es vorher leer war | Einheitliche Regeln im Tool (Nutzer-Entscheid) | 2026-11-21 |
| Kein „Gehen am Folgetag“ beim Ändern | Nicht nötig (Nutzer-Entscheid) | 2026-11-21 |
| Ein Dialog „Eintrag bearbeiten“ pro Zeitpaar, ersetzt „Gehen nachtragen“; × bei Abwesenheiten bleibt | Ein Weg für alle Korrekturen, auch auf dem Handy (Nutzer-Entscheid) | 2026-11-21 |
| PROJ-20/21 gehen vor PROJ-22 live | Mitarbeitende können sofort anfragen; bis PROJ-22 wird direkt in Dataverse korrigiert (Nutzer-Entscheid) | 2026-11-21 |

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
