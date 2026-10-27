# PROJ-17: Zeiterfassung-Übersicht (Dashboard)

## Status: Planned
**Created:** 2026-10-27
**Last Updated:** 2026-10-27

## Dependencies
- Requires: PROJ-1 (Entra-ID-Login mit Rollen) — nur Freigeber
- Requires: PROJ-13 (Zeitnachweis pro Monat) — Ist, Soll, Gleitzeit, Abwesenheiten und Hinweise werden mit denselben Regeln gerechnet
- Requires: PROJ-14 (Arbeitsmodell pro Person) — Personenliste, "nicht auswerten"
- Requires: PROJ-15 (Ferien erfassen und Feriensaldo) — Ferienanspruch, bezogen, geplant, Saldo
- Keine Dataverse-Änderungen (nur lesend)

## Ausgangslage
Der Zeitnachweis (PROJ-13) zeigt eine Person und einen Monat, die Ferien-Seite (PROJ-15) den Ferienstand aller Personen. Eine Gesamtsicht über Gleitzeit, Ist/Soll, Abwesenheiten und Ferien aller Mitarbeitenden fehlt — in PROJ-13 bewusst ausgeschlossen ("Auswertung über mehrere Personen hinweg"). Der Freigeber will auf einen Blick sehen, wo Handlungsbedarf besteht.

## User Stories
- Als Freigeber möchte ich für einen Monat alle Mitarbeitenden mit Gleitzeit, Ist/Soll, Abwesenheiten und Ferien in einer Tabelle sehen, damit ich nicht jeden Zeitnachweis einzeln öffnen muss.
- Als Freigeber möchte ich die Gleitzeit-Salden als Balkengrafik sehen, damit ich sofort erkenne, wer viel Plus oder Minus hat.
- Als Freigeber möchte ich den Ferienstand aller als Balkengrafik sehen (bezogen, geplant, Rest), damit ich Ferienplanung und Restferien im Blick habe.
- Als Freigeber möchte ich auffällige Werte hervorgehoben sehen (kein Arbeitsmodell, offene Einträge, negativer Feriensaldo, hohe Gleitzeit), damit ich gezielt nachfassen kann.
- Als Freigeber möchte ich von einer Person direkt in ihren Zeitnachweis des gewählten Monats springen.
- Als Bearbeiter möchte ich diese Übersicht nicht sehen, da sie Personendaten aller Mitarbeitenden enthält.

## Out of Scope
- Gleitzeit-Verlauf über mehrere Monate als Liniengrafik — bewusst nicht gewählt (Nutzer-Entscheidung), später möglich
- Export der Übersicht (Excel, CSV, PDF) — der PDF-Zeitnachweis pro Person ist PROJ-16
- Einstellbare Schwellen für Warnungen in der Oberfläche — fest im Tool, später anpassbar
- Bearbeiten von Werten in der Übersicht — Erfassen und Korrigieren bleibt im Zeitnachweis bzw. auf der Ferien-Seite
- Jahresstatistik (Summen über alle Monate eines Jahres) ausser dem Ferienstand
- Vergleich mit Vorjahr, Team-/Abteilungsgruppen

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

**Zugriff und Navigation**
- [ ] Angenommen ein Benutzer hat nur die Rolle "Bearbeiter", wenn er die Übersicht direkt aufruft, dann wird der Zugriff serverseitig verweigert
- [ ] Angenommen ein Freigeber klickt im Menü auf "Zeiterfassung", dann öffnet sich die Übersicht; der Reiter "Übersicht" steht vor "Zeitnachweis · Personen · Ferien"
- [ ] Angenommen ein Freigeber wählt einen Monat (Standard: aktueller Monat, Vor/Zurück wie im Zeitnachweis), dann beziehen sich alle Werte auf diesen Monat; die Auswahl steht in der Adresse

**Tabelle**
- [ ] Angenommen es gibt Personen in der Zeiterfassung, dann zeigt die Tabelle jede Person ausser "nicht auswerten" mit: Gleitzeit-Saldo am Monatsende (laufender Monat: Stand heute) in Stunden und Tagen, Veränderung der Gleitzeit im Monat, Ist, Soll und Abweichung des Monats, Krankheitstage und Komp.-GLZ-Tage im Monat und im Jahr, Feriensaldo, Ferien bezogen und geplant im Jahr des gewählten Monats
- [ ] Angenommen ein Freigeber klickt auf einen Spaltenkopf, dann wird die Tabelle nach dieser Spalte sortiert (erneut klicken: umgekehrt); Standard ist alphabetisch nach Name
- [ ] Angenommen ein Freigeber klickt auf eine Person, dann öffnet sich ihr Zeitnachweis für den gewählten Monat
- [ ] Angenommen die Werte sind mit denselben Regeln gerechnet wie im Zeitnachweis und auf der Ferien-Seite, dann stimmen sie für jede Person mit diesen Seiten überein

**Grafiken**
- [ ] Angenommen der Monat ist gewählt, dann zeigt eine Balkengrafik pro Person den Gleitzeit-Saldo am Monatsende (Plus und Minus unterscheidbar, Nulllinie), sortiert wie die Tabelle oder nach Wert
- [ ] Angenommen der Monat ist gewählt, dann zeigt eine gestapelte Balkengrafik pro Person die Ferien des Jahres: bezogen, geplant und verbleibender Saldo; ein negativer Saldo ist erkennbar
- [ ] Angenommen ein Freigeber zeigt auf einen Balken, dann erscheinen Person und genaue Werte

**Warnungen**
- [ ] Angenommen eine Person hat kein Arbeitsmodell, offene Einträge (Gehen fehlt) im Monat, einen negativen Feriensaldo oder eine Gleitzeit über +40 h bzw. unter −40 h, dann ist der betroffene Wert in Tabelle bzw. Zeile hervorgehoben und oben steht eine Zusammenfassung (z.B. "2 Personen mit offenen Einträgen")

**Leer- und Fehlerzustände**
- [ ] Angenommen es gibt noch keine Personen bzw. Zeiteinträge, dann erscheint ein Leer-Hinweis statt Tabelle und Grafiken
- [ ] Angenommen eine Person hat für den Monat keine Gleitzeit (vor dem Beginn, kein Arbeitsmodell), dann steht "—" und sie fehlt in der Gleitzeit-Grafik (mit Hinweis)
- [ ] Angenommen das Laden aus Dataverse schlägt fehl, dann erscheint eine verständliche Fehlermeldung ohne Personendaten

## Edge Cases
- **Person ohne Arbeitsmodell**: Ist zählt, Soll 0, keine Gleitzeit; Warnung "kein Arbeitsmodell"
- **Ausgetretene Person**: erscheint weiterhin (mit Kennzeichnung "ausgetreten"), solange sie nicht "nicht auswerten" ist
- **Monat vor dem Beginn der Gleitzeit / des Feriensaldos**: "—" statt Werten
- **Künftiger Monat**: Gleitzeit = Stand heute (keine Zukunft), geplante Ferien zählen
- **Viele Personen**: Grafiken bleiben lesbar (horizontale Balken, Namen gekürzt mit vollständigem Namen beim Zeigen)
- **Sehr lange Historie**: Die Übersicht lädt alle Personen in vertretbarer Zeit (wenige Sekunden)
- **Unterschiedliche Pensen**: Gleitzeit in Stunden ist vergleichbar; die Grafik zeigt Stunden

## Technical Requirements (optional)
- Security: nur Freigeber, serverseitig; Personendaten aller Mitarbeitenden — nicht in Logs, Fehlermeldungen oder im Repo
- Grafiken barrierearm: Werte zusätzlich in der Tabelle, Farben nicht als einzige Unterscheidung
- Dark Mode und Design-System (Stahlblau, Statusfarben) einhalten
- Performance: Laden in wenigen Sekunden bei rund 10 Personen und mehreren Jahren Historie

## Open Questions
- [ ] Ist die Schwelle ±40 h Gleitzeit richtig, oder z.B. ±20 h / eine Woche des Pensums? (vorerst fest ±40 h)

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Eigenes Feature PROJ-17 statt Erweiterung von PROJ-13 | Eigene Seite, eigene Testbarkeit; PROJ-13 hatte die Team-Übersicht bewusst ausgeschlossen | 2026-10-27 |
| Kennzahlen: Gleitzeit, Ist/Soll Monat, Abwesenheiten (Krankheit, Komp. GLZ), Ferien | Alle vier vom Nutzer gewählt | 2026-10-27 |
| Grafiken: Gleitzeit-Balken und gestapelter Ferien-Balken; kein Gleitzeit-Verlauf | Nutzer-Entscheidung | 2026-10-27 |
| Monat wählbar (Standard: aktueller), Ferien für das Jahr des Monats | Gleiche Logik wie Zeitnachweis; Rückblick auf abgeschlossene Monate möglich (Nutzer-Entscheidung) | 2026-10-27 |
| Reiter "Übersicht" als Startseite der Zeiterfassung; Klick auf Person → Zeitnachweis | Gesamtsicht zuerst, Details auf Klick (Nutzer-Entscheidung) | 2026-10-27 |
| Warnungen mit festen Schwellen (kein Arbeitsmodell, offene Einträge, negativer Feriensaldo, Gleitzeit ±40 h) | Handlungsbedarf auf einen Blick (Nutzer-Entscheidung); Schwellen später anpassbar | 2026-10-27 |
| Nur lesend | Erfassen/Korrigieren bleibt auf den bestehenden Seiten | 2026-10-27 |

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
