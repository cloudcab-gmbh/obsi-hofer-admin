# PROJ-14: Arbeitsmodell pro Person

## Status: Architected
**Created:** 2026-10-26
**Last Updated:** 2026-10-26

## Dependencies
- Requires: PROJ-1 (Entra-ID-Login mit Rollen) — Pflege nur durch Freigeber
- Requires: PROJ-2 (Dataverse-Web-API-Anbindung) — Lesen der Zeiteinträge (Personen-E-Mails), Speichern von Arbeitsmodell, Name und Startsaldo
- Wird vorausgesetzt von: PROJ-13 (Zeitnachweis pro Monat) — Personenliste, Soll pro Tag, Gleitzeit-Startsaldo; PROJ-15 (Ferien) — Pensum für den Ferienanspruch
- **Dataverse-Voraussetzung:** Lesen auf `bmvcc_timetrackingentry` (erteilt 2026-10-26); für Arbeitsmodell, Name und Startsaldo gibt es noch keine Ablage — Form in /architecture, vom Nutzer anzulegen, plus Rechte für den App-Benutzer
- Grundlage: [docs/zeiterfassung-ausgangslage.md](../docs/zeiterfassung-ausgangslage.md)

## Ausgangslage
In der bisherigen Excel-Mappe wurde das Soll pro Tag von Hand eingetragen, der Gleitzeit-Saldo vom Vormonat übernommen. Damit der Zeitnachweis (PROJ-13) das Soll selbst berechnen kann, braucht jede Person ein Arbeitsmodell (Pensum und Arbeitstage) und einen Gleitzeit-Startsaldo, der den Stand aus Excel übernimmt.

**Berechnung des Solls:** Soll pro Arbeitstag = 40 h × Pensum ÷ Anzahl Arbeitstage pro Woche. Beispiel: 40 % an 2 Arbeitstagen (Mo, Di) → 40 × 0.4 ÷ 2 = 8 h an Mo und Di, 0 h an den übrigen Tagen. Feiertage und Ferien setzen das Soll im Zeitnachweis zusätzlich auf 0 (PROJ-13/15).

## User Stories
- Als Freigeber möchte ich alle Personen sehen, die in der Zeiterfassung vorkommen, damit niemand ohne Arbeitsmodell übersehen wird.
- Als Freigeber möchte ich pro Person Pensum und Arbeitstage ab einem Datum festlegen, damit der Zeitnachweis das richtige Soll berechnet.
- Als Freigeber möchte ich bei einer Pensumsänderung eine neue Version ab einem Datum erfassen, damit vergangene Monate unverändert bleiben.
- Als Freigeber möchte ich Eintritt und Austritt abbilden, damit vor dem Eintritt und nach dem Austritt kein Soll entsteht.
- Als Freigeber möchte ich pro Person den Gleitzeit-Saldo aus Excel per Stichtag übernehmen, damit der Zeitnachweis lückenlos weiterrechnet.
- Als Freigeber möchte ich einer Person einen Namen geben und Testkonten ausblenden, damit Listen und Zeitnachweis lesbar und vollständig sind.
- Als Bearbeiter möchte ich diese Funktion nicht sehen, da Pensen und Gleitzeit vertraulich sind.

## Out of Scope
- Anlegen von Personen von Hand — Personen entstehen ausschliesslich aus den E-Mails der Zeiteinträge
- Name aus Microsoft 365 / Entra ID holen — der Name wird von Hand ergänzt
- Soll-Stunden pro Wochentag frei eingeben (z.B. Mo 8.5 h, Di 6 h) — das Soll ist pro Arbeitstag gleich verteilt
- Halbe Arbeitstage im Modell (z.B. Mi nur Vormittag)
- Wochensoll pro Person oder für die Firma ändern — 40 h bei 100 % gilt fest
- Ferienanspruch, Ferientage, Feriensaldo — PROJ-15 (nutzt das Pensum aus diesem Feature)
- Feiertage — automatisch in PROJ-13
- Mehrere Startsaldi pro Person oder Saldo-Korrekturen mitten im Jahr (z.B. Auszahlung von Überzeit) — später, falls nötig
- Änderungsverlauf "wer hat wann was geändert"

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

**Zugriff**
- [ ] Angenommen ein Benutzer hat nur die Rolle "Bearbeiter", wenn er die Seite oder eine Speicher-Aktion direkt aufruft, dann wird der Zugriff serverseitig verweigert

**Personenliste**
- [ ] Angenommen es gibt Zeiteinträge, wenn ein Freigeber die Personenliste öffnet, dann sieht er jede vorkommende Mitarbeiter-E-Mail genau einmal (Gross-/Kleinschreibung ignoriert), mit Name (falls erfasst), aktuellem Pensum und Arbeitstagen oder dem Hinweis "kein Arbeitsmodell", und dem Gleitzeit-Startsaldo
- [ ] Angenommen eine Person hat kein Arbeitsmodell, dann ist sie in der Liste deutlich markiert und lässt sich nach "ohne Arbeitsmodell" filtern
- [ ] Angenommen eine Person ist als "nicht auswerten" markiert, dann erscheint sie standardmässig nicht in der Liste, nicht im Zeitnachweis (PROJ-13) und nicht im Hinweis "Einträge ohne Arbeitsmodell"; über einen Schalter "ausgeblendete anzeigen" lässt sie sich wieder einblenden und zurücksetzen
- [ ] Angenommen es gibt noch keine Zeiteinträge, wenn die Liste lädt, dann erscheint ein Leer-Hinweis statt einer leeren Tabelle

**Name**
- [ ] Angenommen ein Freigeber erfasst oder ändert den Namen einer Person, wenn er speichert, dann erscheint der Name in der Liste und im Zeitnachweis statt der E-Mail; ein leerer Name zeigt wieder die E-Mail

**Arbeitsmodell**
- [ ] Angenommen ein Freigeber erfasst ein Arbeitsmodell mit "gültig ab", Pensum (in %) und Arbeitstagen (Auswahl Mo–So), wenn er speichert, dann zeigt die Seite das daraus berechnete Soll pro Arbeitstag (40 h × Pensum ÷ Anzahl Arbeitstage), z.B. "8.00 h an Mo, Di"
- [ ] Angenommen ein Pensum über 0 % ohne Arbeitstag, ein Pensum unter 0 % oder über 100 %, oder ein fehlendes "gültig ab", wenn der Freigeber speichert, dann wird nicht gespeichert und eine verständliche Meldung angezeigt (serverseitig geprüft)
- [ ] Angenommen eine Person hat bereits ein Arbeitsmodell, wenn der Freigeber eine neue Version ab einem späteren Datum erfasst, dann gilt die bisherige Version bis zum Vortag und die neue ab diesem Datum; frühere Monate im Zeitnachweis bleiben unverändert
- [ ] Angenommen eine Person hat mehrere Versionen, dann sieht der Freigeber sie als Verlauf (gültig ab, Pensum, Arbeitstage, Soll pro Arbeitstag), neueste zuerst
- [ ] Angenommen eine Version wurde falsch erfasst, wenn der Freigeber sie korrigiert oder löscht, dann rechnet der Zeitnachweis alle betroffenen Tage mit dem korrigierten Stand neu; vor dem Löschen erscheint eine Bestätigung
- [ ] Angenommen ein Freigeber erfasst für eine Person einen Austritt (gültig bis), dann entsteht ab dem Folgetag kein Soll mehr; die Person bleibt in der Liste (markiert "ausgetreten")

**Gleitzeit-Startsaldo**
- [ ] Angenommen ein Freigeber erfasst für eine Person einen Startsaldo in Stunden (auch negativ, zwei Nachkommastellen) und einen Stichtag, wenn er speichert, dann rechnet der Zeitnachweis ab dem Folgetag mit diesem Saldo
- [ ] Angenommen eine Person hat einen Startsaldo, wenn der Freigeber ihn korrigiert, dann wirkt die Korrektur auf alle Monate nach dem Stichtag; es gibt pro Person genau einen Startsaldo
- [ ] Angenommen eine Person hat keinen Startsaldo, dann rechnet der Zeitnachweis ab dem "gültig ab" der ersten Arbeitsmodell-Version mit Saldo 0, und die Personenliste zeigt "kein Startsaldo"

**Fehler**
- [ ] Angenommen das Speichern schlägt fehl (Dataverse nicht erreichbar, fehlende Berechtigung), dann erscheint eine verständliche Fehlermeldung, die Eingaben bleiben im Formular erhalten

## Edge Cases
- **Zwei Versionen mit demselben "gültig ab"**: wird abgelehnt ("Für dieses Datum gibt es bereits eine Version")
- **Neue Version vor der bisher ersten Version** (Eintritt früher als gedacht): erlaubt; die neue Version gilt bis zum Tag vor der nächsten
- **Pensum 0 %** (z.B. unbezahlter Urlaub ab Datum): erlaubt, ohne Arbeitstage; Soll 0 an allen Tagen
- **Krumme Werte**: 45 % an 3 Tagen → 40 × 0.45 ÷ 3 = 6.00 h; 30 % an 4 Tagen → 3.00 h; Anzeige und Rechnung auf zwei Nachkommastellen, Summe pro Woche bleibt 40 h × Pensum
- **Arbeitstage am Wochenende** (z.B. Sa): erlaubt
- **Stichtag des Startsaldos vor dem Eintritt** oder nach dem ersten Zeiteintrag: Hinweis, aber erlaubt (der Freigeber übernimmt Stände aus Excel, die nicht exakt zum Modell passen müssen)
- **Zeiteinträge vor dem ersten "gültig ab"**: kein Soll; der Zeitnachweis zeigt die Stunden als Ist (Gleitzeit steigt) — mit Hinweis "vor Arbeitsmodell"
- **E-Mail in unterschiedlicher Schreibweise** (Gross/Klein) in den Einträgen: eine Person
- **Person wechselt die E-Mail-Adresse**: zwei Personen; bewusst nicht zusammengeführt (siehe Open Questions)
- **Zwei Freigeber bearbeiten dieselbe Person gleichzeitig**: Last-Write-Wins, wie in den übrigen Features

## Technical Requirements (optional)
- Security: nur Freigeber, serverseitig auf Seiten- und Aktionsebene; Pensen und Salden sind Personendaten — nicht in Logs oder im Repo
- Alle Datumsangaben in Schweizer Zeit, Stunden mit zwei Nachkommastellen
- 100-%-Woche: 40 h, fest

## Open Questions
- [x] Wo werden Arbeitsmodell, Name, "nicht auswerten" und Startsaldo abgelegt? → zwei neue Dataverse-Tabellen "Zeiterfassung Person" und "Arbeitsmodell", siehe Tech Design (2026-10-26)
- [ ] Nutzer: Tabellen und Rechte in Dataverse anlegen (Spalten siehe Tech Design B)
- [ ] Wird bei einem E-Mail-Wechsel einer Person eine Zusammenführung benötigt? (vorerst nein)
- [ ] Soll der Stichtag des Startsaldos für alle Personen gleich sein (Umstellungstag), oder pro Person frei? (Spec: pro Person frei)

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Personen entstehen automatisch aus den E-Mails der Zeiteinträge | Keine doppelte Pflege; wer stempelt, erscheint (Nutzer-Entscheidung) | 2026-10-26 |
| Soll über Pensum + Arbeitstage, gleich verteilt: 40 h × Pensum ÷ Anzahl Arbeitstage | Entspricht der Arbeitsweise (Pensum ist ohnehin für den Ferienanspruch nötig); einfacher als Stunden pro Wochentag (Nutzer-Entscheidung) | 2026-10-26 |
| 100-%-Woche = 40 h, fest | Passt zur Excel-Umrechnung Gleitzeit-Tage = Stunden ÷ 8 (Nutzer-Entscheidung) | 2026-10-26 |
| Versionen mit "gültig ab" statt Überschreiben; Austritt über "gültig bis" | Vergangene Monate bleiben unverändert; Ein-/Austritt ohne Sonderlogik (Nutzer-Entscheidung) | 2026-10-26 |
| Ein Gleitzeit-Startsaldo pro Person per Stichtag, korrigierbar; ohne Saldo Start bei 0 | Übernahme des Excel-Stands; kein Zwang, damit neue Personen ohne Vorgeschichte sofort ausgewertet werden (Nutzer-Entscheidung) | 2026-10-26 |
| Name von Hand ergänzbar, Konten als "nicht auswerten" ausblendbar | Die Einträge kennen nur E-Mails; Testkonten (heute nur Testdaten vorhanden) sollen Listen nicht stören (Nutzer-Entscheidung) | 2026-10-26 |
| Korrigieren und Löschen von Versionen erlaubt, wirkt rückwirkend | Erfassungsfehler müssen behebbar sein; bewusste Pensumsänderungen werden als neue Version erfasst | 2026-10-26 |

### Technical Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Zwei neue Dataverse-Tabellen "Zeiterfassung Person" und "Arbeitsmodell", vom Nutzer angelegt | Keine eigene Datenbank (PRD); Person einmalig, Versionen mehrfach; Dataverse führt erstellt/geändert automatisch | 2026-10-26 |
| E-Mail in Kleinbuchstaben als Schlüssel der Person | Einzige Verbindung zu den Zeiteinträgen; Schreibweise darf keine zweite Person erzeugen | 2026-10-26 |
| "Gültig bis" einer Version wird abgeleitet, nicht gespeichert; Austritt an der Person | Keine Lücken oder Überschneidungen zwischen Versionen möglich | 2026-10-26 |
| Arbeitstage als 7 Ja/Nein-Spalten | Einfacher und robuster als eine Mehrfachauswahl in Dataverse | 2026-10-26 |
| Personenliste über zusammenfassende Abfrage der E-Mails; alle Seiten einer Abfrage nachladen | Bleibt schnell bei vielen Einträgen; kein Abschneiden bei 500 Datensätzen (Konsistenzprüfung K5) | 2026-10-26 |
| Soll-Berechnung als reine, eigens getestete Rechenregel, von PROJ-13/15 wiederverwendet | Eine Stelle für die Regel 40 h × Pensum ÷ Arbeitstage | 2026-10-26 |
| Eigener Menüpunkt "Zeiterfassung" mit Unterseiten, unabhängig vom Arbeitskontext Firma/Standort | Betrifft die eigenen Mitarbeitenden, nicht Kunden | 2026-10-26 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Ausgangslage
- Personen gibt es in Dataverse nicht als eigene Datensätze — die Zeiteinträge (`bmvcc_timetrackingentry`) kennen nur die E-Mail. Lesen ist erteilt (2026-10-26).
- Im Tool gibt es eine wiederverwendbare Freigeber-Prüfung (PROJ-8) und Dataverse-Hilfsfunktionen zum Lesen/Schreiben (PROJ-2). Diese laden heute aber nur die erste Seite einer Abfrage (Konsistenzprüfung K5) — für die Zeiterfassung muss das Nachladen weiterer Seiten dazukommen.
- Die Seiten der Zeiterfassung hängen **nicht** am Arbeitskontext Firma/Standort (PROJ-10); sie betreffen die eigenen Mitarbeitenden.

### A) Bausteine
```
Kopfzeile (bestehend)
+-- neuer Menüpunkt "Zeiterfassung" (nur Freigeber), Unterseiten:
      "Zeitnachweis" (PROJ-13) · "Personen" (PROJ-14) · später "Ferien" (PROJ-15)

/zeiterfassung/personen (nur Freigeber)
+-- Personenliste (Tabelle)
|   +-- Spalten: Name bzw. E-Mail · Pensum + Arbeitstage (aktuell gültig) · Soll pro Arbeitstag
|   |            · Startsaldo (Stichtag) · Status (ohne Arbeitsmodell / ausgetreten)
|   +-- Filter "nur ohne Arbeitsmodell" · Schalter "ausgeblendete anzeigen"
|   +-- Leer-Hinweis, wenn es noch keine Zeiteinträge gibt
|   +-- Klick auf eine Person → Detailseite

/zeiterfassung/personen/[Person] (nur Freigeber)
+-- Stammdaten: Name · "nicht auswerten" · Austritt (gültig bis)
+-- Gleitzeit-Startsaldo: Stunden + Stichtag
+-- Arbeitsmodell-Verlauf (Tabelle, neueste Version zuerst)
|   +-- gültig ab · Pensum · Arbeitstage · berechnetes Soll pro Arbeitstag
|   +-- "Neue Version" / "Bearbeiten" → Dialog mit Datum, Pensum, Arbeitstagen (Mo–So);
|   |    das Soll pro Arbeitstag wird im Dialog laufend angezeigt
|   +-- "Löschen" → Bestätigungsdialog
+-- Fehlermeldungen beim Speichern; Eingaben bleiben erhalten

Server (Aktionen, je mit Freigeber-Prüfung und Prüfung der Eingaben)
+-- Personen ermitteln: verschiedene E-Mails aus den Zeiteinträgen + gespeicherte Personendaten
+-- Name / "nicht auswerten" / Austritt / Startsaldo speichern
+-- Arbeitsmodell-Version anlegen, ändern, löschen

Gemeinsame Rechenregel (für PROJ-13 wiederverwendet)
+-- "Soll einer Person an einem Datum": gültige Version → Arbeitstag? → 40 h × Pensum ÷ Anzahl Arbeitstage;
     vor der ersten Version oder nach dem Austritt 0
```

### B) Datenmodell (in Worten)
Zwei neue Dataverse-Tabellen, **vom Nutzer anzulegen** (Vorgehen wie "Portalzugang" in PROJ-11). Schema-Namen werden nach dem Anlegen gelesen und in den Implementation Notes festgehalten.

**Tabelle "Zeiterfassung Person"** — ein Datensatz pro Person, für die der Freigeber etwas erfasst hat:
- E-Mail (Primärspalte, Text, Pflicht; in Kleinbuchstaben gespeichert; alternativer Schlüssel, damit es jede E-Mail nur einmal gibt)
- Name (Text, optional)
- Nicht auswerten (Ja/Nein, Standard Nein)
- Austritt am (Datum, optional) — letzter Tag mit Soll
- Gleitzeit-Startsaldo (Dezimalzahl, Stunden, 2 Nachkommastellen, auch negativ, optional)
- Startsaldo-Stichtag (Datum, optional; Pflicht, sobald ein Startsaldo erfasst ist)

**Tabelle "Arbeitsmodell"** — ein Datensatz pro Version:
- Name (Primärspalte, vom Tool gefüllt, z.B. "anna@… ab 01.11.2026")
- Person (Verweis auf "Zeiterfassung Person", Pflicht)
- Gültig ab (Datum, Pflicht)
- Pensum (Dezimalzahl in %, 0–100)
- Arbeitstag Montag … Arbeitstag Sonntag (7 Ja/Nein-Spalten)
- empfohlen: alternativer Schlüssel (Person + Gültig ab) → Dataverse verhindert zwei Versionen am selben Datum

Eine Version gilt bis zum Tag vor der nächsten Version; die letzte Version gilt bis zum Austritt bzw. offen. "Gültig bis" wird daher nicht gespeichert, sondern abgeleitet — Lücken oder Überschneidungen zwischen Versionen können nicht entstehen.

Der Personendatensatz entsteht automatisch beim ersten Speichern (Name, Startsaldo oder erste Version). Personen, die nur in den Zeiteinträgen vorkommen, erscheinen trotzdem in der Liste (Status "ohne Arbeitsmodell").

**Rechte für den App-Benutzer "# OBSI Hofer Admin":** auf beiden Tabellen Lesen, Erstellen, Schreiben, Löschen, Anfügen; auf "Zeiterfassung Person" zusätzlich "Anfügen an". Lesen auf `bmvcc_timetrackingentry` ist bereits erteilt.

### C) Technische Entscheidungen (Begründung)
- **Eigene Dataverse-Tabellen statt Excel, SharePoint oder eigener Datenbank:** gleiche Linie wie das ganze Tool (PRD: keine eigene Datenbank); Dataverse protokolliert "erstellt/geändert von/am" automatisch.
- **Zwei Tabellen (Person + Versionen)** statt alles in einer: Name, Ausblenden, Austritt und Startsaldo gibt es pro Person nur einmal, Arbeitsmodelle mehrfach.
- **E-Mail als Schlüssel der Person, in Kleinbuchstaben:** die Zeiteinträge kennen nur die E-Mail; Gross-/Kleinschreibung darf keine zweite Person erzeugen.
- **"Gültig bis" abgeleitet statt gespeichert:** eine neue Version beendet die vorige automatisch.
- **7 Ja/Nein-Spalten für die Arbeitstage** statt einer Mehrfachauswahl: in Dataverse und beim Lesen einfacher und robuster; in der Oberfläche trotzdem eine Zeile mit Mo–So-Häkchen.
- **Personenliste über eine zusammenfassende Abfrage** ("welche E-Mails kommen vor") statt alle Zeiteinträge zu laden: bleibt schnell, auch bei Zehntausenden Einträgen.
- **Nachladen aller Seiten bei Dataverse-Abfragen** für die Zeiterfassung: Abfragen dürfen nicht bei 500 Datensätzen abschneiden (Lehre aus der Konsistenzprüfung K5).
- **Soll-Berechnung als gemeinsame, reine Rechenregel** (ohne Datenzugriff, eigens getestet): PROJ-13 nutzt sie für jeden Tag, PROJ-15 das Pensum für den Ferienanspruch.
- **Freigeber-Prüfung auf jeder Seite und jeder Aktion** (wie PROJ-8): Aktionen sind direkt aufrufbar.
- **Bestehende Oberflächenbausteine** (Tabelle, Dialog, Checkbox, Eingabe, Bestätigungsdialog, Badge): keine neuen Komponenten nötig.

### D) Abhängigkeiten (Pakete)
Keine neuen Pakete.

### E) Tests
- Unit-Tests der Rechenregel: Soll pro Arbeitstag (40/45/30 % an 2–4 Tagen), Versionswechsel mitten im Monat, vor der ersten Version, nach dem Austritt, Pensum 0 %, Wochenend-Arbeitstage
- Unit-Tests der Aktionen: Bearbeiter abgelehnt; Prüfungen (Pensum ausserhalb 0–100, kein Arbeitstag bei Pensum > 0, doppeltes "gültig ab", Startsaldo ohne Stichtag); E-Mail in Kleinbuchstaben; Personendatensatz entsteht beim ersten Speichern
- Komponententests: Liste mit/ohne Arbeitsmodell, Filter und Schalter "ausgeblendete", Leer-Hinweis, Dialog mit laufend angezeigtem Soll, Fehler beim Speichern
- Manuell lokal mit den Testdaten (5 Personen): Tabellen und Rechte in Dataverse, Personenliste, Versionen anlegen/ändern/löschen, Startsaldo

### F) Vorgehen
1. Nutzer legt die zwei Tabellen und die Rechte in Dataverse an (Liste oben)
2. Schema lesen (nur lesend) und in den Implementation Notes festhalten
3. Bauen auf dem Branch `zeiterfassung`, nur lokal testen — kein Push auf `main`, kein Deploy bis zur Freigabe (Nutzer-Vorgabe 2026-10-26)

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
