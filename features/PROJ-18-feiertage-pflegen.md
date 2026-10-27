# PROJ-18: Feiertage im Tool pflegen

## Status: Architected
**Created:** 2026-10-27
**Last Updated:** 2026-10-27

## Dependencies
- Requires: PROJ-1 (Entra-ID-Login mit Rollen) — nur Freigeber
- Requires: PROJ-13 (Zeitnachweis) — Feiertage setzen das Soll auf 0 (bzw. halbieren es)
- Betrifft: PROJ-15 (Ferien — Feiertage sind keine Ferientage), PROJ-17 (Übersicht rechnet mit denselben Regeln)
- **Dataverse:** Ablage für die gepflegten Feiertage existiert noch nicht — Form in /architecture, vom Nutzer anzulegen, plus Rechte für den App-Benutzer

## Ausgangslage
Heute berechnet das Tool jedes Jahr fest die 9 gesetzlichen Feiertage aus der bisherigen Excel-Liste (Neujahr, Berchtoldstag, Karfreitag, Ostermontag, Auffahrt, Pfingstmontag, Bundesfeiertag, Weihnachten, Stephanstag). Betriebliche Zusatztage (z.B. Heiligabend), halbe Feiertage und Änderungen (z.B. 1. Mai, Fronleichnam) sind nicht möglich; die Liste ist nur im Code sichtbar. In PROJ-13 waren "betriebliche Zusatz-Feiertage oder halbe Feiertage" bewusst ausgeschlossen — dieses Feature holt das nach.

## User Stories
- Als Freigeber möchte ich die Feiertage eines Jahres im Tool sehen, damit ich weiss, mit welchen Tagen der Zeitnachweis rechnet.
- Als Freigeber möchte ich für ein Jahr den automatischen Vorschlag übernehmen und anpassen (Tage hinzufügen, entfernen, umbenennen), damit betriebliche Feiertage berücksichtigt werden.
- Als Freigeber möchte ich halbe Feiertage festlegen (z.B. Heiligabend nachmittags), damit das Soll an diesen Tagen halbiert wird.
- Als Freigeber möchte ich, dass vergangene Jahre unverändert bleiben, solange ich sie nicht bewusst übernehme, damit sich frühere Gleitzeit-Stände nicht ungewollt ändern.
- Als Bearbeiter möchte ich diese Funktion nicht sehen.

## Out of Scope
- Feiertage pro Person oder pro Standort/Kanton — eine Liste für die ganze Firma
- Automatischer Import aus einem Feiertagskalender (Internet, Outlook)
- Feiertage mit anderen Anteilen als ganz/halb (z.B. 2 Stunden)
- Änderungsverlauf "wer hat wann was geändert" (Dataverse führt "geändert von/am")
- Feiertage aus der Erfassungs-App heraus pflegen

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

**Zugriff und Anzeige**
- [ ] Angenommen ein Benutzer hat nur die Rolle "Bearbeiter", wenn er die Feiertags-Seite oder eine Feiertags-Aktion direkt aufruft, dann wird der Zugriff serverseitig verweigert
- [ ] Angenommen ein Freigeber öffnet unter "Zeiterfassung" den Reiter "Feiertage", dann sieht er für ein wählbares Jahr (Standard: aktuelles) alle Feiertage mit Datum, Wochentag, Name und "ganz/halb", sowie ob die Liste der automatische Vorschlag oder gepflegt ist

**Vorschlag und Übernehmen**
- [ ] Angenommen ein Jahr ist noch nicht gepflegt, dann gilt der automatische Vorschlag (die 9 bisherigen Feiertage, bewegliche nach Ostern berechnet) und die Seite zeigt "automatischer Vorschlag" mit der Schaltfläche "Jahr übernehmen"
- [ ] Angenommen ein Freigeber klickt "Jahr übernehmen", dann wird der Vorschlag als gepflegte Liste des Jahres gespeichert und ist danach änderbar; Zeitnachweis, Ferien und Übersicht rechnen ab dann mit der gepflegten Liste

**Pflegen**
- [ ] Angenommen ein Jahr ist gepflegt, wenn der Freigeber einen Feiertag hinzufügt (Datum, Name, ganz/halb), dann gilt er sofort in Zeitnachweis, Ferien und Übersicht
- [ ] Angenommen ein Jahr ist gepflegt, wenn der Freigeber einen Feiertag ändert (Name, ganz/halb) oder nach einer Bestätigung entfernt, dann rechnen alle betroffenen Tage sofort neu
- [ ] Angenommen ein Freigeber erfasst ein Datum ausserhalb des gewählten Jahres, ein leeres Datum oder einen leeren Namen, oder ein Datum, das im Jahr schon Feiertag ist, dann wird nicht gespeichert und eine verständliche Meldung angezeigt (serverseitig geprüft)
- [ ] Angenommen ein Freigeber möchte ein gepflegtes Jahr zurücksetzen, wenn er "Auf Vorschlag zurücksetzen" bestätigt, dann gilt wieder der automatische Vorschlag

**Wirkung**
- [ ] Angenommen ein Tag ist ganzer Feiertag, dann ist sein Soll 0 und der Zeitnachweis zeigt "Feiertag: {Name}" (wie bisher)
- [ ] Angenommen ein Tag ist halber Feiertag und laut Arbeitsmodell ein Arbeitstag, dann ist sein Soll halbiert und der Zeitnachweis zeigt "½ Feiertag: {Name}"; ein Ferien-Eintrag an diesem Tag zählt als 0.5 Ferientag
- [ ] Angenommen ein ganzer Feiertag wird neu erfasst, an dem schon Ferien eingetragen sind, dann zählt der Tag nicht mehr als Ferientag (Hinweis "Ferien an einem Tag ohne Soll"), der Feriensaldo steigt entsprechend
- [ ] Angenommen Ferien werden über einen gepflegten Feiertag erfasst, dann wird er wie bisher übersprungen

**Fehler**
- [ ] Angenommen das Speichern schlägt fehl, dann erscheint eine verständliche Meldung und die Eingaben bleiben erhalten

## Edge Cases
- **Vergangenes Jahr übernehmen und ändern**: Gleitzeit- und Feriensaldo aller Folgemonate ändern sich rückwirkend — vor dem Übernehmen eines vergangenen Jahres erscheint ein Hinweis
- **Feiertag fällt auf einen freien Tag oder ein Wochenende**: kein zusätzlicher Effekt (wie bisher)
- **Halber Feiertag + halber Ferientag am selben Tag**: Soll halbiert durch den Feiertag; die Ferien zählen 0.5 und das verbleibende Soll ist 0
- **Krankheit an einem halben Feiertag**: Soll (halbiert) gilt als erfüllt
- **Jahr ohne Feiertage gepflegt** (alle entfernt): erlaubt, mit Hinweis
- **Zwei Freigeber pflegen gleichzeitig**: Last-Write-Wins; doppelte Daten werden verhindert bzw. zählen einmal
- **Feiertag mit gleichem Datum wie ein anderer** (z.B. Auffahrt und 1. Mai fallen zusammen): nur einer pro Datum

## Technical Requirements (optional)
- Security: nur Freigeber, serverseitig auf Seiten- und Aktionsebene
- Die Regel "welche Tage sind Feiertage" bleibt an einer Stelle; Zeitnachweis, Ferien, Übersicht und später das PDF (PROJ-16) nutzen sie gemeinsam
- Performance: Feiertage werden pro Aufruf einmal geladen, nicht pro Tag

## Open Questions
- [ ] Gehören der 1. Mai oder Fronleichnam bei OBSI Hofer dazu? — mit diesem Feature vom Freigeber selbst pflegbar
- [ ] Soll der automatische Vorschlag später um weitere Tage erweitert werden (z.B. Heiligabend halb)? (vorerst: die 9 bisherigen)
- [ ] Nutzer: Tabellen "Feiertagsjahr" und "Feiertag" mit Rechten in Dataverse anlegen (Spalten siehe Tech Design B)

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Automatischer Vorschlag pro Jahr, im Tool übernehmen und frei anpassen | Keine Pflege nötig, solange die Standardliste passt; betriebliche Tage trotzdem möglich (Nutzer-Entscheidung) | 2026-10-27 |
| Halbe Feiertage: Soll halbiert, Ferien an diesem Tag 0.5 | Heiligabend/Silvester nachmittags frei sind üblich (Nutzer-Entscheidung) | 2026-10-27 |
| Gepflegte Liste gilt erst nach "Jahr übernehmen"; bis dahin der Vorschlag | Vergangene Jahre ändern sich nicht ungewollt (Nutzer-Entscheidung) | 2026-10-27 |
| Eigener Reiter "Feiertage" unter Zeiterfassung | Feiertage gelten für alle Personen; passt neben Ferien | 2026-10-27 |
| Eine Liste für die ganze Firma, höchstens ein Feiertag pro Datum | Einfach und eindeutig; keine Standort-/Personen-Regeln nötig | 2026-10-27 |

### Technical Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Zwei Dataverse-Tabellen "Feiertagsjahr" (Jahr, alternativer Schlüssel) und "Feiertag" (Name, Datum, Halber Tag, Verweis mit Löschweitergabe) | Ein übernommenes Jahr bleibt gepflegt, auch leer; Zurücksetzen = ein Löschvorgang | 2026-10-27 |
| Nicht übernommene Jahre rechnen mit dem berechneten Vorschlag (bisherige Regel) | Keine Pflege nötig; Vergangenheit unverändert | 2026-10-27 |
| Feiertagskalender wird einmal pro Seitenaufruf geladen und als Parameter an die Rechenregeln übergeben | Regeln bleiben rein und testbar; eine Quelle für Zeitnachweis, Ferien, Übersicht, PDF | 2026-10-27 |
| Halber Feiertag als Ja/Nein; halbes Soll, Ferien zählen 0.5 und decken das Rest-Soll | Spec kennt nur ganz/halb; gleiche Logik wie halber Ferientag | 2026-10-27 |
| Datum "Nur Datum", im Tool in Schweizer Zeit gerechnet | Gleiche Konvention wie die übrigen Datumsfelder (PROJ-14) | 2026-10-27 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Ausgangslage
- Die Feiertage stecken heute als feste Regel im Code: 9 Feiertage, bewegliche nach Ostern. Diese Regel wird an mehreren Stellen direkt aufgerufen:
  - Zeitnachweis (Soll, Grund);
  - Ferien (Ferientag, Vorschau, Zeiträume);
  - Übersicht.
- Halbe Feiertage kennt die Rechnung nicht.

### A) Bausteine
```
Zeiterfassung (Unterseiten-Leiste): Übersicht · Zeitnachweis · Personen · Ferien · Feiertage (neu)

/zeiterfassung/feiertage (nur Freigeber)
+-- Jahr wählen (Vor/Zurück, Standard: aktuelles Jahr; in der Adresse)
+-- Status: "automatischer Vorschlag" oder "gepflegt"
+-- Liste: Datum · Wochentag · Name · ganz/halb
+-- Vorschlag:  "Jahr übernehmen" (bei vergangenen Jahren mit Hinweis "rechnet bestehende Monate neu")
+-- Gepflegt:   "Feiertag hinzufügen" (Dialog: Datum, Name, halber Tag)
|               pro Zeile "bearbeiten" (Name, ganz/halb) und "entfernen" (Bestätigung)
|               "Auf Vorschlag zurücksetzen" (Bestätigung)
+-- Fehlermeldungen; Eingaben bleiben erhalten

Server (Freigeber-Prüfung, Prüfung der Eingaben)
+-- Feiertage eines Jahres laden (gepflegt oder Vorschlag)
+-- Jahr übernehmen · Feiertag hinzufügen/ändern/entfernen · Jahr zurücksetzen

Feiertagskalender (gemeinsame Regel, rein)
+-- "Welche Tage sind Feiertage, ganz oder halb?" für die Jahre eines Zeitraums:
    gepflegte Jahre aus Dataverse, übrige Jahre nach dem automatischen Vorschlag
+-- Zeitnachweis, Ferien, Übersicht und später das PDF erhalten den Kalender einmal pro Seitenaufruf
```

### B) Datenmodell (in Worten)
Zwei neue Dataverse-Tabellen, **vom Nutzer anzulegen**:

**"Feiertagsjahr"** — ein Datensatz pro übernommenem Jahr:
- Jahr (Primärspalte, Text, z.B. "2027"; alternativer Schlüssel, damit es jedes Jahr nur einmal gibt).
- Vorhanden heisst: Das Jahr ist gepflegt. Das gilt auch, wenn alle Feiertage entfernt wurden.

**"Feiertag"** — ein Datensatz pro Feiertag eines gepflegten Jahres:
- Name (Primärspalte, Text, z.B. "Heiligabend")
- Datum (Datum, "Nur Datum"; das Tool rechnet in Schweizer Zeit wie bei den übrigen Datumsfeldern)
- Halber Tag (Ja/Nein, Standard Nein)
- Feiertagsjahr (Verweis, Pflicht; Löschweitergabe "Alle weitergeben", damit das Zurücksetzen eines Jahres seine Feiertage mitlöscht)

**Rechte für den App-Benutzer "# OBSI Hofer Admin":** auf beiden Tabellen Lesen, Erstellen, Schreiben, Löschen, Anfügen, Anfügen an.

**Regeln:**
- **Übernehmen:** Das Tool legt das Feiertagsjahr an und speichert die 9 Feiertage des Vorschlags als Datensätze.
- **Höchstens ein Feiertag pro Datum:** vom Tool geprüft.
- **Datum im gewählten Jahr:** Pflicht.
- **Zurücksetzen:** Das Feiertagsjahr wird gelöscht; seine Feiertage löscht Dataverse mit.

**Wirkung in der Rechnung:**
- **Ganzer Feiertag:** Soll 0 (wie bisher).
- **Halber Feiertag:** halbes Soll, Anzeige "½ Feiertag". Ferien an diesem Tag zählen 0.5 und decken das verbleibende halbe Soll.
- Gilt gleich in Zeitnachweis, Ferien und Übersicht.

### C) Technische Entscheidungen (Begründung)
- **Dataverse-Tabellen statt Datei oder Code:**
  - wie alle Daten des Tools (keine eigene Datenbank);
  - für alle Freigeber gleich;
  - Dataverse führt "geändert von/am".
- **Eigene Tabelle "Feiertagsjahr":** Ein übernommenes Jahr bleibt gepflegt, auch wenn alle Feiertage entfernt sind. Das Zurücksetzen ist ein einziger Löschvorgang.
- **Vorschlag weiterhin berechnet:** Nicht übernommene Jahre, Vergangenheit wie Zukunft, rechnen ohne Pflege wie bisher; die bestehende Regel bleibt der Vorschlag.
- **Feiertagskalender als Parameter statt globale Regel:** Die Rechenregeln bleiben rein und testbar. Pro Seitenaufruf wird einmal geladen, nicht pro Tag. Zeitnachweis, Ferien und Übersicht nutzen denselben Kalender.
- **Halber Feiertag als Ja/Nein** statt Stunden: Die Spec kennt nur ganz und halb, gleiche Logik wie beim halben Ferientag.
- **Hinweis vor dem Übernehmen vergangener Jahre:** Das Übernehmen selbst ändert nichts an den Zahlen. Erst spätere Änderungen wirken rückwirkend; der Freigeber soll das wissen.

### D) Abhängigkeiten (Pakete)
Keine neuen Pakete.

### E) Tests
- **Kalender:**
  - Vorschlag für nicht gepflegte Jahre, gepflegte Liste für gepflegte Jahre;
  - Zeitraum über zwei Jahre, eines gepflegt und eines nicht;
  - leeres gepflegtes Jahr.
- **Rechnung:**
  - halber Feiertag (Soll halbiert), halber Feiertag + Ferien (0.5, Rest-Soll 0), halber Feiertag + Krankheit;
  - neuer Feiertag auf bestehendem Ferientag;
  - Ferien-Vorschau überspringt gepflegte Feiertage.
- **Aktionen:**
  - Bearbeiter abgelehnt; Übernehmen legt Jahr und 9 Feiertage an;
  - doppeltes Datum, Datum ausserhalb des Jahres und leerer Name abgelehnt;
  - Zurücksetzen löscht das Jahr.
- **Komponenten:** Status Vorschlag/gepflegt, Dialoge, Bestätigungen, Hinweis bei vergangenem Jahr.
- **Manuell lokal:** 2027 übernehmen, Heiligabend halb ergänzen, Zeitnachweis Dezember prüfen, zurücksetzen.

### F) Vorgehen
1. Der Nutzer legt in Dataverse die Tabellen "Feiertagsjahr" und "Feiertag" mit Rechten an (Spalten siehe B).
2. Schema lesen (nur lesend) und in den Implementation Notes festhalten.
3. Bauen auf dem Branch `zeiterfassung`, nur lokal testen — kein Push auf `main`, kein Deploy bis zur Freigabe.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
