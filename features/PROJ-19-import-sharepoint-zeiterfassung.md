# PROJ-19: Import der SharePoint-Zeiterfassung

## Status: Deployed
**Created:** 2026-11-09
**Last Updated:** 2026-11-12

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
- **Tag endet mit dem Pausenstart** (AEnde und PEnde Platzhalter 00:00/01:00, PStart nach AStart; die Stempel-App rechnet AZNetto = PStart − AStart): ein Eintrag AStart → PStart. Ist PEnde dagegen gestempelt, fehlt das Ende nach der Pause → weiterhin weggelassen (ergänzt 2026-11-10)
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

## Implementation Notes (Backend, 2026-11-09)
- **Regeln:** `src/lib/zeiterfassung/sharepoint-import.ts` (CSV lesen, Zeile abbilden, Plan) mit 30 Unit-Tests (Pause/Platzhalter, Sommer-/Winterzeit, Folgetag, alle Problemfälle, Hinweise)
- **Dataverse:** `erstelleZeiteintrag` nimmt optional die SharePoint-ID (`bmvcc_recordid`); neu `listAlleZeiteintraegeKurz` (ID, Typ, SharePoint-ID aller Einträge)
- **Skript:** `scripts/import-sharepoint-zeiterfassung.ts`, Aufruf `npm run import:sharepoint -- <csv> [--modus=…] [--ohne=…]`. Parallelität 4, bis 5 Wiederholungen bei Drosselung/Nichterreichbarkeit
- **Abweichung von der Spec:** Die auszuschliessende Person wird als Argument `--ohne=` übergeben statt im Code fest hinterlegt (keine Mitarbeiter-E-Mail im öffentlichen Repo)
- **Ergänzen** behandelt auch unvollständig importierte Zeilen (z.B. nur 1 von 2 Einträgen nach Abbruch): die vorhandenen Einträge dieser Zeile werden gelöscht und neu erstellt
- **Trockenlauf 2026-11-09** (`--ohne=` für die ausgeschlossene Person): 1'451 Zeilen → 1'223 importierbar = 2'368 Einträge; 228 weggelassen (178 ausgeschlossene Person, 18 AEnde ≤ AStart, 17 ohne AEnde, 10 nur AZNetto, 2 Pause unplausibel, 1 Krankheit, 1 Komp. GLZ, 1 leer); 19 Hinweise. Dataverse: 155 zu löschen (152 Arbeitszeit, 1 Komp. GLZ, 2 Krankheit), 35 bleiben (34 Ferien, 1 Frei), 0 mit SharePoint-ID

- **Erstbefüllung ausgeführt 2026-11-09** (Nutzer-Freigabe, Tagestotal-Flow aus): 155 Einträge gelöscht, 2'368 erstellt, 0 Fehler. Kontrolle danach: 2'368 Arbeitszeit-Einträge, alle mit SharePoint-ID, keine unvollständige Zeile; 34 Ferien und 1 Frei unverändert
- **Herkunftsvermerk (Nutzerwunsch 2026-11-09):** Die Bemerkung des ersten Eintrags eines Tages lautet "aus SharePoint" bzw. "<Bemerkung> · aus SharePoint" (nur erster Eintrag, sonst zeigt der Zeitnachweis den Text doppelt). Neuer Modus `nachfuehren` setzt bei importierten Einträgen die Bemerkung auf den Wert der Abbildung (Zuordnung SharePoint-ID + Kommen); am 2026-11-09 bei 1'223 Einträgen ausgeführt, 0 Fehler, Kontrolle danach 0 abweichend
- **Tag endet mit dem Pausenstart (Nutzerhinweis 2026-11-10, SharePoint-ID 1567):** Steht AEnde auf einem Platzhalter (≤ AStart), PStart nach AStart und PEnde leer oder Platzhalter, entsteht ein Eintrag AStart → PStart (AZNetto stimmt). Trockenlauf danach: 1'224 Zeilen importierbar (+1 aus der CSV), 17 statt 18 mit "AEnde vor oder gleich AStart". Der Flow des Nutzers wendet dieselbe Regel an (Fall `bisPause`)

## QA Test Results

**Tested:** 2026-11-10
**Gegenstand:** Kommandozeilen-Skript (keine Oberfläche) — Browser-, Responsive- und Cross-Browser-Tests entfallen
**Tester:** QA Engineer (AI)

### Vorgehen
- Unit-Tests der Abbildungsregeln (31) und gesamte Suite: 716/716 grün; Lint und Typprüfung ohne Fehler
- E2E-Regression (Playwright, alle Projekte inkl. Zeiterfassung): 40/40 grün
- Erneuter Trockenlauf gegen Dataverse (nur lesend): Stand unverändert seit dem Import — 2'368 Arbeitszeit-Einträge, alle mit SharePoint-ID, 34 Ferien + 1 Frei, 0 abweichende Bemerkungen
- Datenanalyse der CSV (lokal, ohne Ausgabe von Personendaten): AktivitaetsDatum = Datum von AStart bei allen importierten Zeilen; Mittagessen nur "True"/"False"; keine doppelten SharePoint-IDs; keine Tage mit zwei gültigen Zeilen; 0 überlappende Paare; 1 Zeile mit AEnde am Folgetag; 58 Zeilen in Wochen der Zeitumstellung (Umrechnung über die bestehende, getestete Funktion)
- Code-Review des Skripts (Modi, Sicherungen, Wiederholung bei 429/5xx)

### Acceptance Criteria Status

**Trockenlauf und Bericht**
- [x] Trockenlauf schreibt nichts in Dataverse, liest nur den Bestand; Bericht entsteht
- [ ] Bericht-Inhalt: alles vorhanden **ausser** "pro Person Anzahl Zeilen" — die Konsole zeigt pro Person Einträge und Zeitraum, nicht die Anzahl Zeilen (BUG-4)
- [x] Bericht liegt neben der CSV (ausserhalb des Repos); keine CSV/kein Bericht im Repo

**Abbildung einer Zeile**
- [x] Gültige Pause → zwei Einträge AStart→PStart, PEnde→AEnde (Unit-Test, 2'368 Einträge aus 1'223 Zeilen)
- [x] Ohne Pause (leer, gleich, Platzhalter 00:00/01:00) → ein Eintrag
- [x] Pause endet bei AEnde → ein Eintrag AStart→PStart
- [x] Felder wie Erfassungs-App, Mittagessen/Bemerkung nur auf erstem Eintrag, `bmvcc_recordid` = SharePoint-ID (beide Einträge)
- [x] Schweizer Ortszeit inkl. Sommer-/Winterzeit (Unit-Tests UTC+1/UTC+2)
- [x] Typ leer = Arbeitszeit
- [x] AZNetto-Abweichung nur Hinweis; Uhrzeiten massgeblich
- [x] Spanne > 14 h wird importiert (Hinweis)

**Weggelassene Zeilen**
- [x] Ausgeschlossene Person wird nicht importiert — nur wenn `--ohne=` angegeben ist (siehe BUG-1)
- [x] Problemzeilen mit Grund im Bericht (alle Gründe als Unit-Test)
- [x] Zwei Zeilen am selben Tag: nur die gültige wird importiert

**Löschen und Import**
- [x] Erstbefüllung löscht Arbeitszeit/Krankheit/Komp. GLZ und importiert (Lauf 2026-11-09: 155 gelöscht, 2'368 erstellt, 0 Fehler)
- [x] Ferien/Frei bleiben (34 + 1 unverändert)
- [x] Unbekannte Typen bleiben und werden gezählt (Code-Review; heute keine vorhanden)
- [x] Abschlussmeldung mit Anzahl gelöscht/erstellt/Fehler; erstellt = Trockenlauf

**Ergänzender Lauf** (Code-Review, nicht gegen Dataverse ausgeführt — es gibt keine fehlenden Zeilen)
- [x] Löscht nichts, importiert nur Zeilen mit fehlender SharePoint-ID
- [x] Unvollständige Zeilen werden ersetzt, keine Duplikate

**Ergebnis im Tool**
- [x] Zeitnachweis zeigt die Paare, Ist = AEnde − AStart − Pause (Sichtprüfung Nutzer 2026-11-09; bei allen importierten Zeilen ohne AZNetto-Hinweis stimmt die Summe der Paare auf 1 Minute mit AZNetto überein)
- [x] Tage am/vor dem Stichtag zählen nicht in die Gleitzeit (bestehende Regel PROJ-13, unverändert)

### Edge Cases Status
- [x] Mehrere Zeilen am selben Tag, Pause vor AStart, Pause 0 Minuten, AEnde am Folgetag, Zeitumstellung — Unit-Tests und Datenanalyse
- [x] Person ohne Arbeitsmodell / ausgetretene Personen — werden importiert (keine Sonderbehandlung nötig)
- [x] Dataverse nicht erreichbar / Löschfehler — Erstbefüllung bricht vor dem Erstellen ab und meldet die Fehler
- [x] Andere Spaltenreihenfolge, BOM, fehlende Pflichtspalte — Unit-Tests
- [x] Dezimalkomma bei AZNetto — Unit-Test

### Security Audit Results
- [x] Kein Endpunkt, keine Oberfläche: das Skript läuft nur lokal mit den Zugangsdaten aus `.env.local`, nichts auf Vercel
- [x] Keine CSV, kein Bericht und keine Zugangsdaten im Repo
- [x] Erstbefüllung verweigert, sobald ein Eintrag eine SharePoint-ID trägt (Code-Review; der Trockenlauf bestätigt 2'368 solche Einträge → ein zweiter Löschlauf ist heute ausgeschlossen)
- [x] Schreibender Modus muss ausdrücklich angegeben werden; Standard ist der Trockenlauf
- [ ] Personendaten im Repo: Mitarbeiter-E-Mail im Unit-Test und in der Spec (BUG-2)

### Bugs Found

#### BUG-1: Ergänzen ohne `--ohne=` importiert die ausgeschlossene Person
- **Severity:** Medium
- **Steps to Reproduce:**
  1. `npm run import:sharepoint -- <csv> --modus=ergaenzen` ohne `--ohne=` starten
  2. Expected: Die beim Erstimport ausgeschlossene Person bleibt draussen
  3. Actual: Alle ihre gültigen Zeilen fehlen in Dataverse und werden importiert — heute 332 Einträge
- **Hinweis:** Der Ausschluss wird nirgends gespeichert; Löschen pro Person gibt es im Tool nicht. Vorschlag: Ergänzen zeigt Personen, die noch keinen importierten Eintrag haben, und verlangt eine Bestätigung — oder bricht ab
- **Priority:** Fix vor einem weiteren Ergänzen-Lauf

#### BUG-2: Echte Mitarbeiter-E-Mail im öffentlichen Repo
- **Severity:** Low
- **Steps to Reproduce:** `sharepoint-import.test.ts` (Test "lässt ausgeschlossene Personen weg") sowie Spec (Out of Scope, Akzeptanzkriterium, Decision Log) nennen die ausgeschlossene Person mit Namen bzw. E-Mail. Das widerspricht der Implementierungs-Entscheidung, die Person deshalb per Argument zu übergeben
- **Priority:** Fix vor dem Push (Branch noch nicht gepusht) — Test mit fiktiver Adresse, Spec neutral formulieren ("eine ausgetretene Person")
- **Status:** Behoben 2026-11-10 — Test mit fiktiver Adresse, Spec neutral formuliert; die noch nicht gepushten Commits wurden vor dem ersten Push umgeschrieben, der Name steht nirgends in der Git-Historie

#### BUG-3: Bericht nennt nach dem Import noch "wird bei Erstbefüllung gelöscht"
- **Severity:** Low
- **Steps to Reproduce:** Trockenlauf nach dem Import → "arbeitszeit 2368 → wird bei Erstbefüllung gelöscht", obwohl die Erstbefüllung verweigert würde. Zudem fehlt `nachfuehren` in der Aufrufzeile im Kopfkommentar des Skripts
- **Priority:** Nice to have

#### BUG-4: Bericht ohne Anzahl Zeilen pro Person
- **Severity:** Low
- **Steps to Reproduce:** Trockenlauf → "Einträge pro Person" zeigt Einträge und Zeitraum; das Akzeptanzkriterium verlangt auch die Anzahl Zeilen
- **Priority:** Nice to have

### Summary
- **Acceptance Criteria:** 21/22 erfüllt, 1 teilweise (BUG-4)
- **Bugs Found:** 4 total (0 critical, 0 high, 1 medium, 3 low)
- **Security:** bestanden, eine Datenschutz-Unschönheit (BUG-2)
- **Production Ready:** YES — der Import ist ausgeführt und korrekt; vor einem weiteren `ergaenzen`-Lauf BUG-1 beheben, vor dem Push BUG-2
- **Recommendation:** BUG-1 und BUG-2 beheben, dann pushen/mergen

## Deployment
**Deployed:** 2026-11-12 — Merge nach `main` (Vercel deployt automatisch), Tag `v1.14.0-PROJ-19`

- Keine Änderung in der Oberfläche und keine neuen Umgebungsvariablen: Das Import-Skript läuft nur lokal (`npm run import:sharepoint`)
- Vorprüfung: Lint ohne Meldungen, 719 Unit-Tests grün, Produktions-Build ok
- Datenstand vor dem Deploy: Erstbefüllung 2026-11-09 (2'368 Einträge), seither übernimmt der tägliche Power-Automate-Flow des Nutzers (03:00 Uhr) neue und geänderte SharePoint-Zeilen nach denselben Regeln. Kontrolle der Läufe vom 11. und 12.11.: 1'231 SharePoint-Zeilen, 2'382 Arbeitszeit-Einträge, alle mit SharePoint-ID, keine Abweichung von den Regeln
- Offen: BUG-1 (Modus `ergaenzen` ohne `--ohne=`) — nur relevant bei einem weiteren Ergänzen-Lauf; SharePoint-Zeile 241 (Tag endet mit Pausenstart) bewusst nicht nachgeholt
