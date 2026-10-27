# PROJ-15: Ferien erfassen und Feriensaldo

## Status: Planned
**Created:** 2026-10-26
**Last Updated:** 2026-10-27

## Dependencies
- Requires: PROJ-1 (Entra-ID-Login mit Rollen) — nur Freigeber
- Requires: PROJ-2 (Dataverse-Web-API-Anbindung) — Ferien sind Zeiteinträge in `bmvcc_timetrackingentry`
- Requires: PROJ-14 (Arbeitsmodell pro Person) — Pensum und Arbeitstage für den Anspruch und für die Frage, welche Tage Ferientage sind; Personendaten (Startsaldo-Stichtag)
- Requires: PROJ-13 (Zeitnachweis pro Monat) — Ferientage setzen dort das Soll auf 0 (Schnittstelle vorhanden), Erfassen-Dialog und Tageszeilen werden erweitert
- **Dataverse:** Aktivitätstyp um **3 = Ferien** und **4 = Frei** ergänzt (vom Nutzer, 2026-10-27). Für Ferienanspruch und Ferien-Startsaldo pro Person braucht es zusätzliche Angaben an der Person — Form in /architecture, vom Nutzer anzulegen. Rechte Erstellen/Schreiben/Löschen auf `bmvcc_timetrackingentry` für den App-Benutzer (Erstellen und Schreiben vorhanden, Löschen zu prüfen)

## Ausgangslage
In der Excel-Mappe wurden Ferienbezug und Feriensaldo pro Monat von Hand geführt. Die Erfassungs-App kennt bisher keinen Typ "Ferien". Der Zeitnachweis (PROJ-13) ist bereits vorbereitet: ein Ferientag setzt das Soll auf 0 und wird als "Ferien" angezeigt, Ferien + Arbeitszeit am selben Tag ergeben einen Hinweis.

Ferien werden wie Krankheit als **ganztägige Zeiteinträge** gespeichert (neuer Aktivitätstyp 3 = Ferien). Damit liegen alle Abwesenheiten an einem Ort, und auch die Erfassungs-App kann Ferien später selbst erfassen.

## User Stories
- Als Freigeber möchte ich Ferien einer Person für einen Zeitraum (von–bis) erfassen, damit ich nicht jeden Tag einzeln eintragen muss.
- Als Freigeber möchte ich auch künftige Ferien (geplant) erfassen und wieder löschen können, weil sich Ferienpläne ändern.
- Als Freigeber möchte ich einen halben Ferientag erfassen, damit halbe Freitage korrekt abgerechnet werden.
- Als Freigeber möchte ich pro Person sehen, wie viele Ferientage sie im Jahr zugut hat, bezogen und geplant hat und wie viele bleiben, damit ich die Excel-Ferienliste nicht mehr brauche.
- Als Freigeber möchte ich im Zeitnachweis sehen, wie viele Ferientage im Monat bezogen wurden und wie hoch der Feriensaldo ist.
- Als Freigeber möchte ich den Ferienanspruch pro Person festlegen (z.B. mehr Ferien ab einem bestimmten Alter), damit der Saldo stimmt.
- Als Freigeber möchte ich einen Tag als "Frei" kennzeichnen können, ohne dass er die Rechnung beeinflusst.

## Out of Scope
- Ferienanträge und Genehmigungs-Workflow durch Mitarbeitende — Erfassen nur durch Freigeber im Tool (bzw. später in der Erfassungs-App)
- Selbstansicht der Mitarbeitenden auf ihren Feriensaldo
- Verfall von Restferien, Auszahlung von Ferien, Ferienkürzung bei langer Krankheit — Restferien werden unbegrenzt übertragen
- Altersabhängiger Anspruch automatisch aus dem Geburtsdatum — der Anspruch wird pro Person von Hand gesetzt
- Ferien in Stunden — Ferien zählen in (Arbeits-)Tagen
- Bezahlte Absenzen mit Wirkung (Umzug, Hochzeit, Militär) — der Typ "Frei" ist nur eine Kennzeichnung ohne Rechenwirkung
- Ferienkalender/Teamübersicht im Kalenderformat (wer ist wann weg)
- PDF des Zeitnachweises inkl. Ferien — PROJ-16

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

**Zugriff**
- [ ] Angenommen ein Benutzer hat nur die Rolle "Bearbeiter", wenn er die Ferien-Seite oder eine Ferien-Aktion direkt aufruft, dann wird der Zugriff serverseitig verweigert

**Erfassen**
- [ ] Angenommen ein Freigeber erfasst Ferien für eine Person von–bis, wenn er speichert, dann wird für jeden Tag im Zeitraum, der laut Arbeitsmodell ein Soll hat und kein Feiertag ist, ein Ferien-Eintrag angelegt; Wochenenden, freie Tage und Feiertage werden übersprungen, und der Dialog zeigt vor dem Speichern, wie viele Ferientage das ergibt
- [ ] Angenommen der Zeitraum liegt ganz oder teilweise in der Zukunft, dann können die Ferien trotzdem erfasst werden (geplante Ferien)
- [ ] Angenommen ein Freigeber erfasst einen einzelnen Tag als "halber Ferientag", dann zählt er als 0.5 Ferientag, und das Soll dieses Tages wird halbiert (die andere Hälfte wird normal gestempelt)
- [ ] Angenommen an einem Tag im Zeitraum gibt es bereits Ferien, dann wird für diesen Tag kein zweiter Ferien-Eintrag angelegt; der Freigeber sieht, welche Tage übersprungen wurden
- [ ] Angenommen der Zeitraum ergibt keinen einzigen Ferientag (z.B. nur Wochenende), dann wird nichts gespeichert und eine verständliche Meldung angezeigt
- [ ] Angenommen eine Person hat für (Teile des) Zeitraums kein Arbeitsmodell, dann wird für diese Tage nichts angelegt und der Freigeber darauf hingewiesen
- [ ] Angenommen ein Freigeber klickt im Zeitnachweis auf einen Tag (auch in der Zukunft), dann kann er dort Ferien (ganzer oder halber Tag, optional bis-Datum) und "Frei" erfassen; Arbeitszeit, Krankheit und Komp. GLZ bleiben auf Tage bis heute beschränkt (PROJ-13)
- [ ] Angenommen ein Freigeber erfasst "Frei" für einen Tag, dann wird der Tag im Zeitnachweis als "Frei" gekennzeichnet, ohne Wirkung auf Soll, Ist, Gleitzeit und Ferien

**Löschen**
- [ ] Angenommen ein Ferien- oder Frei-Eintrag existiert, wenn der Freigeber ihn im Zeitnachweis (pro Tag) oder auf der Ferien-Seite (ganzer Zeitraum) löscht, dann wird er nach einer Bestätigung entfernt und Saldo und Zeitnachweis rechnen neu; Arbeitszeit, Krankheit und Komp. GLZ lassen sich im Tool nicht löschen

**Anspruch und Saldo**
- [ ] Angenommen für eine Person ist ein Ferienanspruch in Tagen pro Jahr bei 100 % erfasst (Vorgabe 25), dann ist ihr Anspruch eines Jahres = Anspruch × Pensum, anteilig nach den Tagen mit gültigem Arbeitsmodell (Eintritt, Austritt und Pensumswechsel mitten im Jahr), gerundet auf halbe Tage
- [ ] Angenommen für eine Person ist ein Ferien-Startsaldo in Tagen erfasst (am selben Stichtag wie der Gleitzeit-Startsaldo, PROJ-14), dann beginnt der Feriensaldo am Folgetag mit diesem Wert; danach kommt der Anspruch dazu (im Jahr des Stichtags nur anteilig ab dem Folgetag) und die Ferientage werden abgezogen
- [ ] Angenommen ein Jahr endet mit Restferien, dann werden sie ohne Verfall ins nächste Jahr übertragen
- [ ] Angenommen eine Person hat keinen Ferien-Startsaldo, dann beginnt der Feriensaldo mit 0 am Beginn ihrer Gleitzeit (PROJ-13: Tag nach dem Stichtag bzw. erste Arbeitsmodell-Version)
- [ ] Angenommen der Feriensaldo wird negativ, dann wird er angezeigt und deutlich als Warnung markiert (Erfassen bleibt erlaubt)

**Zeitnachweis (Erweiterung PROJ-13)**
- [ ] Angenommen ein Tag hat einen Ferien-Eintrag und laut Arbeitsmodell ein Soll, dann ist sein Soll 0 (halber Tag: halbes Soll), die Zeile zeigt "Ferien" bzw. "½ Ferien", und der Tag zählt als Ferienbezug
- [ ] Angenommen ein Monat wird angezeigt, dann zeigt die Übersicht zusätzlich "Ferien bezogen (Monat)" und "Feriensaldo" am Monatsende (laufender Monat: Stand heute, künftige Ferien des Monats als "geplant")

**Ferien-Seite**
- [ ] Angenommen ein Freigeber öffnet "Zeiterfassung · Ferien", dann sieht er für ein wählbares Jahr (Standard: aktuelles) alle Personen (ohne "nicht auswerten") mit Anspruch, Saldo Vorjahr, bezogen (bis heute), geplant (ab morgen) und Saldo Ende Jahr
- [ ] Angenommen ein Freigeber wählt auf der Ferien-Seite eine Person, dann sieht er ihre Ferien des Jahres als Zeiträume (von–bis, Anzahl Tage, bezogen/geplant) und kann neue erfassen oder bestehende löschen
- [ ] Angenommen ein Freigeber setzt auf der Personenseite (PROJ-14) Ferienanspruch und Ferien-Startsaldo, dann werden sie serverseitig geprüft (Anspruch 0–50 Tage, Startsaldo mit Stichtag, halbe Tage erlaubt) und wirken sofort auf Saldo und Übersicht

**Fehler**
- [ ] Angenommen das Speichern oder Löschen schlägt fehl, dann erscheint eine verständliche Meldung; bei einem Zeitraum wird gemeldet, wie viele Tage bereits gespeichert wurden

## Edge Cases
- **Ferien über Feiertage** (z.B. Weihnachten bis Neujahr): Feiertage werden nicht als Ferientage angelegt
- **Ferien an einem Tag ohne Soll** (z.B. Arbeitsmodell wird nachträglich geändert, der Tag ist danach frei): der Eintrag bleibt, zählt aber nicht als Ferientag; Zeile mit Hinweis "Ferien an einem Tag ohne Soll"
- **Krankheit während der Ferien** (beide Einträge am selben Tag): Krankheit überwiegt — der Tag zählt als Krankheit, kein Ferienbezug, Hinweis in der Zeile
- **Ferien und Arbeitszeit am selben Tag** (ganzer Ferientag): Ferien zählen, die Arbeitszeit erhöht die Gleitzeit, Hinweis (schon in PROJ-13)
- **Halber Ferientag und Arbeitszeit**: halbes Soll, Ist = Arbeitszeit — der Normalfall
- **Halber Ferientag an einem Tag ohne Soll**: wird nicht angelegt (wie ganze Tage)
- **Pensum ändert sich mitten im Jahr**: Anspruch anteilig je Version; ein Ferientag ist immer ein Arbeitstag der Person (bei 40 % an 2 Tagen ist eine Ferienwoche = 2 Tage)
- **Eintritt / Austritt mitten im Jahr**: Anspruch anteilig; nach dem Austritt keine Ferien mehr erfassbar (Tage ohne Arbeitsmodell)
- **Ferien vor dem Stichtag des Startsaldos** (Excel-Zeitraum): werden angezeigt, zählen aber nicht zum Saldo — der Startsaldo enthält sie bereits
- **Doppelte Erfassung** (zwei Freigeber gleichzeitig): pro Tag höchstens ein Ferien-Eintrag; Doppelungen werden beim Anlegen geprüft, verbleibende zählen nur einmal
- **Ferien in der Erfassungs-App** (später): Einträge vom Typ Ferien aus der App werden gleich behandelt
- **Anspruch wird nachträglich geändert**: wirkt auf alle Jahre ab dem Stichtag (Saldo wird live berechnet)

## Technical Requirements (optional)
- Security: nur Freigeber, serverseitig auf Seiten- und Aktionsebene; Ferien sind Personendaten — nicht in Logs oder im Repo
- Alle Daten in Schweizer Zeit; Ferien in Tagen mit einer Nachkommastelle (halbe Tage)
- Ganztägige Einträge brauchen ein "Kommen" (Tagesbeginn), sonst scheitert der Power-Automate-Flow (Befund PROJ-13, 2026-10-27)

## Open Questions
- [x] Wird der Jahresanspruch am 1. Januar ganz gutgeschrieben oder monatlich aufgebaut? → am Jahresbeginn ganz gutgeschrieben; im Jahr von Eintritt bzw. Stichtag anteilig ab diesem Tag (Nutzer, 2026-10-27)
- [ ] Wie wird ein halber Ferientag in Dataverse gekennzeichnet (eigenes Feld oder Konvention)? — /architecture, ggf. vom Nutzer anzulegen
- [ ] Soll die Erfassungs-App künftig selbst Ferien/Frei erfassen können? (betrifft die App, nicht dieses Tool)

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Ferien als neuer Aktivitätstyp (3 = Ferien) in den Zeiteinträgen statt eigener Ferien-Tabelle | Alle Abwesenheiten an einem Ort, gleiche Logik wie Krankheit, später auch in der Erfassungs-App erfassbar (Nutzer-Entscheidung) | 2026-10-27 |
| Erfassen von–bis, angelegt nur für Tage mit Soll (ohne Wochenenden, freie Tage, Feiertage); auch künftige Tage | Ein Ferientag ist ein Arbeitstag der Person; geplante Ferien gehören in den Saldo (Nutzer-Entscheidung) | 2026-10-27 |
| Halbe Ferientage (0.5, halbes Soll) für einzelne Tage | Halbe Freitage sind üblich (Nutzer-Entscheidung) | 2026-10-27 |
| Anspruch = Tage pro Jahr bei 100 % pro Person (Vorgabe 25) × Pensum, anteilig | Unterschiedliche Ansprüche (z.B. Alter) ohne Sonderlogik; Teilzeit korrekt in eigenen Arbeitstagen (Nutzer-Entscheidung) | 2026-10-27 |
| Ferien-Startsaldo am Stichtag der Gleitzeit, Restferien ohne Verfall übertragen | Übernahme aus Excel wie bei der Gleitzeit; keine Jahresabschlüsse nötig (Nutzer-Entscheidung) | 2026-10-27 |
| Anzeige im Zeitnachweis und auf einer eigenen Seite "Ferien" (Jahresübersicht aller Personen) | Monatsbezug beim Nachweis, Jahresstand für die Planung (Nutzer-Entscheidung) | 2026-10-27 |
| Ferien- und Frei-Einträge im Tool löschbar, andere Typen nicht | Geplante Ferien ändern sich; gestempelte Zeiten bleiben unverändert (Nutzer-Entscheidung) | 2026-10-27 |
| Krankheit während der Ferien überwiegt (kein Ferienbezug) | Übliche Regel: Krankheit verbraucht keine Ferien (Nutzer-Entscheidung) | 2026-10-27 |
| Typ "Frei" (4) nur Kennzeichnung ohne Rechenwirkung | Vom Nutzer so festgelegt; bezahlte Absenzen mit Wirkung sind nicht Teil dieses Features | 2026-10-27 |
| Ferien in Tagen statt Stunden | Wie bisher in Excel; unabhängig vom Soll pro Tag | 2026-10-27 |
| Jahresanspruch wird am 1. Januar ganz gutgeschrieben (Eintritts-/Stichtagsjahr anteilig) | Saldo zeigt sofort, was im Jahr noch geplant werden kann (Nutzer-Entscheidung) | 2026-10-27 |

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
