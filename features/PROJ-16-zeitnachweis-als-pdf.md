# PROJ-16: Zeitnachweis als PDF

## Status: Planned
**Created:** 2026-10-26
**Last Updated:** 2026-10-27

## Dependencies
- Requires: PROJ-13 (Zeitnachweis pro Monat) — Inhalt und Berechnung des PDFs sind die des Zeitnachweises
- Requires: PROJ-14, PROJ-15, PROJ-18 — Arbeitsmodell, Ferien und gepflegte Feiertage fliessen über die Berechnung des Zeitnachweises ein
- Muster: PDF-Export der Prüfberichte (PROJ-7) — Logo, Fusszeile "Seite X von Y"
- Keine Dataverse-Änderungen (nur lesend)

## Ausgangslage
Der Zeitnachweis (PROJ-13) zeigt eine Person und einen Monat am Bildschirm. In der Excel-Mappe gab es pro Person und Monat ein druckbares Blatt "Zeitnachweis". Dieses Feature liefert das Gegenstück als PDF zum Weitergeben, z.B. an die Person, ins Personaldossier oder an die Lohnbuchhaltung.

## User Stories
- Als Freigeber möchte ich im Zeitnachweis mit einem Klick das PDF der gewählten Person und des gewählten Monats herunterladen, damit ich es weitergeben kann.
- Als Freigeber möchte ich, dass das PDF dieselben Zahlen zeigt wie der Bildschirm, damit es keine Abweichungen gibt.
- Als Empfänger möchte ich Tag für Tag Zeiten, Ist, Soll, Abweichung und Gleitzeit sowie die Monatssummen, Gleitzeit- und Feriensaldo sehen.
- Als Freigeber möchte ich, dass interne Prüfhinweise (Abgleich mit dem Flow, Überschneidungen) nicht im PDF stehen, damit es für Mitarbeitende verständlich bleibt.
- Als Bearbeiter möchte ich diese Funktion nicht sehen.

## Out of Scope
- Ablage in SharePoint oder Dataverse — nur Download (Nutzer-Entscheidung)
- Sammel-PDF bzw. PDFs für mehrere Personen auf einmal (Monatsabschluss)
- Unterschriftsfelder oder eingebettetes Visum (Nutzer-Entscheidung: keine)
- Digitale Signatur / Firmen-Siegel — siehe PROJ-9 (nur für Prüfberichte)
- PDF der Übersicht (PROJ-17) oder der Ferien-Seite (PROJ-15)
- Versand per E-Mail aus dem Tool
- Kundenspezifische Vorlagen wie beim Prüfbericht (PROJ-7) — ein festes Layout

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

**Zugriff und Auslösen**
- [ ] Angenommen ein Benutzer hat nur die Rolle "Bearbeiter", wenn er den PDF-Download direkt aufruft, dann wird der Zugriff serverseitig verweigert
- [ ] Angenommen ein Freigeber hat im Zeitnachweis eine Person und einen Monat gewählt, wenn er auf "PDF herunterladen" klickt, dann erhält er ein PDF mit dem Namen "Zeitnachweis {Name bzw. E-Mail} {JJJJ-MM}.pdf"
- [ ] Angenommen keine Person ist gewählt, dann ist "PDF herunterladen" nicht verfügbar

**Inhalt**
- [ ] Angenommen das PDF wird erzeugt, dann ist es A4 hoch und enthält im Kopf das Firmenlogo, den Namen der Person (bzw. E-Mail), den Monat und das im Monat gültige Arbeitsmodell (Pensum, Arbeitstage; bei Wechsel im Monat alle Versionen mit "ab")
- [ ] Angenommen das PDF wird erzeugt, dann enthält es pro Kalendertag eine Zeile mit Datum, Wochentag, Kommen–Gehen-Paaren, Art/Grund (Feiertag, ½ Feiertag, Ferien, ½ Ferien, Krankheit, Komp. GLZ, Frei, frei, nicht angestellt), Ist, Soll, Abweichung, Gleitzeit, Mittag-/Abendessen und Bemerkung
- [ ] Angenommen das PDF wird erzeugt, dann stehen am Ende: Saldo Vormonat (bzw. Startsaldo), Summe Ist, Summe Soll, Abweichung, Gleitzeit Monatsende in Stunden und Tagen, Ferien im Monat (bezogen/geplant) und Feriensaldo Monatsende
- [ ] Angenommen dieselbe Person und derselbe Monat sind gewählt, dann stimmen alle Zahlen im PDF mit dem Zeitnachweis am Bildschirm überein
- [ ] Angenommen ein Tag hat einen offenen Eintrag (Gehen fehlt), dann zeigt das PDF das Paar als "Kommen–…" mit dem Vermerk "Gehen fehlt"; weitere interne Hinweise (Abgleich mit dem Flow, Überschneidungen, unplausible Einträge, "vor Arbeitsmodell") erscheinen nicht
- [ ] Angenommen der Monat ist der laufende Monat, dann ist das PDF als "Stand {Datum}" gekennzeichnet und Tage nach heute bleiben ohne Werte
- [ ] Angenommen das PDF hat mehrere Seiten, dann wiederholen sich die Spaltenköpfe und jede Seite hat die Fusszeile "Seite X von Y" mit Erstellungsdatum und "Erstellt von {Name des Freigebers}"

**Leer- und Fehlerzustände**
- [ ] Angenommen die Person hat im Monat keine Einträge, dann wird das PDF trotzdem erzeugt (Tage mit Soll, Ist 0) mit dem Vermerk "Keine Zeiteinträge in diesem Monat"
- [ ] Angenommen die Person hat kein Arbeitsmodell bzw. der Monat liegt vor dem Beginn der Gleitzeit, dann zeigt das PDF die Ist-Zeiten und statt der Salden "—" mit einem kurzen Vermerk
- [ ] Angenommen das Erzeugen schlägt fehl (Dataverse nicht erreichbar), dann erscheint eine verständliche Fehlermeldung ohne Personendaten

## Edge Cases
- **Viele Paare an einem Tag** (z.B. 4 Kommen/Gehen): Zeiten brechen in der Zelle um; die Zeile wird höher
- **Lange Bemerkungen**: brechen um, werden nicht abgeschnitten
- **Name mit Sonderzeichen**: Dateiname bleibt gültig (unzulässige Zeichen ersetzt)
- **Arbeitsmodell wechselt im Monat**: Kopf nennt beide Versionen; die Tageszeilen nutzen je die gültige
- **Austritt im Monat**: Tage danach als "nicht angestellt"
- **Halber Feiertag und halber Ferientag am selben Tag**: beides in der Spalte Art
- **Monat in der Zukunft**: erzeugbar (Soll und geplante Ferien), "Stand {Datum}"
- **Dark Mode**: ohne Einfluss — das PDF ist immer hell

## Technical Requirements (optional)
- Security: nur Freigeber, serverseitig; Personendaten nur im erzeugten PDF, nicht in Logs, Dateinamen auf dem Server oder im Repo
- Gleiche Berechnung wie der Bildschirm (keine zweite Rechenregel)
- Erzeugen in wenigen Sekunden

## Open Questions
- [x] Fusszeile: Erstellungsdatum **und** "Erstellt von {Freigeber}" (Nutzer, 2026-10-27)

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Nur Download, keine Ablage | Weitergabe an Person/Dossier/Lohnbuchhaltung genügt (Nutzer-Entscheidung) | 2026-10-27 |
| Inhalt wie die Bildschirm-Tabelle, ohne interne Prüfhinweise; offene Einträge als "Gehen fehlt" | Verständlich für Mitarbeitende, gleiche Zahlen wie am Bildschirm (Nutzer-Entscheidung) | 2026-10-27 |
| Keine Unterschriftsfelder, kein Visum | Reines Informationsdokument (Nutzer-Entscheidung); Visum-Security noch offen | 2026-10-27 |
| A4 hoch | Nutzer-Entscheidung; Zeiten und Bemerkungen dürfen umbrechen | 2026-10-27 |
| Ein PDF pro Person und Monat | Sammel-PDFs nicht benötigt | 2026-10-27 |
| Fusszeile mit Erstellungsdatum und "Erstellt von {Freigeber}" | Nachvollziehbar, wer den Nachweis erzeugt hat (Nutzer-Entscheidung) | 2026-10-27 |

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
