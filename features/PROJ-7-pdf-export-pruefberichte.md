# PROJ-7: PDF-Export Prüfberichte (kundenspezifisches Template)

## Status: In Progress
**Created:** 2026-10-05
**Last Updated:** 2026-10-05

## Dependencies
- Requires: PROJ-1 (Entra-ID-Login mit Rollen) — Bearbeiter/Freigeber müssen eingeloggt sein
- Requires: PROJ-2 (Dataverse-Web-API-Anbindung) — Datenquelle für Geräte/Prüfberichte
- Requires: PROJ-3 (Geräte-Verwaltung) — liefert die Geräteliste inkl. Filter, von der aus exportiert wird
- Requires: PROJ-4 (Prüfberichte-Verwaltung) — liefert den "aktuellsten aktiven Prüfbericht" pro Gerät
- **Neue externe Abhängigkeit:** Microsoft Graph API / SharePoint-Zugriff auf die bestehende Dokumentbibliothek "Kunden" (`https://obsihofer.sharepoint.com/Kunden`) — die bestehende Entra-ID-App-Registrierung (PROJ-1) muss um eine zusätzliche, auf diese Site beschränkte Graph-Berechtigung erweitert werden. Erfordert Admin-Consent in Azure AD, siehe Open Questions.

## User Stories
- Als Bearbeiter möchte ich aus der Geräteliste heraus ein PDF mit allen (gefilterten) Geräten einer Firma inkl. ihres aktuellsten Prüfberichts generieren, damit ich dieses dem Kunden wie bisher zukommen lassen kann — ohne die Daten manuell zusammenzutragen.
- Als OBSI Hofer (Bearbeiter) möchte ich, dass der Export automatisch das bereits für diese Firma bestehende Excel-Layout (Spalten, Branding, Farbcodierung) übernimmt, damit der Kunde weiterhin sein gewohntes Format erhält, ohne dass ich dafür etwas Neues einrichten muss.
- Als Bearbeiter möchte ich, dass das generierte PDF automatisch am gleichen Ort landet, wo ich es bisher manuell abgelegt habe (`Kunden/{Firma}/Prüfberichte/{Jahr}/`), damit sich am bestehenden Ablage-Ort/der Namenskonvention nichts ändert.
- Als Bearbeiter möchte ich, falls für eine Firma noch keine Vorlage im aktuellen Jahresordner existiert, trotzdem ein PDF im gewohnten Standardformat generieren können, damit der Export nie hart blockiert.

## Out of Scope
- Versand des PDFs an den Kunden (z.B. per E-Mail) — bleibt wie bisher manuell durch den Bearbeiter, kein Non-Goal-Bruch gegenüber dem Kundenportal-PRD ("keine automatischen Benachrichtigungen")
- Editor/Oberfläche im Admin-Tool zum Erstellen oder Bearbeiten der Excel-Vorlage — die Vorlage wird ausschliesslich direkt in Excel/SharePoint erstellt und gepflegt, exakt wie bisher
- Schreibender Zugriff auf die reale, vom Bearbeiter manuell gepflegte Jahres-Excel-Datei — das System liest sie ausschliesslich als Vorlage (Spalten/Formatierung), ändert sie aber nie (siehe Product Decisions)
- Oberfläche im Admin-Tool zur Pflege einer Firma-Zuordnung — entfällt komplett, da die Zuordnung implizit über die bestehende Ordnerstruktur (`Kunden/{Firma}/Prüfberichte/{aktuelles Jahr}/`) erfolgt
- Checkbox-Auswahl einzelner Geräte — der Export verwendet immer die aktuell gefilterte Geräteliste (siehe Product Decisions)
- Mehrere Prüfberichte/Historie pro Gerät im selben PDF — nur der aktuellste aktive Prüfbericht pro Gerät erscheint (siehe Product Decisions)
- Vorschau des PDFs im Admin-Tool vor dem Download — Datei wird direkt heruntergeladen bzw. im bestehenden Jahresordner abgelegt, keine In-App-Vorschau
- Eigene Firma-übergreifende Artikel-Stammdatenpflege — unverändert gegenüber dem restlichen Tool (Non-Goal laut PRD)

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

- [ ] Angenommen im Ordner `Kunden/{Firma}/Prüfberichte/{aktuelles Jahr}/` der ausgewählten Firma liegt eine Excel-Datei, wenn der Bearbeiter auf der Geräteliste "PDF generieren" klickt, dann wird ein PDF erzeugt, das deren Spalten/Formatierung/Branding übernimmt und alle aktuell gefilterten Geräte enthält
- [ ] Angenommen im Jahresordner der Firma liegt keine Excel-Datei, wenn "PDF generieren" geklickt wird, dann wird stattdessen eine zentrale Standard-Vorlage verwendet (kein Fehler, kein blockierter Export)
- [ ] Angenommen ein Gerät in der gefilterten Liste hat einen aktuellen aktiven Prüfbericht, wenn das PDF generiert wird, dann erscheinen Prüfdatum, Prüfer, Prüfergebnis und Bemerkung dieses Prüfberichts in der entsprechenden Zeile
- [ ] Angenommen ein Gerät in der gefilterten Liste hat noch nie einen aktiven Prüfbericht erhalten, wenn das PDF generiert wird, dann erscheint dieses Gerät nicht im PDF
- [ ] Angenommen der aktuellste aktive Prüfbericht eines Geräts hat das Ergebnis "Freigabe", wenn das PDF generiert wird, dann ist diese Zeile/Zelle grün hervorgehoben
- [ ] Angenommen der aktuellste aktive Prüfbericht eines Geräts hat das Ergebnis "keine Freigabe", wenn das PDF generiert wird, dann ist diese Zeile/Zelle rot hervorgehoben
- [ ] Angenommen der aktuellste aktive Prüfbericht eines Geräts hat das Ergebnis "letzte Freigabe", wenn das PDF generiert wird, dann übernimmt die Zelle die Farbe, die in der jeweiligen Vorlage für diesen Wert bereits per bedingter Formatierung hinterlegt ist (kann je nach Vorlage unterschiedlich sein — siehe Product Decisions)
- [ ] Angenommen die aktuell gefilterte Geräteliste ist leer, wenn "PDF generieren" geklickt wird, dann erscheint eine Fehlermeldung ("Keine Geräte für diesen Export gefunden") statt eines leeren PDFs
- [ ] Angenommen ein PDF wurde erfolgreich generiert, wenn der Vorgang abgeschlossen ist, dann wird es sowohl zum Download angeboten als auch automatisch in `Kunden/{Firma}/Prüfberichte/{aktuelles Jahr}/` abgelegt, mit einem Dateinamen nach dem bestehenden Muster `{Datum} Prüfbericht Absturzsicherungen - {Firma}{ - Lagerort, falls gefiltert}.pdf`
- [ ] Angenommen der Lagerort-Filter in der Geräteliste ist beim Export gesetzt (z.B. "Trakt 4"), wenn das PDF generiert wird, dann enthält der Dateiname den Zusatz " - Trakt 4"; ist kein Lagerort-Filter gesetzt, entfällt dieser Zusatz
- [ ] Angenommen für eine Firma existiert im aktuellen Jahresordner eine Excel-Datei, wenn das PDF generiert wird, dann bleibt diese reale Datei danach unverändert (das System liest sie nur, schreibt nie in sie hinein)

## Edge Cases
- Firma-Ordner in SharePoint ganz ohne Jahresordner für das laufende Jahr (z.B. zu Jahresbeginn, bevor die erste Kopie angelegt wurde) → Standard-Vorlage (siehe AC), kein Fehler; der generierte Export wird trotzdem in einem neu angelegten Jahresordner abgelegt
- Jahresordner enthält mehrere Excel-Dateien (z.B. eine Kopie mit Zusatz wie "- Kopie") → die zuletzt geänderte Datei gilt als Vorlage (deterministisch, keine Fehlermeldung)
- Der SharePoint-Ordnername einer Firma weicht vom exakten Dataverse-Firmennamen ab (in der Praxis beobachtet, z.B. abweichende Schreibweise oder zusätzliche Standort-Unterordner) → wird als "Vorlage nicht gefunden" behandelt, fällt auf die Standard-Vorlage zurück (gleiche Behandlung wie "kein Jahresordner vorhanden" — eine exakte Namensabweichung ist aus Systemsicht nicht von "keine Vorlage vorhanden" unterscheidbar, siehe Open Questions zur endgültigen Zuordnungslogik)
- Sehr grosse Firma (mehrere hundert Geräte) → Generierung kann einige Sekunden dauern; UI muss einen Ladezustand anzeigen statt wie eine hängende Seite zu wirken
- Zwei Bearbeiter generieren zeitgleich für dieselbe Firma → unkritisch, da die reale Jahres-Datei nur lesend verwendet wird und jeder Export eine eigene neue PDF-Datei erzeugt (kein gemeinsames Schreiben, kein Konfliktrisiko)
- Microsoft Graph/SharePoint temporär nicht erreichbar → Fehlermeldung analog zu bestehenden Dataverse-Fehlerzuständen im Tool, kein Absturz der Seite
- Firma-Name oder Lagerort-Filterwert enthalten Zeichen, die in Dateinamen problematisch sind (z.B. `/`) → werden beim Ablegen bereinigt/escaped, damit das Hochladen nicht fehlschlägt
- Die reale Jahres-Datei enthält bereits von Hand ausgefüllte Prüfdaten für andere Geräte/Bereiche als die aktuell exportierten → unkritisch, da das System diese Datei nie beschreibt, sondern nur ihre Spalten/Formatierung für eine neue, separate Arbeitskopie liest

## Technical Requirements (optional)
- Security: Nur eingeloggte Bearbeiter/Freigeber (beide Rollen — reine Leseaktion auf bereits für sie sichtbare Daten, keine neue Rechteausweitung) können den Export auslösen
- Performance: Export einer durchschnittlichen Firma (geschätzt < 50 Geräte) sollte innerhalb weniger Sekunden abgeschlossen sein
- Die neue Microsoft-Graph-Berechtigung (lesender und schreibender Zugriff auf die Bibliothek "Kunden", nicht tenant-weit) muss als Application Permission in der bestehenden Azure-AD-App-Registrierung ergänzt und von einem Admin freigegeben (Consent) werden
- Die reale, vom Bearbeiter gepflegte Jahres-Excel-Datei darf vom System unter keinen Umständen verändert oder überschrieben werden — nur lesender Zugriff auf sie

## Open Questions
- [x] Welche SharePoint-Site/-Bibliothek — **geklärt:** bestehende Bibliothek "Kunden" auf `https://obsihofer.sharepoint.com`, bereits mit einem Ordner pro Firma und darin einem "Prüfberichte"-Unterordner mit Jahres-Unterordnern
- [x] Wie wird die Vorlage einer Firma zugeordnet — **geklärt:** implizit über die bestehende Ordnerstruktur `Kunden/{Firma}/Prüfberichte/{aktuelles Jahr}/`, keine Metadaten-Spalte nötig
- [x] Vorlagenformat — **geklärt:** Excel (.xlsx), nicht Word — entspricht dem bereits etablierten Prozess
- [x] Technischer Ansatz für die Umwandlung inkl. der farblichen Hervorhebung — **entschieden in `/architecture`:** Microsoft Graph übernimmt die PDF-Konvertierung; die Farbcodierung kommt automatisch aus der bereits in der Excel-Vorlage vorhandenen bedingten Formatierung (keine Custom-Lösung nötig), siehe Tech Design
- [x] Feld-Zuordnung — **entschieden in `/architecture`:** über die Spaltenüberschriften der Vorlage (Header-Zuordnung), keine Platzhalter-Syntax nötig, siehe Tech Design
- [x] Azure-AD-App-Registrierung — **entschieden in `/architecture`:** bestehende Registrierung aus PROJ-1/2 wird um eine zusätzliche, auf die Bibliothek "Kunden" beschränkte Graph-Berechtigung erweitert
- [x] Exakte Spaltenüberschriften — **verifiziert in `/backend`** anhand zweier echter Vorlagen-Dateien (Rehaklinik Bellikon, 2021 und 2026): Schreibweisen unterscheiden sich real zwischen Jahren/Firmen (z.B. "Zubehör" vs. "Zubehoer", "Lager- oder Einbauort" vs. "Einbau-/Lagerort", mit/ohne eigene "Inv.Nr."-Spalte) — die Spalten-Erkennung normalisiert daher Umlaute/Zeilenumbrüche/Interpunktion und matcht über Schlüsselwörter statt exaktem Textvergleich, siehe `src/lib/pruefbericht-export/feld-mapping.ts`
- [x] Name/Ort der zentralen Standard-Vorlage — **entschieden in `/backend`:** Pfad wird über die neue Umgebungsvariable `SHAREPOINT_STANDARD_VORLAGE_PFAD` konfiguriert (relativ zur Bibliothek "Kunden"), nicht im Code hinterlegt; der Nutzer legt die Datei an und setzt den Pfad in Vercel
- [ ] Exakte Erkennung, welcher SharePoint-Ordner zu welcher Dataverse-Firma gehört, wenn Namen nicht exakt übereinstimmen (siehe Edge Cases) — in `/backend` noch NICHT speziell behandelt: ein abweichender Ordnername führt aktuell einfach zum selben "kein Jahresordner gefunden"-Pfad wie eine fehlende Vorlage (Fallback auf Standard-Vorlage) — siehe Implementation Notes. Bei Bedarf in `/refine` eine explizite Mapping-Tabelle ergänzen, falls das in der Praxis zu oft zuschlägt

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Export verwendet immer die komplette aktuell gefilterte Geräteliste (Firma + Lagerort + Standort + Letzte-Prüfung-Filter), keine Checkbox-Einzelauswahl | Konsistent mit den bestehenden CSV-Exports im Kundenportal-Repo (PROJ-8/PROJ-10); vermeidet zusätzlichen UI-Aufwand für eine Mehrfachauswahl | 2026-10-05 |
| Pro Gerät erscheint nur der aktuellste aktive Prüfbericht, nicht die ganze Historie | Entspricht exakt dem bisherigen, manuell erstellten Referenzformat (ein Prüftermin pro Zeile); gleiches Konzept wie die bestehende PB_Bemerkung-Logik (PROJ-3/4) | 2026-10-05 |
| Geräte ganz ohne aktiven Prüfbericht werden aus dem PDF ausgeschlossen statt mit leeren Prüf-Feldern angezeigt | Das PDF soll ausschliesslich ein Nachweisdokument bereits erfolgter Prüfungen sein; ein frisch angelegtes, nie geprüftes Gerät gehört fachlich nicht in diesen Bericht | 2026-10-05 |
| Vorlagenformat ist Excel (.xlsx), nicht Word | Entspricht dem bereits real etablierten, bewährten Prozess bei OBSI Hofer (eigene Excel-Datei pro Firma/Jahr in SharePoint, siehe Implementation Notes); löst die Farbcodierung nativ über Excels bedingte Formatierung | 2026-10-05 |
| Die Vorlage wird implizit über die bestehende Ordnerstruktur ermittelt (`Kunden/{Firma}/Prüfberichte/{aktuelles Jahr}/`), keine separate Zuordnungs-Konfiguration | Diese Struktur existiert bereits für jede Firma; eine zusätzliche Zuordnung wäre doppelt gepflegte Information | 2026-10-05 |
| Das System liest die reale, vom Bearbeiter manuell gepflegte Jahres-Excel-Datei ausschliesslich als Vorlage (Spalten/Formatierung/Branding) und schreibt niemals in sie hinein — jeder Export arbeitet auf einer eigenen, neuen Kopie | Die reale Datei wird vom Bearbeiter während des Jahres weiter von Hand gepflegt (z.B. für Bereiche, die das Tool nicht erfasst) — ein automatischer Schreibzugriff könnte bestehende manuelle Einträge überschreiben oder mit Formeln kollidieren; ein rein lesender Zugriff ist risikofrei | 2026-10-05 |
| Fehlt im aktuellen Jahresordner eine Excel-Datei, wird eine zentrale Standard-Vorlage verwendet (kein Fehler) | Hält den Export auch zu Jahresbeginn oder für neue Firmen ohne bisherige Dokumentation funktionsfähig | 2026-10-05 |
| Prüfergebnis-Farbcodierung wird pro Firma von der jeweiligen Vorlage selbst bestimmt (keine global fest codierte Farbzuordnung in unserem System) | Zwei reale Beispiel-Vorlagen des Nutzers zeigen unterschiedliche Konventionen für "letzte Freigabe" (einmal neutral, einmal orange) — eine globale Regel wäre für mindestens eine der Vorlagen falsch. Da ohnehin die bereits vorhandene bedingte Formatierung jeder Vorlage automatisch übernommen wird, ist keine eigene Farblogik nötig | 2026-10-05 |
| Generiertes PDF wird sowohl zum Download angeboten als auch automatisch in genau demselben Ordner abgelegt, in dem bisher manuell erstellte PDFs dieser Firma liegen (`Kunden/{Firma}/Prüfberichte/{aktuelles Jahr}/`) | Kein neues Archiv nötig — die bestehende Ordnerstruktur ist bereits das Archiv; Bearbeiter finden neue und alte Berichte weiterhin am gewohnten Ort | 2026-10-05 |
| Dateiname folgt der bestehenden Konvention `{Datum} Prüfbericht Absturzsicherungen - {Firma}{ - Lagerort}.pdf`, wobei der Lagerort-Zusatz automatisch aus dem aktiven Lagerort-Filter der Geräteliste übernommen wird (leer, falls kein Filter gesetzt) | Reiht sich nahtlos in die historisch bereits vorhandenen Dateien ein, ohne dass der Bearbeiter den Namen manuell anpassen muss | 2026-10-05 |
| Bei mehreren Excel-Dateien im selben Jahresordner gilt die zuletzt geänderte als Vorlage | Deterministisches, einfach nachvollziehbares Verhalten ohne zusätzliche Fehlerbehandlung für einen seltenen Pflegefehler | 2026-10-05 |
| Sowohl Bearbeiter als auch Freigeber dürfen den Export auslösen | Reine Leseaktion auf Daten, die beide Rollen ohnehin bereits vollständig einsehen können — keine neue Rechteausweitung nötig | 2026-10-05 |

### Technical Decisions
<!-- Added by /architecture -->
| Decision | Rationale | Date |
|----------|-----------|------|
| Microsoft Graph API statt direkter SharePoint-REST-API | Ein Protokoll/Auth-Muster für Dateizugriff UND die PDF-Konvertierung; von Microsoft aktiv weiterentwickelt | 2026-10-05 |
| PDF-Konvertierung über die in Microsoft 365 eingebaute Graph-Funktion ("als PDF herunterladen"), keine selbst betriebene Konvertierungs-Software | Vermeidet Betrieb/Wartung einer zusätzlichen Komponente (z.B. LibreOffice) in der schlanken Vercel-Serverless-Umgebung; nutzt die ohnehin vorhandene Microsoft-365-Lizenz; rendert mit derselben Office-Engine wie Excel selbst, dadurch hohe visuelle Treue inkl. bedingter Formatierung | 2026-10-05 |
| Feld-Zuordnung über die Spaltenüberschriften der Vorlage (Header-Matching), keine Platzhalter-Syntax | Die Vorlage ist bereits eine fertig formatierte Excel-Tabelle mit sprechenden Spaltenköpfen (siehe Beispiel-PDF) — das System muss nur erkennen, welche Spalte zu welchem Datenfeld gehört, und darunter Zeilen einfügen; kein neues Konzept, das der Admin erst lernen müsste | 2026-10-05 |
| Farbliche Zellhervorhebung kommt automatisch aus der in der Vorlage bereits vorhandenen bedingten Formatierung (Excel-Standardfunktion), keine selbst geschriebene Logik für Zellfarben | Die reale Vorlage hat laut Fund bereits genau diese Funktion im Einsatz; neue Datenzeilen innerhalb des von der Regel abgedeckten Bereichs übernehmen die Formatierung automatisch — deutlich robuster und für den Admin leichter wartbar als ein Code-Workaround | 2026-10-05 |
| Die reale Jahres-Datei wird nur gelesen (Spaltenstruktur, Formatierung, bedingte Formatierungsregeln werden übernommen); der eigentliche Export arbeitet auf einer im Arbeitsspeicher erzeugten Kopie, die direkt in ein PDF umgewandelt und hochgeladen wird | Setzt die Product Decision "nie in die reale Datei schreiben" technisch um — kein Zwischenspeichern einer bearbeiteten Kopie in SharePoint nötig | 2026-10-05 |
| Standard-Vorlage ist eine einzelne, zentral abgelegte Excel-Datei (Ort mit dem Nutzer in `/backend` final festzulegen), nicht im Code/Repo hinterlegt | Bleibt dadurch vom Nutzer frei anpassbar, ohne Code-Deploy, konsistent mit dem Grundprinzip dieses Features | 2026-10-05 |
| Erweiterung der bestehenden Azure-AD-App-Registrierung (PROJ-1/2) um eine zusätzliche Graph-Berechtigung, beschränkt auf die Bibliothek "Kunden" (statt tenant-weitem SharePoint-Zugriff) | Eine App-Registrierung statt zwei hält die Nutzerverwaltung einfach; auf die konkrete Bibliothek beschränkter Zugriff folgt dem Prinzip "kleinstmögliche Rechteausweitung" | 2026-10-05 |
| Kein separates Archiv — Ausgabe landet direkt im bestehenden Jahresordner der Firma | Diese Struktur ist bereits das gelebte Archiv; eine zweite, parallele Ablage würde nur Verwirrung stiften | 2026-10-05 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Komponenten-Struktur

```
Geräteliste-Seite (/geraete, bestehend aus PROJ-3)
├── Bestehende Filterleiste (Firma, Lagerort, Standort, Letzte Prüfung) – unverändert
├── NEU: "PDF generieren"-Button (neben der Liste)
└── NEU: Lade-/Fehleranzeige während der Generierung
    ├── Erfolg → Browser lädt das PDF direkt herunter
    └── Fehler → verständliche Fehlermeldung (z.B. "Keine Geräte gefunden")

Neuer Export-Vorgang ("PDF generieren", server-seitig)
├── 1. Liest die aktuell gefilterte Geräteliste inkl. aktuellstem aktivem Prüfbericht je Gerät (bestehende PROJ-3/4-Logik, unverändert)
├── 2. Sucht in SharePoint den Ordner `Kunden/{Firma}/Prüfberichte/{aktuelles Jahr}/` und darin die zuletzt geänderte Excel-Datei — gefunden: dient als Vorlage; nicht gefunden: Standard-Vorlage
├── 3. Liest aus der Vorlage die Spaltenüberschriften, Formatierung und bedingten Formatierungsregeln; erzeugt daraus im Arbeitsspeicher eine neue Arbeitskopie und trägt darunter pro Gerät eine Zeile mit den zugeordneten Daten ein (die vorhandene bedingte Formatierung übernimmt automatisch die Farbcodierung für neue Zeilen im abgedeckten Bereich)
├── 4. Wandelt diese Arbeitskopie serverseitig über Microsoft Graph in ein PDF um
├── 5. Legt das PDF im selben Ordner ab (`Kunden/{Firma}/Prüfberichte/{aktuelles Jahr}/`), Dateiname nach bestehendem Muster inkl. optionalem Lagerort-Zusatz
└── 6. Liefert dasselbe PDF gleichzeitig als Download an den Bearbeiter zurück

Die reale, vom Bearbeiter gepflegte Jahres-Excel-Datei selbst wird dabei zu keinem Zeitpunkt verändert (nur Schritt 2/3 lesend).
```

### Datenmodell (in Textform)

- **Vorlagen-/Archiv-Ort:** Kein neues System — beides nutzt die bereits bestehende SharePoint-Bibliothek "Kunden" und deren vorhandene Ordnerstruktur `{Firma}/Prüfberichte/{Jahr}/`. Für die "Vorlage" gilt: die zuletzt geänderte Excel-Datei im Jahresordner des laufenden Jahres; existiert keine, kommt eine zentrale Standard-Vorlage zum Einsatz.
- **Feld-Zuordnung:** Statt eines Platzhalter-Pools wird die Vorlage anhand ihrer vorhandenen Spaltenüberschriften gelesen (z.B. "Einbau-/Lagerort", "Artikel", "Typ", "Serien-Nr.", "Scancode", "Hersteller", "Herstelljahr", "Erstgebrauch", "Ablegereife", "Zubehör", "Geprüft", "Prüfer", "Prüfergebnis", "Bemerkungen" — exakte Liste wird in `/backend` anhand der echten Dateien verifiziert). Jede erkannte Spalte wird mit dem passenden Gerät-/Artikel-/Prüfbericht-Feld befüllt; nicht erkannte Spalten bleiben unverändert (z.B. reine Beschriftungen, die die Vorlage sonst noch enthält).
- **Keine neue Datenbank/Tabelle:** Weder eine Vorlagen-Zuordnung noch ein Archiv erfordern neue Speicherung — beides ergibt sich vollständig aus der bereits bestehenden SharePoint-Struktur; das Admin-Tool selbst bleibt wie in der PRD festgelegt ohne eigene Datenbank.

### Technische Entscheidungen (Begründung)
Siehe Decision Log → Technical Decisions oben.

### Abhängigkeiten (Packages)
- Eine Excel-Bibliothek, die bestehende Formatierung/bedingte Formatierung beim Einfügen neuer Zeilen erhält (z.B. exceljs) — einzige neue Abhängigkeit
- Keine neuen Pakete für die PDF-Konvertierung selbst — läuft über die bestehende Microsoft-Graph-Anbindung, die für diese Funktion um einen zusätzlichen Berechtigungs-Scope erweitert wird (gleiches Authentifizierungsmuster wie die bestehende Dataverse-Anbindung aus PROJ-2, nur mit anderem Scope)

## Implementation Notes (Backend)

- **Microsoft Graph / SharePoint:** `src/lib/sharepoint/client.ts` (Token-Beschaffung + `graphFetch`, exaktes Pattern wie `dataverse/client.ts`, aber eigener Token-Cache mit Scope `https://graph.microsoft.com/.default` — ein Client-Credentials-Token ist immer an einen Scope gebunden, kann also nicht mit dem Dataverse-Token geteilt werden, obwohl dieselbe App-Registrierung beide Rollen übernimmt) und `src/lib/sharepoint/kunden-drive.ts` (löst Site + Drive-ID der Bibliothek "Kunden" einmalig auf und cached sie; `listKundenOrdner`, `findeNeuesteExcelDatei`, `downloadKundenDatei`, `uploadKundenDatei`, `konvertiereZuPdf`, `loescheKundenDatei` — alle über Graphs pfadbasierte Adressierung `/drives/{id}/root:/{pfad}:/...`).
- **Excel-Feld-Zuordnung:** `src/lib/pruefbericht-export/feld-mapping.ts` — `normalizeHeader()` wandelt Umlaute in ASCII-Digraphen (ö→oe etc.) und entfernt alle Nicht-alphanumerischen Zeichen (Leerzeichen, Bindestriche, Zeilenumbrüche), `resolveSpaltenMapping()` matcht danach über eine priorisierte Schlüsselwortliste (spezifischere Felder wie "Prüfergebnis" vor kürzeren wie "Prüfer" geprüft, um Teilstring-Kollisionen zu vermeiden). Gegen zwei echte Vorlagen-Varianten verifiziert (siehe Open Questions).
- **Arbeitskopie-Erzeugung:** `src/lib/pruefbericht-export/arbeitskopie.ts` — lädt die Vorlage mit `exceljs`, verwendet das Arbeitsblatt "Bericht" falls vorhanden (sonst das erste), erkennt die Kopfzeile anhand der "Prüfergebnis"-Spalte, entfernt alle vorhandenen Datenzeilen darunter (siehe Product Decision "nur als Vorlage lesen") und schreibt die neuen Zeilen mit dem Zellstil der ursprünglichen ersten Datenzeile. Bereits vorhandene bedingte Formatierungsregeln werden automatisch mit übernommen; ihre Zeilen-Referenz (`ref`) wird erweitert, falls sie die neue Zeilenzahl nicht abdeckt (nie verkleinert). `conditionalFormattings` ist zur Laufzeit vorhanden, aber nicht Teil der öffentlichen exceljs-Typen — daher ein gezielter Cast statt `any`.
- **Orchestrierung:** `src/lib/pruefbericht-export/export.ts` (`generatePruefberichtPdf`) — filtert Geräte ohne aktuellen aktiven Prüfbericht heraus (Product Decision), lädt Artikel-Stammdaten gebatcht (`listArtikelByIds`, neu in `geraete.ts`, dedupliziert auf eindeutige Artikel-IDs), ermittelt Vorlage via `Kunden/{Firma}/Prüfberichte/{aktuelles Jahr}/` (neueste .xlsx) mit Fallback auf `SHAREPOINT_STANDARD_VORLAGE_PFAD`, lädt die Arbeitskopie als temporäre Datei hoch, konvertiert sie über Graph zu PDF, löscht die temporäre Datei garantiert (`try`/`finally`, auch wenn die Konvertierung selbst fehlschlägt), lädt das PDF zusätzlich in denselben Jahresordner hoch und gibt es zum Download zurück.
- **Dateiname:** `{YYYY-MM-DD} Prüfbericht Absturzsicherungen - {Firma}{ - Lagerort}.pdf`, Lagerort-Zusatz nur falls der Lagerort-Filter in der Geräteliste aktiv war (vom Client mitgegeben).
- **Neue Dataverse-Hilfsfunktionen:** `getAktuellstePruefberichteForGeraete` (`pruefberichte.ts`, analoges Batching/Tie-Breaking wie das bestehende `getAktuelleBemerkungenForGeraete`, liefert aber den vollständigen `Pruefbericht` statt nur die Bemerkung) und `listArtikelByIds` (`geraete.ts`, gechunkte OR-Filter-Abfrage wie `listPruefberichteForGeraete`).
- **Server Action:** `generatePdfAction(geraete, lagerortFilter)` in `geraete/actions.ts` — nimmt die bereits client-seitig gefilterte Geräteliste direkt entgegen (kein zusätzlicher Dataverse-Roundtrip, unkritisch da rein lesend und bereits für den eingeloggten Nutzer geladene Daten), liest die Firma ausschliesslich serverseitig aus der Session (nicht vom Client), gibt das PDF Base64-kodiert zurück (Server Actions können kein rohes `ArrayBuffer` an den Client zurückgeben).
- **UI:** "PDF generieren"-Button in `geraete-liste.tsx`, neben der bestehenden Filterleiste; dekodiert die Base64-Antwort clientseitig zu einem Blob und löst den Download aus; Fehler erscheinen als Inline-Text (kein Toast-System im Projekt aktiv, `sonner` ist installiert aber bisher nirgends eingebunden — hier bewusst nicht neu eingeführt, um konsistent mit dem bestehenden Formular-Fehlermuster zu bleiben, siehe `pruefbericht-form.tsx`).
- **Neue Abhängigkeit:** `exceljs` (`^4.4.0`).
- **Noch nicht verifiziert (nicht automatisiert testbar ohne echten Graph-Zugriff):** das Zusammenspiel mit einer ECHTEN heruntergeladenen Vorlagen-Datei (Erhalt von Logo/Bildern, tatsächliches Aussehen der Graph-PDF-Konvertierung, ob die bedingte Formatierung nach dem Zeilen-Austausch in der echten Datei exakt wie erwartet greift) — alle Unit-Tests arbeiten mit synthetisch per `exceljs` erzeugten Vorlagen, da kein Code-Zugriff auf die echte SharePoint-Instanz besteht. Die drei verbleibenden Setup-Schritte (Azure-Graph-Consent, Standard-Vorlagen-Datei anlegen, `SHAREPOINT_STANDARD_VORLAGE_PFAD` setzen) stehen noch aus — siehe Open Questions.
- `npx tsc --noEmit`, `npx eslint .`, `npx vitest run` (156 Tests, 37 davon neu) und `npm run build` laufen fehlerfrei durch.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
