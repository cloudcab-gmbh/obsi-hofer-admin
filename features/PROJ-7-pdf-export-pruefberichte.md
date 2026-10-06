# PROJ-7: PDF-Export Prüfberichte (kundenspezifisches Template)

## Status: Deployed
**Created:** 2026-10-05
**Last Updated:** 2026-10-06

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
- [ ] Logo im generierten PDF — aktuell bewusst entfernt (siehe Implementation Notes, Live-Fund #2: `XLSCorruptFile`). Bei Bedarf in `/refine` einen sauberen Bild-Erhalt nachziehen (Bild separat extrahieren, nach der Zeilen-Bearbeitung gezielt wieder einfügen) — lässt sich ohne Zugriff auf die echte Datei nicht vorab verifizieren, braucht eine weitere Testrunde mit dem Nutzer

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
- **Server Action:** `generatePdfAction(geraetIds, lagerortFilter)` in `geraete/actions.ts` — nimmt nur die IDs der client-seitig gefilterten Auswahl entgegen, lädt die Gerätedaten aber immer frisch und Firma-gescoped aus Dataverse (siehe QA BUG-1-Fix unten), liest die Firma ausschliesslich serverseitig aus der Session (nicht vom Client), gibt das PDF Base64-kodiert zurück (Server Actions können kein rohes `ArrayBuffer` an den Client zurückgeben).
- **UI:** "PDF generieren"-Button in `geraete-liste.tsx`, neben der bestehenden Filterleiste; dekodiert die Base64-Antwort clientseitig zu einem Blob und löst den Download aus; Fehler erscheinen als Inline-Text (kein Toast-System im Projekt aktiv, `sonner` ist installiert aber bisher nirgends eingebunden — hier bewusst nicht neu eingeführt, um konsistent mit dem bestehenden Formular-Fehlermuster zu bleiben, siehe `pruefbericht-form.tsx`).
- **Neue Abhängigkeit:** `exceljs` (`^4.4.0`).
- **Noch nicht verifiziert (nicht automatisiert testbar ohne echten Graph-Zugriff):** das Zusammenspiel mit einer ECHTEN heruntergeladenen Vorlagen-Datei (Erhalt von Logo/Bildern, tatsächliches Aussehen der Graph-PDF-Konvertierung, ob die bedingte Formatierung nach dem Zeilen-Austausch in der echten Datei exakt wie erwartet greift) — alle Unit-Tests arbeiten mit synthetisch per `exceljs` erzeugten Vorlagen, da kein Code-Zugriff auf die echte SharePoint-Instanz besteht. Die drei verbleibenden Setup-Schritte (Azure-Graph-Consent, Standard-Vorlagen-Datei anlegen, `SHAREPOINT_STANDARD_VORLAGE_PFAD` setzen) stehen noch aus — siehe Open Questions.
- `npx tsc --noEmit`, `npx eslint .`, `npx vitest run` (156 Tests, 37 davon neu) und `npm run build` laufen fehlerfrei durch.
- **Nachträglich behoben (2026-10-06, Live-Fund nach dem Deploy #1):** Jeder Export schlug in Produktion mit `Cannot read properties of null (reading 'locked')` fehl. Ursache: Next.js patcht den globalen `fetch` für sein eigenes Request-Memoization/Caching, was beim internen Klonen einer Antwort ohne Body (konkret: das `204 No Content` der `DELETE`-Anfrage beim Aufräumen der temporären Arbeitskopie, `loescheKundenDatei`) abstürzt — ein bekanntes Next.js-Verhalten. Behoben, indem `graphFetch` (`sharepoint/client.ts`) jeder Anfrage explizit `cache: "no-store"` mitgibt, wodurch Next.js diese Fetches komplett von seiner Cache-/Memoization-Logik ausnimmt. Vorsorglich dieselbe Absicherung auch in `dataverseFetch` ergänzt, da dort grundsätzlich dieselbe Gefahr besteht (z.B. bei einer PATCH-Antwort ohne Body), auch wenn sie dort bisher nicht aufgetreten ist. Dabei zusätzlich den bis dahin komplett stillen generischen Fehlerzweig in `generatePdfAction` korrigiert: er gab vorher nur "Unbekannter Fehler..." ohne jedes Detail zurück, was die Live-Fehlersuche unnötig erschwerte — enthält jetzt die tatsächliche Fehlermeldung (unkritisch, da reines internes Admin-Tool ohne Kundenzugriff).
- **Nachträglich behoben (2026-10-06, Live-Fund nach dem Deploy #2):** Nach dem obigen Fix erreichte der Export tatsächlich die Graph-PDF-Konvertierung, scheiterte dort aber mit einem Fehler von Microsofts Office-Online-Dienst selbst: `HttpCode=UnsupportedMediaType ErrorCode=XLSCorruptFile`. Ursache: Die echte Vorlage (auch die neu angelegte Standard-Vorlage) enthält ein eingebettetes Logo-Bild — `exceljs` erhält eingebettete Bilder/Zeichnungen beim Laden→Ändern→Speichern nicht zuverlässig; das Ergebnis bleibt für `exceljs` selbst lesbar (daher in den synthetischen Unit-Tests nicht aufgefallen), wird vom strengeren Office-Online-Parser aber als beschädigt abgelehnt. **Interimslösung, mit dem Nutzer abgestimmt:** `erzeugeArbeitskopie` entfernt jetzt alle eingebetteten Bilder aus allen Arbeitsblättern (`worksheet._media = []`, da exceljs keine öffentliche Remove-API dafür hat), bevor die Arbeitskopie geschrieben wird. **Bekannte Einschränkung:** Das generierte PDF enthält vorerst kein Logo mehr — Text-Branding (Firmenname, Titel) bleibt erhalten. Ein sauberer Bild-Erhalt (Bild separat extrahieren und nach der Zeilen-Bearbeitung gezielt wieder einfügen, statt sich auf exceljs' automatischen Erhalt zu verlassen) wurde bewusst zurückgestellt, da er ohne Zugriff auf die echte Datei nicht vorab verifizierbar ist — bei Bedarf in `/refine` nachziehen.

## QA Test Results

**Tested:** 2026-10-06
**Tester:** QA Engineer (AI)
**Hinweis zur Testmethode:** Wie bei allen bisherigen Features in diesem Repo lässt sich der echte Login-Flow nicht automatisiert/wiederholbar durchspielen. Zusätzlich ist der Zugriff auf die echte SharePoint-/Graph-Instanz vom lokalen Code aus nicht testbar (reine Konfigurationssache: Consent/Permission-Grant sind jetzt gesetzt, aber ein Live-Aufruf aus dem Agenten-Kontext ist nicht möglich). Fokus dieser Runde: Code-Review + automatisierte Tests (156/156 grün) + Red-Team-Analyse des neuen Datenflusses Client → Server Action → SharePoint.

### Acceptance Criteria Status
- [x] Firmenspezifische Vorlage im aktuellen Jahresordner wird gefunden und verwendet (`export.test.ts`: "uses the firma-specific template found in the current year's folder")
- [x] Fehlt eine Vorlage im Jahresordner, wird die zentrale Standard-Vorlage verwendet (`export.test.ts`: "falls back to the central Standard-Vorlage...")
- [x] Prüfdatum/Prüfer/Prüfergebnis/Bemerkung des aktuellsten aktiven Prüfberichts erscheinen pro Zeile (`export.ts`: `zuExportZeile`, Daten stammen aus `getAktuellstePruefberichteForGeraete` — serverseitig frisch aus Dataverse, nicht aus Client-Daten, siehe BUG-1 unten für die übrigen Felder)
- [x] Geräte ohne aktiven Prüfbericht werden ausgeschlossen (`export.test.ts`: "excludes a Gerät without an active Prüfbericht...")
- [x]/[ ] Farbliche Hervorhebung je Prüfergebnis — funktioniert über die in der Vorlage vorhandene bedingte Formatierung (`arbeitskopie.test.ts`, mehrere Tests); **nicht verifizierbar gegen die echte Vorlagen-Datei** in dieser Umgebung, siehe Implementation Notes
- [x] Leere gefilterte Geräteliste → Fehlermeldung statt leerem PDF (`export.test.ts`: "throws an ExportFehler... when the Geräte list is empty")
- [x] PDF wird zum Download angeboten UND im Jahresordner abgelegt (`export.test.ts`: zwei `uploadKundenDatei`-Aufrufe verifiziert) — siehe BUG-3 für den Fehlerfall
- [x] Lagerort-Filter erscheint im Dateinamen, sonst entfällt der Zusatz (`export.test.ts`: beide Fälle getestet)

### Edge Cases Status
- [x] Reale Jahres-Datei bleibt unverändert (Vorlage wird nur gelesen, nicht beschrieben) — durch das Design erzwungen: `downloadKundenDatei`/`ladeVorlage` haben keinerlei Schreibpfad auf die Quelle, nur `erzeugeArbeitskopie` (arbeitet im Speicher) wird hochgeladen
- [x] Mehrere Excel-Dateien im selben Jahresordner → zuletzt geänderte gewinnt (`kunden-drive.test.ts`: "picks the most recently modified .xlsx file...")
- [x] Zwei Bearbeiter generieren zeitgleich für dieselbe Firma → unkritisch, da nur lesender Zugriff auf die reale Datei und je Export eine eigene, UUID-benannte temporäre Datei (`_temp-${crypto.randomUUID()}.xlsx`), keine gemeinsame Ressource
- [ ] **Siehe BUG-2**: Microsoft Graph/SharePoint-Fehler beim Löschen der temporären Arbeitskopie maskiert eine ansonsten erfolgreiche PDF-Generierung
- [ ] **Siehe BUG-3**: Fehler beim finalen Archiv-Upload verhindert auch den Download, obwohl das PDF bereits fertig im Speicher vorliegt

### Security Audit Results (Red Team)
- [x] Authentifizierung: `generatePdfAction` liegt unter `(protected)/geraete`, die Proxy-Middleware (`src/proxy.ts`) greift für denselben Pfad auch bei Server-Action-POSTs (kein `/api`-Ausschluss für diese Route) — ein nicht eingeloggter Aufruf wird vor Erreichen der Action umgeleitet
- [x] Autorisierung/Firma-Isolation beim SharePoint-Pfad: `firmaName` wird ausschliesslich serverseitig über `getCurrentFirmaId()` → `getFirma()` aufgelöst, nie vom Client übernommen — ein Client kann also nicht gezielt in den Jahresordner einer anderen Firma schreiben/lesen lassen
- [x] OData-/Pfad-Injection: `artikelId`-Liste läuft weiterhin durch `requireValidGuid` (unverändert aus den bestehenden Modulen); SharePoint-Pfadsegmente werden über `bereinigeFuerDateinamen` von den klassischen Sonderzeichen (`\ / : * ? " < > |`) befreit. Ein Firmenname, der ausschliesslich aus `..` besteht, wurde geprüft: Microsoft Graphs pfadbasierte Adressierung (`/root:/{pfad}:/`) löst Segmente als exakte Kind-Elementnamen auf, nicht als generischen Dateisystempfad — ein Segment `..` würde als (nicht existierendes) Element gesucht, nicht als Verzeichnis-Aufstieg interpretiert; keine praktikable Traversal-Möglichkeit gefunden
- [x] BUG-1 (High) behoben — siehe Retest
- [x] BUG-2 (Medium) behoben — siehe Retest
- [x] BUG-3 (Low) behoben — siehe Retest

### Bugs Found

#### BUG-1: Client-seitig mitgegebene Gerätedaten werden ungeprüft in das offizielle PDF übernommen
- **Severity:** High
- **Status:** ✅ Fixed
- **Steps to Reproduce:**
  1. `generatePdfAction(geraete, lagerortFilter)` (`src/app/(protected)/geraete/actions.ts`) nimmt ein vollständiges Array von `Geraet`-Objekten vom Client entgegen — das sind exakt die Objekte, die der Browser im Zustand der `GeraeteListe`-Komponente hält
  2. Next.js Server Actions sind als eigenständige, direkt aufrufbare Endpoints exponiert (POST auf denselben Routen-Pfad mit einem `Next-Action`-Header) — ein eingeloggter Bearbeiter/Freigeber kann diesen Aufruf direkt (z.B. per curl/DevTools) mit selbst zusammengestellten `Geraet`-Objekten ausführen, nicht nur über die UI
  3. In `generatePruefberichtPdf` (`src/lib/pruefbericht-export/export.ts`) wird zwar der **Prüfbericht** (Datum/Prüfer/Ergebnis/Bemerkung) korrekt serverseitig über `getAktuellstePruefberichteForGeraete(geraete.map(g => g.id))` frisch aus Dataverse geladen — die **Gerätestammdaten** selbst (`lagerort`, `serienummer`, `barcode`, `herstelljahr`, `erstgebrauch`, `ablegereife`, `zubehoer`, `kundenId`, `name`/Inv.Nr.) werden aber direkt und ungeprüft aus dem vom Client mitgegebenen Objekt in `zuExportZeile()` übernommen
  4. Ein manipulierter Aufruf könnte für ein real existierendes Gerät (mit echtem, gültigem Prüfbericht — sonst würde es weiter unten herausgefiltert) z.B. ein gefälschtes `ablegereife`-Datum, eine falsche Seriennummer oder einen falschen Lagerort im generierten, offiziell wirkenden PDF erscheinen lassen
  5. Das PDF wird automatisch im echten Kunden-Archiv (`Kunden/{Firma}/Prüfberichte/{Jahr}/`) abgelegt und steht zum Download/Versand an den Kunden bereit — ein Nachweisdokument für sicherheitsrelevante Prüfungen (Absturzsicherungen!) mit potenziell falschen Gerätedaten wäre damit faktisch nicht mehr vertrauenswürdig
  6. Das eigentliche Prüfergebnis (Freigabe/keine Freigabe) selbst kann dadurch **nicht** gefälscht werden (kommt immer frisch aus Dataverse) — das mindert die Schwere, macht den Fund aber nicht harmlos: falsche Herstellungs-/Ablegereife-Daten sind bei Absturzsicherungsausrüstung selbst sicherheitsrelevant
- **Priority:** Fix before deployment

#### BUG-2: Fehler beim Löschen der temporären Arbeitskopie maskiert eine erfolgreiche PDF-Generierung
- **Severity:** Medium
- **Status:** ✅ Fixed
- **Steps to Reproduce:**
  1. In `generatePruefberichtPdf` steht die Konvertierung in einem `try`, das Löschen der temporären Datei im zugehörigen `finally`
  2. Schlägt `konvertiereZuPdf` erfolgreich durch, aber `loescheKundenDatei` im `finally`-Block wirft (z.B. kurzzeitiger Netzwerkfehler bei Graph), überschreibt diese Exception laut JavaScript-Semantik das erfolgreiche Ergebnis des `try`-Blocks
  3. Der Bearbeiter sieht eine Fehlermeldung und bekommt kein PDF, obwohl die Generierung selbst vollständig erfolgreich war — einzige tatsächliche Folge wäre eine liegen gebliebene, harmlose `_temp-*.xlsx`-Datei im Jahresordner
- **Priority:** Should fix

#### BUG-3: Fehler beim finalen Archiv-Upload verhindert auch den Download
- **Severity:** Low
- **Status:** ✅ Fixed
- **Steps to Reproduce:**
  1. Nach erfolgreicher PDF-Konvertierung wird das Ergebnis zusätzlich per `uploadKundenDatei` archiviert — schlägt dieser letzte Schritt fehl (z.B. transiente SharePoint-Störung), wirft `generatePruefberichtPdf` komplett, bevor es das bereits fertige PDF zurückgibt
  2. Der Bearbeiter bekommt weder Download noch Archiv-Kopie, obwohl das PDF korrekt im Speicher vorlag
- **Priority:** Nice to have

### Automatisierte Tests (vor den Fixes)
- **Unit-/Integrationstests (Vitest):** 156/156 grün gesamt (37 neu für PROJ-7: `feld-mapping.test.ts`, `arbeitskopie.test.ts`, `export.test.ts`, `sharepoint/client.test.ts`, `sharepoint/kunden-drive.test.ts`)
- **Regression:** Alle bisherigen PROJ-1/2/3/4-Tests weiterhin grün. `npx tsc --noEmit`, `npm run lint` und `npm run build` laufen fehlerfrei durch

### Retest (2026-10-06)

- **Fix BUG-1:** `generatePdfAction` (`src/app/(protected)/geraete/actions.ts`) nimmt jetzt `geraetIds: string[]` statt vollständiger `Geraet`-Objekte entgegen. Die IDs dienen nur noch als Auswahl: die Action lädt serverseitig über `listStandorteForFirma(firmaId)` → `listGeraeteForStandorte(...)` die authoritative, auf die aktuelle Session-Firma beschränkte Geräteliste neu und filtert sie auf die angefragten IDs (`idSet.has(g.id)`). Ein Client kann damit weder Gerätedaten fälschen noch gezielt ein Gerät einer anderen Firma einschleusen — eine unbekannte/fremde ID wird einfach stillschweigend ignoriert. `src/components/geraete-liste.tsx` schickt entsprechend nur noch `gefiltert.map(g => g.id)`.
- **Fix BUG-2:** Das Löschen der temporären Arbeitskopie (`src/lib/pruefbericht-export/export.ts`) steht jetzt in einem eigenen inneren `try`/`catch` innerhalb des äusseren `finally` — ein Fehler dort wird nur noch geloggt (`console.error`), überschreibt aber nicht mehr das Ergebnis einer erfolgreichen Konvertierung.
- **Fix BUG-3:** Der abschliessende Archiv-Upload ist ebenfalls in ein eigenes `try`/`catch` gefasst — schlägt er fehl, wird das nur geloggt; das bereits fertig generierte PDF wird trotzdem zum Download zurückgegeben.
- **Neue Regressionstests:**
  - `actions.test.ts` → `describe("generatePdfAction", ...)`: kein Firma-Kontext → Fehler ohne jeden Datenzugriff; Geräte werden immer frisch via `listGeraeteForStandorte` geladen und auf die angefragten IDs gefiltert; eine angefragte ID, die nicht zur Firma gehört, wird stillschweigend verworfen; Erfolgsfall liefert Base64-PDF; `ExportFehler`- und generische Fehlerpfade
  - `export.test.ts`: ein Fehler beim Löschen der temporären Datei bzw. beim Archiv-Upload führt weiterhin zu einem erfolgreichen Rückgabewert mit dem generierten PDF
- **Verifiziert:** `npm test` (164/164 grün, 8 neu), `npm run lint` (clean), `npx tsc --noEmit` (clean), `npm run build` (clean)

### Summary
- **Acceptance Criteria:** 8/8 funktional erfüllt, 1 davon (Farbcodierung) weiterhin nur per Unit-Test gegen eine synthetische Vorlage verifiziert, nicht gegen die echte Datei (siehe Implementation Notes)
- **Bugs Found:** 3 total (0 critical, 1 high, 1 medium, 1 low) — alle behoben, siehe Retest
- **Security:** Kein offenes Finding mehr — Firma-Isolation und Authentifizierung waren bereits sauber, die Datenintegrität des generierten Nachweisdokuments ist jetzt ebenfalls serverseitig abgesichert
- **Production Ready:** JA (code-seitig) — die Farbcodierung sowie das Verhalten gegen die echte SharePoint-Instanz (Logo-Erhalt, echte bedingte Formatierung, Azure-Graph-Consent) sollten beim ersten echten Live-Einsatz vom Nutzer bestätigt werden, da das aus der Code-Umgebung heraus nicht testbar ist
- **Recommendation:** Status auf "Approved" setzen und deployen. Erste Live-Generierung für eine Firma mit eigener Vorlage UND eine ohne (Standard-Vorlage-Fallback) vom Nutzer prüfen lassen.

## Deployment
- **Production URL:** https://obsi-hofer-admin.vercel.app
- **Deployed:** 2026-10-06 (automatisch via Vercel bei Push auf `main`)
- **Tag:** `v1.3.0-PROJ-7`
- **Voraussetzungen vom Nutzer bereits erledigt:** Microsoft-Graph-Berechtigung (`Sites.Selected`, `write`) für die App "OBSI Hofer Admin" auf die Site `obsihofer.sharepoint.com` gewährt; Standard-Vorlage unter `Kunden/_PBVorlage/pruefberichtraport.xlsx` abgelegt; `SHAREPOINT_STANDARD_VORLAGE_PFAD=_PBVorlage/pruefberichtraport.xlsx` in Vercel (Production) gesetzt
- **Verifiziert:** Produktions-Build erfolgreich, `https://obsi-hofer-admin.vercel.app/login` antwortet mit HTTP 200 (keine Regression). Der eigentliche Export gegen die echte SharePoint-Instanz (Logo-Erhalt in der Arbeitskopie, tatsächliches Verhalten der Graph-PDF-Konvertierung, echte bedingte Formatierung) ist aus der Code-Umgebung heraus nicht testbar — **steht als Live-Verifikation durch den Nutzer noch aus**, idealerweise einmal für eine Firma mit eigener Jahres-Vorlage und einmal für eine ohne (Standard-Vorlage-Fallback)
