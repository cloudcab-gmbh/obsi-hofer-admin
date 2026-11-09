# PROJ-19: Import der SharePoint-Zeiterfassung

## Status: Architected
**Created:** 2026-11-09
**Last Updated:** 2026-11-09

## Dependencies
- Requires: PROJ-2 (Dataverse-Web-API-Anbindung) — schreibt und löscht Zeiteinträge
- Requires: PROJ-13 (Zeitnachweis) — die importierten Einträge erhalten dieselben Felder wie die Erfassungs-App bzw. das Erfassen im Zeitnachweis (Decision Log PROJ-13, 2026-10-27)
- Betrifft: PROJ-14 (Personen, Startsaldo-Stichtag), PROJ-15 (Ferien/Frei bleiben unangetastet), PROJ-17 (Übersicht zeigt die importierten Daten)
- **Dataverse:** Erstellen und Löschen auf `bmvcc_timetrackingentry` für den App-Benutzer (beides seit PROJ-13 vorhanden — vor dem Lauf prüfen)
- **Extern (Nutzer):** Power-Automate-Flow für die Tagestotals ist während des Imports deaktiviert; ein neuer Flow des Nutzers übernimmt danach laufend neue SharePoint-Einträge nach Dataverse (nicht Teil dieses Features)

## Ausgangslage
Die Mitarbeitenden erfassen ihre Zeiten weiterhin in der SharePoint-Liste "Zeiterfassung" (Site "Projekte"), ein Datensatz pro Person und Tag mit Arbeitsbeginn/-ende (AStart/AEnde), Pause (PStart/PEnde) und Mittagessen. Das Admin-Tool (PROJ-13 bis PROJ-18) rechnet aber mit den Einträgen in Dataverse (`bmvcc_timetrackingentry`, ein Eintrag pro Kommen/Gehen), wo bisher nur Testdaten liegen. Damit Zeitnachweis, Ferien und Übersicht echte Daten zeigen, wird die Liste einmalig nach Dataverse übernommen.

**Änderung gegenüber früheren Aussagen:** [docs/zeiterfassung-ausgangslage.md](../docs/zeiterfassung-ausgangslage.md) und PROJ-13 nennen die SharePoint-Liste "abgelöst, nicht mehr relevant". Stand 2026-11-09 ist sie die laufende Erfassung und die Quelle für Dataverse.

Quelle ist ein CSV-Export der Liste (Spalten: Title = E-Mail, AktivitaetsDatum, AZNetto, AStart, AEnde, PStart, PEnde, Mittagessen, Bemerkung, ID, AktivitaetsDatumZeit, zeitrecid, Aktivitaetstyp). Die Datei liegt lokal ausserhalb des Repos (Personendaten, öffentliches Repo).

Trockenlauf-Analyse vom 2026-11-09: 1'451 Zeilen, 9 Personen, Juli 2023 bis 09.11.2026; 1'304 Zeilen mit Pause, 90 ohne Pause, rund 57 Problemzeilen.

## User Stories
- Als Entwickler/Freigeber möchte ich die SharePoint-Zeiterfassung einmalig nach Dataverse übernehmen, damit Zeitnachweis, Ferien und Übersicht mit echten Daten rechnen.
- Als Freigeber möchte ich vor dem eigentlichen Import einen Bericht sehen (wie viele Einträge pro Person, welche Zeilen weggelassen werden und warum), damit ich den Import bewusst freigeben kann.
- Als Freigeber möchte ich, dass die Testeinträge in Dataverse vor dem Import entfernt werden, damit sie die Gleitzeit nicht verfälschen.
- Als Freigeber möchte ich, dass erfasste Ferien und Frei-Tage erhalten bleiben, damit ich sie nicht neu erfassen muss.
- Als Freigeber möchte ich weggelassene Problemzeilen in einer Liste haben, damit ich sie bei Bedarf im Zeitnachweis von Hand nachtragen kann.
- Als Entwickler möchte ich den Import ein zweites Mal nur ergänzend laufen lassen können, damit Zeilen zwischen CSV-Export und Start des neuen Flows nicht verloren gehen.

## Out of Scope
- Oberfläche im Admin-Tool für den Import — einmaliges lokales Skript, ausgeführt vom Entwickler
- Laufende Übernahme neuer oder geänderter SharePoint-Einträge — macht der Power-Automate-Flow des Nutzers
- Direktes Lesen der SharePoint-Liste über Graph — Quelle ist der CSV-Export (keine neuen Rechte nötig)
- Import einer ausgetretenen Person (Nutzer-Entscheid; ihre E-Mail wird beim Aufruf übergeben, nicht im Repo)
- Korrektur oder Import der Problemzeilen — werden weggelassen und gemeldet; Nachtragen von Hand im Zeitnachweis (PROJ-13)
- Import der Einträge vom Typ Krankheit und Komp. GLZ aus der Liste (3 Zeilen 2024, vor dem Stichtag) — als Problemzeilen weggelassen
- Abendessen — die Liste hat keine solche Spalte
- Neuberechnung der Gleitzeit ab dem ersten importierten Tag — der Startsaldo per Stichtag (PROJ-14) bleibt
- Berechnen der Tages-/Monatstotals (`bmvcc_tagestotal`, `bmvcc_monatstotal`) für die importierten Einträge — das macht der Power-Automate-Flow; das Tool rechnet das Ist ohnehin selbst
- Rückgängigmachen des Löschens — Testdaten, bewusst nicht gesichert

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

**Trockenlauf und Bericht**
- [ ] Angenommen eine CSV-Datei der Liste liegt vor, wenn der Entwickler den Import im Trockenlauf startet, dann wird in Dataverse nichts gelesen oder geschrieben ausser zum Zählen der zu löschenden Einträge, und es entsteht ein Bericht
- [ ] Angenommen der Trockenlauf ist fertig, dann zeigt der Bericht: Anzahl Zeilen gesamt, pro Person Anzahl Zeilen, Zeitraum und Anzahl zu erstellender Einträge, Anzahl der zu löschenden Dataverse-Einträge (pro Typ), sowie jede weggelassene Zeile mit SharePoint-ID, Person, Datum und Grund
- [ ] Angenommen der Bericht enthält Personendaten, dann wird er ausserhalb des Repos abgelegt bzw. nur in der Konsole ausgegeben

**Abbildung einer Zeile**
- [ ] Angenommen eine Zeile hat AStart, AEnde und eine gültige Pause (AStart < PStart < PEnde < AEnde), wenn sie importiert wird, dann entstehen zwei Einträge vom Typ Arbeitszeit: Kommen = AStart, Gehen = PStart sowie Kommen = PEnde, Gehen = AEnde
- [ ] Angenommen eine Zeile hat AStart und AEnde, aber keine Pause (PStart/PEnde leer, gleich, oder Platzhalter wie 00:00/01:00 vor AStart), wenn sie importiert wird, dann entsteht ein Eintrag Kommen = AStart, Gehen = AEnde
- [ ] Angenommen die Pause endet genau bei AEnde, wenn die Zeile importiert wird, dann entsteht ein Eintrag Kommen = AStart, Gehen = PStart
- [ ] Angenommen eine Zeile wird importiert, dann tragen die Einträge dieselben Felder wie aus der Erfassungs-App (Kommen/Arbeitsbeginn und Gehen/Checkout doppelt, Aktivitätsdatum, E-Mail in Kleinbuchstaben, Primärspalte JJJJMMTTHHMM des Kommens, neue GUID), Mittagessen (beide Felder) und Bemerkung nur auf dem ersten Eintrag des Tages, und in `bmvcc_recordid` die SharePoint-ID der Zeile
- [ ] Angenommen Uhrzeiten in der CSV, dann gelten sie als Schweizer Ortszeit (inkl. Sommer-/Winterzeit) und werden so in Dataverse gespeichert, dass der Zeitnachweis dieselben Uhrzeiten anzeigt
- [ ] Angenommen der Aktivitätstyp einer Zeile ist leer, dann wird sie wie Arbeitszeit behandelt
- [ ] Angenommen AZNetto weicht von den Uhrzeiten ab, dann gelten die Uhrzeiten; die Abweichung wird im Bericht als Hinweis aufgeführt, die Zeile wird trotzdem importiert
- [ ] Angenommen die Spanne AStart–AEnde ist länger als 14 h, dann wird die Zeile trotzdem importiert (jedes Paar für sich wird im Zeitnachweis geprüft)

**Weggelassene Zeilen**
- [ ] Angenommen eine Zeile gehört zu einer beim Aufruf ausgeschlossenen Person, dann wird sie nicht importiert
- [ ] Angenommen eine Zeile hat kein AEnde, AEnde vor oder gleich AStart, nur AZNetto ohne Uhrzeiten, eine unplausible Pause (PEnde vor PStart oder ausserhalb der Arbeitszeit, ausser Ende genau bei AEnde), einen anderen Typ als Arbeitszeit/leer, oder weder E-Mail noch Datum, dann wird sie nicht importiert und mit Grund im Bericht aufgeführt
- [ ] Angenommen eine Person hat am selben Tag zwei Zeilen und eine davon ist eine Problemzeile, dann wird nur die gültige importiert

**Löschen und Import (erster Lauf)**
- [ ] Angenommen der Nutzer hat den Bericht freigegeben, wenn der Entwickler den Import im Modus "Erstbefüllung" startet, dann werden zuerst alle Einträge vom Typ Arbeitszeit, Krankheit und Komp. GLZ aller Personen in Dataverse gelöscht und danach die gültigen Zeilen importiert
- [ ] Angenommen Einträge vom Typ Ferien oder Frei (PROJ-15) existieren, dann bleiben sie beim Löschen unangetastet
- [ ] Angenommen Einträge mit unbekanntem Typ existieren, dann bleiben sie unangetastet und werden im Bericht gezählt
- [ ] Angenommen der Import ist fertig, dann meldet er die Anzahl gelöschter und erstellter Einträge sowie allfällige Fehler; ohne Fehler stimmt die Anzahl erstellter Einträge mit dem Trockenlauf überein

**Ergänzender Lauf**
- [ ] Angenommen der Import wurde schon einmal ausgeführt, wenn der Entwickler ihn im Modus "Ergänzen" mit einer neueren CSV startet, dann wird nichts gelöscht und nur Zeilen importiert, deren SharePoint-ID noch in keinem Eintrag steht
- [ ] Angenommen der erste Lauf bricht mittendrin ab (z.B. Netzwerkfehler), wenn der Entwickler danach "Ergänzen" startet, dann werden die fehlenden Zeilen nachgeholt, ohne doppelte Einträge

**Ergebnis im Tool**
- [ ] Angenommen der Import ist fertig, wenn ein Freigeber im Zeitnachweis eine importierte Person und einen Monat wählt, dann zeigt jeder importierte Tag die Paare aus AStart/PStart/PEnde/AEnde, und das Ist entspricht AEnde − AStart − Pause
- [ ] Angenommen ein importierter Tag liegt am oder vor dem Startsaldo-Stichtag der Person, dann wird er angezeigt, zählt aber nicht in die Gleitzeit (bestehende Regel PROJ-13)

## Edge Cases
- **Mehrere Zeilen am selben Tag** (2× in den Daten, je eine Zeile ohne AEnde): die Problemzeile entfällt, die gültige wird importiert. Wären beide gültig, würden beide importiert; der Zeitnachweis legt überschneidende Paare zusammen und warnt
- **Pause beginnt vor AStart** (Platzhalter 00:00/01:00): gilt als "keine Pause"
- **Pause gleich lang wie 0 Minuten** (PStart = PEnde): gilt als "keine Pause"
- **AEnde am Folgetag** (z.B. bis 00:00 des Folgetags): wird als Folgetag übernommen, sofern AEnde nach AStart liegt
- **Zeitumstellung** (letzter Sonntag im März/Oktober): Uhrzeiten werden mit der am jeweiligen Datum gültigen Schweizer Zeit umgerechnet
- **Person ohne Personendatensatz/Arbeitsmodell** (PROJ-14): Einträge werden trotzdem importiert; die Person erscheint wie bisher mit "kein Arbeitsmodell"
- **Ausgetretene Personen** (z.B. ohne Einträge seit 2025): werden importiert; Austritt/"nicht auswerten" pflegt der Freigeber in PROJ-14
- **Dataverse nicht erreichbar oder Rechte fehlen beim Löschen**: Import startet nicht, Meldung mit Ursache, keine halben Löschungen ohne Meldung
- **CSV mit anderer Spaltenreihenfolge oder BOM**: Spalten werden über die Überschrift gefunden; fehlt eine Pflichtspalte, bricht der Lauf mit Meldung ab
- **Dezimalzahlen mit Komma** (AZNetto "8,25"): werden korrekt gelesen

## Technical Requirements (optional)
- Läuft lokal mit den bestehenden Dataverse-Zugangsdaten (`.env.local`), nicht auf Vercel
- Keine Personendaten (CSV, Bericht) im Repo
- Rund 2'700 Einträge: Laufzeit unkritisch, aber Dataverse-Drosselung beachten

## Open Questions
- [x] Wie führt der neue Flow geänderte SharePoint-Zeilen nach? → Der Flow des Nutzers löst bei "Element erstellt oder geändert" aus und übernimmt die Zeile nach derselben Abbildung, Schlüssel `bmvcc_recordid` (Nutzer, 2026-11-09)
- [x] **Gelöschte** SharePoint-Zeilen? → Ein weiterer Flow des Nutzers löscht die zugehörigen Einträge in Dataverse (über `bmvcc_recordid`) (Nutzer, 2026-11-09)
- [x] Welche Seite ist massgeblich, solange die Liste weiterläuft? → **SharePoint** (Nutzer, 2026-11-09). Korrekturen gehören in die Liste; Korrekturen im Zeitnachweis (PROJ-13) können beim nächsten Ändern der Zeile vom Flow überschrieben werden
- [ ] Sollen die Korrektur-Funktionen im Zeitnachweis (Gehen nachtragen, Arbeitszeit erfassen/löschen) deshalb ausgeblendet oder mit einem Hinweis versehen werden? → später mit `/refine PROJ-13` klären
- [x] Wann wird der Tagestotal-Flow wieder eingeschaltet? → sobald der Import fertig ist (Nutzer, 2026-11-09). Die importierten Einträge erhalten keine Totals (Flow war aus); das Tool rechnet das Ist selbst, ein Abgleich-Hinweis erscheint nur bei vorhandenem Total

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Einmaliges lokales Skript statt Import-Seite im Tool | Erstbefüllung läuft einmal; danach übernimmt ein Flow des Nutzers neue Einträge | 2026-11-09 |
| Quelle CSV-Export statt Graph-Zugriff auf die Liste | Keine zusätzlichen SharePoint-Rechte für die App nötig | 2026-11-09 |
| Pause → zwei positive Paare (AStart→PStart, PEnde→AEnde) statt eines Gesamtpaars plus negativer Pause | Gleiches Total; der Zeitnachweis rechnet mit der abgedeckten Zeit und verwirft Paare mit Gehen vor Kommen — eine negative Pause würde das Ist zu hoch machen und jeden Tag als unplausibel markieren (Nutzer-Entscheid nach Erklärung) | 2026-11-09 |
| `bmvcc_recordid` = SharePoint-ID | Ergänzender Lauf ohne Duplikate; Schlüssel für den späteren Flow | 2026-11-09 |
| Vor dem Import alle Einträge Arbeitszeit/Krankheit/Komp. GLZ aller Personen löschen, Ferien/Frei behalten | In Dataverse liegen nur Testeinträge; Ferien/Frei wurden im Tool echt erfasst (Nutzer-Entscheid) | 2026-11-09 |
| Löschen nur im Modus "Erstbefüllung", nie beim Ergänzen | Echte Einträge aus Flow oder Tool dürfen nicht verloren gehen | 2026-11-09 |
| Problemzeilen weglassen und melden, nicht reparieren | Rund 4 % der Zeilen, meist alt; Nachtragen von Hand im Zeitnachweis ist möglich (Nutzer-Entscheid) | 2026-11-09 |
| Eine ausgetretene Person nicht importieren | Nutzer-Entscheid | 2026-11-09 |
| Typ leer = Arbeitszeit; AZNetto nur als Hinweis, Uhrzeiten massgeblich | Leere Typen sind Nachträge mit Uhrzeiten; das Tool rechnet ohnehin mit den Uhrzeiten | 2026-11-09 |
| Startsaldo-Stichtag bleibt | Keine rückwirkende Neuberechnung der Gleitzeit (Nutzer-Entscheid, wie PROJ-13) | 2026-11-09 |
| Ablauf Trockenlauf → Freigabe → Löschen + Import | Löschen ist nicht umkehrbar; der Nutzer gibt den Bericht frei | 2026-11-09 |
| Die SharePoint-Liste läuft weiter; ein Flow des Nutzers übernimmt neue Einträge | Nutzer-Entscheid; der Import ist die Erstbefüllung | 2026-11-09 |
| SharePoint ist massgeblich; der Flow löst bei "erstellt oder geändert" aus und ersetzt die Einträge über `bmvcc_recordid` | Erfassung und Korrektur finden weiter in der Liste statt (Nutzer-Entscheid) | 2026-11-09 |
| Tagestotal-Flow wird erst nach dem Import wieder eingeschaltet | Verhindert rund 2'700 Flow-Läufe während des Imports (Nutzer-Entscheid) | 2026-11-09 |

### Technical Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Kommandozeilen-Skript im Repo (Ordner `scripts/`), ausgeführt mit `tsx` | Nutzt die bestehende Dataverse-Anbindung und Zeitlogik ohne Kopie; keine Oberfläche, nichts auf Vercel | 2026-11-09 |
| Abbildungsregeln als eigenes, reines Modul mit Unit-Tests | Regeln (Pause, Platzhalter, Problemzeilen) sind der heikle Teil und dienen als Referenz für den Flow des Nutzers | 2026-11-09 |
| Trockenlauf ist der Standardmodus; Löschen nur mit ausdrücklichem Modus "Erstbefüllung" | Löschen ist nicht umkehrbar | 2026-11-09 |
| Erstbefüllung verweigert, sobald ein Eintrag eine SharePoint-ID trägt | Verhindert, dass ein zweiter Lauf importierte oder vom Flow erstellte echte Einträge löscht | 2026-11-09 |
| `bmvcc_recordid` (Ganzzahl, bisher leer) = SharePoint-ID; beide Einträge einer Zeile tragen dieselbe ID | Vorhandene Spalte, keine Schemaänderung; Schlüssel für Ergänzen und für den Flow (ersetzen/löschen pro Zeile) | 2026-11-09 |
| Eigene neue Kennung (`bmvcc_timerecordid`) pro Eintrag statt `zeitrecid` aus der Liste | Zwei Einträge pro Zeile bräuchten zwei Kennungen; gleich wie beim Erfassen im Zeitnachweis | 2026-11-09 |
| Bericht mit Personendaten neben der CSV statt im Repo | Repo ist öffentlich | 2026-11-09 |
| Einzelne Schreibfehler brechen den Lauf nicht ab, Wiederholung bei Drosselung | Rund 2'700 Schreibvorgänge; Lücken holt "Ergänzen" nach | 2026-11-09 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Überblick
Kein neuer Bildschirm und keine Änderung an Vercel: Der Import ist ein **Kommandozeilen-Skript im Repo**, das der Entwickler lokal startet. Es nutzt dieselbe Dataverse-Anbindung (PROJ-2) und dieselben Zeit-Hilfsfunktionen wie das Tool (Schweizer Zeit, Sommer-/Winterzeit), damit importierte Einträge genau so aussehen wie im Zeitnachweis erfasste.

```
Import-Skript (lokal, Zugangsdaten aus .env.local)
+-- 1. CSV einlesen (Pfad als Argument, Datei ausserhalb des Repos)
+-- 2. Zeilen prüfen und abbilden  ── reine Regeln, ohne Dataverse, mit Unit-Tests
|      +-- gültig mit Pause   → 2 Einträge
|      +-- gültig ohne Pause  → 1 Eintrag
|      +-- Problemzeile       → weggelassen, mit Grund
+-- 3. Dataverse lesen: zu löschende Einträge zählen, bereits importierte SharePoint-IDs
+-- 4. Bericht (Konsole + Datei neben der CSV)
+-- 5. nur mit ausdrücklichem Modus: löschen und/oder erstellen
```

### Drei Modi
| Modus | Liest | Löscht | Erstellt | Wann |
|---|---|---|---|---|
| **Trockenlauf** (Standard) | CSV + Dataverse | nichts | nichts | immer zuerst; Bericht zur Freigabe |
| **Erstbefüllung** | CSV + Dataverse | alle Arbeitszeit/Krankheit/Komp. GLZ | alle gültigen Zeilen | einmal, nach Freigabe |
| **Ergänzen** | CSV + Dataverse | nichts | nur Zeilen, deren SharePoint-ID fehlt | nach Abbruch oder bis der Flow läuft |

**Sicherung gegen versehentliches Löschen:** Die Erstbefüllung verweigert den Start, sobald irgendein Eintrag bereits eine SharePoint-ID trägt (also schon importiert wurde oder der Flow des Nutzers läuft). Dann ist nur noch "Ergänzen" möglich. Zusätzlich muss der Modus beim Start ausdrücklich angegeben werden.

### Datenmodell (keine Schemaänderung)
Jede gültige Zeile wird zu 1–2 Zeiteinträgen in der bestehenden Tabelle `bmvcc_timetrackingentry`, mit denselben Feldern wie beim Erfassen im Zeitnachweis (PROJ-13):
- Person (E-Mail aus "Title", klein geschrieben), Aktivitätsdatum, Typ Arbeitszeit
- Kommen/Arbeitsbeginn und Gehen/Checkout (Schweizer Ortszeit → UTC)
- Mittagessen (beide Felder) und Bemerkung nur auf dem ersten Eintrag
- Primärspalte JJJJMMTTHHMM des Kommens, neue eigene Kennung pro Eintrag
- **Neu genutzt:** `bmvcc_recordid` (Ganzzahl, bisher überall leer — geprüft 2026-11-09) = SharePoint-ID der Zeile. Beide Einträge einer Zeile tragen dieselbe ID; so findet auch der Flow des Nutzers alle Einträge einer Zeile

Stand Dataverse 2026-11-09 (gelesen): 152 Arbeitszeit, 1 Komp. GLZ, 2 Krankheit → **155 werden gelöscht**; 34 Ferien und 1 Frei bleiben.

### Bericht
- Konsole: Zusammenfassung (Zeilen, Einträge pro Person, zu löschende Einträge pro Typ, Problemzeilen pro Grund)
- Datei neben der CSV (also ausserhalb des Repos): jede weggelassene Zeile mit SharePoint-ID, Person, Datum, Grund — als Liste zum Nachtragen

### Ablauf beim Erstellen
- Einträge werden in kleinen Gruppen nacheinander geschrieben; bei Drosselung durch Dataverse wartet das Skript und versucht es erneut
- Fehler bei einzelnen Zeilen brechen den Lauf nicht ab, sondern werden am Schluss aufgelistet; "Ergänzen" holt sie nach
- Rund 2'700 Einträge: einige Minuten Laufzeit

### Wiederverwendung
- Dataverse-Anbindung, Liste aller Einträge mit Nachladen, Erstellen/Löschen (PROJ-2, PROJ-13)
- Umrechnung Schweizer Datum + Uhrzeit → Zeitpunkt (PROJ-13)
- Erstellen eines Zeiteintrags (PROJ-13) — wird um die optionale SharePoint-ID ergänzt, sonst unverändert

### Abhängigkeiten
Keine neuen Pakete: Das Skript läuft mit dem bereits vorhandenen `tsx`; die Zugangsdaten lädt Node direkt aus `.env.local`.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
