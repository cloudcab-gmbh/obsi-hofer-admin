# PROJ-17: Zeiterfassung-Übersicht (Dashboard)

## Status: Approved
**Created:** 2026-10-27
**Last Updated:** 2026-10-27

## Dependencies
- Requires: PROJ-1 (Entra-ID-Login mit Rollen) — nur Freigeber
- Requires: PROJ-13 (Zeitnachweis pro Monat) — Ist, Soll, Gleitzeit, Abwesenheiten und Hinweise werden mit denselben Regeln gerechnet
- Requires: PROJ-14 (Arbeitsmodell pro Person) — Personenliste, "nicht auswerten"
- Requires: PROJ-15 (Ferien erfassen und Feriensaldo) — Ferienanspruch, bezogen, geplant, Saldo
- Keine Dataverse-Änderungen (nur lesend)

## Ausgangslage
Der Zeitnachweis (PROJ-13) zeigt eine Person und einen Monat, die Ferien-Seite (PROJ-15) den Ferienstand aller Personen. Eine Gesamtsicht über Gleitzeit, Ist/Soll, Abwesenheiten und Ferien aller Mitarbeitenden fehlt — in PROJ-13 bewusst ausgeschlossen ("Auswertung über mehrere Personen hinweg"). Der Freigeber will auf einen Blick sehen, wo Handlungsbedarf besteht.

## User Stories
- Als Freigeber möchte ich für einen Monat alle Mitarbeitenden mit Gleitzeit, Ist/Soll, Abwesenheiten und Ferien in einer Tabelle sehen, damit ich nicht jeden Zeitnachweis einzeln öffnen muss.
- Als Freigeber möchte ich die Gleitzeit-Salden als Balkengrafik sehen, damit ich sofort erkenne, wer viel Plus oder Minus hat.
- Als Freigeber möchte ich den Ferienstand aller als Balkengrafik sehen (bezogen, geplant, Rest), damit ich Ferienplanung und Restferien im Blick habe.
- Als Freigeber möchte ich auffällige Werte hervorgehoben sehen (kein Arbeitsmodell, offene Einträge, negativer Feriensaldo, hohe Gleitzeit), damit ich gezielt nachfassen kann.
- Als Freigeber möchte ich von einer Person direkt in ihren Zeitnachweis des gewählten Monats springen.
- Als Bearbeiter möchte ich diese Übersicht nicht sehen, da sie Personendaten aller Mitarbeitenden enthält.

## Out of Scope
- Gleitzeit-Verlauf über mehrere Monate als Liniengrafik — bewusst nicht gewählt (Nutzer-Entscheidung), später möglich
- Export der Übersicht (Excel, CSV, PDF) — der PDF-Zeitnachweis pro Person ist PROJ-16
- Einstellbare Schwellen für Warnungen in der Oberfläche — fest im Tool, später anpassbar
- Bearbeiten von Werten in der Übersicht — Erfassen und Korrigieren bleibt im Zeitnachweis bzw. auf der Ferien-Seite
- Jahresstatistik (Summen über alle Monate eines Jahres) ausser dem Ferienstand
- Vergleich mit Vorjahr, Team-/Abteilungsgruppen

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

**Zugriff und Navigation**
- [ ] Angenommen ein Benutzer hat nur die Rolle "Bearbeiter", wenn er die Übersicht direkt aufruft, dann wird der Zugriff serverseitig verweigert
- [ ] Angenommen ein Freigeber klickt im Menü auf "Zeiterfassung", dann öffnet sich die Übersicht; der Reiter "Übersicht" steht vor "Zeitnachweis · Personen · Ferien"
- [ ] Angenommen ein Freigeber wählt einen Monat (Standard: aktueller Monat, Vor/Zurück wie im Zeitnachweis), dann beziehen sich alle Werte auf diesen Monat; die Auswahl steht in der Adresse

**Tabelle**
- [ ] Angenommen es gibt Personen in der Zeiterfassung, dann zeigt die Tabelle jede Person ausser "nicht auswerten" mit: Gleitzeit-Saldo am Monatsende (laufender Monat: Stand heute) in Stunden und Tagen, Veränderung der Gleitzeit im Monat, Ist, Soll und Abweichung des Monats, Krankheitstage und Komp.-GLZ-Tage im Monat und im Jahr, Feriensaldo, Ferien bezogen und geplant im Jahr des gewählten Monats
- [ ] Angenommen ein Freigeber klickt auf einen Spaltenkopf, dann wird die Tabelle nach dieser Spalte sortiert (erneut klicken: umgekehrt); Standard ist alphabetisch nach Name
- [ ] Angenommen ein Freigeber klickt auf eine Person, dann öffnet sich ihr Zeitnachweis für den gewählten Monat
- [ ] Angenommen die Werte sind mit denselben Regeln gerechnet wie im Zeitnachweis und auf der Ferien-Seite, dann stimmen sie für jede Person mit diesen Seiten überein

**Grafiken**
- [ ] Angenommen der Monat ist gewählt, dann zeigt eine Balkengrafik pro Person den Gleitzeit-Saldo am Monatsende (Plus und Minus unterscheidbar, Nulllinie), sortiert wie die Tabelle oder nach Wert
- [ ] Angenommen der Monat ist gewählt, dann zeigt eine gestapelte Balkengrafik pro Person die Ferien des Jahres: bezogen, geplant und verbleibender Saldo; ein negativer Saldo ist erkennbar
- [ ] Angenommen ein Freigeber zeigt auf einen Balken, dann erscheinen Person und genaue Werte

**Warnungen**
- [ ] Angenommen eine Person hat kein Arbeitsmodell, offene Einträge (Gehen fehlt) im Monat, einen negativen Feriensaldo oder eine Gleitzeit über +40 h bzw. unter −40 h, dann ist der betroffene Wert in Tabelle bzw. Zeile hervorgehoben und oben steht eine Zusammenfassung (z.B. "2 Personen mit offenen Einträgen")

**Leer- und Fehlerzustände**
- [ ] Angenommen es gibt noch keine Personen bzw. Zeiteinträge, dann erscheint ein Leer-Hinweis statt Tabelle und Grafiken
- [ ] Angenommen eine Person hat für den Monat keine Gleitzeit (vor dem Beginn, kein Arbeitsmodell), dann steht "—" und sie fehlt in der Gleitzeit-Grafik (mit Hinweis)
- [ ] Angenommen das Laden aus Dataverse schlägt fehl, dann erscheint eine verständliche Fehlermeldung ohne Personendaten

## Edge Cases
- **Person ohne Arbeitsmodell**: Ist zählt, Soll 0, keine Gleitzeit; Warnung "kein Arbeitsmodell"
- **Ausgetretene Person**: erscheint weiterhin (mit Kennzeichnung "ausgetreten"), solange sie nicht "nicht auswerten" ist
- **Monat vor dem Beginn der Gleitzeit / des Feriensaldos**: "—" statt Werten
- **Künftiger Monat**: Gleitzeit = Stand heute (keine Zukunft), geplante Ferien zählen
- **Viele Personen**: Grafiken bleiben lesbar (horizontale Balken, Namen gekürzt mit vollständigem Namen beim Zeigen)
- **Sehr lange Historie**: Die Übersicht lädt alle Personen in vertretbarer Zeit (wenige Sekunden)
- **Unterschiedliche Pensen**: Gleitzeit in Stunden ist vergleichbar; die Grafik zeigt Stunden

## Technical Requirements (optional)
- Security: nur Freigeber, serverseitig; Personendaten aller Mitarbeitenden — nicht in Logs, Fehlermeldungen oder im Repo
- Grafiken barrierearm: Werte zusätzlich in der Tabelle, Farben nicht als einzige Unterscheidung
- Dark Mode und Design-System (Stahlblau, Statusfarben) einhalten
- Performance: Laden in wenigen Sekunden bei rund 10 Personen und mehreren Jahren Historie

## Open Questions
- [ ] Ist die Schwelle ±40 h Gleitzeit richtig, oder z.B. ±20 h / eine Woche des Pensums? (vorerst fest ±40 h)

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Eigenes Feature PROJ-17 statt Erweiterung von PROJ-13 | Eigene Seite, eigene Testbarkeit; PROJ-13 hatte die Team-Übersicht bewusst ausgeschlossen | 2026-10-27 |
| Kennzahlen: Gleitzeit, Ist/Soll Monat, Abwesenheiten (Krankheit, Komp. GLZ), Ferien | Alle vier vom Nutzer gewählt | 2026-10-27 |
| Grafiken: Gleitzeit-Balken und gestapelter Ferien-Balken; kein Gleitzeit-Verlauf | Nutzer-Entscheidung | 2026-10-27 |
| Monat wählbar (Standard: aktueller), Ferien für das Jahr des Monats | Gleiche Logik wie Zeitnachweis; Rückblick auf abgeschlossene Monate möglich (Nutzer-Entscheidung) | 2026-10-27 |
| Reiter "Übersicht" als Startseite der Zeiterfassung; Klick auf Person → Zeitnachweis | Gesamtsicht zuerst, Details auf Klick (Nutzer-Entscheidung) | 2026-10-27 |
| Warnungen mit festen Schwellen (kein Arbeitsmodell, offene Einträge, negativer Feriensaldo, Gleitzeit ±40 h) | Handlungsbedarf auf einen Blick (Nutzer-Entscheidung); Schwellen später anpassbar | 2026-10-27 |
| Nur lesend | Erfassen/Korrigieren bleibt auf den bestehenden Seiten | 2026-10-27 |

### Technical Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Übersicht ruft die bestehenden Rechenregeln (Zeitnachweis, Ferienstand) pro Person auf, rechnet nichts neu | Zahlen stimmen mit Zeitnachweis und Ferien-Seite überein | 2026-10-27 |
| Zeiteinträge pro Person parallel mit der bestehenden Abfrage, ab dem früheren von Beginn und 1. Januar | Erprobt, für rund 10 Personen schnell; gemeinsame Abfrage nachrüstbar | 2026-10-27 |
| Grafiken mit shadcn "chart" (Recharts), horizontale Balken | Standard-Baustein der UI-Bibliothek, Design-System-Farben und Dark Mode, Tooltips; Namen lesbar | 2026-10-27 |
| Krankheits-/Komp.-GLZ-Tage = Anzahl Kalendertage mit Eintrag; Jahr bis Monatsende | Mehrere Einträge am selben Tag zählen einmal; Monat und Jahr konsistent | 2026-10-27 |
| Gleitzeit-Schwelle ±40 h an einer Stelle definiert | Später leicht anpassbar (Open Question) | 2026-10-27 |
| Übersicht unter /zeiterfassung, Zeitnachweis zieht nach /zeiterfassung/zeitnachweis; alte Adressen mit Person/Monat leiten weiter | Menüpunkt öffnet die Gesamtsicht; Lesezeichen bleiben gültig | 2026-10-27 |
| Sortieren im Browser | Eine Zeile pro Person, kein Nachladen nötig | 2026-10-27 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Ausgangslage
- Alle Rechenregeln gibt es bereits als reine, getestete Bausteine:
  - Zeitnachweis eines Monats (PROJ-13): Gleitzeit, Ist/Soll, offene Einträge, Ferien des Monats;
  - Ferienstand eines Jahres (PROJ-15).
  Die Übersicht rechnet **nichts neu**, sie ruft diese Bausteine pro Person auf. So stimmen die Zahlen garantiert mit Zeitnachweis und Ferien-Seite überein.
- Es ist noch keine Grafik-Bibliothek installiert.

### A) Bausteine
```
Zeiterfassung (Unterseiten-Leiste): Übersicht (neu, Startseite) · Zeitnachweis · Personen · Ferien

/zeiterfassung = Übersicht (nur Freigeber)
+-- Monat wählen (Vor/Zurück + Monatsfeld, wie Zeitnachweis; in der Adresse)
+-- Warnungen (Zusammenfassung oben): "1 Person ohne Arbeitsmodell", "2 mit offenen Einträgen",
|   "1 mit negativem Feriensaldo", "1 mit Gleitzeit über ±40 h"
+-- Grafik "Gleitzeit" (horizontale Balken pro Person, Nulllinie, Plus/Minus farblich und mit Vorzeichen)
+-- Grafik "Ferien {Jahr}" (horizontale, gestapelte Balken: bezogen · geplant · Rest; negativer Rest erkennbar)
|   Beide Grafiken: Wert beim Zeigen, Personen ohne Wert mit Hinweis ausgelassen
+-- Tabelle (sortierbar per Klick auf den Spaltenkopf)
    +-- Person (Link → Zeitnachweis dieser Person und dieses Monats) · Badge "ausgetreten"
    +-- Gleitzeit (h, Tage) · Veränderung im Monat · Ist · Soll · Abweichung
    +-- Krankheit Monat/Jahr · Komp. GLZ Monat/Jahr (Tage)
    +-- Feriensaldo · Ferien bezogen · geplant (Jahr)
    +-- hervorgehobene Werte bei Warnungen
+-- Leer-Hinweis / Fehlermeldung

Zeitnachweis zieht um: /zeiterfassung/zeitnachweis (Adresse mit Person und Monat wie bisher)
```

### B) Datenmodell (in Worten)
**Nichts wird gespeichert, keine Dataverse-Änderung.**

**Pro Person und gewähltem Monat:**
- Arbeitsmodell, Startsalden und Ferienanspruch (bereits vorhanden, PROJ-14/15).
- Ihre Zeiteinträge vom frühesten nötigen Tag bis Ende des Monats. Der früheste Tag ist der frühere von Beginn der Gleitzeit bzw. des Feriensaldos und dem 1. Januar des Jahres (für die Jahreszahlen).

**Daraus je Person eine Zeile:**
- Gleitzeit am Monatsende bzw. heute und Saldo Vormonat; die Veränderung ist die Differenz.
- Ist, Soll und Abweichung des Monats; Anzahl offener Einträge.
- Krankheits- und Komp.-GLZ-Tage im Monat und im Jahr: Anzahl Kalendertage mit einem solchen Eintrag. Im laufenden Jahr nur bis zum Monatsende.
- Ferien: Saldo am Monatsende, bezogen und geplant im Jahr.
- Warnungen:
  - kein Arbeitsmodell;
  - offene Einträge;
  - Feriensaldo unter 0;
  - Gleitzeit über +40 h oder unter −40 h (feste Schwelle, an einer Stelle definiert).

**Laden:**
- Personenliste und alle Arbeitsmodelle wie auf der Personenseite.
- Die Zeiteinträge pro Person parallel, mit der bestehenden Abfrage inkl. Nachladen aller Seiten.

### C) Technische Entscheidungen (Begründung)
- **Bestehende Rechenregeln wiederverwenden:** eine Wahrheit für alle Seiten; keine Abweichungen zwischen Übersicht, Zeitnachweis und Ferien-Seite.
- **Pro Person eine Abfrage, parallel:** nutzt die erprobte Abfrage aus PROJ-13; bei rund 10 Personen schnell. Für deutlich mehr Personen wäre eine gemeinsame Abfrage nachrüstbar.
- **Grafiken mit der shadcn-Komponente "Chart" (Recharts):** Standard-Baustein der verwendeten UI-Bibliothek. Farben und Dark Mode kommen aus dem Design-System, Tooltips und Achsen sind eingebaut. Recharts wird nur auf dieser Seite geladen.
- **Horizontale Balken:** Namen bleiben bei vielen Personen lesbar; Plus und Minus um eine Nulllinie sind intuitiv.
- **Barrierearm:** Farbe ist nie das einzige Merkmal (Vorzeichen, Legende), alle Werte stehen zusätzlich in der Tabelle.
- **Sortieren im Browser:** die Daten sind klein (eine Zeile pro Person); kein erneutes Laden.
- **Übersicht wird Startseite, Zeitnachweis zieht auf eine eigene Adresse:**
  - Der Menüpunkt öffnet die Gesamtsicht (Product Decision).
  - Links und die gemerkte Auswahl des Zeitnachweises werden angepasst.
  - Alte Adressen mit Person und Monat leiten auf den Zeitnachweis weiter, damit Lesezeichen funktionieren.
- **Freigeber-Prüfung auf der Seite**, keine Personendaten in Logs oder Fehlermeldungen.

### D) Abhängigkeiten (Pakete)
- shadcn-Komponente **chart** (installiert **recharts**): Balkengrafiken mit Tooltips, Farben aus dem Design-System

### E) Tests
- **Zusammenstellung pro Person:**
  - Gleitzeit-Veränderung;
  - Krankheits- und Komp.-GLZ-Tage Monat/Jahr (mehrere Einträge am selben Tag zählen einmal);
  - Warnungen und ihre Schwellen;
  - Person ohne Arbeitsmodell, vor dem Beginn, ausgetreten, künftiger Monat;
  - Übereinstimmung mit Zeitnachweis und Ferienstand.
- **Komponenten:** Sortieren, Link zum Zeitnachweis, Warnungs-Zusammenfassung, Leer-Hinweis, Grafiken mit Daten (Werte vorhanden, Personen ohne Wert ausgelassen).
- **Zugriff:** Bearbeiter abgelehnt, ohne Login → `/login` (E2E), alte Zeitnachweis-Adresse leitet weiter.
- **Manuell lokal mit den Testdaten:** Werte gegen Zeitnachweis und Ferien-Seite vergleichen; Dark Mode.

### F) Vorgehen
Bauen auf dem Branch `zeiterfassung`, nur lokal testen — kein Push auf `main`, kein Deploy bis zur Freigabe.

## Implementation Notes

### Umsetzung Frontend + Backend (2026-10-27, Branch `zeiterfassung`, nur lokal)
- **Rechnung** `src/lib/zeiterfassung/uebersicht.ts`:
  - `berechneUebersichtWerte` ruft pro Person `berechneZeitnachweis` (PROJ-13) und `ferienJahr` (PROJ-15) auf.
  - Daraus kommen Gleitzeit und Veränderung, Ist/Soll/Abweichung, offene Einträge, Krankheits-/Komp.-GLZ-Kalendertage Monat/Jahr, Feriensaldo am Monatsende, bezogen/geplant im Jahr, "ausgetreten" und die Warnungen.
  - Schwelle `GLEITZEIT_SCHWELLE_MINUTEN` = 40 h. `uebersichtLadebeginn` lädt ab dem früheren von Beginn und 1. Januar.
- **Seite** `/zeiterfassung` = Übersicht:
  - Monatsauswahl (`monats-auswahl.tsx`, `?monat=`) und Warnungs-Zusammenfassung;
  - Grafiken (`uebersicht-grafiken.tsx`) und sortierbare Tabelle (`uebersicht-tabelle.tsx`, Link → Zeitnachweis des Monats).
  - Einträge werden pro Person parallel geladen.
- **Zeitnachweis umgezogen** nach `/zeiterfassung/zeitnachweis`:
  - Alte Adressen `/zeiterfassung?person=…` leiten weiter.
  - `zeitnachweisHref` angepasst; Unterseiten-Leiste "Übersicht · Zeitnachweis · Personen · Ferien".
  - Alle Aktionen laden die ganze Zeiterfassung neu (`revalidatePath(…, "layout")`).
- **Grafiken:** shadcn `chart` installiert (Recharts 2.15), horizontale Balken.
  - Gleitzeit: Plus Blau / Minus Rot, Nulllinie.
  - Ferien: gestapelt bezogen / geplant / Rest als Blau-Stufen, negativer Rest rot links der Nulllinie; 2px Fuge zwischen den Segmenten.
  - Tooltips mit vollem Namen und Wert. Personen ohne Wert sind unter der Grafik genannt.
  - Farben mit dem dataviz-Validator geprüft, hell auf Weiss und dunkel auf `#1d2129`, alle Checks bestanden.
- **Probelauf** gegen die Testdaten (2026-10-27, nur Zählungen): 5 Personen, drei Monate in 0.7 s, Werte und Warnungen plausibel.
- **`npm audit`:** 4 bekannte Schwachstellen (uuid, zod u.a.) bestanden schon vorher, nicht durch Recharts.

**Tests:** 11 neue Tests (Zusammenstellung inkl. Übereinstimmung mit Zeitnachweis/Ferienstand, Sortierung, Link, Warnungen, Grafiken, E2E); gesamt 631 Unit- und 38 E2E-Tests grün, `tsc` und ESLint sauber.

## QA Test Results

**Tested:** 2026-10-27
**App URL:** http://localhost:3000 (Branch `zeiterfassung`, nur lokal)
**Tester:** QA Engineer (AI) + Browser-Test durch den Nutzer ("Dashboard ist ok")

### Acceptance Criteria Status
#### Zugriff und Navigation
- [x] Bearbeiter: Hinweis statt Daten; ohne Login → `/login` (E2E)
- [x] Menüpunkt öffnet die Übersicht, Reiter "Übersicht" vorne
- [x] Monat wählbar (Standard aktueller Monat, in der Adresse)

#### Tabelle
- [x] Alle Spalten pro Person (ohne "nicht auswerten")
- [x] Sortierung per Spaltenkopf, fehlende Werte am Ende
- [x] Link zum Zeitnachweis des gewählten Monats
- [x] Werte stimmen mit Zeitnachweis und Ferienstand überein (eigener Test; seit PROJ-18 mit demselben Feiertagskalender)

#### Grafiken
- [x] Gleitzeit-Balken mit Nulllinie, Plus/Minus farblich (Validator bestanden)
- [x] Ferien-Balken bezogen · geplant · Rest (BUG-1 behoben: Rest = Saldo am Jahresende)
- [x] Tooltip mit Person und Wert

#### Warnungen, Leer- und Fehlerzustände
- [x] Hervorhebung und Zusammenfassung (kein Arbeitsmodell, offene Einträge, negativer Feriensaldo, Gleitzeit ±40 h)
- [x] Leer-Hinweis; "—" und Hinweis "Ohne Gleitzeit …" in der Grafik; Fehlermeldung ohne Personendaten

### Edge Cases Status
- [x] Ohne Arbeitsmodell, ausgetreten, vor dem Beginn, künftiger Monat (Unit-Tests)
- [x] Viele Personen: Grafikhöhe wächst, gekürzte Namen mit vollem Namen im Tooltip (Nutzer: bis 10 Personen ausreichend)
- [x] Performance: 5 Personen × 3 Monate in 0.7 s (Probelauf)

### Security Audit Results
- [x] Nur Freigeber (Seite); alte Adresse `/zeiterfassung?person=…` leitet auf den Zeitnachweis, der selbst prüft — kein offener Redirect (Ziel fest)
- [x] Nur lesend; keine Personendaten in Logs/Fehlermeldungen
- [x] Neue Abhängigkeit Recharts: keine neuen Audit-Funde (4 bestehende Funde in anderen Paketen)

### Automatisierte Tests
- [x] `npm test`: 57 Dateien, 661 Tests grün
- [x] `npm run test:e2e`: 40/40 grün

### Bugs Found
#### BUG-1: Ferien-Grafik zählt später geplante Ferien doppelt
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Person mit 25 Tagen Anspruch, 1 Tag im März bezogen, 1 Tag im Dezember geplant.
  2. Übersicht Oktober öffnen.
  3. Expected: Balken bezogen 1 + geplant 1 + Rest 23 = 25.
  4. Actual: Rest = Saldo Ende Oktober = 24, Balken 26 (nachgerechnet).
- **Ursache:** Der Rest-Teil nimmt den Feriensaldo am Monatsende; dieser zieht später geplante Ferien noch nicht ab.
- **Vorschlag:** In der Grafik als Rest den Saldo am Jahresende (nach allen geplanten Ferien) verwenden; in der Tabelle bleibt "Feriensaldo am Monatsende".
- **Priority:** Fix before deployment
- **Status:** ✅ Behoben (2026-10-27) — neuer Wert `ferienSaldoJahresende` (Saldo nach allen bezogenen und geplanten Ferien des Jahres) als Rest in der Grafik; die Tabelle zeigt weiterhin den Feriensaldo am Monatsende. Test: bezogen + geplant + Rest = verfügbare Tage

### Summary
- **Acceptance Criteria:** alle bis auf die Ferien-Grafik erfüllt
- **Bugs Found:** 1 total (0 critical, 0 high, 1 medium, 0 low) — behoben 2026-10-27 (668 Tests grün)
- **Security:** Pass
- **Production Ready:** YES nach Regel (kein Critical/High) — Empfehlung: BUG-1 vor dem Deploy beheben

## Deployment
_To be added by /deploy_
