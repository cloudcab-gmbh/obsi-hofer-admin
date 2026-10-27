# PROJ-13: Zeitnachweis pro Monat

## Status: Approved
**Created:** 2026-10-26
**Last Updated:** 2026-10-27

## Dependencies
- Requires: PROJ-1 (Entra-ID-Login mit Rollen) — Zugriff nur für Freigeber
- Requires: PROJ-2 (Dataverse-Web-API-Anbindung) — Lesen der Zeiteinträge
- Requires: PROJ-14 (Arbeitsmodell pro Person) — liefert die Personenliste, das Soll je Wochentag und den Gleitzeit-Startsaldo
- Optional: PROJ-15 (Ferien erfassen und Feriensaldo) — solange PROJ-15 nicht live ist, kennt der Zeitnachweis keine Ferientage
- **Dataverse-Voraussetzung:** Der App-Benutzer "# OBSI Hofer Admin" braucht **Lesen** auf `bmvcc_timetrackingentry` — vom Nutzer erteilt und verifiziert 2026-10-26; für das Nachtragen von "Gehen" zusätzlich **Schreiben**, für das Erfassen von Einträgen **Erstellen** — beide vorhanden (Global, geprüft 2026-10-27)
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
- Erfassen oder Korrigieren von Zeiteinträgen — Einträge werden weiterhin im bisherigen Erfassungs-Werkzeug gepflegt. **Ausnahmen (2026-10-27):** ein fehlendes "Gehen" nachtragen und für einen Tag neue Einträge erfassen (vergessenes Stempeln, Krankheit, Komp. GLZ); Ändern erfasster Zeiten und Löschen bleiben ausgeschlossen
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
- [ ] Angenommen an einem vergangenen Tag fehlt ein "Gehen", wenn der Freigeber im Hinweis oben oder in der Tageszeile darauf klickt, dann kann er die Uhrzeit (optional am Folgetag) in einem Dialog nachtragen; sie wird im Zeiteintrag in Dataverse gespeichert ("Gehen" und "Checkout"), der Zeitnachweis rechnet sofort neu. "Gehen" vor "Kommen", mehr als 14 h, bereits erfasstes "Gehen" oder Bearbeiter werden serverseitig abgelehnt
- [ ] Angenommen ein Tag liegt nicht in der Zukunft, wenn der Freigeber auf das Datum der Zeile klickt, dann kann er in einem Dialog Einträge erfassen: Arbeitszeit mit einem oder mehreren Kommen/Gehen-Paaren (laufendes Total), oder ganztägig Krankheit bzw. Komp. GLZ, dazu Mittag-/Abendessen und Bemerkung. Jedes Paar wird ein eigener Zeiteintrag mit denselben Feldern wie aus der Erfassungs-App; der Zeitnachweis rechnet sofort neu
- [ ] Angenommen die erfassten Paare überschneiden sich untereinander oder mit bestehenden Einträgen des Tages, Gehen liegt vor Kommen, ein Paar dauert mehr als 14 h, der Tag liegt in der Zukunft oder Krankheit/Komp. GLZ ist für den Tag schon erfasst, dann wird nichts gespeichert und eine verständliche Meldung angezeigt (serverseitig geprüft)
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
| Einträge für einen Tag im Zeitnachweis erfassen (Klick auf das Datum): alle drei Typen, mehrere Paare pro Dialog, jeder Tag bis heute | Vergessenes Stempeln und vergessene Krankmeldungen ohne Umweg über die Erfassungs-App korrigieren (Nutzer-Entscheidung zu Typen, Paaren und Tagen) | 2026-10-27 |
| Fehlendes "Gehen" direkt im Zeitnachweis nachtragen (statt Link nach Dataverse oder nur Sprung zur Zeile) | Häufigster Korrekturfall, sofort sichtbar und behebbar ohne Wechsel ins Erfassungs-Werkzeug (Nutzer-Entscheidung); bewusst eng: nur offene Einträge, nichts überschreiben | 2026-10-27 |
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
| Erfasste Einträge erhalten dieselben Felder wie aus der Erfassungs-App: Kommen/Arbeitsbeginn und Gehen/Checkout doppelt, Mittagessen doppelt (`bmvcc_mittagessen`, `bmvcc_essen`), Primärspalte `bmvcc_activitydatetimecode` = JJJJMMTTHHMM des Kommens (Schweizer Zeit; ganztägig HHMM = 0000), `bmvcc_timerecordid` = neue GUID | Datenprüfung 2026-10-27 (147 Einträge): so füllt die App die Felder; Totals rechnet der Flow | 2026-10-27 |
| Essen und Bemerkung nur auf dem ersten Eintrag eines Erfassungs-Dialogs | Gelten pro Tag (Regel "ja, sobald ein Eintrag ja hat") | 2026-10-27 |
| Nachtragen schreibt "Gehen" und "Checkout" gleich (wie die Erfassungs-App), Uhrzeit als Schweizer Zeit am Tag des Kommens bzw. Folgetag | Beide Feldpaare bleiben konsistent; Zeitumstellung korrekt | 2026-10-27 |

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

**Nachtrag 2026-10-27: "Gehen" nachtragen** (Nutzerwunsch: Hinweis klickbar)
- Hinweis oben listet jeden offenen Eintrag ("Mi 12.08. 07:30") als Link, die Tageszeile zeigt "nachtragen" neben dem offenen Paar — beide öffnen den Dialog `gehen-nachtragen.tsx` (Uhrzeit, "am Folgetag")
- Aktion `trageGehenNachAction` (`src/app/(protected)/zeiterfassung/actions.ts`): Freigeber-Prüfung, lädt den Eintrag neu und schreibt nur, wenn er vom Typ Arbeitszeit ist, ein Kommen und noch kein Gehen hat; Gehen muss nach Kommen liegen und höchstens 14 h später; schreibt `bmvcc_gehen` und `bmvcc_checkouttime`
- Der Power-Automate-Flow läuft auch beim Nachtragen und berechnet `aznetto4`, Tages- und Monatstotal neu (vom Nutzer im Browser-Test bestätigt, 2026-10-27)
- Nachtragen am laufenden Tag ebenfalls möglich (ohne Warnhinweis oben); Stundenwerte umbrechen nicht mehr
- In Dataverse steht als "Geändert von" der App-Benutzer, nicht der Freigeber (Vermerk in der Bemerkung bei Bedarf nachrüstbar)

**Nachtrag 2026-10-27: Einträge für einen Tag erfassen** (Nutzerwunsch: auf den Tag klicken, wenn das Stempeln vergessen wurde)
- Datum jeder Zeile bis heute ist klickbar (gepunktet unterstrichen) und öffnet den Dialog `tag-erfassen.tsx`: Art (Arbeitszeit / Krankheit / Komp. GLZ), bei Arbeitszeit Paare Kommen–Gehen mit "+ weiteres Paar" und laufendem Total, Mittag-/Abendessen, Bemerkung
- Aktion `erfasseTagAction`: Freigeber-Prüfung; Tag nicht in der Zukunft; Uhrzeiten HH:MM in Schweizer Zeit am gewählten Tag (über Mitternacht nicht möglich — dafür "Gehen nachtragen" mit Folgetag); höchstens 10 Paare; Prüfung auf Überschneidung untereinander und mit bestehenden Einträgen; Krankheit/Komp. GLZ höchstens einmal pro Tag; nur Personen aus den Zeiteinträgen. Scheitert ein Paar mitten im Speichern, meldet die Aktion, wie viele gespeichert wurden
- `erstelleZeiteintrag` in `src/lib/dataverse/zeiterfassung.ts` legt den Eintrag mit den App-Feldern an
- Browser-Test 2026-10-27: Arbeitszeit-Einträge werden angelegt, der Flow rechnet die Totals. Ein ganztägiger Eintrag **ohne** Kommen liess den Flow scheitern (`startOfDay` auf leeres Feld, Aktion `varStartOfDay`) → behoben: ganztägige Einträge erhalten als Kommen/Arbeitsbeginn den Tagesbeginn (00:00 Schweizer Zeit), Gehen bleibt leer; die Erfassungs-App setzt Kommen ebenfalls immer

**Tests:** 46 neue Tests (Feiertage, Tagesauswertung, Zeitnachweis inkl. Jahreswechsel, Datenschicht, Ansicht, Auswahl); gesamt 542 grün, `tsc` und ESLint sauber; mit dem Nachtrag 15 weitere (557 grün); mit dem Erfassen 17 weitere (575 grün).

## QA Test Results

**Tested:** 2026-10-27
**App URL:** http://localhost:3000 (Branch `zeiterfassung`, nur lokal)
**Tester:** QA Engineer (AI) + Browser-Test durch den Nutzer (Testanleitung, Nachtragen inkl. Flow-Neuberechnung)

### Acceptance Criteria Status

#### Zugriff und Auswahl
- [x] Bearbeiter: Seite zeigt nur den Freigeber-Hinweis, Unterseiten-Leiste ausgeblendet; Aktion "Gehen nachtragen" und das Merken der Auswahl lehnen serverseitig ab (`actions.test.ts`); ohne Login → `/login` (E2E)
- [x] Personenauswahl ohne "nicht auswerten", mit Name bzw. E-Mail; aktueller Monat vorausgewählt
- [x] Person und Monat bleiben bei Neuladen (Adresse) und beim Zurückkehren über das Menü (Cookie) gewählt — Nutzer-Test + Komponententest

#### Tageszeilen
- [x] Jeder Kalendertag mit Datum und Wochentag
- [x] Kommen/Gehen-Paare in zeitlicher Reihenfolge, Ist = Summe (`tagesauswertung.test.ts`, Nutzer-Test)
- [x] Ohne Gehen: zählt nicht, "offen – Gehen fehlt", Warnung nur an vergangenen Tagen
- [x] Gehen nachtragen (Erweiterung 2026-10-27): aus Hinweis und Zeile, auch am laufenden Tag; Prüfungen serverseitig; Flow rechnet die Totals neu (Nutzer-Test)
- [x] Abgleich Tagestotal des Flows (`bmvcc_tagestotal`) mit Hinweis, Monatstotal in der Übersicht — Nutzer sah den Hinweis im Browser
- [x] Soll aus dem am Datum gültigen Arbeitsmodell
- [x] Feiertage Aargau, Ferien (Schnittstelle, bis PROJ-15 leer), freie Tage → Soll 0 mit Grund
- [x] Krankheit = Soll erfüllt, Komp. GLZ = Gleitzeitbezug (nur Unit-Tests: in den Testdaten gibt es nur Arbeitszeit)
- [x] Abweichung und fortlaufender Saldo pro Zeile
- [x] Mittag-/Abendessen-Regel pro Tag
- [x] Bemerkungen in der Zeile

#### Monatssummen und Saldo
- [x] Saldo Vormonat (bzw. "Startsaldo" im Startmonat), Ist, Soll, Abweichung, Gleitzeit in Stunden und Tagen
- [x] Start am Tag nach dem Stichtag; Folgemonate übernehmen den Endsaldo (über Jahreswechsel getestet)
- [x] Monat vor dem Stichtag → Hinweis Excel-Zeitraum
- [x] Laufender Monat: Tage nach heute zählen nicht, "Stand heute"

#### Zuordnung und Hinweise
- [x] Kein Arbeitsmodell: Soll 0, Ist zählt, Hinweis mit Link zur Person (siehe BUG-1 zur Formulierung)
- [x] Keine Einträge → Hinweis, Tabelle trotzdem
- [x] Ladefehler → verständliche Meldung ohne Zeitdaten

### Edge Cases Status
- [x] Mehrere Einträge pro Tag, Pausen als Lücken
- [x] Überlappende Einträge zählen einmal, Hinweis
- [x] Über Mitternacht: zählt zum Tag des Kommens, "(+1)"
- [x] Eintrag an Tagen ohne Soll: Gleitzeit steigt
- [x] Krankheit an Tag ohne Soll: keine Auswirkung
- [x] Komp. GLZ + Arbeitszeit: volles Soll bleibt
- [x] Modellwechsel mitten im Monat; Ein-/Austritt "nicht angestellt"
- [x] Unplausible Einträge zählen nicht, Warnhinweis, Paar durchgestrichen
- [x] Zeitzone: Aktivitätsdatum in Schweizer Zeit; Nachtragen an Tagen der Zeitumstellung korrekt (`datum.test.ts`)
- [x] Feiertag am Wochenende ohne zusätzlichen Effekt
- [x] Ferien + Arbeitszeit: Hinweis (Schnittstelle getestet)
- [x] Lange Historie: Saldo wird ab Beginn durchgerechnet, unabhängig von geöffneten Monaten; Probelauf mit allen Testpersonen fehlerfrei

### Security Audit Results
- [x] Authentifizierung: `/zeiterfassung` inkl. Parameter hinter dem Login (E2E)
- [x] Autorisierung: Freigeber-Prüfung auf Seite, Nachtragen-Aktion und Cookie-Aktion
- [x] Nachtragen schreibt nur bei offenen Arbeitszeit-Einträgen, liest den Eintrag vor dem Schreiben neu, überschreibt nie ein bestehendes Gehen; ID per Zod-GUID geprüft
- [x] Injection: Person aus der Adresse wird nur verwendet, wenn sie in der Personenliste vorkommt; E-Mail in OData-Filtern escaped; Monat per Muster geprüft; Cookie-Inhalt defensiv gelesen
- [x] XSS: Bemerkungen und Namen per React escaped
- [x] Keine Zeit- oder Personendaten in Logs oder Fehlermeldungen; Testdaten im Repo erfunden
- [ ] Hinweis: E-Mail steht in der Adresse und im (httpOnly-)Cookie — wie in PROJ-14 bewusst akzeptiert
- [ ] Hinweis: "Geändert von" in Dataverse ist beim Nachtragen der App-Benutzer, nicht der Freigeber (Vermerk nachrüstbar)

### Responsive / Browser
- Nutzer-Test im Desktop-Browser. Tabelle scrollt horizontal, Auswahl stapelt sich unter `sm`, Werte umbrechen nicht. Firefox/Safari: Monatsfeld als Textfeld (JJJJ-MM), Vor/Zurück funktioniert — nicht manuell geprüft

### Automatisierte Tests
- [x] `npm test`: 47 Dateien, 558 Tests grün
- [x] `npm run test:e2e`: 32/32 grün (neu: `tests/PROJ-13-zeitnachweis-pro-monat.spec.ts`)

### Bugs Found

#### BUG-1: Hinweis "keine Gleitzeit" stimmt nicht, wenn ein Startsaldo, aber kein Arbeitsmodell erfasst ist
- **Severity:** Low
- **Steps to Reproduce:**
  1. Person mit Startsaldo und Stichtag, ohne Arbeitsmodell-Version
  2. Zeitnachweis eines Monats nach dem Stichtag mit Einträgen öffnen
  3. Expected: Hinweis und Kacheln widersprechen sich nicht
  4. Actual: Hinweis "ohne Arbeitsmodell gibt es kein Soll und keine Gleitzeit", die Kachel zeigt aber eine Gleitzeit (Startsaldo + Ist, z.B. +9.00 h)
- **Priority:** Nice to have — Text anpassen oder ohne Arbeitsmodell keine Gleitzeit rechnen

#### BUG-2: Einträge mit unbekanntem Aktivitätstyp werden still ignoriert
- **Severity:** Low
- **Steps to Reproduce:**
  1. In der Auswahlliste "Aktivitätstyp" kommt ein neuer Wert dazu (z.B. Ferien)
  2. Ein Eintrag mit diesem Typ erscheint im Zeitnachweis nicht und zählt nicht
  3. Expected: Hinweis "unbekannter Eintragstyp"
  4. Actual: kein Hinweis
- **Priority:** Nice to have (heute nur Typ 0–2 vorhanden)

### Summary
- **Acceptance Criteria:** alle erfüllt (Krankheit/Komp. GLZ nur per Unit-Test, da keine Testdaten)
- **Bugs Found:** 2 total (0 critical, 0 high, 0 medium, 2 low)
- **Security:** Pass
- **Production Ready:** YES (fachlich) — Deploy erst nach Nutzer-Freigabe der Zeiterfassung
- **Recommendation:** Low-Bugs nach Wunsch beheben; weiter mit PROJ-15 (Ferien) bzw. PROJ-16 (PDF)

**Nachtest 2026-10-27 (Erweiterungen nach der QA):** "Gehen nachtragen" und "Einträge für einen Tag erfassen" vom Nutzer im Browser geprüft — Arbeitszeit und ganztägige Einträge werden mit korrektem Typ angelegt, der Flow läuft nach der Korrektur (Kommen = Tagesbeginn) durch. 575 Unit-Tests grün. Status wieder Approved

## Deployment
_To be added by /deploy_
