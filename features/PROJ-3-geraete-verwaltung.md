# PROJ-3: Geräte-Verwaltung

## Status: In Progress
**Created:** 2026-10-05
**Last Updated:** 2026-10-05

## Dependencies
- Requires: PROJ-1 (Entra-ID-Login mit Rollen) — für eingeloggte Nutzer mit Rolle Bearbeiter/Freigeber
- Requires: PROJ-2 (Dataverse-Web-API-Anbindung) — für Lesen/Schreiben der Gerätedaten

## User Stories
- Als Bearbeiter möchte ich zuerst eine Firma auswählen und danach nur deren Geräte sehen (über alle Standorte dieser Firma hinweg), damit ich nicht durch die Geräte aller Kunden suchen muss.
- Als Bearbeiter möchte ich innerhalb einer Firma zusätzlich nach Standort filtern können (falls die Firma mehrere hat), damit ich gezielt die Geräte einer bestimmten Niederlassung finde.
- Als Bearbeiter möchte ich innerhalb einer Firma nach Gerätename/Barcode/Seriennummer suchen und nach Lagerort filtern können, damit ich ein bestimmtes Gerät schnell finde.
- Als Bearbeiter möchte ich die Stammdaten eines Geräts (Name, Barcode, Seriennummer, Lagerort, Bemerkungen, Zubehör, Herstelljahr, Erstgebrauch, Ablegereife) bearbeiten können, damit die Daten korrekt und aktuell bleiben.
- Als Bearbeiter möchte ich den aktuellen Prüfstatus eines Geräts einsehen können, auch wenn ich ihn hier nicht ändern kann, damit ich weiss, ob eine Prüfung ansteht.
- Als Freigeber möchte ich dieselben Geräte-Verwaltungsfunktionen nutzen können wie ein Bearbeiter, da sich die Rollen hier nicht unterscheiden.

## Out of Scope
- **Neuanlage neuer Geräte** — bewusste Abweichung vom ursprünglichen PRD-Eintrag, siehe Product Decisions; neue Geräte entstehen weiterhin direkt in Dataverse/Dynamics
- Löschen von Geräten — konsistent mit der PRD-Philosophie, keine Fachdaten echt zu löschen; "Ablegereife" dient bereits als Marker für ausser Betrieb genommene Geräte
- Bearbeitung der Prüfungs-Felder (letzte Prüfung, Betriebsmittelstatus, Prüfer) — gehört exklusiv zu PROJ-4 (Prüfberichte-Verwaltung), hier nur read-only angezeigt
- Ändern der Artikel-Verknüpfung eines Geräts — bei Anlage (ausserhalb dieses Tools) einmalig gesetzt, danach fix
- Ändern der Standort-/Firma-Zuordnung eines Geräts — ebenfalls fix nach Anlage (ein Gerät hängt technisch am Standort, der Standort an der Firma — siehe Tech Design)
- Verwaltung von Standorten selbst (Anlegen/Bearbeiten/Löschen) — Standorte sind Stammdaten wie Firmen/Kontakte/Artikel, bleiben read-only (PRD Non-Goal)
- Konfliktschutz bei gleichzeitiger Bearbeitung (optimistic locking) — bewusst nicht, Last-Write-Wins; konsistent mit PROJ-2 Product Decisions
- Datums-Plausibilitätsprüfung (z.B. Ablegereife muss nach Erstgebrauch liegen) — bewusst nicht für den ersten Wurf
- Pagination/"Mehr laden" in der Geräteliste — bei erwarteter Firmengrösse (wenige Dutzend bis ~200 Geräte) nicht nötig; PROJ-2s Paging-Mechanismus bleibt vorerst ungenutzt
- Bulk-Bearbeitung mehrerer Geräte gleichzeitig
- Bearbeitung von Artikel-Stammdaten selbst — bleiben read-only (PRD Non-Goal)
- **Bearbeitung des Gerätenamens** — *Nachtrag 2026-10-05, beim ersten echten Test festgestellt:* `bmvcc_geraetename` ist in Dataverse ein automatisch generiertes Feld, kein frei vergebener Name; wird daher nur noch read-only angezeigt (siehe Product Decisions)

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

- [ ] Angenommen ein Bearbeiter oder Freigeber hat noch keine Firma ausgewählt, wenn er `/geraete` öffnet, dann sieht er einen Hinweis mit Link zur Firma-Auswahl auf `/start` statt einer Geräteliste
- [ ] Angenommen ein Bearbeiter wählt auf `/start` eine Firma aus, wenn er danach `/geraete` öffnet (auch in einer späteren Sitzung, innerhalb von 30 Tagen), dann bleibt die Auswahl erhalten, ohne erneut gewählt werden zu müssen
- [ ] Angenommen eine Firma wurde ausgewählt, wenn die Geräteliste lädt, dann werden ausschliesslich Geräte dieser Firma (über alle ihre Standorte hinweg) angezeigt
- [ ] Angenommen eine ausgewählte Firma hat mehr als einen Standort, wenn die Geräteliste angezeigt wird, dann steht ein Standort-Filter zur Verfügung und der Standort wird pro Gerät in der Liste angezeigt
- [ ] Angenommen eine ausgewählte Firma hat nur einen Standort, wenn die Geräteliste angezeigt wird, dann wird kein Standort-Filter angezeigt (nicht nötig)
- [ ] Angenommen eine Firma mit Geräten ist ausgewählt, wenn der Nutzer einen Suchbegriff eingibt, der zu Gerätename/Barcode/Seriennummer passt, dann werden nur die passenden Geräte angezeigt
- [ ] Angenommen eine Firma mit Geräten ist ausgewählt, wenn der Nutzer einen Lagerort-Filter wählt, dann werden nur Geräte an diesem Lagerort angezeigt
- [ ] Angenommen eine ausgewählte Firma hat keine Geräte, wenn die Liste geladen wird, dann wird ein klarer Hinweis ("Keine Geräte gefunden") statt einer leeren Fläche angezeigt
- [ ] Angenommen ein Bearbeiter öffnet ein Gerät, wenn die Detailansicht lädt, dann werden alle Stammdaten sowie die Prüfungs-Felder (read-only) angezeigt
- [ ] Angenommen ein Bearbeiter ändert ein oder mehrere editierbare Stammdatenfelder, wenn er speichert, dann werden die Änderungen in Dataverse übernommen
- [ ] Angenommen Dataverse ist beim Speichern nicht erreichbar, wenn der Bearbeiter speichert, dann wird eine verständliche Fehlermeldung angezeigt und die eingegebenen Änderungen bleiben im Formular erhalten
- [ ] Angenommen ein Bearbeiter betrachtet das Bearbeitungsformular, wenn er den Gerätenamen, die Artikel-Verknüpfung, Standort- oder Firma-Zuordnung ändern möchte, dann sind diese Felder nicht editierbar (read-only/ausgegraut)

## Edge Cases
- Zwei Bearbeiter öffnen und speichern dasselbe Gerät gleichzeitig → Last-Write-Wins, keine Warnung (siehe Product Decisions)
- Ein Gerät wird von einem anderen Prozess (z.B. Dataverse-Sync oder PROJ-4) geändert, während ein Bearbeiter es gerade offen hat → beim Speichern wird einfach überschrieben (kein Konfliktschutz, s.o.)
- Firma hat sehr viele Geräte (~200) → komplette Liste wird geladen, keine Pagination nötig (siehe Open Questions für den Fall, dass sich das ändert)
- Nutzer navigiert direkt zu einem Gerät (z.B. über ein altes Lesezeichen), ohne vorher eine Firma gewählt zu haben → siehe Open Questions
- Firma-Dropdown bei vielen Firmen → durchsuchbare Auswahl (Combobox) statt einfacher Dropdown-Liste

## Technical Requirements (optional)
- Alle Lese-/Schreibzugriffe laufen über die generischen Funktionen aus PROJ-2 (`getRecord`, `listRecords`, `updateRecord`)
- Zugriff nur für eingeloggte Nutzer mit Rolle Bearbeiter oder Freigeber (PROJ-1)

## Open Questions
- [ ] Falls sich die Annahme "wenige Dutzend bis ~200 Geräte pro Firma" als falsch herausstellt, muss Pagination nachgerüstet werden — PROJ-2 unterstützt das bereits (Paging-Cursor), die UI müsste dann ergänzt werden

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Keine Neuanlage von Geräten in PROJ-3 (Abweichung vom ursprünglichen PRD-Eintrag) | Neue Geräte entstehen weiterhin ausserhalb des Tools, direkt in Dataverse/Dynamics; PROJ-3 deckt das Tagesgeschäft (Stammdaten/Status pflegen) ab | 2026-10-05 |
| Prüfungs-Felder (letzte Prüfung, Status, Prüfer) sind in PROJ-3 nur lesend | Sauberer Schnitt nach Single Responsibility: diese Felder werden ausschliesslich über das Anlegen eines Prüfberichts in PROJ-4 gesetzt, analog zum (dort allerdings vermischten) Verhalten der bestehenden Power App | 2026-10-05 |
| Artikel-Verknüpfung und Standort-/Firma-Zuordnung sind nach Anlage unveränderlich | Verhindert versehentliches Verschieben von Geräten zwischen Kunden oder Austauschen der Artikel-Referenz | 2026-10-05 |
| Innerhalb einer Firma zusätzlich nach Standort filterbar, Standort pro Gerät angezeigt | Beim Architektur-Review festgestellt: ein Gerät hängt technisch am Standort, nicht direkt an der Firma (siehe Tech Design) — eine Firma mit mehreren Standorten (Niederlassungen) braucht daher eine feinere Filterung als nur "Firma" | 2026-10-05 |
| Pflicht: Firma zuerst auswählen, bevor Geräte geladen werden | Dieses Tool zeigt (anders als das Kundenportal) Geräte über alle Firmen hinweg — ohne Firma-Zwang müsste eine unübersichtlich grosse Gesamtliste geladen werden | 2026-10-05 |
| Volltextsuche + Lagerort-Filter innerhalb der Firma | Übernommen aus der bewährten Legacy-App-UX, ohne deren Status-Tabs (da Status hier nur read-only ist) | 2026-10-05 |
| ~~Nur Gerätename ist Pflichtfeld~~ → Gerätename ist read-only, keine Pflichtfelder mehr; keine Datums-Plausibilitätsprüfung | *Korrigiert 2026-10-05 beim ersten echten Test:* `bmvcc_geraetename` ist ein automatisch generiertes Dataverse-Feld, nicht frei editierbar — alle verbleibenden Stammdatenfelder bleiben optional, analog zum bisherigen freien Umgang in der Legacy-App | 2026-10-05 |
| Last-Write-Wins bei gleichzeitiger Bearbeitung, kein Konfliktschutz | Konsistent mit der PROJ-2-Entscheidung; bei wenigen gleichzeitigen internen Nutzern ein unwahrscheinliches Szenario | 2026-10-05 |
| Keine Pagination in der Geräteliste | Erwartete Firmengrösse (wenige Dutzend bis ~200 Geräte) macht das Laden der kompletten Liste praktikabel | 2026-10-05 |
| Kein Löschen von Geräten | Konsistent mit der PRD-Philosophie, keine Fachdaten echt zu löschen; Ablegereife dient bereits als "ausser Betrieb"-Marker | 2026-10-05 |
| Bearbeiter und Freigeber werden bei der Geräte-Verwaltung gleich behandelt | Die Rollenunterscheidung aus dem PRD betrifft nur die Sync-Freigabe (PROJ-5), nicht die Datenpflege | 2026-10-05 |

### Technical Decisions
<!-- Added by /architecture -->
| Decision | Rationale | Date |
|----------|-----------|------|
| Server Actions statt eigener API-Routen | Nur dieses Frontend konsumiert die Daten; kein eigener REST-Layer nötig, direkter Aufruf der PROJ-2-Funktionen | 2026-10-05 |
| Zweistufiges Laden: erst Standorte der Firma, dann deren Geräte | Die Dataverse-Verknüpfung läuft über den Standort, nicht direkt über die Firma (beim Architektur-Review anhand der verifizierten Feldnamen im Kundenportal-Repo festgestellt) | 2026-10-05 |
| Standort-Filter/-Spalte nur bei Firmen mit mehr als einem Standort sichtbar | Vermeidet unnötige UI bei der grossen Mehrheit der Firmen mit nur einem Standort | 2026-10-05 |
| Suche/Lagerort-/Standort-Filter clientseitig auf der geladenen Firma-Liste statt serverseitig pro Eingabe | Erwartete Firmengrösse (≤~200 Geräte) macht das praktikabel; sofortiges Ergebnis ohne Server-Rundtrip | 2026-10-05 |
| Eigene Route `/geraete/[id]` statt Dialog für die Bearbeitung | Genug Felder für einen Dialog zu eng; direkt verlinkbar | 2026-10-05 |
| Direkter Aufruf einer Geräte-Detailseite ohne vorherige Firma-Auswahl erlaubt | Firma-Auswahl auf der Listenseite ist Navigationshilfe, kein Zugriffs-Gate; Detailseite lädt das Gerät direkt per ID | 2026-10-05 |
| Formular-Validierung mit Zod + react-hook-form | Projekt-Konvention, bereits vorhandene Abhängigkeiten | 2026-10-05 |
| Neue shadcn-Komponenten `command`/`popover` für die Firma-Combobox | Bisher nur eine einfache `select`-Komponente installiert, die bei vielen Firmen nicht durchsuchbar wäre | 2026-10-05 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### A) Component Structure
```
Geräte-Seite (/geraete)
+-- Firma-Auswahl (durchsuchbare Combobox, Pflicht-Einstieg)
+-- Geräteliste (erst sichtbar nach Firma-Auswahl)
|   +-- Standort-Filter (Dropdown, nur sichtbar wenn die Firma >1 Standort hat)
|   +-- Suchfeld (Gerätename / Barcode / Seriennummer)
|   +-- Lagerort-Filter (Dropdown, Optionen aus den geladenen Geräten abgeleitet)
|   +-- Tabelle (Name, Barcode, Standort, Lagerort, Status-Badge)
|   +-- Leerer-Zustand-Hinweis ("Keine Geräte für diese Firma gefunden")
+-- Geräte-Detailseite (/geraete/[id])
    +-- Stammdaten-Formular (editierbar: Name, Barcode, Seriennummer, Lagerort,
    |   Bemerkungen, Zubehör, Herstelljahr, Erstgebrauch, Ablegereife)
    +-- Prüfstatus-Bereich (read-only: Status-Badge, letzte Prüfung, Prüfer)
    +-- Artikel-Info (read-only)
    +-- Standort- & Firma-Zugehörigkeit (read-only)
    +-- Speichern-Button + Fehlermeldungs-Bereich (bei Dataverse-Fehlern)
```

### B) Data Model (plain language)
Kein eigenes Datenmodell — alle Daten kommen live aus Dataverse über die generischen Funktionen aus PROJ-2, nichts wird zwischengespeichert. Wichtig für das Verständnis: **ein Gerät gehört technisch zu einem Standort, nicht direkt zu einer Firma — eine Firma kann mehrere Standorte (Niederlassungen) haben.**
- **Firma-Auswahl:** Liste der Firmen wird aus Dataverse gelesen (nur lesend, keine eigene Firma-Verwaltung — siehe PRD Non-Goal)
- **Standorte einer Firma:** Werden nach der Firma-Auswahl nachgeladen, um daraus die zugehörigen Geräte zu bestimmen und — falls mehr als einer existiert — den Standort-Filter zu befüllen
- **Geräteliste:** Alle Geräte aller Standorte der ausgewählten Firma werden in einem Rutsch geladen (siehe Product Decision "keine Pagination")
- **Gerät-Detail:** Stammdaten (editierbar) + Prüfstatus/Artikel/Standort/Firma (read-only, aus verknüpften Dataverse-Datensätzen)

### C) Tech Decisions
- **Server Actions statt eigener API-Routen:** Laden der Firmenliste, Standorte, Geräteliste und Speichern erfolgen über Next.js Server Actions, die direkt die PROJ-2-Funktionen (`listRecords`, `getRecord`, `updateRecord`) aufrufen. Kein eigener REST-Layer nötig, da nur dieses eine Frontend die Daten konsumiert — konsistent mit PROJ-2s Design als reine Server-Bibliothek.
- **Geräte einer Firma werden in zwei Schritten geladen:** Erst werden die Standorte der ausgewählten Firma gelesen, dann die Geräte, die zu einem dieser Standorte gehören (da die Verknüpfung in Dataverse über den Standort läuft, nicht direkt über die Firma). Für eine Firma mit typischerweise sehr wenigen Standorten ist das ein vertretbarer zusätzlicher Lesevorgang.
- **Standort-Filter/-Spalte nur sichtbar, wenn die Firma mehr als einen Standort hat:** Vermeidet unnötige UI bei der grossen Mehrheit der Firmen mit nur einem Standort.
- **Suche/Lagerort-/Standort-Filter laufen clientseitig auf der bereits geladenen Firma-Liste, nicht pro Tastendruck gegen Dataverse:** Da pro Firma nur wenige Dutzend bis ~200 Geräte erwartet werden (Product Decision "keine Pagination"), wird die komplette Liste einmal geladen und Suche/Filter direkt im Browser angewendet — sofortiges Ergebnis ohne Server-Rundtrip pro Eingabe, analog zum bewährten Verhalten der Legacy-App. Die Lagerort-Filter-Optionen werden aus den geladenen Geräten abgeleitet (keine separate Dataverse-Abfrage).
- **Eigene Detailseite (`/geraete/[id]`) statt Dialog/Modal:** Genug Felder, dass ein Dialog zu eng würde; eine eigene Route ist zudem direkt verlinkbar/mit Browser-Zurück navigierbar.
- **Direkter Aufruf einer Geräte-Detailseite ohne vorherige Firma-Auswahl ist erlaubt** *(löst die offene Frage aus der Spec)*: Die Detailseite lädt das Gerät über seine ID direkt per `getRecord` und zeigt dessen Standort-/Firma-Zugehörigkeit (durch Nachladen der jeweiligen Datensätze) als Kontext an — die Firma-Auswahl auf der Listen-Seite ist reine Navigationshilfe, kein Zugriffs-Gate.
- **Formular-Validierung mit Zod + react-hook-form** (bereits Projekt-Abhängigkeiten): keine Pflichtfelder mehr, da Gerätename inzwischen read-only ist (siehe Product Decisions).
- **Gerätename wird read-only in der Info-Karte angezeigt, nicht mehr als Formularfeld** *(Korrektur 2026-10-05)*: automatisch generiertes Dataverse-Feld, daher aus dem editierbaren Formular entfernt und nicht mehr Teil des an `updateGeraetStammdaten` übergebenen Payloads.
- **Bei Speicherfehlern bleibt der Formular-Zustand erhalten** und die aus PROJ-2 kommende Fehlerkategorie (`DataverseError`) wird in eine verständliche Meldung übersetzt — kein automatisches Zurücksetzen oder erneutes Laden des Formulars.
- **Kein eigener Zwischenspeicher/Cache:** Jeder Seitenaufruf lädt frisch von Dataverse, passend zum PRD-Grundsatz "live lesen, keine eigene Datenhaltung".

### D) Dependencies
- `command` und `popover` (shadcn/ui) — Bausteine für die durchsuchbare Firma-Combobox, bisher nicht installiert (`npx shadcn@latest add command popover`)
- Keine neuen npm-Pakete über das shadcn-CLI hinaus — Formular-Validierung (`zod`, `react-hook-form`) ist bereits vorhanden

## Implementation Notes (Frontend)

Umgesetzt (UI + Server Actions in einem Schritt, kein separater `/backend`-Durchlauf nötig — PROJ-2 ist bereits die Backend-Schicht, hier kamen keine neuen API-Routen/Tabellen hinzu):

- `src/lib/dataverse/geraete.ts` — domänenspezifische Funktionen auf Basis von PROJ-2 (`listFirmen`, `listStandorteForFirma`, `listGeraeteForStandorte`, `getGeraet`, `getFirma`, `getStandort`, `getArtikel`, `updateGeraetStammdaten`); mappt rohe Dataverse-Feldnamen auf ein `Geraet`/`Firma`/`Standort`/`ArtikelInfo`-Objekt
- `src/app/(protected)/geraete/actions.ts` — Server Action `saveGeraetStammdaten` mit Zod-Validierung (nur `name` Pflichtfeld, siehe Spec), übersetzt `DataverseError` in eine Nutzer-Meldung
- `src/components/firma-combobox.tsx` — durchsuchbare Firma-Auswahl (shadcn `command`+`popover`, neu installiert)
- `src/components/geraete-liste.tsx` — Geräte-Tabelle mit clientseitiger Suche/Lagerort-/Standort-Filterung (Standort-Filter/-Spalte nur bei >1 Standort sichtbar)
- `src/components/geraet-form.tsx` — Bearbeitungsformular (react-hook-form + zod), zeigt Status/Prüfung/Prüfer/Firma/Standort/Artikel read-only
- `src/lib/status-badge.ts` — 1:1 aus dem Kundenportal-Repo übernommene Status→Badge-Farbe-Zuordnung
- `src/app/(protected)/geraete/page.tsx`, `src/app/(protected)/geraete/[id]/page.tsx` — die beiden Routen

**Sicherheitsfix während der Umsetzung:** `firmaId` kommt direkt aus einem URL-Query-Parameter und wurde vor dem Einbau in `listStandorteForFirma` unquotiert in den OData-`$filter` eingesetzt — ohne Prüfung wäre das eine OData-Injection-Lücke gewesen (ein präparierter Wert hätte zusätzliche Filterbedingungen einschleusen können). Jetzt wird `firmaId` (und jede `standortId`) vor Verwendung gegen ein striktes GUID-Pattern geprüft.

**Offene Verifikationspunkte gegen die echte Dataverse-Umgebung** (konnten in dieser Umgebung nicht gegen echte Daten getestet werden, siehe PROJ-2 QA-Hinweis):
- Feldname `bmvcc_erstgebrauch`: stammt nur aus der Legacy-Power-App-Quelle (`docs/legacy-power-app/`), nicht aus dem gegen die echte Umgebung verifizierten Sync-Job-Mapping (das Feld wird dort nicht benötigt und daher nicht synct)
- Feldname `bmvcc_notitzen` für "Bemerkungen": laut verifiziertem Sync-Job-Mapping korrekt (`src/lib/sync/jobs.ts` im Kundenportal-Repo, Kommentar "Verified against the real environment on 2026-09-16") — widerspricht der Legacy-Power-App-YAML, die stattdessen `bmvcc_bemerkungen` verwendet; hier wurde bewusst der verifizierten Quelle gefolgt
- OData-Filtersyntax für Lookup-Gleichheit (`_bmvcc_standort_value eq <guid ohne Anführungszeichen>`) ist Standard-Dataverse-Konvention, aber nicht gegen die echte Umgebung getestet

**Nicht möglich in dieser Umgebung:** Ein echter Login-Test (Entra-ID-SSO) oder ein Abgleich gegen echte Dataverse-Daten — der Build läuft sauber durch und `/geraete`, `/geraete/[id]` leiten unauthentifiziert korrekt zu `/login` weiter (per Smoke-Test gegen den laufenden Dev-Server geprüft), aber die eigentliche Funktionalität (Firma auswählen, Geräte sehen, speichern) muss vom Nutzer im Browser mit echtem Login verifiziert werden.

**Produktions-Incident beim ersten echten Test (2026-10-05):** Beim ersten Öffnen von `/geraete` mit echtem Login kam `Keine ausreichende Berechtigung ... missing prvReadbmvcc_firma privilege`. Ursache: Die in PROJ-2 eingerichtete Security Role des Applikationsbenutzers deckte bewusst nur Geräte und Prüfberichte ab (siehe PROJ-2 Product Decisions) — Firma, Standort und Artikel waren dort nicht vorgesehen, weil PROJ-2 zum Zeitpunkt seiner Umsetzung diesen Bedarf noch nicht kannte. Behoben durch Ergänzen von Read-Rechten auf Firma (`bmvcc_firma`), Standort (`bmvcc_organizationlocation`) und Artikel (`bmvcc_artikel`) in derselben Security Role (siehe PROJ-2 Technical Requirements). Vom Nutzer bestätigt: funktioniert jetzt.

**Bug gefunden beim ersten echten Test (2026-10-05):** "Herstelljahr" wurde als reines Textfeld angezeigt statt als Kalender-Datum wie Erstgebrauch/Ablegereife. Nutzer bestätigt: `bmvcc_herstelljahr` ist in Dataverse ebenfalls ein Datumsfeld — `GeraetForm` entsprechend korrigiert (`type="date"`, analog zu den anderen beiden).

**Folgebug (2026-10-05):** Nach der Umstellung zeigte das Herstelljahr-Feld keinen Wert mehr an. Ursache: `bmvcc_herstelljahr` liefert offenbar einen vollen ISO-Zeitstempel (z.B. `2020-03-14T23:00:00Z`) statt eines reinen Datums — `<input type="date">` akzeptiert nur exakt `YYYY-MM-DD` und bleibt bei allem anderen leer. Behoben durch eine `toDateInputValue()`-Hilfsfunktion in `GeraetForm`, die bei allen drei Datumsfeldern (Herstelljahr, Erstgebrauch, Ablegereife) nur die ersten 10 Zeichen verwendet — vorsorglich auch bei den beiden bereits funktionierenden Feldern angewendet, falls sie zufällig denselben Zeitstempel-Fall nur in bestimmten Datensätzen zeigen.

**UX-Lücke gefunden beim ersten echten Test (2026-10-05):** Die Detailseite hatte keinen Weg zurück zur Geräteliste — der Nutzer musste die Firma jedes Mal neu auswählen. Behoben: Der Link von der Liste zur Detailseite trägt jetzt `?firmaId=` mit, und die Detailseite zeigt oben einen "Zurück zur Liste"-Link, der dorthin zurückführt. Bei einem direkten Aufruf der Detailseite ohne diesen Query-Parameter (z.B. über ein Lesezeichen) wird ersatzweise die über das Gerät aufgelöste Firma verwendet — nur wenn gar keine Firma ermittelbar ist, führt der Link zur leeren Firma-Auswahl.

**Nachtrag (2026-10-05, Nutzerwunsch):** Zusätzlich zum Link oben auf der Seite gibt es jetzt auch einen "Zurück"-Button direkt neben "Speichern" am Ende des Formulars (derselbe Ziel-Link) — vermeidet Hochscrollen nach dem Ausfüllen des Formulars.

**Bug gefunden beim ersten echten Test (2026-10-05):** Die Firma-Suche in der Combobox zeigte bei einer Eingabe wie "reha" weiterhin offensichtlich nicht passende Firmen an, der gesuchte Eintrag war erst nach Scrollen sichtbar. Ursache: `cmdk`s eingebaute Fuzzy-Suche vergibt bei vielen ähnlich langen Firmennamen auch unpassenden Treffern oft einen Score > 0 und blendet sie dadurch nicht aus. Behoben, indem `Command` auf `shouldFilter={false}` gesetzt und stattdessen selbst eine einfache, vorhersagbare Teilstring-Suche (case-insensitive `includes()`) über die Firmenliste gelegt wurde.

**Architektur-Nachtrag (2026-10-05, Nutzerwunsch):** Die Firma-Auswahl wurde von `/geraete` auf `/start` verschoben und von einer pro-Seitenaufruf-Auswahl (`?firmaId=`-Query-Parameter) zu einer **global für die Session geltenden "aktuellen Firma"** umgebaut — gilt ab sofort auch als Grundlage für künftige Features wie PROJ-4 (Prüfberichte), ohne dass dort erneut ausgewählt werden muss:
- Neu: `src/lib/firma-session.ts` — `getCurrentFirmaId()`/`setCurrentFirmaId()`, hinterlegt die Auswahl in einem httpOnly-Cookie (`aktuelle_firma_id`, 30 Tage gültig)
- `/start` zeigt jetzt die Firma-Combobox (inkl. "Weiter zu Geräte"-Button, wenn bereits eine Firma gewählt ist)
- `/geraete` liest die Firma nicht mehr aus der URL, sondern aus der Session; ohne gewählte Firma erscheint ein Hinweis mit Link zu `/start`
- `AppHeader` zeigt die aktuell gewählte Firma als Link zu `/start` (zum Wechseln), damit der (unsichtbare) Session-Zustand für den Nutzer jederzeit erkennbar bleibt
- Die Detailseiten-Navigation (`/geraete/[id]`, "Zurück zur Liste") braucht dadurch keinen `?firmaId=`-Parameter mehr — vereinfacht auf einen festen Link zu `/geraete`

Betrifft Component-Structure/Data-Model/Tech-Decisions im Tech-Design-Abschnitt dieser Spec nur indirekt (dort weiterhin als "Firma-Auswahl" beschrieben, jetzt auf `/start` statt `/geraete` verortet) — keine separate Überarbeitung dieser Abschnitte, da die fachliche Absicht (Firma vor Geräte-Zugriff festlegen) unverändert bleibt.

**Nachtrag (2026-10-05, Nutzerwunsch):** `bmvcc_kundenid` ("Kunden-eigene Gerätebezeichnung", bereits aus dem Kundenportal-Repo als PROJ-7-Zusatzspalte bekannt, dort aber ausdrücklich *nicht* für die Firma-Zuordnung verwendet) ergänzt:
- Neue Spalte "Kunden-ID" in der Geräteliste, auch Teil der Volltextsuche
- Neues editierbares Feld "Kunden-eigene Gerätebezeichnung" im Stammdaten-Formular (damit Bearbeiter es im Kundenauftrag anpassen können)
- Stammdaten-Set der Spec dadurch implizit erweitert — ergänzt in `GERAET_SELECT`/`Geraet`/`GeraetStammdatenInput` in `src/lib/dataverse/geraete.ts`

**Nachtrag (2026-10-05, Nutzerwunsch):** Zusätzliche Spalte "Letzte Prüfung" in der Geräteliste, direkt hinter "Lagerort" — bisher nur im Detail-Formular read-only sichtbar, jetzt auch in der Liste auf einen Blick erkennbar. Dafür `formatDatum()` aus `geraet-form.tsx` in ein gemeinsames `src/lib/format.ts` extrahiert, um Duplikation zu vermeiden.

## QA Test Results

**Tested:** 2026-10-05
**Tester:** QA Engineer (AI), aufbauend auf einer ausgiebigen Live-Testrunde des Nutzers selbst (echter Login, echte Dataverse-Daten)
**Hinweis zur Testmethode:** Der Nutzer hat diese Runde bereits selbst live im Browser mit echten Daten getestet und dabei 7 echte Bugs/Lücken gefunden, die alle noch während der Testrunde behoben wurden (siehe Implementation Notes für Details zu jedem einzelnen). Diese QA-Runde ergänzt das um Code-Review, einen Security-Audit und automatisierte Tests für den bisher ungetesteten Code (`geraete.ts`, `actions.ts`, `firma-session.ts`); ein zusätzlicher manueller Playwright-E2E-Durchlauf ist in dieser Umgebung weiterhin nicht möglich (kein echter Entra-Login/keine echten Dataverse-Daten hier verfügbar).

### Acceptance Criteria Status
Alle 12 Acceptance Criteria erfüllt — die meisten direkt vom Nutzer live bestätigt ("funktioniert", "alles ok"), die übrigen (Standort-Filter-Sichtbarkeits-Schwelle bei genau einem vs. mehreren Standorten, Lagerort-Filter, Leer-Zustände) per Code-Review verifiziert.

- [x] Hinweis + Link zu `/start` ohne gewählte Firma
- [x] Firma-Auswahl bleibt über die Session erhalten (Cookie, 30 Tage) — vom Nutzer bestätigt
- [x] Geräteliste zeigt ausschliesslich Geräte der gewählten Firma über alle Standorte hinweg
- [x] Standort-Filter/-Spalte nur bei >1 Standort sichtbar (Code-Review: `standorte.length > 1`)
- [x] Kein Standort-Filter bei genau einem Standort (Code-Review, derselbe Schalter)
- [x] Suche nach Gerätename/Barcode/Seriennummer (und zusätzlich Kunden-ID, siehe Nachtrag) funktioniert
- [x] Lagerort-Filter funktioniert (Code-Review: korrekt aus geladenen Geräten abgeleitet)
- [x] "Keine Geräte gefunden"-Hinweis bei leerer gefilterter/ungefilterter Liste
- [x] Detailansicht zeigt Stammdaten + read-only Prüfungs-Felder — vom Nutzer bestätigt
- [x] Speichern übernimmt Änderungen in Dataverse — vom Nutzer bestätigt
- [x] Verständliche Fehlermeldung + Datenerhalt bei Speicherfehler (Code-Review: `register()` ist unkontrolliert, kein `reset()` im Fehlerfall — Werte bleiben im Formular)
- [x] Gerätename/Artikel/Standort/Firma read-only — vom Nutzer bestätigt (Gerätename-Korrektur war einer der 7 Bugs dieser Runde)

### Edge Cases Status
- [x] Last-Write-Wins bei gleichzeitiger Bearbeitung (Code-Review: kein Konfliktschutz implementiert, wie geplant)
- [x] Firma mit bis zu ~200 Geräten: komplette Liste wird geladen, clientseitig gefiltert (Code-Review)
- [x] Direkter Aufruf einer Geräte-Detailseite ohne vorherige Firma-Auswahl funktioniert weiterhin (lädt über die ID, unabhängig von der Session-Firma)
- [x] Firma-Dropdown durchsuchbar (nach Bugfix: eigene Teilstring-Suche statt cmdk-Fuzzy-Suche)

### Security Audit Results (Red Team / Code Review)
- [x] Zugriff auf alle `/geraete`-Routen nur für eingeloggte Nutzer mit Rolle Bearbeiter/Freigeber (proxy.ts-Gate aus PROJ-1, unverändert)
- [x] Keine Rollen-Differenzierung nötig/vorhanden (Bearbeiter = Freigeber für diese Funktion, wie in Product Decisions festgelegt)
- [x] OData-Injection über `firmaId`/`standortId` verhindert (GUID-Validierung in `geraete.ts`, bereits während der Umsetzung gefunden und behoben, jetzt zusätzlich per Unit-Test abgesichert)
- [x] `id`-Routenparameter der Detailseite wird über PROJ-2s `getRecord`-GUID-Validierung abgesichert
- [x] Keine XSS-Angriffsfläche: alle Werte werden über React-JSX ausgegeben (automatisches Escaping), kein `dangerouslySetInnerHTML`
- [x] Session-Cookie (`aktuelle_firma_id`) ist `httpOnly`, `sameSite=lax`, `secure` in Produktion, enthält keine sensiblen Daten (nur eine Firma-GUID)
- [x] Keine Secrets im Client-Bundle (Dataverse-Zugangsdaten bleiben vollständig in PROJ-2 serverseitig)
- [ ] BUG: siehe BUG-1 (Low) — mehrfache redundante Dataverse-Aufrufe für dieselbe Firma pro Seitenaufruf

### Bugs Found

#### BUG-1: Redundante `getFirma`-Aufrufe bei jedem `/start`-Aufruf
- **Severity:** Low
- **Steps to Reproduce:**
  1. `/start` lädt selbst `getFirma(currentFirmaId)` für den "Weiter zu Geräte"-Button
  2. `AppHeader` (wird auf jeder geschützten Seite gerendert, auch auf `/start` selbst) lädt unabhängig davon erneut `getFirma(currentFirmaId)` für die Kopfzeilen-Anzeige
  3. Erwartet: Die aktuelle Firma wird pro Seitenaufruf einmal geladen
  4. Tatsächlich: Ein Aufruf von `/start` löst zwei identische Dataverse-Anfragen aus; jede andere Seite mit `AppHeader` löst zusätzlich zu ihrem eigenen Bedarf eine weitere `getFirma`-Anfrage aus
- **Priority:** Nice to have (bei diesem internen, wenig frequentierten Tool kein praktisches Problem, aber ein einfacher Optimierungspunkt für später, z.B. Firma-Name direkt im Cookie mitführen statt bei jedem Aufruf nachzuladen)

#### BUG-2: Keine Begrenzung der OR-Filter-Kette bei sehr vielen Standorten einer Firma
- **Severity:** Low
- **Steps to Reproduce:**
  1. `listGeraeteForStandorte()` baut für jede Firma eine OData-`$filter`-Kette mit einer OR-Bedingung pro Standort
  2. Erwartet: Auch bei ungewöhnlich vielen Standorten einer Firma funktioniert die Abfrage zuverlässig
  3. Tatsächlich: Bei sehr vielen Standorten (deutlich mehr als in der Praxis erwartet) könnte die resultierende Filter-/URL-Länge an Dataverse-Grenzen stossen — kein Safeguard vorhanden
- **Priority:** Nice to have (unrealistisch bei der erwarteten Firmenstruktur; falls doch relevant, späterer Wechsel auf eine `Containsvalues`-Funktion oder mehrere Teilabfragen)

### Summary
- **Acceptance Criteria:** 12/12 erfüllt
- **Bugs Found während dieser QA-Runde:** 2 total (0 critical, 0 high, 0 medium, 2 low) — beide "Nice to have", nicht blockierend
- **Zusätzlich während der Live-Testrunde des Nutzers gefunden und bereits behoben (siehe Implementation Notes):** 7 (Zurück-Navigation fehlte, Herstelljahr-Feldtyp, Datums-Zeitstempel-Truncation, Firma-Suche, Gerätename-read-only, Firma-Auswahl-Architektur, Kunden-ID-Feld — keines davon mehr offen)
- **Security:** Keine offenen Findings ausser den zwei Low-Priority-Nice-to-haves oben
- **Neue Unit-Tests:** 22 (`geraete.test.ts`, `actions.test.ts`, `firma-session.test.ts`) — Testsuite insgesamt jetzt 62/62 grün
- **Production Ready:** YES
- **Recommendation:** Freigegeben für `/deploy`. BUG-1/BUG-2 können bei Gelegenheit nachgezogen werden, sind aber kein Hindernis.

## Deployment
_To be added by /deploy_
