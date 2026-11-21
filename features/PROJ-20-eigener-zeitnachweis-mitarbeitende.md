# PROJ-20: Eigener Zeitnachweis für Mitarbeitende

## Status: In Progress
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
- [ ] Liefert das Microsoft-Konto aller Mitarbeitenden eine E-Mail, die der E-Mail in der SharePoint-Liste entspricht (`vorname.name@obsi-hofer.ch`)? Vor dem Go-live mit einem Testkonto prüfen

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
| Eigene Seite „Mein Zeitnachweis“ statt Personen-Parameter auf der Freigeber-Seite | Die Seite kennt nur die angemeldete Person; ein Fehler in der Rollenprüfung kann so keine fremden Daten zeigen | 2026-11-21 |
| Person aus der Anmeldung (E-Mail aus dem Microsoft-Konto, sonst Anmeldename), nie aus der Anfrage | Schutz vor Manipulation der Adresse oder der PDF-Anfrage | 2026-11-21 |
| Eigene PDF-Aktion ohne E-Mail-Parameter | Die bestehende Freigeber-Aktion nimmt eine beliebige E-Mail entgegen; für Mitarbeitende darf das nicht möglich sein | 2026-11-21 |
| Zwei Schutzschichten: Umleitung beim Seitenaufruf und Rollenprüfung in jeder Aktion | Aktionen lassen sich unabhängig von der Seite aufrufen; Geräte-, Prüfbericht- und Firmenwahl-Aktionen prüften bisher nur die Anmeldung | 2026-11-21 |
| Bestehende Zeitnachweis-Ansicht mit Nur-Lesen-Modus statt zweiter Ansicht | Gleiche Werte und Hinweise für Freigeber und Mitarbeitende, eine Stelle zum Pflegen (inkl. Handy-Anpassung) | 2026-11-21 |
| Erlaubte Monate aus dem bestehenden Beginn der Auswertung (Stichtag/Arbeitsmodell) und dem Austritt | Keine zweite Regel; deckt sich mit der Berechnung des Zeitnachweises | 2026-11-21 |
| Rolle „Mitarbeiter“ als Entra-App-Rolle, keine eigene Benutzerverwaltung | Gleich wie PROJ-1; keine eigene Datenbank (PRD) | 2026-11-21 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Überblick
Kein neues Datenmodell und keine neue Tabelle in Dataverse: Der eigene Zeitnachweis nutzt dieselbe Berechnung und dieselbe Ansicht wie der Zeitnachweis für Freigeber (PROJ-13) und dasselbe PDF (PROJ-16). Neu sind eine eigene Seite „Mein Zeitnachweis“, die dritte Rolle „Mitarbeiter“ im Zugriffsschutz und eine Nur-Lesen-Variante der bestehenden Ansicht.

### Seitenstruktur
```
Mein Zeitnachweis  (neue Seite, eigene Adresse, z.B. /mein-zeitnachweis)
+-- Titel „Mein Zeitnachweis“ mit Namen der Person
+-- Fester Hinweis „Korrekturen bitte in der SharePoint-Zeiterfassung …“
+-- Monats-Auswahl (Pfeile + Kalender, begrenzt auf erlaubte Monate)
+-- „PDF herunterladen“ (immer der eigene Zeitnachweis)
+-- Zeitnachweis-Ansicht (bestehende Komponente, Nur-Lesen-Variante)
|   +-- Kennzahlen (auf dem Handy zwei pro Zeile)
|   +-- Tabelle Tag für Tag (auf dem Handy seitlich wischbar, Datum und Zeiten bleiben links stehen)
+-- Sonderfall-Meldungen statt Zeitnachweis
    +-- „Für dich wird kein Zeitnachweis geführt“ (nicht auswerten)
    +-- „Für dein Konto (…) wurden keine Zeiteinträge gefunden …“
    +-- „Arbeitsmodell noch nicht erfasst …“ (zusätzlich zum aktuellen Monat)
    +-- Fehlermeldung, wenn Dataverse nicht erreichbar ist

Kopfzeile / Menü (bestehend, angepasst)
+-- Geräte, Prüfberichte      → nur Bearbeiter und Freigeber (wie bisher)
+-- Freigabe, Zeiterfassung    → nur Freigeber (wie bisher)
+-- Mein Zeitnachweis          → neu, für alle mit Rolle Mitarbeiter
```

### Wie die Person bestimmt wird
- Die Seite nimmt **keine Person aus der Adresse** entgegen. Wer der Zeitnachweis gehört, ergibt sich ausschliesslich aus der Anmeldung: Beim Login übernimmt das Tool die E-Mail aus dem Microsoft-Konto (Feld „E-Mail“, sonst der Anmeldename) in die Sitzung.
- Diese E-Mail wird klein geschrieben mit den Zeiteinträgen und den Personen-Stammdaten (PROJ-14) abgeglichen.
- Auch der PDF-Download bekommt **keine E-Mail vom Browser**, sondern erzeugt immer das PDF der angemeldeten Person. Damit lässt sich durch Ändern der Adresse oder der Anfrage nie ein fremder Zeitnachweis abrufen.

### Rollen und Zugriffsschutz
| Rolle(n) | Darf ins Tool | Startseite nach dem Login | Sichtbar |
|---|---|---|---|
| nur Mitarbeiter | ja (neu) | Mein Zeitnachweis | nur Mein Zeitnachweis |
| Bearbeiter (+ evtl. Mitarbeiter) | ja | Start wie bisher | Geräte, Prüfberichte (+ Mein Zeitnachweis) |
| Freigeber (+ evtl. Mitarbeiter) | ja | Start wie bisher | alles wie bisher (+ Mein Zeitnachweis) |
| keine dieser Rollen | nein | Kein Zugang | — |

- **Erste Schutzschicht (Zugriffsprüfung beim Seitenaufruf):** Wer nur die Rolle Mitarbeiter hat, wird von jeder anderen Seite (Start, Geräte, Prüfberichte, Sync-Freigabe, Zeiterfassung) auf „Mein Zeitnachweis“ umgeleitet.
- **Zweite Schutzschicht (jede Aktion prüft selbst):** Heute prüfen die Aktionen für Geräte, Prüfberichte und die Firmen-/Standortwahl nur, ob jemand angemeldet ist — bisher genügte das, weil nur Bearbeiter und Freigeber hineinkamen. Mit der neuen Rolle könnten Mitarbeitende diese Aktionen sonst technisch aufrufen. Deshalb prüfen diese Aktionen künftig ausdrücklich „Bearbeiter oder Freigeber“. Die Aktionen der Zeiterfassung und der Sync-Freigabe prüfen bereits „nur Freigeber“ und bleiben unverändert.
- „Mein Zeitnachweis“ erscheint im Menü nur mit Rolle Mitarbeiter; ein Freigeber ohne diese Rolle sieht ihn nicht (Spec).

### Nur-Lesen-Variante der Ansicht
Die bestehende Zeitnachweis-Ansicht erhält einen Modus „Mitarbeiteransicht“:
- ohne Personen-Auswahl, ohne „Gehen nachtragen“, „Einträge erfassen“, Löschen-× und „löschen“ bei Ferien
- ohne den Vermerk „aus SharePoint“ in der Bemerkung (eine eigene Bemerkung davor bleibt) und ohne den Abgleich mit dem Monatstotal der App
- ohne Link auf die Personen-Seite (PROJ-14)
- Tageshinweise, Kennzahlen, Summen und Werte bleiben identisch zur Freigeber-Ansicht — eine Berechnung für beide

### Erlaubte Monate
- Untergrenze: Monat des Beginns der Auswertung (Startsaldo-Stichtag, sonst Beginn des Arbeitsmodells) — genau der Wert, mit dem der Zeitnachweis heute schon rechnet
- Obergrenze: aktueller Monat, bei erfasstem Austritt höchstens der Austrittsmonat
- Ein Monat ausserhalb (aus Adresse oder Kalender) wird auf den nächstgelegenen erlaubten Monat gesetzt; ohne Beginn nur der aktuelle Monat
- Die Monatswahl merkt sich das Tool wie heute pro Sitzung, getrennt von der Auswahl des Freigebers

### Datenmodell
Keine neuen Daten. Gelesen wird wie bisher:
- Zeiteinträge der Person (nur ihre eigene E-Mail, nur der benötigte Zeitraum)
- Personen-Stammdaten (Arbeitsmodell, Startsaldo, Stichtag, Austritt, „nicht auswerten“, Ferienanspruch) aus PROJ-14
- Feiertage aus PROJ-18

Neu in der Sitzung (nicht gespeichert): die E-Mail aus dem Microsoft-Konto.

### Einrichtung in Entra ID (Nutzer)
- In der App-Registrierung eine dritte App-Rolle **„Mitarbeiter“** (Wert `mitarbeiter`) anlegen, analog zu Bearbeiter und Freigeber
- Die Rolle den Mitarbeitenden zuweisen (auch Bearbeitern und Freigebern, die ihren eigenen Zeitnachweis sehen sollen)
- Keine neuen Umgebungsvariablen, keine neuen Dataverse-Rechte (der App-Benutzer liest die Zeiteinträge bereits)

### Abhängigkeiten
Keine neuen Pakete.

## Implementation Notes (Frontend, 2026-11-21)
- **Seite** `/mein-zeitnachweis`: Person nur aus der Anmeldung (`src/lib/auth/mitarbeiter.ts`), Monat aus `?monat=`, auf die erlaubten Monate begrenzt. Meldungen für: keine Rolle, keine E-Mail im Konto, keine Zeiteinträge, „nicht auswerten“, Ladefehler. Fester Hinweis zu Korrekturen in SharePoint
- **Laden:** `ladeEigenenZeitnachweis` in `zeitnachweis-laden.ts` (unterscheidet unbekannt / nicht auswerten / ok, nutzt denselben Rechenweg wie Seite und PDF der Freigeber); Regeln für erlaubte Monate und den Herkunftsvermerk als reine Funktionen in `src/lib/zeiterfassung/mein-zeitnachweis.ts` mit Unit-Tests; `auswertungsBeginn` aus `zeitnachweis.ts` exportiert
- **Ansicht:** `ZeitnachweisAnsicht` mit `nurLesen` — ohne Tag erfassen, Löschen, Nachtragen; offene Tage mit Verweis auf SharePoint statt Links; ohne „aus SharePoint“, Tagestotal- und Monatstotal-Abgleich; ohne Arbeitsmodell der Hinweis an die Personalverantwortung. Zusätzlich blendet die Mitarbeiteransicht den App-Tagestotal-Abgleich aus (wie den Monatstotal-Abgleich, technischer Hinweis)
- **Handy (beide Ansichten):** unter 768 px bleiben Datum und Zeiten beim seitlichen Wischen stehen; Kennzahlen zwei pro Zeile (bestand schon)
- **Monatswahl:** `MeinZeitnachweisMonat` mit Grenzen (Pfeile/Kalender deaktiviert ausserhalb); die Monatswahl wird nicht pro Sitzung gemerkt, sie steht nur in der Adresse (einfacher, Startmonat ist immer der aktuelle)
- **PDF:** `erzeugeEigenesZeitnachweisPdfAction(monat)` ohne E-Mail-Parameter; „Erstellt von“ = angemeldete Person
- **Menü:** „Mein Zeitnachweis“ mit Rolle Mitarbeiter; Geräte, Prüfberichte und Firmenwahl nur für Bearbeiter/Freigeber

## Implementation Notes (Backend, 2026-11-21)
- **Zugriffsschutz (`src/proxy.ts`):** Rolle `mitarbeiter` kommt ins Tool. Wer *nur* Mitarbeiter ist, wird von jeder Seite ausser `/mein-zeitnachweis` dorthin umgeleitet (auch von `/login`, `/kein-zugang`, `/start`); Bearbeiter/Freigeber unverändert mit Startseite `/start`, auch wenn sie zusätzlich Mitarbeiter sind
- **E-Mail in der Sitzung (`src/auth.ts`):** beim Login aus dem Claim `email`, sonst `preferred_username` bzw. `upn` (nur Werte mit „@“), klein geschrieben; wie die Rollen nur beim Login gesetzt → nach dem Deploy einmal neu anmelden
- **Rollenprüfung in den Aktionen:** `aktuellerBenutzerIstBearbeiterOderFreigeber` (`src/lib/auth/freigeber.ts`) in Geräte speichern, Prüfbericht-PDF, Prüfbericht erfassen/bearbeiten/stornieren sowie Firmen- und Standortwahl (`firma-session.ts`). Unverändert ohne Prüfung: reine Cookie-Aktionen ohne Dataverse-Zugriff (Geräte-Filter, Zeitnachweis-Auswahl, Abmelden). Zeiterfassung und Sync prüfen bereits „nur Freigeber“
- **Eigenes PDF:** `erzeugeEigenesZeitnachweisPdfAction(monat)` — Rolle Mitarbeiter, E-Mail aus der Sitzung, Monat wie auf der Seite begrenzt (Dateiname mit dem tatsächlich gezeigten Monat), keine Personendaten in Fehlermeldungen
- **Tests:** Proxy (Mitarbeiter allein, kombiniert mit Bearbeiter/Freigeber, unbekannte Rolle), Rollenprüfung in Geräte-, Prüfbericht- und Firmenwahl-Aktionen, eigenes PDF (ohne Rolle, ohne E-Mail, ungültiger Monat, immer eigene Person, keine Details im Fehler). 762 Unit-Tests grün
- **Keine** neuen Umgebungsvariablen, Pakete oder Dataverse-Rechte

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
