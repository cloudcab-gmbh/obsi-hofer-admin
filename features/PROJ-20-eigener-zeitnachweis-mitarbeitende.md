# PROJ-20: Eigener Zeitnachweis für Mitarbeitende

## Status: Planned
**Created:** 2026-11-21
**Last Updated:** 2026-11-21

## Dependencies
- Requires: PROJ-1 (Entra-ID-Login mit Rollen): neue App-Rolle „Mitarbeiter“, Anmeldung und Zugriffsschutz
- Requires: PROJ-13 (Zeitnachweis pro Monat): Berechnung und Darstellung werden wiederverwendet
- Optional: PROJ-16 (Zeitnachweis als PDF): Download des eigenen Zeitnachweises
- Betrifft: PROJ-14 (Startsaldo-Stichtag, Arbeitsmodell, „nicht auswerten“, Austritt bestimmen, was sichtbar ist), PROJ-15 (Feriensaldo in den Kennzahlen)
- **Extern (Nutzer):** In Entra ID die App-Rolle „Mitarbeiter“ anlegen und den Mitarbeitenden zuweisen

## Ausgangslage
Heute kommt nur ins Tool, wer die Rolle Bearbeiter oder Freigeber hat; alle anderen landen auf „Kein Zugang“. Den Zeitnachweis (PROJ-13) sehen nur Freigeber, und zwar für alle Personen. Die Daten liegen vollständig in Dataverse (Erstbefüllung PROJ-19, seither täglicher Flow aus der SharePoint-Liste). Die Mitarbeitenden sollen ihren eigenen Zeitnachweis selbst anschauen können.

## User Stories
- Als Mitarbeitender möchte ich meinen eigenen Zeitnachweis pro Monat sehen (Ist, Soll, Gleitzeit, Ferien), damit ich meinen Stand jederzeit kenne, ohne nachfragen zu müssen.
- Als Mitarbeitender möchte ich meinen Zeitnachweis als PDF herunterladen, damit ich ihn ablegen oder ausdrucken kann.
- Als Mitarbeitender möchte ich Hinweise auf fehlerhafte Tage sehen (z.B. „offen – Gehen fehlt“), damit ich sie in der SharePoint-Zeiterfassung korrigieren kann.
- Als Mitarbeitender möchte ich den Zeitnachweis auch auf dem Handy anschauen können, damit ich unterwegs kurz meine Gleitzeit prüfen kann.
- Als Freigeber möchte ich festlegen, wer Zugang bekommt (Rolle „Mitarbeiter“ in Entra ID), damit nur freigeschaltete Personen ins Tool kommen.
- Als Freigeber möchte ich sicher sein, dass Mitarbeitende nur ihre eigenen Daten sehen, damit keine Arbeitszeiten anderer Personen offengelegt werden.
- Als Bearbeiter, der selbst Mitarbeitender ist, möchte ich zusätzlich zu Geräten und Prüfberichten meinen Zeitnachweis sehen, ohne ein zweites Konto zu brauchen.

## Out of Scope
- Bearbeiten durch Mitarbeitende: kein „Gehen nachtragen“, kein „Einträge erfassen“, kein Löschen. Korrekturen werden in der SharePoint-Zeiterfassung erfasst (SharePoint ist massgeblich, PROJ-19)
- Zeitnachweise anderer Personen für Mitarbeitende; die Personen-Auswahl bleibt Freigebern vorbehalten (PROJ-13)
- Übersicht, Personen, Ferien-Übersicht und Feiertage für Mitarbeitende (PROJ-14, PROJ-15, PROJ-17, PROJ-18 bleiben Freigebern vorbehalten)
- Ferien beantragen oder erfassen durch Mitarbeitende
- Manuelles Zuordnen einer abweichenden Anmelde-E-Mail zu den Zeiteinträgen; falls nötig später als Erweiterung der Personen-Stammdaten (PROJ-14)
- Eigenes, vereinfachtes Handy-Layout (z.B. Tageskarten); die bestehende Ansicht wird auf dem Handy nutzbar gemacht
- Änderungen am PDF (PROJ-16): Inhalt und Aufbau bleiben wie für Freigeber
- Benachrichtigungen (z.B. E-Mail bei offenen Tagen) und Bestätigen/Visieren des Monats durch Mitarbeitende
- Automatischer Zugang für alle Konten des Firmen-Tenants (Zugang nur mit Rolle)

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

**Zugang und Rollen**
- [ ] Angenommen eine Person hat in Entra ID nur die Rolle „Mitarbeiter“, wenn sie sich anmeldet, dann landet sie direkt in ihrem eigenen Zeitnachweis im aktuellen Monat
- [ ] Angenommen eine Person hat keine der Rollen Bearbeiter, Freigeber oder Mitarbeiter, wenn sie sich anmeldet, dann sieht sie wie bisher „Kein Zugang“
- [ ] Angenommen eine Person hat nur die Rolle „Mitarbeiter“, wenn sie eine andere Seite direkt per URL aufruft (Geräte, Prüfberichte, Sync-Freigabe, Zeiterfassung-Übersicht, Personen, Ferien, Feiertage), dann wird sie nicht angezeigt, sondern sie landet in ihrem eigenen Zeitnachweis
- [ ] Angenommen eine Person hat nur die Rolle „Mitarbeiter“, dann zeigt das Menü nur „Mein Zeitnachweis“ und die Abmeldung
- [ ] Angenommen eine Person hat die Rollen Bearbeiter und Mitarbeiter, dann sieht sie Geräte und Prüfberichte wie bisher und zusätzlich „Mein Zeitnachweis“
- [ ] Angenommen eine Person hat die Rolle Bearbeiter, aber nicht Mitarbeiter, dann sieht sie keinen Zeitnachweis (wie bisher)
- [ ] Angenommen eine Person ist Freigeber, dann bleibt die Zeiterfassung für alle Personen unverändert, und zusätzlich führt „Mein Zeitnachweis“ direkt zum eigenen Zeitnachweis (sofern die Person auch die Rolle Mitarbeiter hat)

**Nur eigene Daten**
- [ ] Angenommen eine Person mit Rolle „Mitarbeiter“ ist angemeldet, dann zeigt der Zeitnachweis ausschliesslich Einträge, deren E-Mail (ohne Gross-/Kleinschreibung) ihrer Anmelde-E-Mail entspricht
- [ ] Angenommen eine Person ohne Freigeber-Rolle verändert die Adresse (z.B. `?person=` einer anderen Person), wenn sie die Seite aufruft, dann sieht sie trotzdem nur ihren eigenen Zeitnachweis; Daten anderer Personen werden nie ausgeliefert, auch nicht als PDF
- [ ] Angenommen eine Person ohne Freigeber-Rolle, dann gibt es keine Personen-Auswahl

**Inhalt (nur lesen)**
- [ ] Angenommen der eigene Zeitnachweis ist offen, dann zeigt er dieselben Kennzahlen wie für Freigeber (Saldo Vormonat, Ist, Soll, Abweichung, Gleitzeit Stand heute, Ferien im Monat, Feriensaldo Monatsende) und die Tabelle Tag für Tag mit denselben Werten
- [ ] Angenommen eine Person ohne Freigeber-Rolle, dann gibt es weder „Gehen nachtragen“ noch „Einträge erfassen“ noch Löschen (kein ×, kein „löschen“)
- [ ] Angenommen eine Person ohne Freigeber-Rolle, wenn sie „PDF herunterladen“ wählt, dann erhält sie das PDF ihres eigenen Zeitnachweises für den gewählten Monat (wie PROJ-16)
- [ ] Angenommen der Zeitnachweis ist offen, dann steht oben der Satz „Korrekturen bitte in der SharePoint-Zeiterfassung erfassen. Änderungen erscheinen hier am nächsten Morgen.“

**Hinweise**
- [ ] Angenommen ein Tag hat einen Tageshinweis (offen – Gehen fehlt, Einträge überschneiden sich, unplausibler Eintrag zählt nicht, Ferien und Arbeitszeit am selben Tag), dann sieht ihn auch der Mitarbeitende
- [ ] Angenommen ein Tag hat eine eigene Bemerkung aus SharePoint, dann wird sie angezeigt
- [ ] Angenommen die Bemerkung eines Tages enthält den Vermerk „aus SharePoint“, dann wird dieser Vermerk für Mitarbeitende nicht angezeigt (eine eigene Bemerkung davor bleibt sichtbar)
- [ ] Angenommen der Abgleich „Monatstotal laut App … berechnete Arbeitszeit“ würde erscheinen, dann wird er für Mitarbeitende nicht angezeigt

**Wählbare Monate**
- [ ] Angenommen die Person hat einen Beginn der Auswertung (Startsaldo-Stichtag, sonst Beginn des Arbeitsmodells, PROJ-14), dann sind die Monate vom Monat dieses Beginns bis zum aktuellen Monat wählbar; frühere und künftige Monate nicht (Pfeile deaktiviert, Auswahl begrenzt, Aufruf per URL führt zum nächstgelegenen erlaubten Monat)
- [ ] Angenommen die Person hat keinen Beginn der Auswertung (kein Arbeitsmodell erfasst), dann sieht sie nur den aktuellen Monat mit dem Hinweis „Arbeitsmodell noch nicht erfasst – bitte an die Personalverantwortung wenden“
- [ ] Angenommen für die Person ist ein Austritt erfasst und das Konto ist noch aktiv, dann sind die Monate bis und mit dem Austrittsmonat wählbar, spätere nicht

**Sonderfälle**
- [ ] Angenommen für die Person ist „nicht auswerten“ gesetzt (PROJ-14), dann sieht sie keinen Zeitnachweis, sondern den Hinweis „Für dich wird kein Zeitnachweis geführt“
- [ ] Angenommen es gibt keine Zeiteinträge und keinen Personendatensatz mit der Anmelde-E-Mail, dann sieht die Person „Für dein Konto (Anmelde-E-Mail) wurden keine Zeiteinträge gefunden. Bitte wende dich an die Personalverantwortung.“ statt eines leeren Zeitnachweises
- [ ] Angenommen Dataverse ist nicht erreichbar, dann erscheint eine verständliche Fehlermeldung (wie in PROJ-13) und keine Daten anderer Personen

**Handy**
- [ ] Angenommen der Zeitnachweis wird auf einem Handy (375 px) geöffnet, dann stehen die Kennzahlen untereinander (zwei pro Zeile), die Tabelle lässt sich seitlich wischen, wobei Datum und Zeiten links stehen bleiben, und Monats-Auswahl sowie „PDF herunterladen“ sind mit dem Finger bedienbar

## Edge Cases
- **Anmelde-E-Mail mit Grossbuchstaben** (z.B. `Vorname.Name@…`): Abgleich ohne Gross-/Kleinschreibung, die Einträge werden gefunden
- **Anmelde-E-Mail einer anderen Domain oder Alias:** kein Treffer → Hinweis „keine Zeiteinträge gefunden“ (kein manuelles Zuordnen in diesem Feature)
- **Personendatensatz vorhanden, aber noch keine Zeiteinträge** (z.B. Neueintritt): Zeitnachweis mit Soll, Ist 0 — kein „keine Zeiteinträge gefunden“
- **Tag ohne Arbeitszeit mit Soll** (z.B. vergessen zu erfassen, noch offen in SharePoint oder vom Flow weggelassen): zählt wie für Freigeber mit −Soll; der Satz zu Korrekturen in SharePoint erklärt, was zu tun ist
- **Heutiger Tag:** erscheint wie für Freigeber; Zeiten von heute kommen erst mit dem nächtlichen Flow
- **Rolle entzogen oder Konto gelöscht während einer laufenden Sitzung:** spätestens bei der nächsten Anmeldung kein Zugang mehr
- **Freigeber ohne Rolle Mitarbeiter:** sieht alle Zeitnachweise wie bisher, „Mein Zeitnachweis“ erscheint nicht
- **Person mit Austritt in der Zukunft:** alle Monate bis zum aktuellen Monat wählbar
- **Monat des Beginns liegt im aktuellen Monat:** nur dieser Monat wählbar

## Technical Requirements (optional)
- Sicherheit: Die Einschränkung auf die eigenen Daten muss serverseitig gelten (Seite und PDF), nicht nur in der Oberfläche
- Datenschutz: Arbeitszeiten sind Personendaten; Mitarbeitende dürfen nie Daten anderer Personen erhalten
- Gleiche Rechenregeln wie PROJ-13 bis PROJ-15 (keine zweite Berechnung)
- Responsive: Handy 375 px, Tablet 768 px, Desktop 1440 px

## Open Questions
- [ ] Wer legt die App-Rolle „Mitarbeiter“ in Entra ID an und weist sie zu, und ab wann? (Nutzer, vor dem Deploy)
- [ ] Wie erfahren die Mitarbeitenden vom neuen Zugang (Mail mit Link, Teams)? Nicht Teil des Features, aber vor dem Go-live zu klären

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Nur lesen, PDF erlaubt | SharePoint ist massgeblich; Änderungen im Tool würde der Flow überschreiben (Nutzer-Entscheid) | 2026-11-21 |
| Zugang nur mit neuer App-Rolle „Mitarbeiter“ in Entra ID | Kontrolle pro Person beim Freigeber, gleich wie Bearbeiter/Freigeber; ein Firmenkonto allein reicht nicht (Nutzer-Entscheid) | 2026-11-21 |
| Zuordnung über die Anmelde-E-Mail (ohne Gross-/Kleinschreibung) | Die Einträge tragen die E-Mail aus SharePoint; keine zusätzliche Pflege nötig | 2026-11-21 |
| Rollen addieren sich; nur Mitarbeiter → direkt zum eigenen Zeitnachweis, sonst nichts | Prüfer mit Rolle Bearbeiter brauchen kein zweites Konto; Mitarbeitende sehen keine Kunden- und Gerätedaten (Nutzer-Entscheid) | 2026-11-21 |
| Wählbare Monate: Beginn der Auswertung bis aktueller Monat | Vor dem Stichtag stimmen Saldo und Gleitzeit nicht (Excel-Zeitraum); vermeidet Rückfragen (Nutzer-Entscheid) | 2026-11-21 |
| Ohne Arbeitsmodell nur aktueller Monat mit Hinweis | Ohne Beginn gibt es keinen sinnvollen Saldo | 2026-11-21 |
| Tageshinweise und eigene Bemerkung anzeigen; „aus SharePoint“ und Monatstotal-Abgleich ausblenden | Mitarbeitende sollen Fehler in SharePoint korrigieren können, technische Vermerke verwirren (Nutzer-Entscheid) | 2026-11-21 |
| Fester Hinweis zu Korrekturen in SharePoint | Erklärt, wo korrigiert wird und dass Änderungen erst am nächsten Morgen erscheinen (nächtlicher Flow) | 2026-11-21 |
| „nicht auswerten“ → kein Zeitnachweis, nur Hinweis | Kennzeichen ist bewusst gesetzt (z.B. Geschäftsleitung, Aushilfen) (Nutzer-Entscheid) | 2026-11-21 |
| Nach Austritt mit aktivem Konto: Monate bis Austrittsmonat sichtbar | Schlussstand bleibt einsehbar und als PDF verfügbar (Nutzer-Entscheid) | 2026-11-21 |
| Kein Treffer zur Anmelde-E-Mail → klarer Hinweis statt leerem Zeitnachweis | Ein leerer Zeitnachweis mit −Soll an jedem Tag wäre irreführend (Nutzer-Entscheid) | 2026-11-21 |
| Bestehende Ansicht auf dem Handy nutzbar machen, kein eigenes Handy-Layout | Gleitzeit unterwegs prüfen; ein zweites Design wäre doppelter Pflegeaufwand (Nutzer-Entscheid) | 2026-11-21 |

### Technical Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| _To be added by /architecture_ | | |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
