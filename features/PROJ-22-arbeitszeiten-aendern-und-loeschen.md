# PROJ-22: Arbeitszeiten im Zeitnachweis ändern und löschen

## Status: In Progress
**Created:** 2026-11-21
**Last Updated:** 2026-11-22

## Dependencies
- Requires: PROJ-13 (Zeitnachweis für Freigeber) — dort wird geändert und gelöscht
- Requires: PROJ-1 (Rolle Freigeber)
- Betrifft: PROJ-19 (der tägliche SharePoint-Flow des Nutzers schreibt dieselben Einträge und muss geschützte Einträge auslassen), PROJ-15 (Abwesenheiten löschen), PROJ-16 (PDF), PROJ-17 (Übersicht), PROJ-20 (Anzeige „korrigiert“ für Mitarbeitende), PROJ-21 (Korrektur-Anfragen werden hier erledigt; Link der Teams-Karte)
- **Extern (Nutzer):** täglichen SharePoint-Flow anpassen, damit er im Tool korrigierte und im Tool gelöschte Einträge auslässt
- **Reihenfolge:** PROJ-20 und PROJ-21 gehen vor PROJ-22 live (Nutzer-Entscheid 2026-11-21); bis dahin wird direkt in der Dataverse-Tabelle korrigiert

## Ausgangslage
Der Zeitnachweis für Freigeber kann heute nur Einträge hinzufügen („Tag erfassen“), bei offenen Einträgen „Gehen“ nachtragen und Abwesenheiten löschen. Falsch erfasste Arbeitszeiten lassen sich weder ändern noch löschen — weder bei der normalen Pflege noch beim Erledigen einer Korrektur-Anfrage (PROJ-21, QA BUG-1). Die meisten Einträge stammen aus SharePoint und werden vom täglichen Flow übernommen; eine Korrektur in Dataverse darf dabei nicht verloren gehen.

## User Stories
- Als Freigeber möchte ich Kommen und Gehen eines falsch erfassten Arbeitszeit-Eintrags ändern, damit Ist und Gleitzeit stimmen.
- Als Freigeber möchte ich einen falschen Eintrag (Arbeitszeit oder Abwesenheit) löschen, damit er nicht mehr zählt.
- Als Vorgesetzter mit Rolle Freigeber möchte ich eine Korrektur-Anfrage direkt im Zeitnachweis erledigen, auf den der Link in Teams führt.
- Als Freigeber möchte ich sehen, wer wann was korrigiert oder gelöscht hat, damit Änderungen nachvollziehbar bleiben.
- Als Freigeber möchte ich mich darauf verlassen, dass der tägliche SharePoint-Flow eine Korrektur nicht wieder überschreibt.
- Als Mitarbeitender möchte ich in „Mein Zeitnachweis“ sehen, dass ein Eintrag korrigiert wurde.

## Out of Scope
- Ändern durch Bearbeiter oder Mitarbeitende — nur Freigeber
- Ändern von Datum, Person, Art des Eintrags, Mittag-/Abendessen — dafür löschen und mit „Tag erfassen“ neu erfassen
- „Gehen am Folgetag“ (über Mitternacht) beim Ändern (Nutzer-Entscheid: nicht nötig)
- Wiederherstellen gelöschter Einträge — bei Bedarf neu erfassen
- Eigene Änderungshistorie mit allen Versionen — nur letzte Korrektur mit vorherigen Zeiten
- Sperre abgeschlossener Monate
- Zurückschreiben der Korrektur nach SharePoint
- Status einer Korrektur-Anfrage im Tool setzen (bleibt in Teams, PROJ-21)
- Sperre bei gleichzeitigem Bearbeiten — die letzte Speicherung gilt

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

**Ändern**
- [ ] Angenommen ein Freigeber sieht den Zeitnachweis einer Person, wenn er ein Zeitpaar in der Spalte „Zeiten“ anklickt bzw. antippt, dann öffnet sich der Dialog „Eintrag bearbeiten“ mit Kommen, Gehen, optionaler Bemerkung sowie „Speichern“ und „Löschen“
- [ ] Angenommen der Freigeber ändert Kommen und/oder Gehen gültig, wenn er speichert, dann wird der Eintrag geändert, Ist/Soll/Gleitzeit werden neu berechnet und der Eintrag gilt als „im Tool korrigiert“
- [ ] Angenommen der Eintrag ist offen (ohne Gehen), wenn der Freigeber ihn anklickt, dann kann er im selben Dialog das Gehen nachtragen (ersetzt „Gehen nachtragen“); das Gehen darf leer bleiben
- [ ] Angenommen der Eintrag hat ein Gehen, wenn der Freigeber das Gehen leert, dann erscheint eine Fehlermeldung und nichts wird gespeichert
- [ ] Angenommen Gehen liegt nicht nach Kommen, die Dauer übersteigt 14 Stunden, eine Zeit liegt in der Zukunft oder das Paar überschneidet sich mit einem anderen Arbeitszeit-Eintrag des Tages, wenn der Freigeber speichert, dann erscheint eine passende Fehlermeldung, nichts wird gespeichert und die Eingaben bleiben im Dialog erhalten
- [ ] Angenommen der Freigeber gibt eine Bemerkung ein, wenn er speichert, dann erscheint sie beim Tag in „Bemerkung / Hinweise“

**Löschen**
- [ ] Angenommen der Freigeber wählt im Dialog „Löschen“ oder bei einer Abwesenheit das ×, dann erscheint eine Bestätigung, und erst danach wird gelöscht
- [ ] Angenommen der Eintrag stammt aus SharePoint, wenn er gelöscht wird, dann wird er als „im Tool gelöscht“ markiert statt entfernt: Er zählt nirgends mehr (Ist, Gleitzeit, Ferien, Übersicht, PDF) und erscheint nicht in „Mein Zeitnachweis“
- [ ] Angenommen der Eintrag wurde im Tool erfasst (ohne SharePoint-Herkunft), wenn er gelöscht wird, dann wird er endgültig entfernt (wie heute bei Abwesenheiten)

**Nachvollziehbarkeit**
- [ ] Angenommen ein Eintrag wurde im Tool geändert, dann sehen Freigeber beim Tag z.B. „korrigiert 21.11. von Robert Bienz (vorher 07:30–16:30)“
- [ ] Angenommen ein Eintrag aus SharePoint wurde im Tool gelöscht, dann sehen Freigeber ihn durchgestrichen mit z.B. „gelöscht 21.11. von Robert Bienz“
- [ ] Angenommen ein Eintrag wurde korrigiert, dann sieht die Person in „Mein Zeitnachweis“ beim Tag nur „korrigiert“, ohne Namen und alte Zeiten
- [ ] Angenommen ein Eintrag wurde mehrfach korrigiert, dann zeigt die Markierung die letzte Korrektur und als „vorher“ die Zeiten vor dieser Korrektur

**Schutz vor dem SharePoint-Flow**
- [ ] Angenommen ein Eintrag ist im Tool korrigiert oder gelöscht, wenn die Person den zugehörigen SharePoint-Eintrag später ändert, dann übernimmt der tägliche Flow diese Änderung nicht, und die Korrektur bleibt bestehen (Flow-Anpassung durch den Nutzer)

**Berechtigung**
- [ ] Angenommen jemand ohne Rolle Freigeber ruft Ändern oder Löschen auf (auch direkt, ohne Oberfläche), dann wird es abgelehnt und nichts geändert

## Edge Cases
- **Eintrag über Mitternacht** (bestehend, aus SharePoint): Beim Ändern gilt Gehen am selben Tag; soll er über Mitternacht bleiben, wird er gelöscht und neu erfasst bzw. in SharePoint belassen
- **Eintrag wurde inzwischen gelöscht oder geändert** (anderer Freigeber, Flow): Meldung „Diesen Eintrag gibt es nicht mehr. Bitte die Seite neu laden.“ bzw. die letzte Speicherung gilt
- **Korrektur ergibt Überschneidung** mit einem anderen Eintrag: abgelehnt; erst den anderen Eintrag ändern oder löschen
- **Freigeber korrigiert eigene Einträge:** erlaubt, mit Markierung wie bei allen
- **Ältere Monate:** ohne Sperre änderbar; Saldo der Folgemonate ändert sich entsprechend
- **Gelöschte Abwesenheit aus SharePoint** (Ferien/Krankheit): zählt nicht mehr für Ferien und Soll
- **Tagestotal / Monatstotal aus dem Flow:** werden nach der Änderung wie bei den bestehenden Korrekturen neu angestossen
- **Dataverse nicht erreichbar:** Fehlermeldung im Dialog, Eingaben bleiben erhalten

## Technical Requirements (optional)
- Sicherheit: Rolle Freigeber wird serverseitig bei jeder Änderung geprüft
- Datenschutz: Name des Korrigierenden und frühere Zeiten nur für Freigeber sichtbar
- Bedienbar auf dem Handy (Antippen eines Zeitpaars)

## Open Questions
- [ ] Ist das Auditing von Dataverse für die Zeiteinträge eingeschaltet (zusätzliche Nachvollziehbarkeit beim endgültigen Löschen)? (Nutzer)
- [x] Woran erkennt der Flow geschützte Einträge, und wie wird er angepasst? → „Im Tool geändert am“ gefüllt; ganze SharePoint-Zeile auslassen, auch beim Löschen (Tech Design E; Anpassung durch den Nutzer)
- [x] Wie werden die Markierungen in Dataverse abgelegt? → vier neue Spalten auf `bmvcc_timetrackingentry` (Tech Design B; vom Nutzer anzulegen)
- [x] Logische Namen der vier neuen Spalten → `bmvcc_imtoolgeandertam`, `bmvcc_imtoolgeandertvon`, `bmvcc_imtoolgeloscht`, `bmvcc_zeitenvorher` (angelegt und geprüft 2026-11-22)

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Im Tool korrigierte Einträge sind vor dem SharePoint-Flow geschützt | Keine Korrektur darf unbemerkt verloren gehen; die Korrektur im Tool ist verbindlich (Nutzer-Entscheid) | 2026-11-21 |
| Änderbar: Kommen, Gehen, Bemerkung; löschbar: jeder Eintrag | Deckt falsche Zeiten und falsche Einträge ab; Art/Datum über Löschen + „Tag erfassen“ (Nutzer-Entscheid) | 2026-11-21 |
| Nur Freigeber | Nur Freigeber sehen Zeitnachweise aller Personen; Manager, die Anfragen erledigen, brauchen die Rolle Freigeber (Nutzer-Entscheid) | 2026-11-21 |
| Keine Sperre abgeschlossener Monate | Wie „Tag erfassen“ und „Gehen nachtragen“; Korrekturen auch nach dem Monatsabschluss nötig; Änderungen nachvollziehbar (Nutzer-Entscheid) | 2026-11-21 |
| Markierung „korrigiert … von … (vorher …)“ für Freigeber, nur „korrigiert“ für Mitarbeitende | Nachvollziehbar ohne eigene Historie; Mitarbeitende sehen, dass etwas geändert wurde (Nutzer-Entscheid) | 2026-11-21 |
| Einträge aus SharePoint werden beim Löschen markiert statt entfernt, im Tool erfasste endgültig gelöscht | Sonst legt der Flow gelöschte Einträge wieder an; Löschen bleibt nachvollziehbar (Nutzer-Entscheid) | 2026-11-21 |
| Gleiche Prüfungen wie „Tag erfassen“; Gehen nur leer, wenn es vorher leer war | Einheitliche Regeln im Tool (Nutzer-Entscheid) | 2026-11-21 |
| Kein „Gehen am Folgetag“ beim Ändern | Nicht nötig (Nutzer-Entscheid) | 2026-11-21 |
| Ein Dialog „Eintrag bearbeiten“ pro Zeitpaar, ersetzt „Gehen nachtragen“; × bei Abwesenheiten bleibt | Ein Weg für alle Korrekturen, auch auf dem Handy (Nutzer-Entscheid) | 2026-11-21 |
| PROJ-20/21 gehen vor PROJ-22 live | Mitarbeitende können sofort anfragen; bis PROJ-22 wird direkt in Dataverse korrigiert (Nutzer-Entscheid) | 2026-11-21 |

### Technical Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Markierung in vier neuen Spalten direkt auf dem Zeiteintrag (geändert am/von, gelöscht, Zeiten vorher) statt eigener Historien-Tabelle | Nur die letzte Korrektur ist gefordert; der Flow prüft eine Spalte am selben Datensatz, ohne Zusatzabfrage auf eine zweite Tabelle | 2026-11-22 |
| Schutzmerkmal = „Im Tool geändert am“ gefüllt (gilt für Korrektur und Löschung) | Eine einzige, einfache Bedingung im Flow | 2026-11-22 |
| Flow lässt die ganze SharePoint-Zeile aus, sobald einer ihrer Einträge geschützt ist | Eine Zeile ergibt bis zu zwei Einträge (Pause); teilweises Ersetzen erzeugt doppelte/widersprüchliche Zeiten | 2026-11-22 |
| Gelöschte Einträge werden standardmässig schon in der Dataverse-Abfrage ausgeblendet; nur der Freigeber-Zeitnachweis holt sie ausdrücklich | Kein Bericht (Ist, Ferien, Übersicht, PDF, Überschneidungsprüfung) kann sie versehentlich mitzählen | 2026-11-22 |
| Server-Aktionen statt API-Routen, Rolle Freigeber in jeder Aktion geprüft | Wie die bestehenden Korrekturen in PROJ-13/15 | 2026-11-22 |
| Prüfregeln (Überschneidung, 14 h, Zukunft) gemeinsam mit „Tag erfassen“ | Gleiche Regeln im ganzen Tool (Produkt-Entscheid) ohne doppelte Logik | 2026-11-22 |
| Abgleich-Hinweis zum Flow-Total an Tagen mit gelöschtem Eintrag ausgeblendet; Totals-Flow muss nicht angepasst werden | Der Flow kennt die Markierung nicht; das Tool rechnet das Ist selbst | 2026-11-22 |
| Name und frühere Zeiten werden für Mein Zeitnachweis und PDF nicht geladen | Datenschutz: nur Freigeber sehen sie | 2026-11-22 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Überblick
Kein neues Paket, keine neue Seite. Neu sind vier Spalten auf den Zeiteinträgen in Dataverse, zwei Server-Aktionen („Eintrag ändern“, „Eintrag löschen“) und der Dialog „Eintrag bearbeiten“ im bestehenden Zeitnachweis für Freigeber. Ausserdem muss der Nutzer seinen SharePoint-Flow so anpassen, dass er geschützte Einträge auslässt.

### A) Oberfläche

```
Zeitnachweis (Freigeber, /zeiterfassung/zeitnachweis) — bestehend
+-- Hinweis „offene Einträge“ oben
|   +-- je offener Eintrag: öffnet jetzt „Eintrag bearbeiten“ (statt „Gehen nachtragen“)
+-- Tabelle, Spalte „Zeiten“
|   +-- jedes Zeitpaar ist ein Knopf (Klicken bzw. Antippen auf dem Handy)
|   |   +-- Dialog „Eintrag bearbeiten“ (neu, ersetzt „Gehen nachtragen“)
|   |       +-- Kopf: Person, Wochentag + Datum
|   |       +-- Kommen (Pflicht), Gehen (leer nur, wenn vorher leer), Bemerkung (optional, max. 500)
|   |       +-- Fehlermeldung im Dialog, Eingaben bleiben erhalten
|   |       +-- Knöpfe: Löschen (links) · Abbrechen · Speichern
|   |       +-- Löschen → Bestätigung („Eintrag 07:30–16:30 vom 21.11. löschen?“)
|   +-- im Tool gelöschte Einträge: durchgestrichen, nicht anklickbar
+-- Abwesenheiten: × bleibt (mit der bestehenden Bestätigung), löscht künftig nach denselben Regeln
+-- Spalte „Bemerkung / Hinweise“
    +-- „korrigiert 21.11. von Robert Bienz (vorher 07:30–16:30)“
    +-- „gelöscht 21.11. von Robert Bienz“

Mein Zeitnachweis (Mitarbeitende) — bestehend
+-- Spalte „Bemerkung / Hinweise“: nur „korrigiert“
+-- im Tool gelöschte Einträge erscheinen gar nicht

PDF (Freigeber und Mitarbeitende)
+-- gelöschte Einträge fehlen; bei korrigierten steht „korrigiert“ (ohne Namen)
```

Alles aus vorhandenen shadcn-Bausteinen (Dialog, AlertDialog, Input, Textarea, Button). Der Dialog übernimmt das Muster von „Gehen nachtragen“ und „Tag erfassen“. Die Komponente „Gehen nachtragen“ entfällt.

### B) Daten (Dataverse, Tabelle Zeiterfassung `bmvcc_timetrackingentry`)

Vier neue Spalten, vom Nutzer angelegt (2026-11-22):

| Spalte | Logischer Name | Typ | Inhalt |
|---|---|---|---|
| Im Tool geändert am | `bmvcc_imtoolgeandertam` | Datum und Uhrzeit (Benutzerlokal) | Zeitpunkt der letzten Korrektur bzw. der Löschung. **Ist das Feld gefüllt, gilt der Eintrag als geschützt** (das prüft der Flow) |
| Im Tool geändert von | `bmvcc_imtoolgeandertvon` | Text (100) | Name des Freigebers |
| Im Tool gelöscht | `bmvcc_imtoolgeloscht` | Ja/Nein (Standard Nein) | Eintrag zählt nicht mehr |
| Zeiten vorher | `bmvcc_zeitenvorher` | Text (50) | z.B. „07:30–16:30“ bzw. „07:30–offen“, Stand vor der letzten Korrektur |

**Geprüft 2026-11-22:** alle vier auf `bmvcc_timetrackingentry`, optional, Typen und Längen wie oben, vom App-Benutzer lesbar. Bestehende Einträge haben „Im Tool gelöscht“ leer (nicht Nein). Der Filter „gelöscht ungleich Ja“ liefert trotzdem alle 2'455 Einträge, leere Werte zählen also als nicht gelöscht. Eine zuerst versehentlich in ZeiterfassungPerson angelegte Kopie der Spalten ist wieder entfernt.

Was gespeichert wird:
- **Ändern:** Kommen und Gehen werden wie bei der Erfassungs-App jeweils doppelt geschrieben (Kommen/Arbeitsbeginn, Gehen/Checkout). Die Kennung JJJJMMTTHHMM wird aus dem neuen Kommen gebildet. Dazu kommen die Bemerkung und die vier Spalten. „Zeiten vorher“ wird bei jeder Korrektur überschrieben, es zählt also nur die letzte Korrektur.
- **Löschen eines Eintrags mit SharePoint-ID** (`bmvcc_recordid` gefüllt): Der Eintrag bleibt in Dataverse. Gesetzt werden „Im Tool gelöscht“, „geändert am“ und „geändert von“.
- **Löschen eines im Tool erfassten Eintrags** (ohne SharePoint-ID): Der Eintrag wird endgültig gelöscht, wie heute.
- Datum, Person, Art und Essen bleiben unverändert.

### C) Wo gelöschte Einträge ausgeblendet werden
Die Lesefunktionen für Zeiteinträge lassen im Tool gelöschte Einträge **standardmässig weg**, und zwar schon bei der Abfrage in Dataverse. Das gilt für Zeitnachweis, Mein Zeitnachweis, PDF, Übersicht, Ferien und Feriensaldo, die Personenliste, den ersten Eintrag einer Person und die Prüfung auf Überschneidungen bei „Tag erfassen“ und Ferien. Nur der Zeitnachweis für Freigeber fragt sie ausdrücklich mit ab, um sie durchgestrichen zu zeigen. Dort werden sie vor jeder Berechnung aussortiert. So kann kein bestehender Bericht einen gelöschten Eintrag versehentlich mitzählen.

### D) Server-Aktionen

| Aktion | Prüfungen (alle auf dem Server) |
|---|---|
| Eintrag ändern (Eintrags-ID, Kommen, Gehen, Bemerkung) | Rolle Freigeber; Eintrag frisch aus Dataverse lesen: existiert, ist nicht gelöscht, ist eine Arbeitszeit; Uhrzeiten HH:MM; Gehen nach Kommen, höchstens 14 h, nicht in der Zukunft; Gehen leer nur, wenn es vorher leer war; keine Überschneidung mit den übrigen (nicht gelöschten) Arbeitszeit-Einträgen des Tages; Bemerkung höchstens 500 Zeichen |
| Eintrag löschen (Eintrags-ID) | Rolle Freigeber; Eintrag existiert und ist nicht schon gelöscht; danach je nach SharePoint-ID markieren oder endgültig löschen |
| × bei Abwesenheiten (bestehend) | wie heute, aber Einträge mit SharePoint-ID werden markiert statt gelöscht |

Danach wird der Zeitnachweis neu geladen. Ist ein Eintrag inzwischen verschwunden, erscheint die Meldung „Diesen Eintrag gibt es nicht mehr. Bitte die Seite neu laden.“ Die Prüfregeln (Überschneidung, 14 h, Zukunft) werden mit „Tag erfassen“ geteilt, damit beide gleich prüfen.

### E) Schutz vor dem SharePoint-Flow (Anpassung durch den Nutzer)
Der Flow „SharePoint-Element erstellt oder geändert“ ersetzt heute alle Einträge mit derselben SharePoint-ID (`bmvcc_recordid`). Neu gilt:
1. Vor dem Ersetzen listet der Flow die Einträge mit dieser SharePoint-ID, bei denen **„Im Tool geändert am“ gefüllt** ist.
2. Gibt es mindestens einen solchen Eintrag, lässt der Flow die **ganze Zeile** aus und ändert nichts. Eine Zeile kann wegen der Pause zwei Einträge haben. Würde er nur den ungeschützten neu schreiben, entstünden doppelte oder widersprüchliche Zeiten.
3. Der Flow „SharePoint-Element gelöscht“ lässt geschützte Einträge ebenfalls stehen.

Folge: Ändert die Person die SharePoint-Zeile später nochmals, gilt weiter die Korrektur im Tool. Soll SharePoint wieder massgeblich sein, löscht ein Freigeber den Eintrag im Tool und erfasst ihn neu.

### F) Tages- und Monatstotal (bestehender Totals-Flow)
Der Totals-Flow kennt „Im Tool gelöscht“ nicht und rechnet einen markierten Eintrag weiter mit. Das Tool rechnet das Ist ohnehin selbst. An Tagen mit einem gelöschten Eintrag blendet es deshalb den Abgleich-Hinweis zum Flow-Total aus, damit keine falsche Warnung erscheint. Nach einer Korrektur stösst das Tool den Totals-Flow wie bisher an. Auf Wunsch kann der Nutzer den Totals-Flow so anpassen, dass er gelöschte Einträge überspringt. Nötig ist das nicht.

### G) Anzeige der Markierung
- Freigeber sehen „korrigiert dd.mm. von Name (vorher …)“ bzw. „gelöscht dd.mm. von Name“.
- Mein Zeitnachweis und PDF zeigen nur „korrigiert“. Name und frühere Zeiten werden für Mitarbeitende gar nicht erst geladen.
- Die Teams-Karte aus PROJ-21: Nach dem Go-live ändert der Nutzer den Text „Korrektur bitte direkt in Dataverse …“ zu „Korrektur im Zeitnachweis (Link) vornehmen“.

### H) Abhängigkeiten
Keine neuen Pakete.

### I) Vor /backend (Nutzer)
1. ~~Die vier Spalten in `bmvcc_timetrackingentry` anlegen~~ — erledigt und geprüft 2026-11-22 (siehe B).
2. App-Benutzer: Schreiben und Löschen auf `bmvcc_timetrackingentry` (sind vorhanden seit PROJ-13/19, beim Bau prüfen).
3. Die SharePoint-Flows anpassen (E), am besten vor dem Go-live. Bis dahin können Korrekturen beim nächsten Ändern der SharePoint-Zeile überschrieben werden.

## Implementation Notes (Frontend, 2026-11-22)
Branch `proj-22-eintraege-bearbeiten`. Die Server-Aktionen sind mitgebaut. Ihre Tests folgen in /backend.

- **Dialog** `EintragBearbeiten` (`src/components/eintrag-bearbeiten.tsx`):
  - Auslöser ist das Zeitpaar selbst (gepunktet unterstrichen, Bildschirmleser: „Eintrag 07:30–16:30 vom 02.11.2026 bearbeiten“).
  - Felder: Kommen, Gehen (optional nur bei offenem Eintrag), Bemerkung (max. 500).
  - „Löschen“ wechselt im selben Dialog zu einer Bestätigung („Eintrag löschen?“). Es gibt keinen zweiten, verschachtelten Dialog, das ist auf dem Handy stabiler.
  - Bei einem Eintrag über Mitternacht weist der Dialog darauf hin, dass Gehen beim Speichern am selben Tag gilt.
  - Fehler erscheinen im Dialog, die Eingaben bleiben erhalten. Doppelklick-Schutz.
- **Zeitnachweis** (`zeitnachweis-ansicht.tsx`):
  - Jedes Zeitpaar öffnet den Dialog, auch die offenen Einträge im Hinweis oben.
  - Das × an Zeitpaaren und „nachtragen“ entfallen.
  - Das × bei Abwesenheiten bleibt; der Bestätigungstext lautet jetzt „… wird gelöscht und zählt danach nicht mehr“.
  - Gelöschte Einträge stehen durchgestrichen und grau in der Spalte „Zeiten“ (nur Freigeber, nicht anklickbar).
  - Markierungen in „Bemerkung / Hinweise“:
    - für Freigeber z.B. „korrigiert 21.11. von Robert Bienz (vorher 07:30–16:30)“ bzw. „17:00–19:00 gelöscht 21.11. von Robert Bienz“. Abweichend vom Spec-Beispiel steht beim Löschen das Zeitpaar dabei, damit klar ist, welcher Eintrag gemeint ist.
    - für Mitarbeitende nur „korrigiert“.
- **PDF:** In der Spalte Bemerkung steht bei korrigierten Einträgen „korrigiert“ (ohne Namen). Gelöschte Einträge fehlen.
- **Rechnen:**
  - `werteTagAus` trennt gelöschte Einträge ab: Sie zählen nicht und werden in `geloeschte` nur zur Anzeige mitgegeben.
  - Ferientage und Feriensaldo rechnen nur mit nicht gelöschten Einträgen.
  - Der Abgleich mit dem Flow-Total entfällt an Tagen bzw. in Monaten mit gelöschtem Eintrag.
- **Dataverse** (`src/lib/dataverse/zeiterfassung.ts`):
  - Folgende Abfragen lassen gelöschte Einträge standardmässig weg (`bmvcc_imtoolgeloscht ne true`): `listZeiteintraege`, `listFerienUndKrankheit`, `listZeiterfassungEmails` (`$apply=filter(…)/groupby`, gegen Dataverse geprüft) und `ersterZeiteintrag`.
  - Option `mitGeloeschten` bzw. `mitKorrekturDetails` (Name, Zeiten vorher). Nur der Freigeber-Zeitnachweis nutzt sie. Mein Zeitnachweis und beide PDFs laden die Details nicht.
  - Neu: `korrigiereZeiteintrag` und `markiereAlsGeloescht`.
  - `getZeiteintragFuerKorrektur` liefert zusätzlich Bemerkung, SharePoint-ID und „gelöscht“.
- **Server-Aktionen** (`zeiterfassung/actions.ts`):
  - `aendereZeiteintragAction`:
    - prüft: Freigeber; Eintrag frisch gelesen, nicht gelöscht, Arbeitszeit; Prüfregeln.
    - Ist nichts geändert, wird nichts gespeichert und nichts markiert.
  - `loescheAbwesenheitenAction`: markiert Einträge mit SharePoint-ID, löscht die übrigen endgültig, überspringt bereits gelöschte.
  - `trageGehenNachAction` und die Komponente `GehenNachtragen` sind entfernt.
- **Prüfregeln** `src/lib/zeiterfassung/eintrag-pruefung.ts` (rein, mit Tests): Dauer, 14 h, Zukunft, Überschneidung, Gehen nicht leeren. „Tag erfassen“ nutzt Dauer und Überschneidung jetzt ebenfalls daraus.
- **Tests:**
  - neu `eintrag-pruefung.test.ts` und 2 Ansichtstests (Freigeber- und Mitarbeiteranzeige).
  - angepasst: Ansichts- und Dataverse-Tests.
  - entfernt: Tests von „Gehen nachtragen“.
  - Stand: 801 Tests grün, `tsc` und `lint` sauber.

## Implementation Notes (Backend, 2026-11-22)
Die Server-Aktionen und der Dataverse-Zugriff sind mit dem Frontend gebaut (siehe oben). In diesem Schritt kamen die Tests dazu und eine Prüfung gegen das echte Dataverse.

- **`aendereZeiteintragAction`** (10 Tests):
  - Bearbeiter wird abgelehnt, ohne Dataverse-Zugriff.
  - Korrektur am Tag des Eintrags in Schweizer Zeit, mit Name des Freigebers und „vorher“.
  - Offenen Eintrag ergänzen oder offen lassen.
  - Ohne Änderung wird nichts gespeichert und nichts markiert.
  - Überschneidung nur mit den übrigen Arbeitszeit-Einträgen (nicht mit sich selbst, nicht mit Abwesenheiten).
  - Abgelehnt werden:
    - Gehen leeren
    - Gehen vor Kommen
    - mehr als 14 h
    - ungültige Uhrzeiten, Bemerkung über 500 Zeichen, ungültige ID
    - Zeiten in der Zukunft
    - andere Typen als Arbeitszeit
  - Gelöschter oder verschwundener Eintrag → „Diesen Eintrag gibt es nicht mehr …“.
  - Ein Speicherfehler gibt die Dataverse-Meldung zurück.
- **`loescheAbwesenheitenAction`** (+3 Tests):
  - Eintrag mit SharePoint-ID wird mit dem Namen des Freigebers markiert, nicht gelöscht.
  - Im Tool erfasster Eintrag wird endgültig gelöscht.
  - Bereits gelöschter Eintrag wird übersprungen.
  - Bearbeiter kann weder löschen noch markieren.
- **Dataverse-Zugriff** (+5 Tests):
  - Markierung lesen; Name und frühere Zeiten nur auf Anfrage.
  - Standardfilter „nicht gelöscht“.
  - `getZeiteintragFuerKorrektur` liefert SharePoint-ID, Bemerkung und „gelöscht“.
  - `korrigiereZeiteintrag` schreibt Kommen/Gehen doppelt, die Kennung und die Markierung.
  - `markiereAlsGeloescht` ändert die Zeiten nicht.
- **Rechnen und Anzeige** (+11 Tests):
  - Tagesauswertung: Gelöschte Einträge zählen nicht (auch nicht Essen, Bemerkung, Krankheit, Flow-Total), werden aber zur Anzeige mitgegeben.
  - Zeitnachweis: kein Ist, kein Ferientag, kein Flow-Abgleich; ein Monat nur mit gelöschten Einträgen gilt als leer.
  - `korrekturTexte`: Freigeber- und Mitarbeiterfassung, Datum in Schweizer Zeit.
  - PDF zeigt nur „korrigiert“.
- **Gegen Dataverse geprüft (2026-11-22)** mit einem Wegwerf-Eintrag (Test-Adresse, sofort wieder gelöscht, danach 0 Reste):
  - Der App-Benutzer darf anlegen, korrigieren (inkl. der vier neuen Spalten), markieren, lesen und löschen.
  - Der Filter `bmvcc_imtoolgeloscht ne true` blendet den markierten Eintrag aus.
- **Stand:** 834 Tests grün, `tsc` und `lint` sauber.
- **Kein Rate-Limit:** Nur Freigeber können ändern, wie bei den übrigen Korrekturen (PROJ-13/15).

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
