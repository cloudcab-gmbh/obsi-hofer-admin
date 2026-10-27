# PROJ-13: Zeitnachweis pro Monat

## Status: In Progress
**Created:** 2026-10-26
**Last Updated:** 2026-10-27

## Dependencies
- Requires: PROJ-1 (Entra-ID-Login mit Rollen) — Zugriff nur für Freigeber
- Requires: PROJ-2 (Dataverse-Web-API-Anbindung) — Lesen der Zeiteinträge
- Requires: PROJ-14 (Arbeitsmodell pro Person) — liefert die Personenliste, das Soll je Wochentag und den Gleitzeit-Startsaldo
- Optional: PROJ-15 (Ferien erfassen und Feriensaldo) — solange PROJ-15 nicht live ist, kennt der Zeitnachweis keine Ferientage
- **Dataverse-Voraussetzung:** Der App-Benutzer "# OBSI Hofer Admin" braucht **Lesen** auf `bmvcc_timetrackingentry` — vom Nutzer erteilt und verifiziert 2026-10-26
- Grundlage: [docs/zeiterfassung-ausgangslage.md](../docs/zeiterfassung-ausgangslage.md) (bisherige Excel-Mappe, Dataverse-Schema)

## Ausgangslage
Die neue Zeiterfassung speichert in Dataverse (`bmvcc_timetrackingentry`, Typen Arbeitszeit, Komp. GLZ, Krankheit): **jedes Kommen/Gehen ist ein eigener Eintrag**, ein Tag hat also oft mehrere Einträge (z.B. Vormittag und Nachmittag); die Pause ist die Lücke dazwischen. Ein Power-Automate-Flow berechnet zusätzlich ein Tagestotal. Die frühere Erfassung in einer SharePoint-Liste (ein Datensatz pro Tag und Person) und die Excel-Auswertung darauf werden abgelöst; aus Excel wird nur noch der Gleitzeit-Stand als Startsaldo übernommen (PROJ-14). In Excel hiess die Monatsauswertung pro Person "Zeitnachweis" (Ist, Soll, Abweichung, fortlaufende Gleitzeit, Feriensaldo; Soll und Ferien von Hand). Dieses Feature ersetzt die Monatsauswertung.

## User Stories
- Als Freigeber möchte ich eine Person und einen Monat wählen und den Zeitnachweis Tag für Tag sehen, damit ich die Excel-Mappe nicht mehr führen muss.
- Als Freigeber möchte ich pro Tag Ist, Soll und Abweichung sehen, damit ich Über- und Unterzeit erkenne.
- Als Freigeber möchte ich den Gleitzeit-Saldo am Monatsende (in Stunden und in Tagen) sehen, inklusive Übertrag aus dem Vormonat, damit ich den Stand jeder Person kenne.
- Als Freigeber möchte ich erkennen, warum ein Tag kein Soll hat (Feiertag, Ferien, kein Arbeitstag laut Arbeitsmodell), damit der Nachweis nachvollziehbar ist.
- Als Freigeber möchte ich erkennen, für welche Personen mit Zeiteinträgen noch kein Arbeitsmodell erfasst ist, damit keine Stunden ohne Soll ausgewertet werden.
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
- [ ] Angenommen ein Freigeber öffnet den Zeitnachweis, wenn die Seite lädt, dann kann er eine Person (alle Personen aus PROJ-14 ausser den als "nicht auswerten" markierten, angezeigt mit Name bzw. E-Mail) und einen Monat wählen; vorausgewählt ist der aktuelle Monat
- [ ] Angenommen ein Freigeber hat Person und Monat gewählt, wenn er die Seite neu lädt oder zurückkehrt, dann bleiben Person und Monat gewählt

**Tageszeilen**
- [ ] Angenommen Person und Monat sind gewählt, wenn der Zeitnachweis lädt, dann erscheint jeder Kalendertag des Monats als Zeile mit Datum und Wochentag
- [ ] Angenommen eine Person hat an einem Tag einen oder mehrere Einträge vom Typ "Arbeitszeit", wenn der Tag angezeigt wird, dann zeigt er alle Kommen/Gehen-Paare des Tages in zeitlicher Reihenfolge (z.B. "07:30–12:00, 12:45–17:15"), und das Ist ist die Summe (Gehen − Kommen) aller Einträge des Tages
- [ ] Angenommen ein Eintrag hat ein "Kommen", aber kein "Gehen", dann zählt er nicht ins Ist und die Zeile ist als "offen – Gehen fehlt" markiert; beim laufenden Tag (heute) ohne Warnung, an vergangenen Tagen als Warnung
- [ ] Angenommen das Tagestotal des Power-Automate-Flows (`bmvcc_tagestotal`, Minuten) weicht vom selbst berechneten Ist des Tages ab, dann zeigt die Zeile einen dezenten Hinweis mit beiden Werten; massgeblich bleibt das selbst berechnete Ist. Dasselbe gilt in der Monatsübersicht für das Monatstotal (`bmvcc_monatstotal`)
- [ ] Angenommen ein Tag ist laut Arbeitsmodell ein Arbeitstag und weder Feiertag noch Ferientag, dann ist sein Soll das Soll des Wochentags aus dem Arbeitsmodell, das an diesem Datum gilt
- [ ] Angenommen ein Tag ist ein gesetzlicher Feiertag im Aargau, ein Ferientag (PROJ-15) oder laut Arbeitsmodell kein Arbeitstag, dann ist sein Soll 0 und der Grund steht in der Zeile ("Feiertag: Auffahrt", "Ferien", "frei")
- [ ] Angenommen ein Tag hat einen Eintrag vom Typ "Krankheit", dann gilt das Soll als erfüllt (Ist = Soll), die Gleitzeit bleibt unverändert, und die Zeile ist als "Krankheit" gekennzeichnet
- [ ] Angenommen ein Tag hat einen Eintrag vom Typ "Komp. GLZ", dann ist das Ist 0, die Gleitzeit sinkt um das Soll des Tages, und die Zeile ist als "Komp. GLZ" gekennzeichnet
- [ ] Angenommen ein Tag hat Ist und Soll, dann zeigt die Zeile die Abweichung (Ist − Soll) und den fortlaufenden Gleitzeit-Saldo nach diesem Tag
- [ ] Angenommen mindestens ein Eintrag eines Tages hat "Mittagessen" gesetzt, dann gilt der ganze Tag als "Mittagessen: ja" (auch wenn andere Einträge des Tages "nein" haben); dasselbe gilt für "Abendessen"
- [ ] Angenommen ein Eintrag hat eine Bemerkung, dann wird sie in der Tageszeile angezeigt

**Monatssummen und Saldo**
- [ ] Angenommen ein Monat wird angezeigt, dann stehen über bzw. unter der Tabelle: Saldo Vormonat, Summe Ist, Summe Soll, Abweichung des Monats, Gleitzeit-Saldo am Monatsende in Stunden und in Tagen (Stunden ÷ 8)
- [ ] Angenommen für eine Person ist ein Gleitzeit-Startsaldo per Stichtag erfasst (PROJ-14), dann beginnt die Berechnung am Folgetag mit diesem Saldo, und der Saldo Vormonat jedes späteren Monats ist der Endsaldo des Vormonats
- [ ] Angenommen ein Monat liegt vollständig vor dem Stichtag des Startsaldos, wenn der Freigeber ihn wählt, dann erscheint ein Hinweis, dass für diesen Zeitraum keine Auswertung im Tool vorliegt (Excel-Zeitraum)
- [ ] Angenommen der gewählte Monat ist der laufende Monat, dann zählen Tage nach dem heutigen Datum weder Soll noch Ist, und der Saldo ist als "Stand heute" bezeichnet

**Zuordnung und Hinweise**
- [ ] Angenommen die gewählte Person hat für den Monat (oder Teile davon) kein Arbeitsmodell, dann zeigen die betroffenen Tage Soll 0 mit dem Hinweis "kein Arbeitsmodell", das Ist zählt trotzdem, und oben steht ein Hinweis mit Link zur Pflege in PROJ-14
- [ ] Angenommen eine Person hat im Monat keine Einträge, dann wird der Zeitnachweis trotzdem angezeigt (alle Tage mit Ist 0, Soll laut Arbeitsmodell) mit einem Hinweis "Keine Zeiteinträge in diesem Monat"
- [ ] Angenommen das Laden aus Dataverse schlägt fehl (nicht erreichbar, fehlende Berechtigung), dann erscheint eine verständliche Fehlermeldung statt eines unvollständigen Nachweises

## Edge Cases
- **Mehrere Einträge am selben Tag** (der Normalfall seit der neuen Erfassung): alle Paare in zeitlicher Reihenfolge, Ist = Summe der Paare; Pausen sind die Lücken dazwischen und werden nicht abgezogen
- **Überlappende Einträge** (z.B. 08:00–12:00 und 11:30–13:00): überlappende Zeit zählt nur einmal; die Zeile zeigt einen Hinweis "Einträge überschneiden sich"
- **Eintrag über Mitternacht** (Gehen am Folgetag): zählt vollständig zum Tag des Kommens
- **Eintrag an einem Tag ohne Soll** (Wochenende, Feiertag, freier Tag): Ist zählt voll, Abweichung = Ist, Gleitzeit steigt
- **Krankheit an einem Tag ohne Soll**: Ist = 0, keine Auswirkung
- **Komp. GLZ und Arbeitszeit am selben Tag** (z.B. halber Tag frei): Ist = Summe der Arbeitszeit-Einträge; das Soll bleibt das volle Soll des Tages — die Gleitzeit sinkt um die nicht gearbeiteten Stunden
- **Arbeitsmodell ändert sich mitten im Monat** (z.B. Pensum ab 15.): jeder Tag nimmt das an seinem Datum gültige Modell
- **Person tritt mitten im Monat ein / aus** (Arbeitsmodell gültig ab/bis): Tage ausserhalb haben kein Soll und sind als "nicht angestellt" gekennzeichnet
- **Unplausibler Eintrag** (Gehen vor Kommen, mehr als 14 h am Stück): zählt nicht ins Ist, Tageszeile mit Warnhinweis
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
- [x] Woher kommen die Einträge? → Die neue Erfassung speichert in Dataverse, jedes Kommen/Gehen als eigener Eintrag; die SharePoint-Liste der Excel-Mappe ist abgelöst und nicht mehr relevant (Nutzer, 2026-10-26)
- [x] Netto-Arbeitszeit aus `bmvcc_networkinghours` oder `bmvcc_aznetto4`? → keines von beiden: Das Ist wird aus Kommen/Gehen gerechnet (Nutzer-Entscheidung 2026-10-26). Befund der Daten: `bmvcc_networkinghours` 1× gefüllt, `bmvcc_aznetto4` 127× (von 143), entspricht aber nur 12× der Dauer des Eintrags
- [x] Muss der Zeitnachweis Pausen abziehen? → Nein: Pausen sind Lücken zwischen den Einträgen; die Pausenfelder sind praktisch leer (5× bzw. 3× von 143)
- [x] Welches Feldpaar ist Kommen/Gehen? → Die Erfassungs-App setzt beim Kommen `Kommen` und `astart`, beim Gehen `Gehen` und `checkout` jeweils gleichzeitig auf die aktuelle Zeit (Code vom Nutzer, 2026-10-26). Massgeblich: `bmvcc_kommen`/`bmvcc_gehen`, bei leeren Werten (ältere Einträge) `bmvcc_activitystarttime`/`bmvcc_checkouttime`. Abweichungen zwischen beiden Paaren (10 von 139) stammen vermutlich aus älteren Einträgen oder Korrekturen
- [x] Wohin schreibt der Flow das Tagestotal? → korrigiert 2026-10-27 (Nutzer + Datenprüfung): `bmvcc_aznetto4` = Dauer des einzelnen Eintrags, `bmvcc_tagestotal` = Tagestotal, `bmvcc_monatstotal` = Monatstotal, alle in ganzen Minuten. Tagestotal stimmt an 49 von 52 Tagen mit der Summe der Eintragsdauern, Monatstotal in 14 von 16 Personen-Monaten; der aktuellste Wert steht auf dem neuesten Eintrag (ältere Einträge tragen teils Zwischenstände) — massgeblich für den Abgleich ist daher der höchste Wert des Tages bzw. Monats
- [x] Einheit von `bmvcc_aznetto4`? → Datenprüfung 2026-10-27: ganze **Minuten**, Dauer **des einzelnen Eintrags** (129 von 129 Einträgen mit Kommen/Gehen stimmen auf ±1 Minute); vom Nutzer bestätigt. Das Ist wird ebenfalls auf ganze Minuten gerechnet
- [x] Mittagessen: welches Feld? → Die App schreibt `mittagessen` (Ja/Nein, `bmvcc_essen`) und `Mittagessen` (Yes/No, `bmvcc_mittagessen`) immer gleich; massgeblich `bmvcc_mittagessen`, Abendessen `bmvcc_abendessen`. Pro Tag "ja", sobald ein Eintrag des Tages "ja" hat (Nutzer, 2026-10-26)
- [x] Läuft die neue Erfassung schon produktiv? → Nein: Die 143 Einträge in Dataverse (April bis 02.09.2026, 5 Personen) sind alles Testdaten (Nutzer, 2026-10-26). Lokal wird mit diesen Testdaten getestet; Monate ab September sind dabei leer
- [x] Kann beim Stempeln ein anderer Tag gewählt werden? → Nein, immer heute (Nutzer, 2026-10-26); Aktivitätsdatum und Uhrzeit von Kommen gehören also zum selben Tag
- [ ] Gehören 1. Mai oder Fronleichnam zu den Feiertagen von OBSI Hofer? (in der bisherigen Excel-Liste nicht enthalten)

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
| Personenauswahl = alle Personen aus PROJ-14 (automatisch aus den E-Mails der Zeiteinträge), ausser "nicht auswerten"; fehlendes Arbeitsmodell als Hinweis im Zeitnachweis | Folge der PROJ-14-Entscheidung, Personen automatisch zu bilden | 2026-10-26 |
| Quelle ist ausschliesslich Dataverse (neue Erfassung, ein Eintrag pro Kommen/Gehen); die SharePoint-Liste wird nicht angebunden | Die SharePoint-Erfassung ist abgelöst (Nutzer, 2026-10-26) | 2026-10-26 |
| Mittag-/Abendessen pro Tag = ja, sobald ein Eintrag des Tages ja hat | Die App fragt bei jedem Kommen/Gehen erneut; ein Tag mit Mittagessen soll nicht durch einen späteren Eintrag "nein" verlieren (Nutzer-Vorgabe) | 2026-10-26 |
| Ist = Summe (Gehen − Kommen) der Einträge, selbst berechnet; das Flow-Tagestotal nur als Abgleich-Hinweis | Nachvollziehbar Zeile für Zeile und unabhängig von Fehlern im Flow; in den bisherigen Daten passen Flow-Total und Einzeleinträge selten zusammen (Nutzer-Entscheidung) | 2026-10-26 |
| PDF als eigenes Feature (PROJ-16), obwohl Bildschirm + PDF gewünscht | Einzeln testbar und baut auf der fertigen Berechnung auf; gleiches Vorgehen wie Geräteliste (PROJ-3) und Prüfbericht-PDF (PROJ-7) | 2026-10-26 |
| Gleitzeit beginnt mit Startsaldo am Tag nach dem Stichtag, ohne Startsaldo mit 0 am "gültig ab" der ersten Version; Einträge davor werden angezeigt, zählen aber nicht | Testphasen und Einträge vor dem Eintritt sollen die Gleitzeit nicht aufblähen; löst den Widerspruch zum Edge Case "Zeiteinträge vor dem ersten gültig ab" in PROJ-14 (Nutzer-Entscheidung) | 2026-10-27 |

### Technical Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Zeitnachweis wird bei jedem Aufruf live berechnet, nichts gespeichert | Korrekturen (Einträge, Arbeitsmodell, Startsaldo) wirken sofort und rückwirkend; ca. 1'000 Einträge pro Person und Jahr sind schnell geladen. Jährlicher Zwischenstand nachrüstbar | 2026-10-27 |
| Nur Einträge der gewählten Person ab Beginn der Gleitzeit bis Monatsende laden, alle Seiten | Saldo Vormonat ohne vorheriges Öffnen der Vormonate; kein Abschneiden (K5) | 2026-10-27 |
| Rechenregeln (Feiertage, Tagesauswertung, Zeitnachweis) rein und getrennt von Datenzugriff/Oberfläche | Wiederverwendung im PDF (PROJ-16), jede Regel einzeln testbar | 2026-10-27 |
| Feiertage Aargau berechnet (Ostern per Standard-Formel) | Keine Pflege pro Jahr | 2026-10-27 |
| Dauer je Eintrag auf ganze Minuten | Die App rechnet in Minuten; Sekunden erzeugen nur Rundungsdifferenzen | 2026-10-27 |
| Abgleich gegen `bmvcc_tagestotal` (pro Tag) und `bmvcc_monatstotal` (pro Monat), je höchster Wert, Hinweis ab > 1 Minute; `bmvcc_aznetto4` ist nur die Dauer eines Eintrags | Feldbedeutung vom Nutzer bestätigt, Datenprüfung: aktuellster Stand auf dem neuesten Eintrag, ältere tragen Zwischenstände | 2026-10-27 |
| Person und Monat in der Adresse, letzte Auswahl zusätzlich gemerkt | Neuladen, Zurück-Taste und Lesezeichen ohne Zusatzlogik | 2026-10-27 |
| Zeitnachweis ist die Startseite von "Zeiterfassung", "Personen" eine Unterseite | Häufigste Tätigkeit | 2026-10-27 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Ausgangslage
- PROJ-14 ist gebaut (Branch `zeiterfassung`, Approved): Personen, Arbeitsmodell-Versionen, Austritt und Startsaldo liegen in Dataverse; die Rechenregel "Soll einer Person an einem Datum", die Datumsumrechnung in Schweizer Zeit und das Nachladen aller Seiten einer Abfrage gibt es bereits.
- Datenprüfung der Testdaten (2026-10-27, 146 Einträge, nur Zählungen):
  - Das Aktivitätsdatum ist als Mitternacht Schweizer Zeit gespeichert ("Benutzer lokal") — gleiche Umrechnung wie in PROJ-14.
  - Kommen/Gehen enthalten Sekunden; 15 Einträge ohne Gehen; 1 Eintrag, dessen Gehen auf einen anderen Tag fällt.
  - Totals des Power-Automate-Flows, alle in ganzen Minuten: `bmvcc_aznetto4` = Dauer des Eintrags (129/129 stimmen), `bmvcc_tagestotal` = Tagestotal (49/52 Tage stimmen), `bmvcc_monatstotal` = Monatstotal (14/16 Personen-Monate stimmen). Den aktuellsten Stand trägt der neueste Eintrag; ältere Einträge haben teils Zwischenstände.
  - Bisher nur Typ "Arbeitszeit" in den Daten; Krankheit und Komp. GLZ sind nur aus dem Schema bekannt.

### A) Bausteine
```
Menüpunkt "Zeiterfassung" (bestehend, nur Freigeber)
+-- Unterseiten-Leiste: "Zeitnachweis" · "Personen" (· später "Ferien")

/zeiterfassung = Zeitnachweis (nur Freigeber; bisher Weiterleitung auf Personen)
+-- Auswahl
|   +-- Person (durchsuchbare Auswahl wie bei Firma/Standort; Name bzw. E-Mail; ohne "nicht auswerten")
|   +-- Monat (Vor-/Zurück-Schaltflächen + Monatsauswahl; Standard: aktueller Monat)
|   +-- Auswahl steht in der Adresse (Neuladen, Zurück, Link teilen) und wird zusätzlich gemerkt
+-- Hinweise oben (je nach Lage)
|   +-- "kein Arbeitsmodell" für (Teile des) Monats → Link zur Person (PROJ-14)
|   +-- Monat vollständig vor dem Startsaldo-Stichtag → "Excel-Zeitraum, keine Auswertung im Tool"
|   +-- "Keine Zeiteinträge in diesem Monat"
|   +-- offene Einträge (Gehen fehlt) an vergangenen Tagen
+-- Monatsübersicht (Karten): Saldo Vormonat · Ist · Soll · Abweichung · Gleitzeit Monatsende in Stunden und Tagen
|   (laufender Monat: "Stand heute"; Hinweis, wenn das Monatstotal des Flows abweicht)
+-- Tagestabelle (eine Zeile pro Kalendertag)
|   +-- Datum + Wochentag · Zeiten (Kommen–Gehen-Paare) · Art/Grund · Ist · Soll · Abweichung · Gleitzeit
|   +-- Mittag · Abend · Bemerkung · Hinweise (offen, Überschneidung, unplausibel, Abweichung zum Tagestotal des Flows)
|   +-- Wochenenden/Feiertage dezent hinterlegt; Tage nach heute ausgegraut
+-- Fehlermeldung statt Tabelle, wenn Dataverse nicht antwortet

Server (nur lesend, mit Freigeber-Prüfung)
+-- Person, Versionen und Startsaldo laden (aus PROJ-14)
+-- Zeiteinträge der Person laden: vom Beginn der Gleitzeit bis Monatsende, nur benötigte Felder, alle Seiten

Rechenregeln (rein, ohne Datenzugriff, eigens getestet)
+-- Feiertage Aargau pro Jahr (feste Daten + Ostern-abhängige: Karfreitag, Ostermontag, Auffahrt, Pfingstmontag)
+-- Tagesauswertung: Einträge → Paare, Ist, Hinweise, Essen, Bemerkungen
+-- Zeitnachweis: Tag für Tag Soll (Regel aus PROJ-14 + Feiertag/Ferien/Typ), Abweichung, fortlaufende Gleitzeit
```

### B) Datenmodell (in Worten)
**Keine neuen Tabellen, nichts wird gespeichert.** Der Zeitnachweis wird bei jedem Aufruf aus den vorhandenen Daten berechnet.

Gelesen werden pro Zeiteintrag: Aktivitätsdatum, Typ (Arbeitszeit / Komp. GLZ / Krankheit), Kommen und Gehen (Ersatz: Arbeitsbeginn/Checkout bei älteren Einträgen), Tages- und Monatstotal des Flows (Minuten), Mittagessen, Abendessen, Bemerkung — gefiltert auf die E-Mail der Person und den Zeitraum.

Ein Tag ergibt sich so:
- **Ist** = Summe der Dauer aller vollständigen Arbeitszeit-Einträge, je auf ganze Minuten; Überschneidungen zählen einmal. Unvollständige (ohne Gehen) und unplausible (Gehen vor Kommen, mehr als 14 h) zählen nicht und erzeugen einen Hinweis.
- **Soll** = Soll aus dem Arbeitsmodell (PROJ-14), aber 0 an Feiertagen, Ferientagen (PROJ-15, bis dahin keine), vor dem Eintritt und nach dem Austritt.
- **Krankheit**: Ist = Soll (Gleitzeit unverändert). **Komp. GLZ**: zählt kein Ist, Soll bleibt → Gleitzeit sinkt.
- **Abweichung** = Ist − Soll; **Gleitzeit** = Gleitzeit des Vortags + Abweichung.
- **Beginn der Gleitzeit**: mit Startsaldo am Tag nach dem Stichtag mit diesem Saldo; ohne Startsaldo am "gültig ab" der ersten Arbeitsmodell-Version mit 0. Einträge davor werden angezeigt (Hinweis "vor Arbeitsmodell" bzw. "Excel-Zeitraum"), zählen aber nicht zur Gleitzeit.
- **Laufender Monat**: Tage nach heute zählen weder Soll noch Ist.
- **Abgleich mit dem Flow**: weicht das Tagestotal (höchster Wert `bmvcc_tagestotal` des Tages) um mehr als eine Minute vom selbst berechneten Ist ab, zeigt die Zeile einen dezenten Hinweis mit beiden Werten; ebenso die Monatsübersicht mit dem Monatstotal (höchster Wert `bmvcc_monatstotal` im Monat). Tage ohne Arbeitszeit-Einträge und der laufende Tag werden nicht verglichen.

Die Zeile "Saldo Vormonat" ist die Gleitzeit am letzten Tag des Vormonats — berechnet in derselben Rechnung, die vom Beginn der Gleitzeit bis zum Monatsende läuft. Kein Monat muss vorher geöffnet worden sein.

### C) Technische Entscheidungen (Begründung)
- **Live berechnen statt Monatsabschlüsse speichern:** Korrekturen an Einträgen, Arbeitsmodell oder Startsaldo wirken sofort und rückwirkend (so verlangen es PROJ-14 und die Edge Cases); keine zweite Datenhaltung, die veralten kann. Menge: rund 1'000 Einträge pro Person und Jahr — auch mehrere Jahre laden in wenigen Sekunden. Falls es später zu langsam wird, kann ein jährlicher Zwischenstand (wie der Startsaldo) nachgerüstet werden.
- **Nur die Einträge der gewählten Person laden** (gefiltert in Dataverse), nur die benötigten Felder, alle Seiten.
- **Rechenregeln getrennt von Datenzugriff und Oberfläche:** dieselbe Rechnung braucht der PDF-Export (PROJ-16); jede Regel (Feiertage, Überschneidung, Krankheit, Komp. GLZ, Monatswechsel) ist einzeln testbar.
- **Feiertage berechnet statt gepflegt:** feste Liste aus der Excel-Mappe, Ostern per Standard-Formel; keine Pflege pro Jahr.
- **Dauer auf ganze Minuten:** die App rechnet ebenfalls in Minuten; Sekunden würden nur Rundungsdifferenzen erzeugen.
- **Flow-Totals nur als Abgleich:** Tages- und Monatstotal werden mit der eigenen Rechnung verglichen und bei Abweichung angezeigt; massgeblich bleibt die eigene Rechnung (Product Decision). Verglichen wird mit dem höchsten Wert des Tages bzw. Monats, weil ältere Einträge Zwischenstände tragen.
- **Auswahl in der Adresse (Person, Monat):** Neuladen, Zurück-Taste und Lesezeichen funktionieren ohne Zusatzlogik; zusätzlich wird die letzte Auswahl gemerkt, damit der Menüpunkt dort weitermacht.
- **Zeitnachweis wird Startseite der Zeiterfassung**, "Personen" eine Unterseite — er ist die häufigste Tätigkeit.
- **Freigeber-Prüfung auf Seite und Aktion**, Zeitdaten weder in Logs noch in Fehlermeldungen.
- **Bestehende Bausteine:** durchsuchbare Auswahl, Tabelle, Karte, Badge, Schaltflächen — keine neuen Komponenten oder Pakete.

### D) Abhängigkeiten (Pakete)
Keine neuen Pakete.

### E) Tests
- Feiertage: mehrere Jahre (bewegliche Feiertage), Feiertag am Wochenende
- Tagesauswertung: mehrere Paare, Überschneidung, ohne Gehen (heute/vergangen), über Mitternacht, unplausibel, Ersatzfelder, Essen-Regel, Abgleich Tages-/Monatstotal (Zwischenstände)
- Zeitnachweis: Krankheit/Komp. GLZ mit und ohne Soll, Komp. GLZ + Arbeitszeit, Versionswechsel mitten im Monat, Eintritt/Austritt, Startsaldo-Beginn, Beginn ohne Startsaldo, Monat vor dem Stichtag, laufender Monat, Saldo über mehrere Monate/Jahreswechsel
- Aktionen/Seite: Bearbeiter abgelehnt, Fehler beim Laden
- Komponenten: Auswahl, Hinweise, Tabelle, Summen
- Manuell lokal mit den Testdaten (April–September 2026)

### F) Vorgehen
1. Bauen auf dem Branch `zeiterfassung`, nur lokal testen — kein Push auf `main`, kein Deploy bis zur Freigabe (Nutzer-Vorgabe 2026-10-26)
2. Keine Dataverse-Änderungen nötig (Lesen auf den Zeiteinträgen ist erteilt)

## Implementation Notes

### Umsetzung Frontend + Backend (2026-10-27, Branch `zeiterfassung`, nur lokal)
Wie PROJ-14 in einem Schritt gebaut (nur lesend, keine Dataverse-Änderungen).

**Seiten**
- `/zeiterfassung` ist jetzt der Zeitnachweis (vorher Weiterleitung auf die Personen); Unterseiten-Leiste "Zeitnachweis · Personen" im Layout `zeiterfassung/layout.tsx` (nur für Freigeber)
- Auswahl (`zeitnachweis-auswahl.tsx`): Person per durchsuchbarer Auswahl (ohne "nicht auswerten"), Monat mit Vor/Zurück und Monatsfeld; Adresse `?person=…&monat=YYYY-MM`, zusätzlich im Cookie `zeitnachweis_auswahl` gemerkt (30 Tage, httpOnly). Ohne Angaben: gemerkte Auswahl bzw. aktueller Monat, keine Person
- Ansicht (`zeitnachweis-ansicht.tsx`): Hinweise (kein Arbeitsmodell mit Link zu PROJ-14, Excel-Zeitraum bzw. vor dem ersten Arbeitsmodell, keine Einträge, fehlendes Gehen, Abweichung Monatstotal), Kennzahlen (Saldo Vormonat bzw. "Startsaldo", wenn die Gleitzeit im Monat beginnt; Ist; Soll; Abweichung; Gleitzeit Monatsende/"Stand heute" in Stunden und Tagen), Tagestabelle mit Summenzeile. Tage vor dem Beginn und nach heute ausgegraut, freie Tage/Feiertage hinterlegt, unplausible Paare durchgestrichen

**Rechenregeln (rein, für PROJ-16 wiederverwendbar)**
- `src/lib/zeiterfassung/feiertage.ts`: 9 Feiertage Aargau, Ostern nach der gregorianischen Formel
- `src/lib/zeiterfassung/tagesauswertung.ts`: Paare in zeitlicher Reihenfolge, Ist in ganzen Minuten als Vereinigung der Intervalle (Überschneidung einmal), offen/unplausibel (> 14 h oder Gehen vor Kommen) zählen nicht, Gehen am Folgetag "(+1)", Essen-Regel, Bemerkungen, höchstes Tagestotal des Flows
- `src/lib/zeiterfassung/zeitnachweis.ts`: Tag für Tag Grund (kein Arbeitsmodell → nicht angestellt → Feiertag → Ferien → frei), Soll, Krankheit (Ist = max(Soll, Arbeitszeit)), Komp. GLZ, Abweichung, fortlaufende Gleitzeit ab Beginn; Saldo Vormonat durch Durchrechnen ab Beginn; Flow-Abgleich Tag/Monat; `ladebeginn` bestimmt den Ladezeitraum
- Ferien: Schnittstelle `ferientage` vorbereitet, bis PROJ-15 leer
- `datum.ts` erweitert (Folgetag, Tage des Monats, Monat verschieben, Uhrzeit Schweizer Zeit, Wochentag/Monat als Text), `format.ts` (Minuten → "x.xx h", Tage = Stunden ÷ 8), `links.ts` (Adressen, von Server und Client genutzt)

**Daten**
- `listZeiteintraege(email, von, bis)` in `src/lib/dataverse/zeiterfassung.ts`: Filter auf E-Mail und Aktivitätsdatum (Schweizer Mitternacht), alle Seiten, nur benötigte Felder; Typ 0/1/2 → Arbeitszeit/Komp. GLZ/Krankheit, andere → "unbekannt" (zählt nicht); Kommen/Gehen mit Ersatz Arbeitsbeginn/Checkout

**Abweichungen / Hinweise**
- Krankheit + Arbeitszeit am selben Tag: Ist = das Grössere aus Soll und Arbeitszeit (Gleitzeit sinkt nicht, steigt nur bei Mehrarbeit) — in der Spec nicht geregelt
- Feiertag an einem freien Tag wird als "Feiertag: …" angezeigt (Soll ohnehin 0)
- Monatsfeld: Firefox/Safari zeigen statt der Monatsauswahl ein Textfeld (Eingabe JJJJ-MM); Vor/Zurück funktioniert überall
- Probelauf gegen die Testdaten 2026-10-27 (5 Personen, April–Oktober, nur Summen ausgegeben): Laden und Rechnen fehlerfrei; Flow-Abweichungen an einzelnen Tagen sichtbar

**Tests:** 46 neue Tests (Feiertage, Tagesauswertung, Zeitnachweis inkl. Jahreswechsel, Datenschicht, Ansicht, Auswahl); gesamt 542 grün, `tsc` und ESLint sauber.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
