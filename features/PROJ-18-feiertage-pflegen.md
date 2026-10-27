# PROJ-18: Feiertage im Tool pflegen

## Status: Planned
**Created:** 2026-10-27
**Last Updated:** 2026-10-27

## Dependencies
- Requires: PROJ-1 (Entra-ID-Login mit Rollen) — nur Freigeber
- Requires: PROJ-13 (Zeitnachweis) — Feiertage setzen das Soll auf 0 (bzw. halbieren es)
- Betrifft: PROJ-15 (Ferien — Feiertage sind keine Ferientage), PROJ-17 (Übersicht rechnet mit denselben Regeln)
- **Dataverse:** Ablage für die gepflegten Feiertage existiert noch nicht — Form in /architecture, vom Nutzer anzulegen, plus Rechte für den App-Benutzer

## Ausgangslage
Heute berechnet das Tool jedes Jahr fest die 9 gesetzlichen Feiertage aus der bisherigen Excel-Liste (Neujahr, Berchtoldstag, Karfreitag, Ostermontag, Auffahrt, Pfingstmontag, Bundesfeiertag, Weihnachten, Stephanstag). Betriebliche Zusatztage (z.B. Heiligabend), halbe Feiertage und Änderungen (z.B. 1. Mai, Fronleichnam) sind nicht möglich; die Liste ist nur im Code sichtbar. In PROJ-13 waren "betriebliche Zusatz-Feiertage oder halbe Feiertage" bewusst ausgeschlossen — dieses Feature holt das nach.

## User Stories
- Als Freigeber möchte ich die Feiertage eines Jahres im Tool sehen, damit ich weiss, mit welchen Tagen der Zeitnachweis rechnet.
- Als Freigeber möchte ich für ein Jahr den automatischen Vorschlag übernehmen und anpassen (Tage hinzufügen, entfernen, umbenennen), damit betriebliche Feiertage berücksichtigt werden.
- Als Freigeber möchte ich halbe Feiertage festlegen (z.B. Heiligabend nachmittags), damit das Soll an diesen Tagen halbiert wird.
- Als Freigeber möchte ich, dass vergangene Jahre unverändert bleiben, solange ich sie nicht bewusst übernehme, damit sich frühere Gleitzeit-Stände nicht ungewollt ändern.
- Als Bearbeiter möchte ich diese Funktion nicht sehen.

## Out of Scope
- Feiertage pro Person oder pro Standort/Kanton — eine Liste für die ganze Firma
- Automatischer Import aus einem Feiertagskalender (Internet, Outlook)
- Feiertage mit anderen Anteilen als ganz/halb (z.B. 2 Stunden)
- Änderungsverlauf "wer hat wann was geändert" (Dataverse führt "geändert von/am")
- Feiertage aus der Erfassungs-App heraus pflegen

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

**Zugriff und Anzeige**
- [ ] Angenommen ein Benutzer hat nur die Rolle "Bearbeiter", wenn er die Feiertags-Seite oder eine Feiertags-Aktion direkt aufruft, dann wird der Zugriff serverseitig verweigert
- [ ] Angenommen ein Freigeber öffnet unter "Zeiterfassung" den Reiter "Feiertage", dann sieht er für ein wählbares Jahr (Standard: aktuelles) alle Feiertage mit Datum, Wochentag, Name und "ganz/halb", sowie ob die Liste der automatische Vorschlag oder gepflegt ist

**Vorschlag und Übernehmen**
- [ ] Angenommen ein Jahr ist noch nicht gepflegt, dann gilt der automatische Vorschlag (die 9 bisherigen Feiertage, bewegliche nach Ostern berechnet) und die Seite zeigt "automatischer Vorschlag" mit der Schaltfläche "Jahr übernehmen"
- [ ] Angenommen ein Freigeber klickt "Jahr übernehmen", dann wird der Vorschlag als gepflegte Liste des Jahres gespeichert und ist danach änderbar; Zeitnachweis, Ferien und Übersicht rechnen ab dann mit der gepflegten Liste

**Pflegen**
- [ ] Angenommen ein Jahr ist gepflegt, wenn der Freigeber einen Feiertag hinzufügt (Datum, Name, ganz/halb), dann gilt er sofort in Zeitnachweis, Ferien und Übersicht
- [ ] Angenommen ein Jahr ist gepflegt, wenn der Freigeber einen Feiertag ändert (Name, ganz/halb) oder nach einer Bestätigung entfernt, dann rechnen alle betroffenen Tage sofort neu
- [ ] Angenommen ein Freigeber erfasst ein Datum ausserhalb des gewählten Jahres, ein leeres Datum oder einen leeren Namen, oder ein Datum, das im Jahr schon Feiertag ist, dann wird nicht gespeichert und eine verständliche Meldung angezeigt (serverseitig geprüft)
- [ ] Angenommen ein Freigeber möchte ein gepflegtes Jahr zurücksetzen, wenn er "Auf Vorschlag zurücksetzen" bestätigt, dann gilt wieder der automatische Vorschlag

**Wirkung**
- [ ] Angenommen ein Tag ist ganzer Feiertag, dann ist sein Soll 0 und der Zeitnachweis zeigt "Feiertag: {Name}" (wie bisher)
- [ ] Angenommen ein Tag ist halber Feiertag und laut Arbeitsmodell ein Arbeitstag, dann ist sein Soll halbiert und der Zeitnachweis zeigt "½ Feiertag: {Name}"; ein Ferien-Eintrag an diesem Tag zählt als 0.5 Ferientag
- [ ] Angenommen ein ganzer Feiertag wird neu erfasst, an dem schon Ferien eingetragen sind, dann zählt der Tag nicht mehr als Ferientag (Hinweis "Ferien an einem Tag ohne Soll"), der Feriensaldo steigt entsprechend
- [ ] Angenommen Ferien werden über einen gepflegten Feiertag erfasst, dann wird er wie bisher übersprungen

**Fehler**
- [ ] Angenommen das Speichern schlägt fehl, dann erscheint eine verständliche Meldung und die Eingaben bleiben erhalten

## Edge Cases
- **Vergangenes Jahr übernehmen und ändern**: Gleitzeit- und Feriensaldo aller Folgemonate ändern sich rückwirkend — vor dem Übernehmen eines vergangenen Jahres erscheint ein Hinweis
- **Feiertag fällt auf einen freien Tag oder ein Wochenende**: kein zusätzlicher Effekt (wie bisher)
- **Halber Feiertag + halber Ferientag am selben Tag**: Soll halbiert durch den Feiertag; die Ferien zählen 0.5 und das verbleibende Soll ist 0
- **Krankheit an einem halben Feiertag**: Soll (halbiert) gilt als erfüllt
- **Jahr ohne Feiertage gepflegt** (alle entfernt): erlaubt, mit Hinweis
- **Zwei Freigeber pflegen gleichzeitig**: Last-Write-Wins; doppelte Daten werden verhindert bzw. zählen einmal
- **Feiertag mit gleichem Datum wie ein anderer** (z.B. Auffahrt und 1. Mai fallen zusammen): nur einer pro Datum

## Technical Requirements (optional)
- Security: nur Freigeber, serverseitig auf Seiten- und Aktionsebene
- Die Regel "welche Tage sind Feiertage" bleibt an einer Stelle; Zeitnachweis, Ferien, Übersicht und später das PDF (PROJ-16) nutzen sie gemeinsam
- Performance: Feiertage werden pro Aufruf einmal geladen, nicht pro Tag

## Open Questions
- [ ] Gehören der 1. Mai oder Fronleichnam bei OBSI Hofer dazu? — mit diesem Feature vom Freigeber selbst pflegbar
- [ ] Soll der automatische Vorschlag später um weitere Tage erweitert werden (z.B. Heiligabend halb)? (vorerst: die 9 bisherigen)

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Automatischer Vorschlag pro Jahr, im Tool übernehmen und frei anpassen | Keine Pflege nötig, solange die Standardliste passt; betriebliche Tage trotzdem möglich (Nutzer-Entscheidung) | 2026-10-27 |
| Halbe Feiertage: Soll halbiert, Ferien an diesem Tag 0.5 | Heiligabend/Silvester nachmittags frei sind üblich (Nutzer-Entscheidung) | 2026-10-27 |
| Gepflegte Liste gilt erst nach "Jahr übernehmen"; bis dahin der Vorschlag | Vergangene Jahre ändern sich nicht ungewollt (Nutzer-Entscheidung) | 2026-10-27 |
| Eigener Reiter "Feiertage" unter Zeiterfassung | Feiertage gelten für alle Personen; passt neben Ferien | 2026-10-27 |
| Eine Liste für die ganze Firma, höchstens ein Feiertag pro Datum | Einfach und eindeutig; keine Standort-/Personen-Regeln nötig | 2026-10-27 |

### Technical Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| _wird in /architecture ergänzt_ | | |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
