# PROJ-22: Arbeitszeiten im Zeitnachweis ändern und löschen

## Status: Deployed
**Created:** 2026-11-21
**Last Updated:** 2026-11-22

## Dependencies
- Requires: PROJ-13 (Zeitnachweis für Freigeber) — dort wird geändert und gelöscht
- Requires: PROJ-1 (Rolle Freigeber)
- Betrifft: PROJ-19 (der tägliche SharePoint-Flow des Nutzers schreibt dieselben Einträge und muss geschützte Einträge auslassen), PROJ-15 (Abwesenheiten löschen), PROJ-16 (PDF), PROJ-17 (Übersicht), PROJ-20 (Anzeige „korrigiert“ für Mitarbeitende), PROJ-21 (Korrektur-Anfragen werden hier erledigt; Link der Teams-Karte)
- **Extern (Nutzer):** täglichen SharePoint-Flow anpassen, damit er im Tool korrigierte und im Tool gelöschte Einträge auslässt — **erledigt und getestet 2026-11-22** (siehe Tech Design E)
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
- **Eintrag über Mitternacht:** Das Häkchen „Gehen am Folgetag“ ist bei solchen Einträgen vorbelegt; auch ein offener Nachteinsatz lässt sich damit abschliessen (QA BUG-1, 2026-11-22)
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
| ~~Kein „Gehen am Folgetag“ beim Ändern~~ → Häkchen „Gehen am Folgetag“ im Dialog | Ursprünglich nicht nötig; nach QA BUG-1 doch nötig, sonst lassen sich Einträge über Mitternacht nicht bearbeiten (Nutzer-Entscheid „bug-1 bis 3 fixen“) | 2026-11-22 |
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
3. ~~Der Flow „SharePoint-Element gelöscht“ lässt geschützte Einträge ebenfalls stehen.~~ Entfällt: Diesen Flow gibt es nicht (Nutzer, 2026-11-22). In SharePoint gelöschte Zeilen bleiben in Dataverse stehen und zählen weiter, wie schon vor PROJ-22. Ein Freigeber kann sie jetzt im Tool löschen.

**Umgesetzt und getestet (2026-11-22):** Der tägliche Flow „syncZeiterfassung“ fragt in der Schleife `alleNeuenRecords` nach „List rows“ mit einer neuen Aktion „Geschuetzt“ ab, ob es geschützte Einträge gibt. Sie sucht in derselben Tabelle mit `$filter = bmvcc_recordid eq <ID> and bmvcc_imtoolgeandertam ne null`, `$top 1`. Die anschliessende Bedingung „nicht geschuetzt“ prüft `empty(outputs('Geschuetzt')?['body/value'])` = true. Nur im True-Zweig laufen „bestehendeloeschen“ und der Switch, der False-Zweig ist leer. Test mit einem manuellen Lauf:
- SharePoint-ID 1566 (nicht korrigiert): Einträge ersetzt, neue Bemerkung übernommen ✓
- SharePoint-ID 1567 (im Tool korrigiert, danach in SharePoint geändert): Korrektur und Markierung bleiben, die SharePoint-Änderung wird nicht übernommen ✓

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
3. ~~Die SharePoint-Flows anpassen (E)~~ — erledigt und getestet 2026-11-22 (siehe E).

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

**Tested:** 2026-11-22
**App URL:** http://localhost:3000 (Branch `proj-22-eintraege-bearbeiten`)
**Tester:** QA Engineer (AI). Live-Schritte hat der Nutzer im Browser gemacht; den Microsoft-Login kann die AI nicht durchspielen.

**Geprüft auf drei Wegen:**
- **U:** Unit- bzw. Komponententest
- **L:** live durch den Nutzer (2026-11-22), Ergebnis von der AI direkt in Dataverse kontrolliert
- **D:** gegen das echte Dataverse mit einem Wegwerf-Eintrag (wieder entfernt)

### Acceptance Criteria Status

#### Ändern
- [x] AC-1: Klick auf ein Zeitpaar öffnet „Eintrag bearbeiten“ mit Kommen, Gehen, Bemerkung, Speichern und Löschen (U, L: Zeitpaar 07:10–12:04 am 09.11.)
- [x] AC-2: Eine gültige Änderung wird gespeichert, Ist/Gleitzeit rechnen neu, der Eintrag ist als „im Tool korrigiert“ markiert (U, L: SharePoint-ID 1567 mit Zeitpunkt, Name und „vorher 07:10–12:04“, D)
- [x] AC-3: Bei einem offenen Eintrag lässt sich Gehen im selben Dialog nachtragen oder leer lassen; ersetzt „Gehen nachtragen“, auch im Hinweis oben (U)
- [x] AC-4: Ein vorhandenes Gehen zu leeren wird abgelehnt, im Browser und auf dem Server (U)
- [x] AC-5: Gehen ≤ Kommen, über 14 h, Zukunft und Überschneidung werden abgelehnt, die Eingaben bleiben im Dialog (U)
- [x] AC-6: Die Bemerkung erscheint beim Tag (U, L)

#### Löschen
- [x] AC-7: „Löschen“ im Dialog und das × bei Abwesenheiten löschen erst nach Bestätigung; Abbrechen führt zurück (U)
- [x] AC-8: Ein Eintrag aus SharePoint wird markiert statt entfernt und zählt nirgends mehr: nicht in Ist, Gleitzeit, Ferien, Übersicht, PDF und Mein Zeitnachweis (U, D: Filter blendet den markierten Eintrag aus)
- [x] AC-9: Ein im Tool erfasster Eintrag wird endgültig gelöscht (U)

#### Nachvollziehbarkeit
- [x] AC-10: Freigeber sehen „korrigiert 21.11. von … (vorher …)“ (U, L)
- [x] AC-11: Freigeber sehen einen gelöschten Eintrag durchgestrichen mit „… gelöscht 21.11. von …“ (U)
- [x] AC-12: Mein Zeitnachweis und PDF zeigen nur „korrigiert“, ohne Namen und alte Zeiten; Name und Zeiten werden dafür gar nicht geladen (U)
- [x] AC-13: Bei mehreren Korrekturen gilt die letzte, „vorher“ zeigt den Stand vor dieser Korrektur (U). Siehe BUG-2 für reine Bemerkungsänderungen.

#### Schutz vor dem SharePoint-Flow
- [x] AC-14: Eine im Tool korrigierte Zeile wird vom täglichen Flow nicht überschrieben (L: 1567 behält „test schutz“, die SharePoint-Änderung wird nicht übernommen). Ungeschützte Zeilen ersetzt der Flow weiter normal (L: 1566).

#### Berechtigung
- [x] AC-15: Ohne Rolle Freigeber lehnen Ändern und Löschen ab, auch bei direktem Aufruf, ohne Dataverse-Zugriff (U). Ohne Sitzung leitet der Proxy schon vorher auf /login um, auch bei einer gefälschten Server-Action-Anfrage (E2E).

### Edge Cases Status
- [x] EC-1 Eintrag über Mitternacht: Der Dialog weist darauf hin, dass Gehen am selben Tag gilt; ein Speichern mit dem alten Gehen wird als „Gehen vor Kommen“ abgelehnt (U). Siehe BUG-1.
- [x] EC-2 Eintrag inzwischen gelöscht (endgültig oder im Tool): „Diesen Eintrag gibt es nicht mehr. Bitte die Seite neu laden.“ (U). Ein zweites Löschen desselben Eintrags wird übersprungen (U).
- [x] EC-3 Korrektur ergibt Überschneidung: abgelehnt (U)
- [x] EC-4 Freigeber korrigiert eigene Einträge: erlaubt, mit Markierung (L)
- [x] EC-5 Ältere Monate: keine Sperre (U, keine Datumsgrenze in der Aktion)
- [x] EC-6 Gelöschte Abwesenheit aus SharePoint: zählt nicht mehr für Ferien und Soll (U)
- [x] EC-7 Tages-/Monatstotal: Das Speichern stösst den Totals-Flow an; der Abgleich-Hinweis entfällt an Tagen und in Monaten mit gelöschtem Eintrag (U)
- [x] EC-8 Dataverse nicht erreichbar: Meldung im Dialog, Eingaben bleiben, keine Seitenaktualisierung (U)
- [x] Zusätzlich: Ohne Änderung wird nichts gespeichert und nichts markiert (U)
- [x] Zusätzlich: Ein Monat nur mit gelöschten Einträgen gilt als „keine Zeiteinträge“ (U)
- [x] Zusätzlich: Ein Netzwerkfehler beim Speichern zeigt eine Meldung statt eines Absturzes (U)

### Security Audit Results
- [x] Authentication: alle betroffenen Seiten und Aktionen nur mit Sitzung (E2E)
- [x] Authorization: Ändern und Löschen nur mit Rolle Freigeber, serverseitig geprüft, bevor Dataverse gelesen wird (U). Der Eintrag wird auf dem Server frisch gelesen; Tag und Person kommen nie aus dem Browser.
- [x] Datenschutz: Name des Korrigierenden und frühere Zeiten werden für Mein Zeitnachweis und beide PDFs nicht geladen (U)
- [x] Input-Validierung:
  - Zod prüft die GUID, HH:MM und die Bemerkung bis 500 Zeichen.
  - Name und „vorher“ werden auf die Spaltenlänge gekürzt.
  - Die OData-Filter enthalten keine Eingaben aus dem Browser.
- [x] XSS: Bemerkung, Name und Zeiten werden von React als Text ausgegeben (U mit `<img onerror>`)
- [x] Manipulierte Eingaben: Datum, Person, Art und Essen lassen sich nicht ändern, die Aktion nimmt diese Felder gar nicht entgegen.
- [ ] Rate-Limit: keines. Nur Freigeber, wie bei den übrigen Korrekturen (PROJ-13/15). Kein Bug, Bewertung Low wie in PROJ-21.

### Regression
- [x] Alle bestehenden Unit-Tests grün; die Tests für „Gehen nachtragen“ sind entfernt, die Funktion ist im Dialog aufgegangen.
- [x] „Tag erfassen“ nutzt jetzt die gemeinsamen Prüfregeln; die bestehenden Tests sind unverändert grün. Im Tool gelöschte Einträge blockieren das Neuerfassen nicht mehr.
- [x] Ferien, Feriensaldo, Übersicht, Personenliste und Korrektur-Anfrage (PROJ-15/17/14/21) lesen ohne gelöschte Einträge (U, Filter im Dataverse-Zugriff).
- [x] E2E: 52/52 grün, davon 3 neu (`tests/PROJ-22-arbeitszeiten-aendern-und-loeschen.spec.ts`).

### Nicht automatisiert geprüft (Nutzer vor dem Deploy)
- [ ] Löschen im Dialog einmal live: einen mit „Tag erfassen“ angelegten Test-Eintrag löschen (endgültig)
- [ ] Handy (375 px): Zeitpaar antippen, Dialog bedienen
- [ ] Firefox oder Safari: Zeitfelder im Dialog

### Bugs Found

#### BUG-1: Eintrag über Mitternacht: nur die Bemerkung ändern geht nicht — BEHOBEN 2026-11-22
- **Severity:** Low
- **Steps to Reproduce:**
  1. Einen Eintrag mit Gehen am Folgetag öffnen, z.B. 22:00–01:30 (+1).
  2. Nur die Bemerkung ändern und speichern.
  3. Expected: Die Bemerkung wird gespeichert.
  4. Actual: „„Gehen“ muss nach „Kommen“ liegen.“, weil Gehen beim Speichern am selben Tag gilt.
- **Hinweis:**
  - Das folgt aus dem Entscheid „kein Gehen am Folgetag“, und der Dialog weist darauf hin. Seit „Gehen nachtragen“ ersetzt ist, lässt sich ein offener Nachteinsatz im Tool nicht mehr über Mitternacht abschliessen.
  - Umweg: löschen und neu erfassen bzw. in SharePoint korrigieren.
- **Priority:** Nice to have

#### BUG-2: Nach einer reinen Bemerkungsänderung zeigt „vorher“ die unveränderten Zeiten — BEHOBEN 2026-11-22
- **Severity:** Low
- **Steps to Reproduce:**
  1. Bei einem Eintrag 07:10–12:04 nur die Bemerkung ändern.
  2. Expected: z.B. „korrigiert 22.11. von … (Bemerkung)“ oder ohne „vorher“.
  3. Actual: „korrigiert 22.11. von … (vorher 07:10–12:04)“, obwohl die Zeiten gleich sind. Live gesehen bei SharePoint-ID 1567.
- **Priority:** Nice to have

#### BUG-3: Eine Person, deren Einträge alle im Tool gelöscht sind, verschwindet aus der Auswahl — BEHOBEN 2026-11-22
- **Severity:** Low
- **Steps to Reproduce:**
  1. Bei einer Person, die nur SharePoint-Einträge hat, alle Einträge im Tool löschen.
  2. Expected: Die Person bleibt wählbar, die gelöschten Einträge sind durchgestrichen sichtbar.
  3. Actual: Die Personenliste kommt aus den nicht gelöschten Einträgen, deshalb fehlt die Person, sofern sie keine gespeicherten Stammdaten hat.
- **Hinweis:** In der Praxis kaum relevant, alle aktiven Personen haben Stammdaten bzw. laufende Einträge.
- **Priority:** Nice to have

#### Bekannte Einschränkung (kein Bug)
- Der Totals-Flow kennt die Lösch-Markierung nicht. `bmvcc_tagestotal`/`bmvcc_monatstotal` zählen markierte Einträge weiter mit; das Tool rechnet selbst und blendet den Abgleich dort aus (Tech Design F).
- In SharePoint gelöschte Zeilen bleiben in Dataverse, es gibt keinen Lösch-Flow (Tech Design E).

### Vor dem Deploy (Nutzer)
- Den Text der Teams-Karte aus PROJ-21 („Korrektur bitte direkt in Dataverse …“) ändern auf: „Korrektur im Zeitnachweis vornehmen (Link)“.
- Entscheiden, ob der Test-Eintrag SharePoint-ID 1567 korrigiert bleibt oder die Markierung entfernt wird.

### Summary
- **Acceptance Criteria:** 15/15 passed
- **Bugs Found:** 3 total (0 critical, 0 high, 0 medium, 3 low), alle behoben
- **Security:** Pass (kein Rate-Limit, Low, wie bisher)
- **Production Ready:** YES
- **Recommendation:** Deploy

### Bugfixes (2026-11-22)
- **BUG-1:**
  - Der Dialog hat das Häkchen „Gehen am Folgetag (nach Mitternacht)“. Es ist bei Einträgen über Mitternacht vorbelegt und ohne Gehen gesperrt.
  - Die Aktion nimmt `gehenAmFolgetag` entgegen. Die Prüfungen (14 h, Zukunft, Überschneidung) gelten unverändert.
  - Das Zeitpaar zeigt im Bildschirmleser-Text „(+1)“.
- **BUG-2:** Bleiben die Zeiten gleich, schreibt die Aktion „Zeiten vorher“ nicht. Ein älterer Wert bleibt stehen; ohne frühere Zeitkorrektur steht nur „korrigiert … von …“.
- **BUG-3:** Die Personenliste (`listZeiterfassungEmails`) zählt im Tool gelöschte Einträge wieder mit. Alle übrigen Abfragen blenden sie weiter aus.
- **Tests:**
  - +5 Unit-Tests: Aktion Folgetag; nur Bemerkung bei Nachteinsatz; „vorher“ bleibt; Dataverse ohne „Zeiten vorher“; 2 Dialogtests Folgetag.
  - 849/849 grün, `tsc` und `lint` sauber.

## Deployment
- **Deployed:** 2026-11-22 als Version 1.16.0 (Tag `v1.16.0-PROJ-22`), Merge von `proj-22-eintraege-bearbeiten` nach `main`, Vercel-Auto-Deploy
- **Production URL:** https://obsi-hofer-admin.vercel.app/zeiterfassung/zeitnachweis
- **Vor dem Deploy geprüft:** lint, 849 Unit-Tests, 52 E2E-Tests, `npm run build`; keine neuen Umgebungsvariablen
- **Dataverse:** vier Spalten auf `bmvcc_timetrackingentry` (angelegt und geprüft 2026-11-22)
- **Flow:** Schutz in „syncZeiterfassung“ aktiv und getestet (Tech Design E)
- **Nach dem Deploy (2026-11-22):**
  - Der Nutzer hat in Produktion getestet: Ändern, Löschen und Handy, alles ok.
  - Der Text der Teams-Karte aus PROJ-21 ist angepasst.
  - Beim Test-Eintrag mit der SharePoint-ID 1567 ist die Markierung per Skript entfernt; der tägliche Flow übernimmt ihn wieder aus SharePoint.
  - Patch 1.16.1 (`v1.16.1-PROJ-13`): Tage ohne Soll heissen „arbeitsfrei“ statt „frei“, damit sie vom löschbaren Eintrag „Frei“ unterscheidbar sind.
