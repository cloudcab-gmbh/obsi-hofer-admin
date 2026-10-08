# PROJ-10: Standort als Arbeitskontext

## Status: Deployed
**Created:** 2026-10-08
**Last Updated:** 2026-10-08

## Dependencies
- Requires: PROJ-3 (Geräte-Verwaltung) — Geräteliste, Firma-Auswahl auf `/start`, Filter-Session
- Requires: PROJ-4 (Prüfberichte-Verwaltung) — Prüfberichte-Übersicht bezieht sich künftig auf den Standort
- Requires: PROJ-7 (PDF-Export) — Dateiname, Titel und Archiv-Ablage berücksichtigen den Standort
- Dataverse: bestehende Beziehungen Firma → Standort (1:n) und Standort → Geräte (1:n) — keine Schemaänderung
- Folge-Features: PROJ-11 (Kundenportal-Zugang pro Standort) und PROJ-12 (Sync-Freigabe und -Verlauf pro Standort) bauen auf dem hier eingeführten "aktuellen Standort" auf

## User Stories
- Als Bearbeiter möchte ich nach der Firma auch den Standort wählen, damit ich bei Kunden mit mehreren Niederlassungen nur die Geräte des Standorts sehe, an dem ich gerade prüfe.
- Als Bearbeiter möchte ich bei einer Firma mit nur einem Standort nichts zusätzlich auswählen müssen, damit sich für die grosse Mehrheit der Kunden nichts verkompliziert.
- Als Bearbeiter möchte ich im Header jederzeit sehen, an welcher Firma und welchem Standort ich arbeite, damit ich nicht versehentlich Geräte des falschen Standorts bearbeite.
- Als Bearbeiter möchte ich, dass Geräteliste, Prüfberichte-Übersicht und PDF-Export sich automatisch auf den gewählten Standort beziehen, ohne jedes Mal filtern zu müssen.
- Als OBSI Hofer möchte ich, dass die Prüfberichte einer Firma mit mehreren Standorten im SharePoint pro Standort abgelegt werden und der Standort im Dateinamen steht, damit Berichte verschiedener Niederlassungen nicht verwechselt werden.

## Out of Scope
- Kundenportal-Zugang (Kontaktliste auf `/sync-freigabe`) pro Standort — bleibt in diesem Feature pro Firma → **PROJ-11**
- Sync-Freigabe und Sync-Verlauf pro Standort — bleiben in diesem Feature pro Firma → **PROJ-12**
- Option "Alle Standorte" (firmenweites Arbeiten bei mehreren Standorten) — bewusst nicht, es gilt immer genau ein Standort
- Schnellwechsel des Standorts direkt auf der Geräteliste oder der Prüfberichte-Übersicht — Wechsel nur über die Startseite
- Eigene PDF-Vorlage pro Standort — die Vorlage bleibt pro Firma (bzw. die Standard-Vorlage)
- Verschieben bereits archivierter PDFs in die neuen Standort-Ordner
- Anlegen, Umbenennen oder Löschen von Standorten — Standorte bleiben Stammdaten in Dataverse
- Änderungen an Dataverse oder am Kundenportal-Repo

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

**Auswahl auf der Startseite**
- [ ] Angenommen eine Firma mit mehreren Standorten ist gewählt, wenn der Nutzer die Startseite öffnet, dann sieht er unter "Aktuelle Firma" ein durchsuchbares Auswahlfeld "Aktueller Standort" mit allen Standorten dieser Firma
- [ ] Angenommen der Nutzer wählt eine Firma mit genau einem Standort, wenn die Auswahl gespeichert wird, dann ist dieser Standort automatisch der aktuelle Standort, ohne zusätzliche Auswahl
- [ ] Angenommen eine Firma mit mehreren Standorten ist gewählt, aber noch kein Standort, wenn der Nutzer die Startseite betrachtet, dann ist der Button "Weiter zu Geräte" erst nach der Standort-Auswahl verfügbar
- [ ] Angenommen der Nutzer wechselt die Firma, wenn die neue Firma gespeichert wird, dann wird der bisherige Standort verworfen (bei genau einem Standort automatisch neu gesetzt, sonst muss neu gewählt werden)
- [ ] Angenommen der Nutzer wechselt den Standort, wenn die Auswahl gespeichert wird, dann werden die Filter der Geräteliste (Suche, Lagerort, Letzte Prüfung, Sortierung) zurückgesetzt — wie heute beim Firmenwechsel
- [ ] Angenommen der Nutzer wählt denselben Standort erneut, dann bleiben die Filter erhalten

**Anzeige**
- [ ] Angenommen Firma und Standort sind gewählt, wenn der Nutzer eine beliebige Seite betrachtet, dann zeigt der Header Firma und Standort (z.B. "Rehaklinik Bellikon · Haupthaus"); bei einer Firma mit nur einem Standort genügt der Firmenname
- [ ] Angenommen die Navigation ist auf kleinen Bildschirmen zusammengeklappt, dann zeigt auch das mobile Menü Firma und Standort

**Geräteliste (`/geraete`)**
- [ ] Angenommen ein Standort ist gewählt, wenn der Nutzer die Geräteliste öffnet, dann sieht er nur die Geräte dieses Standorts
- [ ] Angenommen eine Firma mit mehreren Standorten ist gewählt, dann gibt es auf der Geräteliste weder den Standort-Filter noch die Standort-Spalte, die heute nur bei solchen Firmen erscheinen (PROJ-3: "nur bei Firmen mit mehr als einem Standort sichtbar")
- [ ] Angenommen eine Firma mit mehreren Standorten ist gewählt, aber kein Standort, wenn der Nutzer die Geräteliste öffnet, dann sieht er einen Hinweis mit Link zur Startseite statt einer Liste (analog zu "keine Firma gewählt")
- [ ] Angenommen der Standort hat keine Geräte, dann sieht der Nutzer "Keine Geräte für diesen Standort gefunden."
- [ ] Angenommen ein Standort ist gewählt, dann zeigt die Anzahl über "PDF generieren" die Geräte dieses Standorts ("42 von 120 Geräten" bezieht sich auf den Standort)

**Prüfberichte-Übersicht (`/pruefberichte`)**
- [ ] Angenommen ein Standort ist gewählt, wenn der Nutzer die Prüfberichte-Übersicht öffnet, dann sieht er nur Prüfberichte von Geräten dieses Standorts (zusätzlich eingeschränkt durch den Geräte-Filter wie bisher)
- [ ] Angenommen eine Firma mit mehreren Standorten ist gewählt, aber kein Standort, dann sieht der Nutzer auf der Prüfberichte-Übersicht denselben Hinweis wie auf der Geräteliste

**PDF-Export**
- [ ] Angenommen die Firma hat mehrere Standorte oder weitere aktive Firmen heissen gleich, wenn ein PDF erzeugt wird, dann enthält der Dateiname den Standort-Kurznamen, z.B. "2026-10-08 Prüfbericht Absturzsicherungen - Bilfinger Industrial Services Schweiz AG - Pratteln.pdf" (bei Lagerort-Filter zusätzlich wie bisher " - <Lagerort>")
- [ ] Angenommen die Firma hat mehrere Standorte, wenn ein PDF erzeugt wird, dann steht der Standort auch im Titel/Kopfbereich des PDFs neben dem Firmennamen
- [ ] Angenommen die Firma hat mehrere Standorte **oder weitere aktive Firmen heissen gleich** (z.B. Bilfinger-Niederlassungen), wenn das PDF im SharePoint archiviert wird, dann landet es in "<Firma>/Standort <Kurzname>/Prüfberichte/<Jahr>/" (Kurzname = Standortname ohne vorangestellten Firmennamen, z.B. "Standort Pratteln"); fehlende Ordner werden automatisch angelegt *(geändert 2026-10-08, vorher "<Firma>/Prüfberichte/<Standort>/<Jahr>/")*
- [ ] Angenommen der Standort heisst genau wie die Firma (Kurzname leer, z.B. Bilfinger-Hauptstandort), dann wird wie bisher in "<Firma>/Prüfberichte/<Jahr>/" archiviert, ohne Standort im Dateinamen
- [ ] Angenommen die Firma hat genau einen Standort und ihr Name ist eindeutig, wenn ein PDF erzeugt wird, dann sind Dateiname, Titel und Ablageort unverändert wie bisher ("<Firma>/Prüfberichte/<Jahr>/", kein Standort im Namen)
- [ ] Angenommen ein PDF wird erzeugt, dann wird die Vorlage wie bisher pro Firma gesucht ("<Firma>/Prüfberichte/vorlage_pruefberichtraport.xlsx", sonst Standard-Vorlage)
- [ ] Angenommen der PDF-Export wird ausgelöst, dann enthält er nur Geräte des aktuellen Standorts — auch wenn ein manipulierter Aufruf Geräte-IDs eines anderen Standorts oder einer anderen Firma mitschickt (serverseitige Einschränkung wie bisher auf Firmenebene, jetzt auf Standortebene)

**Unverändert**
- [ ] Angenommen ein Nutzer ruft eine Geräte- oder Prüfbericht-Detailseite direkt per Link auf, dann funktioniert das wie bisher unabhängig vom gewählten Standort
- [ ] Angenommen der Nutzer öffnet `/sync-freigabe`, dann beziehen sich Kontaktliste, Sync und Sync-Verlauf weiterhin auf die ganze Firma (bis PROJ-11/12)

## Edge Cases
- **Firma ohne Standort** → Startseite zeigt "Für diese Firma sind keine Standorte erfasst."; Geräteliste und Prüfberichte zeigen denselben Hinweis statt einer Liste
- **Gespeicherter Standort gehört nicht (mehr) zur gewählten Firma** (z.B. in Dataverse umgehängt oder gelöscht) → wird verworfen; bei genau einem Standort automatisch neu gesetzt, sonst Hinweis zur Neuauswahl
- **Firma bekommt nachträglich einen zweiten Standort** → der bisher automatisch gesetzte Standort bleibt gültig; ab jetzt zeigt die Startseite das Standort-Feld, Header/Dateiname/Ablage richten sich nach "mehrere Standorte"
- **Standortname mit für SharePoint verbotenen Zeichen** (`/ \ : * ? " < > |`) → im Ordner- und Dateinamen ersetzt, wie heute beim Firmennamen
- **Zwei Standorte mit gleichem Namen in derselben Firma** → unterscheidender Zusatz " (2)" usw. in Auswahl, Header, Dateiname und Ordner, in fester Reihenfolge (siehe Tech Design)
- **Direkter Aufruf einer Geräte-Detailseite eines anderen Standorts** → erlaubt (Navigationshilfe, kein Zugriffs-Gate, wie bisher bei der Firma); der aktuelle Standort ändert sich dadurch nicht
- **Gleichzeitige Nutzer** → Firma- und Standort-Auswahl gelten pro Sitzung (Browser), mehrere Bearbeiter können parallel an verschiedenen Standorten arbeiten
- **Standort-Auswahl zwischen zwei Tabs gewechselt** → der zuletzt gewählte Standort gilt für alle Tabs derselben Sitzung (wie heute bei der Firma)

## Technical Requirements (optional)
- Security: Einschränkung auf den Standort erfolgt serverseitig (Geräte für Liste, Prüfberichte und PDF werden immer aus dem Standort der Sitzung geladen, nie aus vom Browser übergebenen Listen)
- Performance: Laden der Geräteliste nicht langsamer als heute (eher schneller, da nur ein Standort)
- Keine Änderung an Dataverse-Schema oder Rechten (Standorte werden bereits gelesen)

## Open Questions
- [x] Gibt es in echten Daten Firmen mit zwei gleichnamigen Standorten? → Ja, genau ein Fall (in einer Testfirma). Lösung: unterscheidender Zusatz " (2)" usw. in fester Reihenfolge, siehe Tech Design (2026-10-08)
- [x] Welches Dataverse-Feld eignet sich als Anzeigename des Standorts? → `bmvcc_displayname`: bei allen 207 Standorten gefüllt, max. 51 Zeichen; Sonderzeichen werden wie beim Firmennamen ersetzt (2026-10-08)

- [x] Gleichnamige Firmen (z.B. die drei Bilfinger-Niederlassungen) teilen sich denselben SharePoint-Ordner `<Firma>/` → gewollt (bestehende Struktur); das Archiv wird über "Standort <Kurzname>" darin getrennt (2026-10-08)

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Aufteilung in drei Features: PROJ-10 (Arbeitskontext: Geräte, Prüfberichte, PDF), PROJ-11 (Kundenportal-Zugang pro Standort), PROJ-12 (Sync und Verlauf pro Standort) | Nutzer will "alles pro Standort"; PROJ-10 ist sofort und nur in diesem Repo machbar, PROJ-11/12 hängen von offenen Fragen zu Dataverse (Kontakt ↔ Standort) bzw. vom Kundenportal-Repo ab und sollen PROJ-10 nicht blockieren | 2026-10-08 |
| Priorität P1 | Wichtige Verbesserung im Alltag, das Tool funktioniert aber auch ohne (Nutzer-Entscheidung) | 2026-10-08 |
| Immer genau ein Standort, kein "Alle Standorte" | Klare Regel, passt zu "alles pro Standort" und zu den Folge-Features (Nutzer-Entscheidung) | 2026-10-08 |
| Bei genau einem Standort automatische Auswahl | Für die grosse Mehrheit der Firmen ändert sich die Bedienung nicht | 2026-10-08 |
| Auswahl nur auf der Startseite, Anzeige im Header; kein Schnellwechsel auf den Listen | Gleiches Muster wie die Firma-Auswahl, weniger Bedienelemente (Nutzer-Entscheidung) | 2026-10-08 |
| Standortwechsel setzt die Filter der Geräteliste zurück | Lagerorte sind standortspezifisch — gleiche Begründung wie beim Firmenwechsel (PROJ-3, Nachtrag 2026-10-06) | 2026-10-08 |
| ~~PDF-Ablage bei mehreren Standorten in "<Firma>/Prüfberichte/<Standort>/<Jahr>/"~~ → **"<Firma>/Standort <Kurzname>/Prüfberichte/<Jahr>/"**, auch für gleichnamige Firmen; Vorlage bleibt pro Firma | Beim ersten Test gesehen: Mehr-Standort-Kunden haben im SharePoint bereits Standort-Ordner direkt unter der Firma mit eigenem "Prüfberichte"-Ordner (Bilfinger: "Standort Pratteln", …). Automatisch gebildeter Ordnername statt Zuordnungsfeld in Dataverse; dass bei abweichend benannten Ordnern (z.B. "Objekt - …") ein zusätzlicher Ordner entsteht, wird in Kauf genommen (Nutzer-Entscheidung) | 2026-10-08 |
| Bei genau einem Standort bleiben Dateiname, Titel und Ablage unverändert | Bestehende Archive der grossen Mehrheit bleiben einheitlich, kein Bruch in der Ordnerstruktur (Nutzer-Entscheidung) | 2026-10-08 |
| Standort-Filter und -Spalte der Geräteliste entfallen (heute nur bei Firmen mit mehreren Standorten sichtbar, siehe PROJ-3) | Bei genau einem aktiven Standort ohne Funktion | 2026-10-08 |
| Kontakte, Sync und Sync-Verlauf bleiben in PROJ-10 pro Firma | Getrennte Folge-Features PROJ-11/12 mit eigenen externen Abhängigkeiten | 2026-10-08 |
| Gleichnamige Firmen bleiben in Dataverse getrennt (z.B. drei "Bilfinger Industrial Services Schweiz AG" für drei Niederlassungen, je mit einem Standort); das Tool macht sie in Auswahl und Header mit dem Standort unterscheidbar | Live-Fund beim ersten Test: Firma erschien mehrfach in der Auswahl. Laut Nutzer ist die Zuordnung in Dataverse bewusst so (Nutzer-Entscheidung) | 2026-10-08 |
| Inaktive Firmen werden in der Auswahl nicht mehr angezeigt | Fehler seit PROJ-3 (kein Statusfilter); u.a. ein vierter, deaktivierter Bilfinger-Datensatz ohne Standort erschien in der Auswahl | 2026-10-08 |

### Technical Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Aktueller Standort als Sitzungs-Cookie neben der aktuellen Firma | Bewährtes Muster aus PROJ-3, keine eigene Datenhaltung, unabhängig pro Bearbeiter | 2026-10-08 |
| Zentraler serverseitiger "Arbeitskontext" (Firma, Standort, mehrere Standorte ja/nein, Hinweis-Zustände) für alle Seiten | Regeln an einer Stelle; gleiche Logik für Startseite, Header, Geräteliste, Prüfberichte, PDF | 2026-10-08 |
| Standort bei Firmenwahl mit genau einem Standort sofort mitspeichern; alte Sitzungen ohne Standort bei genau einem Standort automatisch gültig | Spec-Edge-Case "Firma bekommt zweiten Standort": der bisherige Standort bleibt gültig; keine Neuauswahl für bestehende Sitzungen | 2026-10-08 |
| Gültigkeit des Standorts bei jedem Aufruf gegen die Standorte der Firma prüfen, Ergebnis pro Seitenaufruf wiederverwenden | Umgehängte/gelöschte Standorte führen zur Neuauswahl statt zu falschen Daten; keine Zusatzabfrage | 2026-10-08 |
| Feld "Standort" aus der Geräte-Filter-Sitzung entfernen | Standort ist jetzt Arbeitskontext, kein Filter mehr | 2026-10-08 |
| Gleichnamige Standorte: Zusatz " (2)", " (3)" nach Erstellungsdatum | Stabil (gleicher Standort → gleicher Ordner), lesbar; betrifft laut Datenanalyse nur eine Testfirma | 2026-10-08 |
| Ablage-Unterordner werden nicht separat angelegt, sondern beim Hochladen über den Pfad erzeugt | Verhalten der bestehenden SharePoint-Anbindung, so entstehen bereits die Jahresordner | 2026-10-08 |
| Standort-Auswahl mit derselben durchsuchbaren Auswahl wie die Firma (shadcn command/popover) | Einheitliche Bedienung; nötig bei vielen Standorten | 2026-10-08 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Ausgangslage (Datenanalyse 2026-10-08, nur lesend)
- 207 Standorte bei rund 160 Firmen: **146 Firmen mit genau einem Standort**, 14 mit mehreren (meist 2–5; eine Firma mit 28 Standorten ist offensichtlich eine Testfirma).
- Gleichnamige Standorte innerhalb einer Firma: nur 1 Fall ("Kochergasse 9" doppelt, in der Testfirma).
- `bmvcc_displayname` ist bei allen Standorten gefüllt (max. 51 Zeichen); 1 Name enthält ein in SharePoint verbotenes Zeichen.
- Die Geräte werden schon heute über die Standorte der Firma geladen — der Umbau grenzt nur von "alle Standorte der Firma" auf "den aktuellen Standort" ein.

### A) Bausteine
```
Startseite /start
+-- "Aktuelle Firma" (bestehende durchsuchbare Auswahl)
+-- "Aktueller Standort" (NEU, gleiche Bedienung wie die Firma-Auswahl)
|     nur sichtbar bei Firmen mit mehreren Standorten
|     Hinweis bei Firma ohne Standort
+-- "Weiter zu Geräte" — erst aktiv, wenn ein Standort feststeht

Header + mobiles Menü
+-- "Firma · Standort" (bei nur einem Standort nur die Firma)

Arbeitskontext (NEU, serverseitig, von allen Seiten genutzt)
+-- liest Firma + Standort aus der Sitzung
+-- prüft: gehört der Standort zur Firma?
+-- Firma mit genau einem Standort → dieser gilt automatisch
+-- Ergebnis: Firma, Standort, "Firma hat mehrere Standorte" — oder ein Hinweis-Zustand
      (keine Firma / Firma ohne Standort / Standort noch nicht gewählt)

Geräteliste /geraete           → nur Geräte des Standorts; Standort-Filter/-Spalte entfallen
Prüfberichte-Übersicht         → nur Prüfberichte von Geräten des Standorts
"PDF generieren" (Server)      → Geräte nur aus dem Standort der Sitzung
PDF-Export                     → bei mehreren Standorten: Standort in Dateiname, Kopfbereich, Ablageordner
/sync-freigabe, Detailseiten   → unverändert (Firma bzw. direkt per ID)
```

### B) Daten (in Worten)
Keine Datenbank, keine Dataverse-Änderung. Neu ist nur ein zweiter Sitzungswert neben der Firma:
- **Aktueller Standort** (Cookie, wie heute "aktuelle Firma", 30 Tage, nur serverseitig lesbar).
- Beim Wählen einer Firma mit genau einem Standort wird dieser sofort mitgespeichert (so bleibt er gültig, auch wenn die Firma später einen zweiten Standort bekommt). Beim Firmenwechsel wird der Standort verworfen.
- Beim Wechsel des Standorts werden die Geräte-Filter geleert (wie beim Firmenwechsel). Das bisherige Filterfeld "Standort" in der Filter-Sitzung entfällt.
- Ältere Sitzungen ohne gespeicherten Standort: bei Firmen mit genau einem Standort automatisch gültig, sonst Hinweis zur Auswahl.

**Regel für Namen bei mehreren Standorten bzw. gleichnamigen Firmen** *(Ablage geändert 2026-10-08 nach Blick in die bestehende SharePoint-Struktur)*:
- Kurzname: Standortname ohne vorangestellten Firmennamen ("Bilfinger … AG - Pratteln" → "Pratteln"); leer, wenn der Standort wie die Firma heisst → dann alles wie bisher
- Dateiname: `<Datum> Prüfbericht Absturzsicherungen - <Firma> - <Kurzname>[ - <Lagerort>].pdf`
- Ablage: `<Firma>/Standort <Kurzname>/Prüfberichte/<Jahr>/` — folgt der bestehenden manuellen Konvention (z.B. `Bilfinger …/Standort Pratteln/Prüfberichte/`); fehlende Ordner legt SharePoint beim Hochladen automatisch an
- Kopfbereich des PDFs: Kurzname unter dem Firmennamen
- Bekannte Einschränkung: Kunden, deren bestehende Ordner anders heissen (z.B. Ramseyer und Dilger: "Objekt - Hotel Alpin Palace, Mürren" vs. Dataverse-Standort "Hotel Mürren Palace"), erhalten einen neuen Ordner "Standort <Kurzname>" neben dem bestehenden (Nutzer-Entscheidung, bewusst ohne Zuordnungsfeld in Dataverse)
- Verbotene Zeichen werden wie beim Firmennamen ersetzt
- Gleichnamige Standorte einer Firma erhalten in Auswahl, Header, Dateiname und Ordner einen unterscheidenden Zusatz " (2)", " (3)" … — in fester Reihenfolge (nach Erstellungsdatum), damit derselbe Standort immer denselben Ordner bekommt

### C) Technische Entscheidungen (Begründung)
- **Standort als Sitzungswert wie die Firma**: bewährtes Muster aus PROJ-3, keine eigene Datenhaltung, mehrere Bearbeiter arbeiten unabhängig voneinander.
- **Ein zentraler "Arbeitskontext" statt Prüfungen pro Seite**: Die Regeln (gehört der Standort zur Firma, automatische Wahl, Hinweis-Zustände) stehen an einer Stelle und gelten gleich für Startseite, Header, Geräteliste, Prüfberichte und PDF — weniger Fehlerquellen.
- **Gültigkeit bei jedem Aufruf prüfen**: Standorte können in Dataverse umgehängt oder gelöscht werden; ein veralteter Wert führt dann zur Neuauswahl statt zu einer leeren oder falschen Liste. Kostet keine zusätzliche Abfrage, da die Standorte der Firma ohnehin geladen werden; innerhalb eines Seitenaufrufs wird das Ergebnis wiederverwendet (Header + Seite).
- **Sicherheit serverseitig**: Der PDF-Export und die Listen laden die Geräte immer selbst aus dem Standort der Sitzung — vom Browser geschickte Geräte-IDs dienen weiterhin nur als Auswahl innerhalb dieser Menge (Fortsetzung von PROJ-7 QA BUG-1).
- **Standort-Auswahl mit derselben durchsuchbaren Auswahl wie die Firma** (shadcn `command`/`popover`, bereits installiert): bei Firmen mit vielen Standorten (Testfirma: 28) nötig, einheitliche Bedienung.
- **Sonderfall "nur ein Standort" bleibt optisch unsichtbar**: keine Auswahl, kein Standort im Header/Dateinamen/Ordner — für 146 von ~160 Firmen ändert sich nichts.

### D) Abhängigkeiten (Pakete)
Keine neuen Pakete.

### E) Tests
- Unit-Tests für den Arbeitskontext: alle Zustände (keine Firma, Firma ohne Standort, ein Standort automatisch, mehrere ohne/mit Auswahl, fremder/gelöschter Standort, alte Sitzung ohne Standort)
- Unit-Tests für Namen/Ablage im PDF-Export (ein vs. mehrere Standorte, Sonderzeichen, gleichnamige Standorte, Lagerort-Zusatz)
- Server-Action-Test: Geräte-IDs eines anderen Standorts werden ignoriert
- Komponententests: Standort-Auswahl auf der Startseite, Header-Anzeige, Hinweis-Zustände auf Geräteliste/Prüfberichten
- Manuell: Firma mit einem Standort (unverändert) und Firma mit mehreren Standorten (Auswahl, Liste, PDF-Ablage im SharePoint)

## Implementation Notes (Frontend + Backend)

**Umgesetzt 2026-10-08** — Oberfläche und Server-Logik in einem Durchgang (die Seiten sind Server-Komponenten und brauchen den Arbeitskontext direkt; kein separates `/backend`).

**Arbeitskontext & Sitzung**
- Neu `src/lib/arbeitskontext.ts`: reine Regel `bestimmeArbeitskontext()` (Zustände `keine-firma`, `firma-ohne-standort`, `standort-waehlen`, `bereit` inkl. `mehrereStandorte`), `ladeArbeitskontext()` (React `cache` — Header und Seite teilen sich pro Aufruf ein Ergebnis; nicht mehr existierende Firma → `keine-firma`, andere Dataverse-Fehler werden durchgereicht) und `kontextBezeichnung()` für Header/Menü.
- `src/lib/firma-session.ts`: zweites Cookie `aktueller_standort_id`. `setCurrentFirmaId()` verwirft bei Firmenwechsel Standort und Filter, speichert bei genau einem Standort diesen sofort mit und meldet `standortWaehlen` zurück. Neu `setCurrentStandortId()` — übernimmt nur Standorte der aktuellen Firma (Server Actions sind direkt aufrufbar), setzt bei echtem Wechsel die Geräte-Filter zurück.
- `listStandorteForFirma()` liefert zusätzlich `erstelltAm` (`createdon`); neu `eindeutigeStandortNamen()` vergibt bei gleichnamigen Standorten " (2)", " (3)" … nach Erstellungsdatum.

**Oberfläche**
- Neu `DurchsuchbareAuswahl` (aus der bisherigen Firma-Combobox herausgelöst), genutzt von `FirmaCombobox` und neu `StandortCombobox`. Nach Firmenwahl: bei mehreren Standorten bleibt der Nutzer auf `/start`, sonst direkt zu `/geraete`.
- Startseite: Feld "Aktueller Standort" nur bei mehreren Standorten; Hinweis bei Firma ohne Standort bzw. Ladefehler; "Weiter zu Geräte (Firma · Standort)" erst bei feststehendem Standort.
- Header und mobiles Menü: "Firma · Standort" (bei einem Standort nur Firma, bei offener Wahl "Firma · Standort wählen"); Platz für den Text im Header leicht vergrössert. Auf Nutzerwunsch (2026-10-08) steht "Firma: …" im Desktop-Header jetzt fett **vor** den Menüpunkten (Geräte, Prüfberichte, Freigabe) statt rechts neben dem Namen.
- Neu `KontextHinweis` für Geräteliste und Prüfberichte-Übersicht (keine Firma / Standort wählen / Firma ohne Standort).
- Geräteliste: lädt nur Geräte des Standorts; Standort-Filter, Standort-Spalte und Sortierung nach Standort entfernt; Leer-Text "Keine Geräte für diesen Standort gefunden."; Liste wird bei Standortwechsel neu aufgebaut (`key`).
- Prüfberichte-Übersicht: nur Prüfberichte von Geräten des Standorts; Hinweistext auf "(Lagerort/Letzte Prüfung)" angepasst.
- Geräte-Filter-Sitzung: Feld `standortId` entfernt (ältere Cookies mit dem Feld werden einfach ignoriert).

**PDF-Export**
- `generatePdfAction`: Geräte nur aus dem Standort der Sitzung (QA BUG-1 aus PROJ-7 jetzt auf Standortebene); "Kein Standort ausgewählt." bei offener Wahl; `standortName` nur bei mehreren Standorten an den Export.
- `generatePruefberichtPdf`: Standort im Dateinamen (`… - <Firma> - <Standort>[ - <Lagerort>].pdf`), im Kopfbereich unter dem Firmennamen und als Ablage-Unterordner `<Firma>/Prüfberichte/<Standort>/<Jahr>/`; verbotene Zeichen ersetzt; Vorlage weiterhin pro Firma. Ohne Standort exakt wie bisher.

**Live-Fund beim ersten Test (2026-10-08): gleichnamige Firmen.** "Bilfinger Industrial Services Schweiz AG" erschien viermal in der Firmenauswahl. Analyse (nur lesend): 10 Firmennamen kommen mehrfach vor; bei Bilfinger sind es drei aktive Firmen mit je einem Standort (Hauptstandort, Pratteln, Boningen) plus ein deaktivierter Datensatz ohne Standort. Laut Nutzer ist die Trennung in Dataverse gewollt. Umsetzung:
- `listFirmen()` liefert nur noch aktive Firmen (`statecode eq 0`) — Fehler seit PROJ-3.
- Neu `firmenAnzeigenamen()` (rein, getestet): gleichnamige Firmen erhalten " · <Standort>" ohne vorangestellten Firmennamen ("… AG - Pratteln" → "Pratteln"); leerer Zusatz erlaubt, solange eindeutig (Bilfinger-Hauptstandort heisst wie die Firma); "ohne Standort" bzw. "n Standorte"; verbleibende Gleichheit wird nach ID nummeriert. Startseite lädt dafür einmal alle Standorte (`listAlleStandorte()`, ~200).
- Arbeitskontext: `firma.anzeigename` (Header, mobiles Menü, Button auf `/start`) nach derselben Regel — nur wenn weitere aktive Firmen gleich heissen (`listAktiveFirmenMitNamen()`, `listStandorteForFirmen()`). `firma.name` bleibt der echte Name: PDF-Dateiname und SharePoint-Ordner unverändert.
- PDF-Ablage geändert (nach Blick in die SharePoint-Struktur, nur lesend): `<Firma>/Standort <Kurzname>/Prüfberichte/<Jahr>/` statt `<Firma>/Prüfberichte/<Standort>/<Jahr>/`, angewendet bei mehreren Standorten **und** bei gleichnamigen Firmen (`firma.mehrdeutig`); Kurzname über `standortKurzname()`, Entscheidung in `pdfStandortZusatz()` (arbeitskontext.ts). Leerer Kurzname (Bilfinger-Hauptstandort) → Ablage wie bisher.

**Unverändert:** `/sync-freigabe` (Kontakte, Sync, Verlauf weiterhin pro Firma, bis PROJ-11/12), Geräte- und Prüfbericht-Detailseiten.

**Tests:** neu `arbeitskontext.test.ts` (alle Zustände, alte Sitzungen, umgehängte Standorte, gleichnamige Standorte, Bezeichnung, Laden inkl. gelöschter Firma/Dataverse-Fehler); erweitert `firma-session.test.ts` (Standort bei Firmenwahl, Validierung von `setCurrentStandortId`, Filter-Reset), `geraete.test.ts` (`eindeutigeStandortNamen`), `export.test.ts` (Dateiname, Ablage, Sonderzeichen, Vorlage pro Firma, unverändert ohne Standort), `actions.test.ts` (Standort-Scope, "Kein Standort ausgewählt.", Standortname nur bei mehreren), `pdf-generator.test.ts` (Kopfbereich). 366 Tests grün, Typecheck/Lint/Build sauber.

**Noch nicht im Browser geprüft** — siehe Übergabe an den Nutzer.

## QA Test Results

**Tested:** 2026-10-08
**App URL:** http://localhost:3000
**Tester:** QA Engineer (AI) + Browser-Test durch den Nutzer (Firmenauswahl, Header)

### Acceptance Criteria Status

#### Auswahl auf der Startseite
- [x] Standort-Feld nur bei mehreren Standorten, durchsuchbar (gemeinsame `DurchsuchbareAuswahl`, gleiche Bedienung wie Firma)
- [x] Genau ein Standort → automatisch gesetzt (`firma-session.test.ts`, `arbeitskontext.test.ts`)
- [x] "Weiter zu Geräte" erst bei feststehendem Standort (nur im Zustand `bereit` gerendert)
- [x] Firmenwechsel verwirft den Standort; bei einem Standort automatisch neu gesetzt (`firma-session.test.ts`)
- [x] Standortwechsel setzt die Geräte-Filter zurück, gleicher Standort nicht (`firma-session.test.ts`)

#### Anzeige
- [x] Header "Firma · Standort", bei einem Standort nur Firma (`arbeitskontext.test.ts`); auf Nutzerwunsch fett vor den Menüpunkten — vom Nutzer im Browser gesehen
- [x] Mobiles Menü erhält dieselbe Bezeichnung

#### Geräteliste
- [x] Nur Geräte des Standorts (`listGeraeteForStandorte([standort])`); Standort-Filter/-Spalte entfernt (`geraete-liste.test.tsx` ohne Standort-Props)
- [x] Hinweis statt Liste bei fehlender Standort-Wahl (`KontextHinweis`)
- [x] Leer-Text "Keine Geräte für diesen Standort gefunden."
- [x] Anzahl über "PDF generieren" bezieht sich auf den Standort

#### Prüfberichte-Übersicht
- [x] Nur Prüfberichte von Geräten des Standorts, zusätzlich Geräte-Filter; Hinweis bei fehlender Standort-Wahl

#### PDF-Export
- [x] Dateiname und Kopfbereich mit Standort-Kurzname bei mehreren Standorten bzw. gleichnamigen Firmen (`export.test.ts`, `pdf-generator.test.ts`, `actions.test.ts`)
- [x] Ablage "<Firma>/Standort <Kurzname>/Prüfberichte/<Jahr>/"; Hauptstandort mit leerem Kurznamen und Firmen mit einem Standort wie bisher (`export.test.ts`, `actions.test.ts`)
- [x] Vorlage weiterhin pro Firma (`export.test.ts`)
- [x] Manipulierte Geräte-IDs anderer Standorte werden ignoriert (`actions.test.ts`)
- [x] **Manuell geprüft (2026-10-08, Nutzer, lokal mit `npm run dev`):** echter PDF-Export für "Bilfinger … · Pratteln" — Ablage in `Standort Pratteln/Prüfberichte/<Jahr>/` und Dateiname erfolgreich. Erster Versuch legte nichts ab, weil lokal noch `PDF_SIGNATUR_MODUS=test` gesetzt war (Testmodus archiviert bewusst nicht, PROJ-9) — kein Fehler. Die bisher manuell abgelegten Bilfinger-Berichte liegen ohne Jahresordner und mit ", Pratteln" im Namen; Jahresordner und " - Pratteln" vom Nutzer als in Ordnung bestätigt

#### Unverändert
- [x] Detailseiten unabhängig vom Standort; `/sync-freigabe` weiterhin pro Firma (einziger verbleibender Nutzer von `getCurrentFirmaId` ausserhalb von Sitzung/Arbeitskontext)

### Edge Cases Status
- [x] Firma ohne Standort → Hinweis auf Startseite, Geräteliste, Prüfberichte
- [x] Gespeicherter Standort gehört nicht mehr zur Firma → Neuauswahl bzw. automatische Wahl (`arbeitskontext.test.ts`)
- [x] Firma bekommt zweiten Standort → gespeicherter Standort bleibt gültig (`arbeitskontext.test.ts`)
- [x] Verbotene Zeichen im Standortnamen ersetzt (`export.test.ts`)
- [x] Gleichnamige Standorte → " (2)" in fester Reihenfolge (`geraete.test.ts`, `arbeitskontext.test.ts`)
- [x] Gleichzeitige Nutzer / mehrere Tabs → Auswahl pro Sitzung (Cookie), wie bei der Firma
- [x] (zusätzlich) Firma existiert nicht mehr → "keine Firma"; andere Dataverse-Fehler → Ladefehler der Seite (`arbeitskontext.test.ts`)
- [x] (zusätzlich) Gleichnamige Firmen in Auswahl und Header unterscheidbar; inaktive Firmen ausgeblendet (`geraete.test.ts`, `arbeitskontext.test.ts`, Nutzer-Test)
- [x] (zusätzlich) BUG-1 behoben 2026-10-08: Freigabe-Seite nennt gleichnamige Firmen mit Zusatz
- [ ] (zusätzlich) Siehe BUG-2: abgelehnte Standort-Wahl ohne Rückmeldung
- [ ] (zusätzlich) Siehe BUG-3: bereits gewählte inaktive Firma bleibt aktiv

### Security Audit Results
- [x] Authentifizierung: `/start`, `/geraete`, `/pruefberichte` ohne Sitzung → `/login` (neue E2E-Suite `tests/PROJ-10-…spec.ts`)
- [x] Autorisierung Standort: `setCurrentStandortId` übernimmt nur Standorte der aktuellen Firma (direkt aufrufbare Server Action), getestet
- [x] Daten-Scope: Liste, Prüfberichte und PDF laden Geräte nur aus dem Standort der Sitzung; vom Browser geschickte IDs nur als Auswahl (getestet)
- [x] OData-Injection: Firmenname im Filter mit verdoppelten Anführungszeichen; IDs per GUID-Prüfung (`requireValidGuid`, `getRecord` mit `requireValidId`)
- [x] Keine neuen Geheimnisse, keine neuen Umgebungsvariablen; Cookies `httpOnly`, `sameSite=lax`, `secure` in Production
- [x] Inaktive/fremde Firma per direktem Server-Action-Aufruf setzbar — betrifft nur die eigene Sitzung eines angemeldeten internen Nutzers, keine Daten anderer Mandanten (internes Tool); siehe BUG-3

### Automatisierte Tests
- [x] `npm test`: 31 Dateien, 375 Tests grün
- [x] `npm run test:e2e`: 24/24 grün (inkl. 3 neue PROJ-10-Tests)
- Cross-Browser/Responsive: Header-Änderung nutzt bestehende Breakpoints (Desktop-Navigation ab `lg`, darunter mobiles Menü); nicht automatisiert geprüft

### Bugs Found

#### BUG-1: Freigabe-Seite nennt gleichnamige Firmen ununterscheidbar
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Auf `/start` "Bilfinger Industrial Services Schweiz AG · Pratteln" wählen
  2. `/sync-freigabe` öffnen, "Sync auslösen"
  3. Expected: Seite und Bestätigungsdialog nennen die Niederlassung ("… · Pratteln")
  4. Actual: "Die Daten von „Bilfinger Industrial Services Schweiz AG“ werden ins Kundenportal übertragen." — für alle drei Bilfinger-Firmen identisch; nur der Header zeigt den Zusatz. Risiko: Freigabe für die falsche Niederlassung
- **Priority:** Fix before deployment
- **Status:** ✅ Behoben (2026-10-08) — `/sync-freigabe` übergibt jetzt `firma.anzeigename` aus dem Arbeitskontext an Kontaktliste und Sync-Dialog ("… · Pratteln"). Sync und Verlauf laufen unverändert über die Firmen-ID; die Server Action lädt für Kundenportal-Aufruf und Verlaufseintrag weiterhin den echten Firmennamen. Nicht mehr existierende Firma → wie bisher der Ladefehler der Seite.

#### BUG-2: Abgelehnte Standort-Wahl ohne Rückmeldung
- **Severity:** Low
- **Steps to Reproduce:**
  1. Startseite in zwei Tabs offen; in Tab A eine andere Firma wählen
  2. In Tab B einen Standort der vorherigen Firma wählen
  3. Expected: Hinweis, dass der Standort nicht (mehr) zur Firma passt
  4. Actual: `setCurrentStandortId` lehnt korrekt ab, die Seite lädt nur neu — ohne Meldung
- **Priority:** Nice to have

#### BUG-3: Bereits gewählte inaktive Firma bleibt aktiv
- **Severity:** Low
- **Steps to Reproduce:**
  1. Vor diesem Feature eine (inzwischen ausgeblendete) inaktive Firma gewählt haben (Cookie bis zu 30 Tage gültig)
  2. Expected: Wie "keine Firma" behandelt, Neuauswahl
  3. Actual: Arbeitskontext prüft den Status der Firma nicht; die inaktive Firma bleibt gewählt (in der Regel ohne Standort → Hinweis "keine Standorte erfasst")
- **Priority:** Nice to have

### Summary
- **Acceptance Criteria:** alle erfüllt (Unit-/Komponententests; echter PDF-Export mit Standort-Ordner vom Nutzer bestätigt)
- **Bugs Found:** 3 total (0 critical, 0 high, 1 medium, 2 low) — BUG-1 behoben, BUG-2/3 offen (Low)
- **Security:** Pass
- **Production Ready:** YES (keine Critical/High) — Empfehlung: BUG-1 vor dem Deployment beheben und den PDF-Export mit Standort-Ordner einmal manuell prüfen
- **Recommendation:** ~~BUG-1 fixen~~ (behoben), ~~manueller PDF-Test~~ (bestanden) → deployen

## Deployment

- **Production URL:** https://obsi-hofer-admin.vercel.app (`/start`, `/geraete`, `/pruefberichte`, `/sync-freigabe`)
- **Deployed:** 2026-10-08
- **Commit:** `563c15d`, **Tag:** `v1.9.0-PROJ-10`
- **Keine neuen Umgebungsvariablen**, keine Änderung an Dataverse oder am Kundenportal
- **Verifikation:** Lokaler Produktions-Build, Lint, 375 Unit-Tests und 24 E2E-Tests grün; Vercel-Production-Build "Ready"; `/start`, `/geraete`, `/pruefberichte` antworten unauthentifiziert mit 307 → `/login`. Funktion vorab vom Nutzer lokal gegen die echten Daten geprüft (Firmen-/Standortauswahl, Header, PDF-Ablage im Standort-Ordner).
- **Hinweis für bestehende Sitzungen:** Bei Firmen mit genau einem Standort ändert sich nichts (automatische Wahl). Wer eine Firma mit mehreren Standorten gewählt hatte, sieht auf Geräte/Prüfberichte einen Hinweis und wählt einmal den Standort auf der Startseite.
- **Offen (Low):** QA BUG-2 (abgelehnte Standort-Wahl ohne Meldung), BUG-3 (bereits gewählte inaktive Firma bleibt aktiv).
