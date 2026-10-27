# PROJ-14: Arbeitsmodell pro Person

## Status: Approved
**Created:** 2026-10-26
**Last Updated:** 2026-10-27

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
- [x] Nutzer: Tabellen und Rechte in Dataverse anlegen → erledigt und verifiziert 2026-10-26 (Schema siehe Implementation Notes)
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
| Datumsfelder bleiben "Benutzer lokal"; das Tool schreibt und liest sie immer als Kalenderdatum in Schweizer Zeit (Europe/Zurich) | Bestehende Spalten lassen sich in Dataverse nicht auf "Zeitzonenunabhängig"/"Nur Datum" umstellen (vom Nutzer getestet); gleiche Umrechnung wie beim Aktivitätsdatum der Zeiteinträge. Grenze: wer die Felder direkt in Dataverse mit anderer Zeitzone bearbeitet, kann das Datum verschieben | 2026-10-26 |
| Primärspalte der Person (`bmvcc_name`) enthält die E-Mail; lesbarer Name in eigener Spalte `bmvcc_anzeigename` | Schlüssel `bmvcc_mail` liegt auf der Primärspalte (vom Nutzer so angelegt) | 2026-10-26 |

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

## Implementation Notes

### Dataverse-Schema (vom Nutzer angelegt, gelesen 2026-10-26, nur lesend)
**Zeiterfassung Person** — Entity-Set `bmvcc_zeiterfassungpersons`, Id `bmvcc_zeiterfassungpersonid`
| Spalte | Typ | Inhalt |
| --- | --- | --- |
| `bmvcc_name` | Text (850), Primärspalte | E-Mail in Kleinbuchstaben; alternativer Schlüssel `bmvcc_mail` (aktiv) |
| `bmvcc_anzeigename` | Text (100) | Name |
| `bmvcc_nichtauswerten` | Ja/Nein | nicht auswerten |
| `bmvcc_austrittam` | Datum, Format "Nur Datum", Verhalten "Benutzer lokal" | Austritt (letzter Tag mit Soll) |
| `bmvcc_gleitzeitstartsaldo` | Dezimal, 2 Nachkommastellen | Startsaldo in Stunden |
| `bmvcc_startsaldostichtag` | Datum, "Nur Datum", "Benutzer lokal" | Stichtag |

**Arbeitsmodell** — Entity-Set `bmvcc_arbeitsmodells`, Id `bmvcc_arbeitsmodellid`
| Spalte | Typ | Inhalt |
| --- | --- | --- |
| `bmvcc_name` | Text, Primärspalte | vom Tool gefüllt |
| `bmvcc_person` | Verweis → Zeiterfassung Person (Pflicht), Navigation `bmvcc_Person` | Person |
| `bmvcc_gultigab` | Datum, "Nur Datum", "Benutzer lokal" | gültig ab |
| `bmvcc_pensum` | Dezimal, 1 Nachkommastelle | Pensum in % |
| `bmvcc_arbeitstagmontag` … `bmvcc_arbeitstagsonntag` | 7× Ja/Nein | Arbeitstage |

Kein alternativer Schlüssel auf (Person + gültig ab) — das Tool prüft doppelte Daten selbst.

**Rechte** des App-Benutzers "# OBSI Hofer Admin" (per `RetrieveUserPrivileges` geprüft): auf beiden Tabellen Lesen, Erstellen, Schreiben, Löschen, Anfügen, Anfügen an (Organisation). Lesen auf `bmvcc_timetrackingentry` erteilt.

**Datumsfelder:** "Benutzer lokal" lässt sich bei bestehenden Spalten nicht umstellen. Das Tool schreibt ein Datum als Mitternacht Schweizer Zeit und liest es in Schweizer Zeit zurück (siehe Technical Decisions). Eine Testspalte `bmvcc_austritt` ("Zeitzonenunabhängig") wird nicht verwendet und kann gelöscht werden.

### Umsetzung Frontend + Backend (2026-10-27, Branch `zeiterfassung`, nur lokal)
Wie bei PROJ-11 in einem Schritt gebaut (die Oberfläche braucht die Dataverse-Anbindung zum Testen).

**Seiten**
- Menüpunkt "Zeiterfassung" (nur Freigeber) → `/zeiterfassung` leitet vorerst auf `/zeiterfassung/personen` weiter (Zeitnachweis folgt mit PROJ-13)
- `/zeiterfassung/personen`: Personenliste (`zeiterfassung-personen-liste.tsx`) mit Filter "nur ohne Arbeitsmodell", Schalter "ausgeblendete anzeigen", Hinweis "x Personen haben noch kein Arbeitsmodell" (ohne ausgeblendete), Leer-Hinweis. Pensum/Arbeitstage zeigen die heute gültige Version, sonst die nächste künftige ("ab …")
- `/zeiterfassung/personen/[email]` (E-Mail URL-kodiert): Angaben zur Person (`person-stammdaten-form.tsx`: Name, nicht auswerten, Austritt, Startsaldo + Stichtag mit Hinweisen "Stichtag vor Eintritt" / "Zeiteinträge bis zum Stichtag") und Arbeitsmodell-Verlauf (`arbeitsmodell-verlauf.tsx`: neueste zuerst, abgeleitetes "gültig bis", Dialog mit laufend angezeigtem Soll, Bestätigung vor dem Löschen). Unbekannte E-Mails → 404
- Freigeber-Prüfung auf beiden Seiten und in allen Aktionen; Meldung statt Inhalt für Bearbeiter

**Server**
- `src/app/(protected)/zeiterfassung/personen/actions.ts`: `speicherePersonAction`, `speichereArbeitsmodellAction` (neu oder Korrektur), `loescheArbeitsmodellAction`; Zod-Prüfung (Pensum 0–100 auf eine Nachkommastelle, Arbeitstag bei Pensum > 0, gültiges Datum, Startsaldo ±9999.99 mit Komma erlaubt, Startsaldo und Stichtag nur zusammen); doppeltes "gültig ab" wird abgelehnt; Versionen nur der eigenen Person änderbar/löschbar; Personen werden nur angelegt, wenn die E-Mail in den Zeiteinträgen vorkommt
- `src/lib/dataverse/zeiterfassung.ts`: E-Mails per `$apply=groupby((bmvcc_useremail))`, Personen/Versionen mit Nachladen aller Seiten, Person per Upsert über den Schlüssel (`PATCH bmvcc_zeiterfassungpersons(bmvcc_name='…')`), Version per Bind über die Personen-ID
- `src/lib/dataverse/records.ts`: neu `listAllRecords` (folgt `@odata.nextLink`, K5) und `upsertRecordByKey`

**Gemeinsame Regeln (für PROJ-13/15)**
- `src/lib/zeiterfassung/soll.ts`: `sollProArbeitstag`, `sollAmDatum`, `gueltigeVersion`, `gueltigBis`, `aktuelleVersion`, Formatierung
- `src/lib/zeiterfassung/datum.ts`: Schweizer Kalenderdatum ↔ Dataverse-Zeitpunkt (Mitternacht Europe/Zurich), Wochentag, Vortag
- `src/lib/zeiterfassung/personen-uebersicht.ts`: Zusammenführung E-Mails + Personen + Versionen

**Gegen Dataverse geprüft (2026-10-27, Testperson angelegt und wieder gelöscht):** gruppierte E-Mail-Abfrage, Upsert über den Schlüssel (gleiche ID beim zweiten Aufruf), Datum wird unverändert gespeichert. Ein Bind über den alternativen Schlüssel (`bmvcc_Person@odata.bind` mit E-Mail) findet die Person **nicht** (404) — deshalb Bind über die ID.

**Abweichungen / Hinweise**
- Gruppierte Abfragen sind in Dataverse auf 50'000 Einträge begrenzt; bei rund 5'000 Einträgen pro Jahr reicht das für mehrere Jahre, danach muss die Personenliste anders ermittelt werden
- Die E-Mail steht in der URL der Detailseite (internes Tool, Firmen-Adressen)

**Tests:** 68 neue Unit- und Komponententests (Rechenregel, Datum inkl. Zeitumstellung, Datenschicht, Aktionen inkl. Bearbeiter-Sperre, Liste, Dialog); gesamt 496 grün, `tsc` und ESLint sauber.

## QA Test Results

**Tested:** 2026-10-27
**App URL:** http://localhost:3000 (Branch `zeiterfassung`, nur lokal)
**Tester:** QA Engineer (AI) + Browser-Test durch den Nutzer (Testanleitung Punkte 1–8, "passt")

### Acceptance Criteria Status

#### Zugriff
- [x] Bearbeiter: Seiten zeigen nur den Freigeber-Hinweis, alle drei Aktionen lehnen serverseitig ab, ohne Dataverse zu berühren (`actions.test.ts`); Menüpunkt nur für Freigeber
- [x] Ohne Login: `/zeiterfassung`, `/zeiterfassung/personen` und die Personenseite leiten auf `/login` (E2E)

#### Personenliste
- [x] Jede E-Mail genau einmal, Gross-/Kleinschreibung zusammengeführt, mit Name, aktuellem Pensum/Arbeitstagen bzw. "kein Arbeitsmodell" und Startsaldo — Nutzer-Test (5 Testpersonen) + `personen-uebersicht.test.ts`, `zeiterfassung.test.ts`
- [x] Ohne Arbeitsmodell deutlich markiert (rotes Badge + Zähler), Filter "nur ohne Arbeitsmodell"
- [x] "nicht auswerten": standardmässig ausgeblendet, nicht im Zähler "ohne Arbeitsmodell", per Schalter wieder sichtbar und auf der Personenseite zurücksetzbar. Wirkung im Zeitnachweis → mit PROJ-13 zu prüfen
- [x] Leer-Hinweis ohne Zeiteinträge (Komponententest)

#### Name
- [x] Name erscheint in Liste und Überschrift statt der E-Mail, leerer Name zeigt wieder die E-Mail (Nutzer-Test + `actions.test.ts`). Zeitnachweis → PROJ-13

#### Arbeitsmodell
- [x] Soll pro Arbeitstag wird im Dialog laufend und im Verlauf angezeigt (z.B. "8.00 h an Mo, Di"; 45 % an Mo–Mi = 6.00 h)
- [x] Pensum > 0 ohne Arbeitstag, < 0, > 100, leer sowie fehlendes "gültig ab" werden serverseitig mit Meldung abgelehnt
- [x] Neue Version ab späterem Datum: bisherige gilt bis zum Vortag (abgeleitetes "gültig bis", `soll.test.ts`)
- [x] Verlauf neueste zuerst mit gültig ab/bis, Pensum, Arbeitstagen, Soll
- [x] Korrigieren und Löschen (mit Bestätigung); nur Versionen der eigenen Person. Neuberechnung im Zeitnachweis → PROJ-13 (rechnet live, nichts gespeichert)
- [x] Austritt: ab dem Folgetag kein Soll (`sollAmDatum`), Person bleibt in der Liste, Badge "ausgetreten" sobald das Datum vorbei ist (siehe BUG-1/BUG-3)

#### Gleitzeit-Startsaldo
- [x] Startsaldo in Stunden, auch negativ, Komma erlaubt, auf zwei Nachkommastellen gerundet, mit Stichtag; Startsaldo und Stichtag nur zusammen
- [x] Genau ein Startsaldo pro Person, korrigierbar
- [x] Ohne Startsaldo zeigt die Liste "kein Startsaldo". Rechnung ab der ersten Version mit 0 → PROJ-13

#### Fehler
- [x] Fehlgeschlagenes Speichern: verständliche Meldung, Formular bzw. Dialog bleiben mit den Eingaben offen (Komponententest + Aktionstests); Verbindungsabbruch/abgelaufene Aktion abgefangen

### Edge Cases Status
- [x] Zwei Versionen mit demselben "gültig ab" → abgelehnt (gleichzeitige Eingabe zweier Freigeber siehe BUG-2)
- [x] Neue Version vor der bisher ersten → erlaubt
- [x] Pensum 0 % ohne Arbeitstage → erlaubt, Soll 0
- [x] Krumme Werte (45 %/3 Tage = 6.00 h, 30 %/4 Tage = 3.00 h, 50 %/3 Tage = 6.67 h)
- [x] Arbeitstage am Wochenende → erlaubt und gerechnet
- [x] Stichtag vor dem Eintritt bzw. nach dem ersten Zeiteintrag → Hinweis, Speichern erlaubt
- [x] E-Mail in unterschiedlicher Schreibweise → eine Person
- [x] Zwei Freigeber bearbeiten dieselbe Person → Last-Write-Wins
- [x] Zeitumstellung: Datum bleibt an allen Tagen eines Jahres gleich (Rundlauf-Test 366 Tage, inkl. 29.03. und 25.10.)
- [x] Unbekannte E-Mail in der URL → 404; Aktionen legen keine Personen an, die in den Zeiteinträgen nicht vorkommen

### Security Audit Results
- [x] Authentifizierung: alle neuen Routen hinter dem Login (E2E)
- [x] Autorisierung: Freigeber-Prüfung auf Seiten- und Aktionsebene. Defense in depth geprüft: Ein Pfad auf `.png` (vom Login-Schutz in `proxy.ts` ausgenommen) zeigt ohne Sitzung nur den Freigeber-Hinweis, keine Daten
- [x] Fremde Datensätze: Versionen lassen sich nur ändern/löschen, wenn sie zur Person der URL gehören; Versions-IDs per Zod-GUID geprüft
- [x] Injection: E-Mail wird in OData-Filtern und im Schlüssel-Pfad escaped (`'` verdoppelt) und kodiert (Tests mit `o'neil@…`); Name per React escaped (kein XSS)
- [x] Keine Personendaten in Logs (keine `console`-Ausgaben in den neuen Modulen); keine Zeit- oder Personendaten im Repo (Tests mit erfundenen Adressen)
- [x] Rate Limiting: wie im übrigen Tool keines (nur angemeldete Freigeber) — kein neues Risiko
- [ ] Hinweis: Die E-Mail steht in der URL der Personenseite und damit in Server-Logs (internes Tool, Firmen-Adressen — bewusst akzeptiert, siehe Implementation Notes)

### Responsive / Browser
- Nutzer-Test im Desktop-Browser. Mobile Ansicht nicht separat geprüft: Tabellen scrollen horizontal (`overflow-x-auto`), Formulare einspaltig unter `sm`, Menüpunkt auch im mobilen Menü. Firefox/Safari nicht getestet (Login nicht automatisierbar); verwendet nur Standard-Elemente (`input type=date`, shadcn)

### Automatisierte Tests
- [x] `npm test`: 40 Dateien, 496 Tests grün
- [x] `npm run test:e2e`: 30/30 grün (neu: `tests/PROJ-14-arbeitsmodell-pro-person.spec.ts`, 3 Routen × 2 Browser)

### Bugs Found

#### BUG-1: Austritt vor dem Beginn einer Version ergibt widersprüchliches "gültig bis"
- **Severity:** Low
- **Steps to Reproduce:**
  1. Person mit Version ab 01.11.2026
  2. Austritt am 31.05.2026 speichern
  3. Expected: Hinweis, dass der Austritt vor einer Version liegt, bzw. sinnvolle Anzeige
  4. Actual: Verlauf zeigt "gültig ab 01.11.2026, gültig bis 31.05.2026"; kein Hinweis. Die Rechnung stimmt (nach dem Austritt kein Soll)
- **Priority:** Nice to have
- **Status:** ✅ Behoben (2026-10-27) — Liegt der Austritt vor einer Version, gilt sie als "nach Austritt – ohne Wirkung" (Badge statt "gültig bis"); "gültig bis" endet am früheren von Austritt und Vortag der nächsten Version; Hinweis im Formular

#### BUG-2: Gleichzeitig angelegte Versionen mit demselben Datum
- **Severity:** Low
- **Steps to Reproduce:**
  1. Zwei Freigeber öffnen dieselbe Person
  2. Beide legen gleichzeitig eine Version mit demselben "gültig ab" an
  3. Expected: zweite wird abgelehnt
  4. Actual: beide werden gespeichert (die Prüfung im Tool liest vor dem Schreiben; Dataverse hat keinen alternativen Schlüssel Person + gültig ab). Danach gilt zufällig eine der beiden
- **Priority:** Nice to have — sehr unwahrscheinlich; vollständig lösbar mit einem alternativen Schlüssel (Person + gültig ab) in Dataverse
- **Status:** ✅ Behoben (2026-10-27) — Nach dem Anlegen prüft die Aktion auf eine zweite Version am selben Datum; behalten wird die kleinste ID, die eigene wird gelöscht und mit "Für dieses Datum gibt es bereits eine Version" abgelehnt

#### BUG-3: Künftiger Austritt in der Personenliste nicht sichtbar
- **Severity:** Low
- **Steps to Reproduce:**
  1. Austritt in der Zukunft erfassen
  2. Personenliste öffnen
  3. Expected: Hinweis auf den bevorstehenden Austritt
  4. Actual: Badge erscheint erst, wenn das Datum vorbei ist
- **Priority:** Nice to have
- **Status:** ✅ Behoben (2026-10-27) — Personenliste zeigt einen künftigen Austritt als Badge "Austritt {Datum}"

### Summary
- **Acceptance Criteria:** alle erfüllt (Wirkung im Zeitnachweis wird mit PROJ-13 geprüft)
- **Bugs Found:** 3 total (0 critical, 0 high, 0 medium, 3 low) — alle behoben 2026-10-27 (685 Tests grün)
- **Security:** Pass
- **Production Ready:** YES (fachlich) — Deploy aber erst nach Nutzer-Freigabe der Zeiterfassung (Vorgabe: erst alles lokal testen)
- **Recommendation:** Low-Bugs nach Wunsch beheben; weiter mit PROJ-13

## Deployment
_To be added by /deploy_
