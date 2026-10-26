# PROJ-13: Zeitnachweis pro Monat

## Status: Planned
**Created:** 2026-10-26
**Last Updated:** 2026-10-26

## Dependencies
- Requires: PROJ-1 (Entra-ID-Login mit Rollen) — Zugriff nur für Freigeber
- Requires: PROJ-2 (Dataverse-Web-API-Anbindung) — Lesen der Zeiteinträge
- Requires: PROJ-14 (Arbeitsmodell pro Person) — liefert die Personenliste, das Soll je Wochentag und den Gleitzeit-Startsaldo
- Optional: PROJ-15 (Ferien erfassen und Feriensaldo) — solange PROJ-15 nicht live ist, kennt der Zeitnachweis keine Ferientage
- **Dataverse-Voraussetzung:** Der App-Benutzer "# OBSI Hofer Admin" braucht **Lesen** auf `bmvcc_timetrackingentry` (heute 403, geprüft 2026-10-26)
- Grundlage: [docs/zeiterfassung-ausgangslage.md](../docs/zeiterfassung-ausgangslage.md) (bisherige Excel-Mappe, Dataverse-Schema)

## Ausgangslage
Die Arbeitszeiten der Mitarbeitenden stehen bereits in Dataverse (`bmvcc_timetrackingentry`, Typen Arbeitszeit, Komp. GLZ, Krankheit). Ausgewertet wird heute in einer Excel-Mappe: pro Person und Monat ein Blatt "Zeitnachweis" mit Ist, Soll, Abweichung, fortlaufender Gleitzeit und Feriensaldo; Soll und Ferien werden dort von Hand eingetragen. Dieses Feature ersetzt die Monatsauswertung.

## User Stories
- Als Freigeber möchte ich eine Person und einen Monat wählen und den Zeitnachweis Tag für Tag sehen, damit ich die Excel-Mappe nicht mehr führen muss.
- Als Freigeber möchte ich pro Tag Ist, Soll und Abweichung sehen, damit ich Über- und Unterzeit erkenne.
- Als Freigeber möchte ich den Gleitzeit-Saldo am Monatsende (in Stunden und in Tagen) sehen, inklusive Übertrag aus dem Vormonat, damit ich den Stand jeder Person kenne.
- Als Freigeber möchte ich erkennen, warum ein Tag kein Soll hat (Feiertag, Ferien, kein Arbeitstag laut Arbeitsmodell), damit der Nachweis nachvollziehbar ist.
- Als Freigeber möchte ich auf Einträge hingewiesen werden, die keiner Person mit Arbeitsmodell zugeordnet werden können, damit keine Stunden verloren gehen.
- Als Bearbeiter möchte ich diese Funktion nicht sehen, da Zeitdaten der Mitarbeitenden vertraulich sind.

## Out of Scope
- Erfassen oder Korrigieren von Zeiteinträgen — der Zeitnachweis liest nur; Einträge werden weiterhin im bisherigen Erfassungs-Werkzeug gepflegt
- Pflege von Arbeitsmodell (Soll je Wochentag) und Gleitzeit-Startsaldo — PROJ-14
- Ferien erfassen, Ferienanspruch und Feriensaldo — PROJ-15 (der Zeitnachweis zeigt Ferien an, sobald PROJ-15 sie liefert)
- PDF "Zeitnachweis <Person> <Monat>" — eigenes Feature PROJ-16
- Ansicht für Mitarbeitende auf ihre eigenen Daten (Selbstansicht) — später, braucht Login für alle Mitarbeitenden
- Excel-/CSV-Export und Übergabe an die Lohnbuchhaltung
- Betriebliche Zusatz-Feiertage oder halbe Feiertage (z.B. Heiligabend-Nachmittag) — nur die gesetzlichen Aargauer Feiertage
- Spesen (z.B. "Spesen Znacht") — die Mittag-/Abendessen-Angaben werden nur angezeigt, nicht abgerechnet
- Auswertung über mehrere Personen hinweg (Team-Übersicht, Jahresstatistik)

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

**Zugriff und Auswahl**
- [ ] Angenommen ein Benutzer hat nur die Rolle "Bearbeiter", wenn er den Zeitnachweis direkt aufruft, dann wird der Zugriff serverseitig verweigert (nicht nur der Menüpunkt ausgeblendet)
- [ ] Angenommen ein Freigeber öffnet den Zeitnachweis, wenn die Seite lädt, dann kann er eine Person (alle Personen mit Arbeitsmodell, PROJ-14) und einen Monat wählen; vorausgewählt ist der aktuelle Monat
- [ ] Angenommen ein Freigeber hat Person und Monat gewählt, wenn er die Seite neu lädt oder zurückkehrt, dann bleiben Person und Monat gewählt

**Tageszeilen**
- [ ] Angenommen Person und Monat sind gewählt, wenn der Zeitnachweis lädt, dann erscheint jeder Kalendertag des Monats als Zeile mit Datum und Wochentag
- [ ] Angenommen eine Person hat an einem Tag einen oder mehrere Einträge vom Typ "Arbeitszeit", wenn der Tag angezeigt wird, dann zeigt er Kommen, Pausenbeginn, Pausenende und Gehen, und das Ist ist die Summe der Netto-Arbeitszeit aller Einträge des Tages
- [ ] Angenommen ein Tag ist laut Arbeitsmodell ein Arbeitstag und weder Feiertag noch Ferientag, dann ist sein Soll das Soll des Wochentags aus dem Arbeitsmodell, das an diesem Datum gilt
- [ ] Angenommen ein Tag ist ein gesetzlicher Feiertag im Aargau, ein Ferientag (PROJ-15) oder laut Arbeitsmodell kein Arbeitstag, dann ist sein Soll 0 und der Grund steht in der Zeile ("Feiertag: Auffahrt", "Ferien", "frei")
- [ ] Angenommen ein Tag hat einen Eintrag vom Typ "Krankheit", dann gilt das Soll als erfüllt (Ist = Soll), die Gleitzeit bleibt unverändert, und die Zeile ist als "Krankheit" gekennzeichnet
- [ ] Angenommen ein Tag hat einen Eintrag vom Typ "Komp. GLZ", dann ist das Ist 0, die Gleitzeit sinkt um das Soll des Tages, und die Zeile ist als "Komp. GLZ" gekennzeichnet
- [ ] Angenommen ein Tag hat Ist und Soll, dann zeigt die Zeile die Abweichung (Ist − Soll) und den fortlaufenden Gleitzeit-Saldo nach diesem Tag
- [ ] Angenommen ein Eintrag hat eine Bemerkung oder Mittag-/Abendessen gesetzt, dann wird beides in der Tageszeile angezeigt

**Monatssummen und Saldo**
- [ ] Angenommen ein Monat wird angezeigt, dann stehen über bzw. unter der Tabelle: Saldo Vormonat, Summe Ist, Summe Soll, Abweichung des Monats, Gleitzeit-Saldo am Monatsende in Stunden und in Tagen (Stunden ÷ 8)
- [ ] Angenommen für eine Person ist ein Gleitzeit-Startsaldo per Stichtag erfasst (PROJ-14), dann beginnt die Berechnung am Folgetag mit diesem Saldo, und der Saldo Vormonat jedes späteren Monats ist der Endsaldo des Vormonats
- [ ] Angenommen ein Monat liegt vollständig vor dem Stichtag des Startsaldos, wenn der Freigeber ihn wählt, dann erscheint ein Hinweis, dass für diesen Zeitraum keine Auswertung im Tool vorliegt (Excel-Zeitraum)
- [ ] Angenommen der gewählte Monat ist der laufende Monat, dann zählen Tage nach dem heutigen Datum weder Soll noch Ist, und der Saldo ist als "Stand heute" bezeichnet

**Zuordnung und Hinweise**
- [ ] Angenommen es gibt im gewählten Monat Einträge mit einer Mitarbeiter-E-Mail, für die kein Arbeitsmodell existiert, dann erscheint ein Hinweis mit diesen E-Mail-Adressen und der Anzahl Einträge
- [ ] Angenommen eine Person hat im Monat keine Einträge, dann wird der Zeitnachweis trotzdem angezeigt (alle Tage mit Ist 0, Soll laut Arbeitsmodell) mit einem Hinweis "Keine Zeiteinträge in diesem Monat"
- [ ] Angenommen das Laden aus Dataverse schlägt fehl (nicht erreichbar, fehlende Berechtigung), dann erscheint eine verständliche Fehlermeldung statt eines unvollständigen Nachweises

## Edge Cases
- **Mehrere Einträge am selben Tag** (z.B. Vormittag und Nachmittag getrennt erfasst): Ist = Summe; Kommen = frühester Beginn, Gehen = spätestes Ende; Pausenangaben aus dem jeweiligen Eintrag
- **Eintrag an einem Tag ohne Soll** (Wochenende, Feiertag, freier Tag): Ist zählt voll, Abweichung = Ist, Gleitzeit steigt
- **Krankheit an einem Tag ohne Soll**: Ist = 0, keine Auswirkung
- **Komp. GLZ und Arbeitszeit am selben Tag** (z.B. halber Tag frei): Ist = Summe der Arbeitszeit-Einträge; das Soll bleibt das volle Soll des Tages — die Gleitzeit sinkt um die nicht gearbeiteten Stunden
- **Arbeitsmodell ändert sich mitten im Monat** (z.B. Pensum ab 15.): jeder Tag nimmt das an seinem Datum gültige Modell
- **Person tritt mitten im Monat ein / aus** (Arbeitsmodell gültig ab/bis): Tage ausserhalb haben kein Soll und sind als "nicht angestellt" gekennzeichnet
- **Eintrag ohne Netto-Arbeitszeit** (leeres Feld) oder mit unplausiblem Wert (negativ, mehr als 24 h): zählt nicht ins Ist, Tageszeile mit Warnhinweis
- **Mitternacht/Zeitzone**: Ein Eintrag zählt zu dem Tag seines Aktivitätsdatums in Schweizer Zeit, auch wenn Dataverse UTC speichert
- **Feiertag fällt auf einen freien Tag oder ein Wochenende**: kein zusätzlicher Effekt (Soll ist ohnehin 0)
- **Ferientag und Arbeitszeit-Eintrag am selben Tag**: Ist zählt, Soll 0 (Ferien) → Gleitzeit steigt; Zeile mit Hinweis "Ferien und Arbeitszeit am selben Tag"
- **Sehr lange Gleitzeit-Historie**: Der Saldo eines Monats darf nicht davon abhängen, dass alle Vormonate einzeln geöffnet wurden

## Technical Requirements (optional)
- Security: nur Freigeber, serverseitig auf Seiten- und Aktionsebene (wie PROJ-8/PROJ-5); Zeitdaten sind Personendaten — keine Zeitdaten in Logs, Fehlermeldungen oder im Repo
- Feiertage: gesetzliche Feiertage Aargau gemäss bisheriger Excel-Liste, für jedes Jahr automatisch: Neujahr, Berchtoldstag, Karfreitag, Ostermontag, Auffahrt, Pfingstmontag, Bundesfeiertag, Weihnachten, Stephanstag
- Performance: ein Monat einer Person lädt in wenigen Sekunden, auch mit Gleitzeit-Übertrag über mehrere Jahre
- Alle Zeiten in Schweizer Zeit; Stunden mit zwei Nachkommastellen

## Open Questions
- [ ] Welches Feld ist die massgebliche Netto-Arbeitszeit: `bmvcc_networkinghours` ("aznetto") oder `bmvcc_aznetto4`? Und Kommen/Gehen aus `bmvcc_kommen`/`bmvcc_gehen` oder `bmvcc_activitystarttime`/`bmvcc_checkouttime`? — erst prüfbar, wenn das Leserecht erteilt ist (/architecture)
- [ ] Welche der drei Essens-Felder (`bmvcc_mittagessen`, `bmvcc_essen`, `bmvcc_abendessen`) sind in Gebrauch?
- [ ] Wird die Netto-Arbeitszeit vom Erfassungs-Werkzeug bereits ohne Pause berechnet, oder muss der Zeitnachweis die Pause abziehen?
- [ ] Gehören 1. Mai oder Fronleichnam zu den Feiertagen von OBSI Hofer? (in der bisherigen Excel-Liste nicht enthalten)
- [ ] Wer schreibt die Einträge heute in `bmvcc_timetrackingentry` (welches Erfassungs-Werkzeug), und wie viele Einträge kommen pro Monat zusammen?

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Zeiterfassung als Feature im Admin-Tool statt eigenem Projekt | Gleiche Dataverse-Umgebung, gleicher Login und gleiche Dataverse-Anbindung; ein Tool für die Administration (Nutzer-Entscheidung) | 2026-10-26 |
| Erste Ausbaustufe = Auswertung ersetzen, nicht Erfassen | Die Einträge liegen bereits in Dataverse; der Aufwand steckt heute in der Excel-Auswertung (Nutzer-Entscheidung) | 2026-10-26 |
| Nur Freigeber sehen den Zeitnachweis, keine neue Rolle | Wer heute die Mappe führt, hat Freigeber-Rechte; keine neuen Nutzer und keine neue App-Rolle nötig (Nutzer-Entscheidung) | 2026-10-26 |
| Aufteilung in vier Features: Zeitnachweis (PROJ-13), Arbeitsmodell (PROJ-14), Ferien (PROJ-15), PDF (PROJ-16) | Jeweils eigene Oberfläche und einzeln test- und deploybar; Arbeitsmodell ist Voraussetzung für das Soll (Nutzer-Entscheidung zur Aufteilung) | 2026-10-26 |
| Soll aus einem Arbeitsmodell pro Person (Soll je Wochentag, gültig ab) statt Handeintrag pro Tag | Ersetzt das manuelle Eintragen in Excel; Feiertage und Ferien setzen das Soll automatisch auf 0 (Nutzer-Entscheidung) | 2026-10-26 |
| Krankheit = Soll erfüllt; Komp. GLZ = Gleitzeitbezug (Ist 0) | Krankheit darf die Gleitzeit nicht verringern; Komp. GLZ ist ein freier Tag zulasten der Gleitzeit (Nutzer-Entscheidung) | 2026-10-26 |
| Gleitzeit startet mit einem Startsaldo pro Person per Stichtag (Pflege in PROJ-14) | Übernahme des Stands aus Excel ohne rückwirkende Neuberechnung (Nutzer-Entscheidung) | 2026-10-26 |
| Gesetzliche Feiertage Aargau automatisch, ohne Pflege | Liste aus der bisherigen Excel-Mappe; bewegliche Feiertage werden pro Jahr berechnet (Nutzer-Entscheidung) | 2026-10-26 |
| Gleitzeit in Tagen = Stunden ÷ 8 | Wie in der bisherigen Excel-Mappe | 2026-10-26 |
| Zeitnachweis nur lesend | Korrekturen gehören ins Erfassungs-Werkzeug; vermeidet zwei Stellen zum Ändern derselben Daten | 2026-10-26 |
| PDF als eigenes Feature (PROJ-16), obwohl Bildschirm + PDF gewünscht | Einzeln testbar und baut auf der fertigen Berechnung auf; gleiches Vorgehen wie Geräteliste (PROJ-3) und Prüfbericht-PDF (PROJ-7) | 2026-10-26 |

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
