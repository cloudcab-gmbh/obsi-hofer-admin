# PROJ-16: Zeitnachweis als PDF

## Status: In Progress
**Created:** 2026-10-26
**Last Updated:** 2026-10-27

## Dependencies
- Requires: PROJ-13 (Zeitnachweis pro Monat) — Inhalt und Berechnung des PDFs sind die des Zeitnachweises
- Requires: PROJ-14, PROJ-15, PROJ-18 — Arbeitsmodell, Ferien und gepflegte Feiertage fliessen über die Berechnung des Zeitnachweises ein
- Muster: PDF-Export der Prüfberichte (PROJ-7) — Logo, Fusszeile "Seite X von Y"
- Keine Dataverse-Änderungen (nur lesend)

## Ausgangslage
Der Zeitnachweis (PROJ-13) zeigt eine Person und einen Monat am Bildschirm. In der Excel-Mappe gab es pro Person und Monat ein druckbares Blatt "Zeitnachweis". Dieses Feature liefert das Gegenstück als PDF zum Weitergeben, z.B. an die Person, ins Personaldossier oder an die Lohnbuchhaltung.

## User Stories
- Als Freigeber möchte ich im Zeitnachweis mit einem Klick das PDF der gewählten Person und des gewählten Monats herunterladen, damit ich es weitergeben kann.
- Als Freigeber möchte ich, dass das PDF dieselben Zahlen zeigt wie der Bildschirm, damit es keine Abweichungen gibt.
- Als Empfänger möchte ich Tag für Tag Zeiten, Ist, Soll, Abweichung und Gleitzeit sowie die Monatssummen, Gleitzeit- und Feriensaldo sehen.
- Als Freigeber möchte ich, dass interne Prüfhinweise (Abgleich mit dem Flow, Überschneidungen) nicht im PDF stehen, damit es für Mitarbeitende verständlich bleibt.
- Als Bearbeiter möchte ich diese Funktion nicht sehen.

## Out of Scope
- Ablage in SharePoint oder Dataverse — nur Download (Nutzer-Entscheidung)
- Sammel-PDF bzw. PDFs für mehrere Personen auf einmal (Monatsabschluss)
- Unterschriftsfelder oder eingebettetes Visum (Nutzer-Entscheidung: keine)
- Digitale Signatur / Firmen-Siegel — siehe PROJ-9 (nur für Prüfberichte)
- PDF der Übersicht (PROJ-17) oder der Ferien-Seite (PROJ-15)
- Versand per E-Mail aus dem Tool
- Kundenspezifische Vorlagen wie beim Prüfbericht (PROJ-7) — ein festes Layout

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

**Zugriff und Auslösen**
- [ ] Angenommen ein Benutzer hat nur die Rolle "Bearbeiter", wenn er den PDF-Download direkt aufruft, dann wird der Zugriff serverseitig verweigert
- [ ] Angenommen ein Freigeber hat im Zeitnachweis eine Person und einen Monat gewählt, wenn er auf "PDF herunterladen" klickt, dann erhält er ein PDF mit dem Namen "Zeitnachweis {Name bzw. E-Mail} {JJJJ-MM}.pdf"
- [ ] Angenommen keine Person ist gewählt, dann ist "PDF herunterladen" nicht verfügbar

**Inhalt**
- [ ] Angenommen das PDF wird erzeugt, dann ist es A4 hoch und enthält im Kopf das Firmenlogo, den Namen der Person (bzw. E-Mail), den Monat und das im Monat gültige Arbeitsmodell (Pensum, Arbeitstage; bei Wechsel im Monat alle Versionen mit "ab")
- [ ] Angenommen das PDF wird erzeugt, dann enthält es pro Kalendertag eine Zeile mit Datum, Wochentag, Kommen–Gehen-Paaren, Art/Grund (Feiertag, ½ Feiertag, Ferien, ½ Ferien, Krankheit, Komp. GLZ, Frei, frei, nicht angestellt), Ist, Soll, Abweichung, Gleitzeit, Mittag-/Abendessen und Bemerkung
- [ ] Angenommen das PDF wird erzeugt, dann stehen am Ende: Saldo Vormonat (bzw. Startsaldo), Summe Ist, Summe Soll, Abweichung, Gleitzeit Monatsende in Stunden und Tagen, Ferien im Monat (bezogen/geplant) und Feriensaldo Monatsende
- [ ] Angenommen dieselbe Person und derselbe Monat sind gewählt, dann stimmen alle Zahlen im PDF mit dem Zeitnachweis am Bildschirm überein
- [ ] Angenommen ein Tag hat einen offenen Eintrag (Gehen fehlt), dann zeigt das PDF das Paar als "Kommen–…" mit dem Vermerk "Gehen fehlt"; weitere interne Hinweise (Abgleich mit dem Flow, Überschneidungen, unplausible Einträge, "vor Arbeitsmodell") erscheinen nicht
- [ ] Angenommen der Monat ist der laufende Monat, dann ist das PDF als "Stand {Datum}" gekennzeichnet und Tage nach heute bleiben ohne Werte
- [ ] Angenommen das PDF hat mehrere Seiten, dann wiederholen sich die Spaltenköpfe und jede Seite hat die Fusszeile "Seite X von Y" mit Erstellungsdatum und "Erstellt von {Name des Freigebers}"

**Leer- und Fehlerzustände**
- [ ] Angenommen die Person hat im Monat keine Einträge, dann wird das PDF trotzdem erzeugt (Tage mit Soll, Ist 0) mit dem Vermerk "Keine Zeiteinträge in diesem Monat"
- [ ] Angenommen die Person hat kein Arbeitsmodell bzw. der Monat liegt vor dem Beginn der Gleitzeit, dann zeigt das PDF die Ist-Zeiten und statt der Salden "—" mit einem kurzen Vermerk
- [ ] Angenommen das Erzeugen schlägt fehl (Dataverse nicht erreichbar), dann erscheint eine verständliche Fehlermeldung ohne Personendaten

## Edge Cases
- **Viele Paare an einem Tag** (z.B. 4 Kommen/Gehen): Zeiten brechen in der Zelle um; die Zeile wird höher
- **Lange Bemerkungen**: brechen um, werden nicht abgeschnitten
- **Name mit Sonderzeichen**: Dateiname bleibt gültig (unzulässige Zeichen ersetzt)
- **Arbeitsmodell wechselt im Monat**: Kopf nennt beide Versionen; die Tageszeilen nutzen je die gültige
- **Austritt im Monat**: Tage danach als "nicht angestellt"
- **Halber Feiertag und halber Ferientag am selben Tag**: beides in der Spalte Art
- **Monat in der Zukunft**: erzeugbar (Soll und geplante Ferien), "Stand {Datum}"
- **Dark Mode**: ohne Einfluss — das PDF ist immer hell

## Technical Requirements (optional)
- Security: nur Freigeber, serverseitig; Personendaten nur im erzeugten PDF, nicht in Logs, Dateinamen auf dem Server oder im Repo
- Gleiche Berechnung wie der Bildschirm (keine zweite Rechenregel)
- Erzeugen in wenigen Sekunden

## Open Questions
- [x] Fusszeile: Erstellungsdatum **und** "Erstellt von {Freigeber}" (Nutzer, 2026-10-27)

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Nur Download, keine Ablage | Weitergabe an Person/Dossier/Lohnbuchhaltung genügt (Nutzer-Entscheidung) | 2026-10-27 |
| Inhalt wie die Bildschirm-Tabelle, ohne interne Prüfhinweise; offene Einträge als "Gehen fehlt" | Verständlich für Mitarbeitende, gleiche Zahlen wie am Bildschirm (Nutzer-Entscheidung) | 2026-10-27 |
| Keine Unterschriftsfelder, kein Visum | Reines Informationsdokument (Nutzer-Entscheidung); Visum-Security noch offen | 2026-10-27 |
| A4 hoch | Nutzer-Entscheidung; Zeiten und Bemerkungen dürfen umbrechen | 2026-10-27 |
| Ein PDF pro Person und Monat | Sammel-PDFs nicht benötigt | 2026-10-27 |
| Fusszeile mit Erstellungsdatum und "Erstellt von {Freigeber}" | Nachvollziehbar, wer den Nachweis erzeugt hat (Nutzer-Entscheidung) | 2026-10-27 |

### Technical Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| pdfmake wie beim Prüfbericht-Export (PROJ-7), gemeinsame Grundlage (Schriften, Logo, Fusszeile) herausgelöst | Erprobt, kein neues Paket; Prüfbericht bleibt unverändert (Tests) | 2026-10-27 |
| Seite und PDF-Aktion nutzen denselben Lade- und Rechenschritt | Identische Zahlen, keine zweite Logik | 2026-10-27 |
| Server-Aktion mit Base64-Rückgabe, Download im Browser | Gleiches Muster wie PROJ-7; Freigeber-Prüfung in der Aktion; keine Ablage | 2026-10-27 |
| Druckansicht als reine Funktion, interne Hinweise dort weggelassen | Einzeln testbar ohne PDF-Rendern | 2026-10-27 |
| "Erstellt von" = angezeigter Name des angemeldeten Freigebers | Wie "Ausgelöst von" im Sync-Verlauf (PROJ-6) | 2026-10-27 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Ausgangslage
- Der Prüfbericht-Export (PROJ-7) erzeugt PDFs mit **pdfmake** auf dem Server:
  - Roboto-Schriften und Logo als eingebettete Daten;
  - Fusszeile "Seite X von Y";
  - Rückgabe an den Browser als Base64; der Browser speichert die Datei.
- Der Zeitnachweis (PROJ-13) berechnet bereits alles, was das PDF zeigt, als reine Rechnung. Er nutzt dazu Arbeitsmodell, Ferien und gepflegte Feiertage.

### A) Bausteine
```
Zeitnachweis (bestehend)
+-- Knopf "PDF herunterladen" neben der Auswahl (nur wenn eine Person gewählt ist)
    +-- während der Erzeugung gesperrt ("Erzeugt …"), Fehlermeldung bei Problemen
    +-- Datei "Zeitnachweis {Name} {JJJJ-MM}.pdf" wird im Browser gespeichert

Server-Aktion "Zeitnachweis-PDF erzeugen" (nur Freigeber)
+-- lädt Person, Arbeitsmodell, Einträge und Feiertage — dieselben Schritte wie die Seite
+-- berechnet den Zeitnachweis mit derselben Rechenregel wie der Bildschirm
+-- baut das PDF und gibt es zurück (nichts wird gespeichert)

PDF-Aufbau (A4 hoch)
+-- Kopf: Logo · "Zeitnachweis" · Person · Monat · Arbeitsmodell(e) im Monat · ggf. "Stand {Datum}"
+-- Tabelle (Kopfzeile wiederholt sich auf jeder Seite):
|   Datum · Zeiten · Art · Ist · Soll · Abw. · Gleitzeit · Essen · Bemerkung
|   Wochenenden/Feiertage leicht hinterlegt; "Gehen fehlt" bei offenen Einträgen
+-- Summenblock: Saldo Vormonat/Startsaldo · Ist · Soll · Abweichung · Gleitzeit (h, Tage) ·
|   Ferien im Monat (bezogen/geplant) · Feriensaldo; Vermerke (keine Einträge, kein Arbeitsmodell)
+-- Fusszeile jeder Seite: "Seite X von Y" · Erstellt am {Datum} von {Freigeber}
```

### B) Datenmodell (in Worten)
**Nichts wird gespeichert, keine Dataverse-Änderung.**
- Das PDF entsteht aus genau den Daten, die die Zeitnachweis-Seite lädt, und aus derselben Berechnung.
- Neu ist nur die "Druckansicht": eine Umwandlung der berechneten Tageszeilen und Summen in eine Druckstruktur.
- Interne Hinweise werden dabei weggelassen. Aus offenen Einträgen wird "Gehen fehlt".

### C) Technische Entscheidungen (Begründung)
- **pdfmake wie bei PROJ-7:** Die Bibliothek ist bereits im Tool, auf dem Server erprobt (Schriften, Logo, Seitenzahlen). Kein neues Paket.
- **Gemeinsame PDF-Grundlage herauslösen:** Schriften, Logo und die Fusszeile "Seite X von Y" werden in einen kleinen gemeinsamen Baustein verschoben, den Prüfbericht und Zeitnachweis nutzen. Der Prüfbericht-Export bleibt dabei inhaltlich unverändert; seine Tests sichern das ab.
- **Laden und Rechnen einmal definiert:** Seite und PDF-Aktion nutzen denselben Ladeschritt für Person, Arbeitsmodell, Einträge und Feiertage. Das ergibt identische Zahlen und keine zweite Logik.
- **Server-Aktion mit Base64-Rückgabe** (wie PROJ-7): Die Freigeber-Prüfung läuft in der Aktion; die Datei entsteht nur im Browser des Freigebers. Keine Ablage, keine öffentliche Adresse.
- **"Erstellt von":** der angezeigte Name des angemeldeten Freigebers (wie "Ausgelöst von" im Sync-Verlauf, PROJ-6).
- **Dateiname:** wird aus Name bzw. E-Mail und Monat gebildet; Zeichen, die in Dateinamen nicht erlaubt sind, werden ersetzt.
- **Druckansicht als reine Funktion** (ohne Datenzugriff): Inhalt und Weglassen der internen Hinweise sind einzeln testbar, ohne ein PDF zu rendern.

### D) Abhängigkeiten (Pakete)
Keine neuen Pakete (pdfmake ist vorhanden).

### E) Tests
- **Druckansicht:**
  - Zeilen und Spalten, Art-Texte (Feiertag, ½ Feiertag, Ferien, ½ Ferien, Krankheit, Komp. GLZ, Frei);
  - "Gehen fehlt", keine internen Hinweise, Summenblock;
  - Arbeitsmodell-Wechsel im Kopf, Vermerke (keine Einträge, kein Arbeitsmodell), "Stand {Datum}".
- **Dateiname:** Sonderzeichen werden ersetzt.
- **Aktion:**
  - Bearbeiter abgelehnt; Person nicht in der Zeiterfassung abgelehnt;
  - die Zahlen sind dieselben wie in der Seitenberechnung;
  - Fehler beim Laden ergibt eine Meldung ohne Personendaten.
- **PDF:** wird erzeugt (beginnt mit "%PDF"), mehrseitig mit wiederholter Kopfzeile.
- **Prüfbericht-PDF unverändert:** bestehende Tests nach dem Herauslösen grün.
- **Manuell lokal:** PDF eines Monats mit Feiertag, Ferien und offenem Eintrag mit dem Bildschirm vergleichen.

### F) Vorgehen
Bauen auf dem Branch `zeiterfassung`, nur lokal testen — kein Push auf `main`, kein Deploy bis zur Freigabe.

## Implementation Notes

### Umsetzung Frontend + Backend (2026-10-27, Branch `zeiterfassung`, nur lokal)
- **Gemeinsame PDF-Grundlage** `src/lib/pdf/grundlage.ts`:
  - Roboto-Schriften (virtuelles Dateisystem), Logo als Data-URL, `renderePdf`;
  - aus `pruefbericht-export/pdf-generator.ts` herausgelöst, unverändert (81 Prüfbericht-Tests grün).
- **Gemeinsamer Ladeweg** `src/lib/zeiterfassung/zeitnachweis-laden.ts` (`ladeAuswertbarePersonen`, `ladeZeitnachweis`): Die Zeitnachweis-Seite und die PDF-Aktion laden und rechnen identisch.
- **Art-Beschriftung** in `src/lib/zeiterfassung/anzeige.ts` (`grundText`, `artTexte`), von Bildschirm und PDF genutzt.
- **Druckansicht** `src/lib/zeiterfassung/zeitnachweis-pdf.ts`:
  - `bauePdfDokument`: A4 hoch, Kopf mit Logo, Person, Monat, "Stand" im laufenden Monat und Arbeitsmodell(en) im Monat;
  - Tabelle mit wiederholter Kopfzeile, ungeteilten Zeilen und hinterlegten freien Tagen/Feiertagen;
  - "Gehen fehlt" statt interner Hinweise; Summenblock und Vermerke;
  - Fusszeile "Erstellt am … von …" und "Seite X von Y".
  - `zeitnachweisDateiname` ersetzt unzulässige Zeichen.
- **Aktion** `erzeugeZeitnachweisPdfAction`: Freigeber (Name für "Erstellt von"), Monat geprüft, Person muss auswertbar sein; Base64 zurück, nichts gespeichert; Fehlermeldung ohne Personendaten.
- **Knopf** `zeitnachweis-pdf-knopf.tsx` neben der Auswahl (nur mit gewählter Person), Download wie beim Prüfbericht.

**Tests:** 19 neue Tests (Druckansicht inkl. echtem PDF-Rendern, Dateiname, Versionen im Monat, Aktion); gesamt 680 grün, `tsc` und ESLint sauber. Layout im Browser noch zu prüfen (lokal kein PDF-Bildwerkzeug).

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
