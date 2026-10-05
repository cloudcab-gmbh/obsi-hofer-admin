# PROJ-7: PDF-Export Prüfberichte (kundenspezifisches Template)

## Status: Architected
**Created:** 2026-10-05
**Last Updated:** 2026-10-05

## Dependencies
- Requires: PROJ-1 (Entra-ID-Login mit Rollen) — Bearbeiter/Freigeber müssen eingeloggt sein
- Requires: PROJ-2 (Dataverse-Web-API-Anbindung) — Datenquelle für Geräte/Prüfberichte
- Requires: PROJ-3 (Geräte-Verwaltung) — liefert die Geräteliste inkl. Filter, von der aus exportiert wird
- Requires: PROJ-4 (Prüfberichte-Verwaltung) — liefert den "aktuellsten aktiven Prüfbericht" pro Gerät
- **Neue externe Abhängigkeit:** Microsoft Graph API / SharePoint-Zugriff — die bestehende Entra-ID-App-Registrierung (PROJ-1) muss um zusätzliche Graph-Berechtigungen erweitert werden (Zugriff auf die Vorlagen- und Archiv-Bibliothek). Erfordert Admin-Consent in Azure AD, siehe Open Questions.

## User Stories
- Als Bearbeiter möchte ich aus der Geräteliste heraus ein PDF mit allen (gefilterten) Geräten einer Firma inkl. ihres aktuellsten Prüfberichts generieren, damit ich dieses dem Kunden wie bisher zukommen lassen kann — ohne die Daten manuell in Excel/Word zusammenzutragen.
- Als OBSI Hofer (Admin) möchte ich pro Firma eine eigene Word-Vorlage in SharePoint hinterlegen können, damit jeder Kunde sein gewohntes, individuelles Berichtsformat erhält.
- Als OBSI Hofer (Admin) möchte ich eine Vorlage einfach durch Hochladen in SharePoint und Setzen einer Metadaten-Spalte einer Firma zuweisen können, ohne dafür eine eigene Oberfläche im Admin-Tool zu brauchen.
- Als Bearbeiter möchte ich, falls für eine Firma noch keine eigene Vorlage existiert, trotzdem ein PDF im gewohnten Standardformat generieren können, damit der Export nie hart blockiert.

## Out of Scope
- Versand des PDFs an den Kunden (z.B. per E-Mail) — bleibt wie bisher manuell durch den Bearbeiter, kein Non-Goal-Bruch gegenüber dem Kundenportal-PRD ("keine automatischen Benachrichtigungen")
- Editor/Oberfläche im Admin-Tool zum Erstellen oder Bearbeiten der Word-Vorlage — die Vorlage wird ausschliesslich direkt in Word/SharePoint erstellt und gepflegt
- Oberfläche im Admin-Tool zur Pflege der Firma-Zuordnung — erfolgt ausschliesslich über die Metadaten-Spalte direkt in SharePoint
- Checkbox-Auswahl einzelner Geräte — der Export verwendet immer die aktuell gefilterte Geräteliste (siehe Product Decisions)
- Mehrere Prüfberichte/Historie pro Gerät im selben PDF — nur der aktuellste aktive Prüfbericht pro Gerät erscheint (siehe Product Decisions)
- Vorschau des PDFs im Admin-Tool vor dem Download — Datei wird direkt heruntergeladen bzw. im SharePoint-Archiv abgelegt, keine In-App-Vorschau
- Versionierung/Verlauf mehrerer gleichzeitig aktiver Vorlagen pro Firma — pro Firma gilt zu jedem Zeitpunkt genau eine zugewiesene Vorlage (siehe Edge Cases)
- Eigene Firma-übergreifende Artikel-Stammdatenpflege — unverändert gegenüber dem restlichen Tool (Non-Goal laut PRD)

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

- [ ] Angenommen eine Firma ist ausgewählt und hat eine eigene, in SharePoint zugewiesene Vorlage, wenn der Bearbeiter auf der Geräteliste "PDF generieren" klickt, dann wird ein PDF erzeugt, das auf dieser firmenspezifischen Vorlage basiert und alle aktuell gefilterten Geräte enthält
- [ ] Angenommen eine Firma hat keine eigene zugewiesene Vorlage, wenn "PDF generieren" geklickt wird, dann wird stattdessen die Standard-Vorlage verwendet (kein Fehler, kein blockierter Export)
- [ ] Angenommen ein Gerät in der gefilterten Liste hat einen aktuellen aktiven Prüfbericht, wenn das PDF generiert wird, dann erscheinen Prüfdatum, Prüfer, Prüfergebnis und Bemerkung dieses Prüfberichts in der entsprechenden Zeile
- [ ] Angenommen ein Gerät in der gefilterten Liste hat noch nie einen aktiven Prüfbericht erhalten, wenn das PDF generiert wird, dann erscheint dieses Gerät nicht im PDF
- [ ] Angenommen der aktuellste aktive Prüfbericht eines Geräts hat das Ergebnis "Freigabe", wenn das PDF generiert wird, dann ist diese Zeile/Zelle grün hervorgehoben
- [ ] Angenommen der aktuellste aktive Prüfbericht eines Geräts hat das Ergebnis "keine Freigabe", wenn das PDF generiert wird, dann ist diese Zeile/Zelle rot hervorgehoben
- [ ] Angenommen der aktuellste aktive Prüfbericht eines Geräts hat das Ergebnis "letzte Freigabe", wenn das PDF generiert wird, dann ist diese Zeile/Zelle ohne farbliche Hervorhebung (neutral), wie im bisherigen, manuell erstellten Referenzformat
- [ ] Angenommen die aktuell gefilterte Geräteliste ist leer, wenn "PDF generieren" geklickt wird, dann erscheint eine Fehlermeldung ("Keine Geräte für diesen Export gefunden") statt eines leeren PDFs
- [ ] Angenommen ein PDF wurde erfolgreich generiert, wenn der Vorgang abgeschlossen ist, dann wird es sowohl zum Download angeboten als auch automatisch im SharePoint-Archiv im Ordner der jeweiligen Firma abgelegt
- [ ] Angenommen eine Firma hat eine zugewiesene Vorlage, deren Datei in SharePoint zwischenzeitlich gelöscht oder verschoben wurde, wenn "PDF generieren" geklickt wird, dann erscheint eine klare Fehlermeldung ("zugewiesene Vorlage nicht gefunden") statt eines stillen Rückfalls auf die Standard-Vorlage

## Edge Cases
- Firma ganz ohne SharePoint-Zuordnung → Standard-Vorlage (siehe AC), kein Fehler
- Firma mit defekter/gelöschter Zuordnung (Metadaten zeigen auf nicht mehr existierende Datei) → expliziter Fehler, **kein** stiller Fallback auf die Standard-Vorlage (um nicht versehentlich mit der falschen/generischen Vorlage ein offiziell wirkendes Kundendokument zu erzeugen)
- Firma mit versehentlich mehreren Dateien, die alle als ihre Vorlage markiert sind → die zuletzt geänderte Datei gilt als aktive Vorlage (deterministisch, keine Fehlermeldung — siehe Product Decisions)
- Sehr grosse Firma (mehrere hundert Geräte) → Generierung kann einige Sekunden dauern; UI muss einen Ladezustand anzeigen statt wie eine hängende Seite zu wirken
- Zwei Bearbeiter generieren zeitgleich für dieselbe Firma → unkritisch, da rein lesender Datenzugriff und jeweils eine eigene neue Datei im Archiv (kein Überschreiben)
- Microsoft Graph/SharePoint temporär nicht erreichbar → Fehlermeldung analog zu bestehenden Dataverse-Fehlerzuständen im Tool, kein Absturz der Seite
- Firma-Name oder Gerätedaten enthalten Zeichen, die in Datei-/Ordnernamen problematisch sind (z.B. `/`) → werden beim Ablegen im SharePoint-Archiv bereinigt/escaped, damit das Hochladen nicht fehlschlägt

## Technical Requirements (optional)
- Security: Nur eingeloggte Bearbeiter/Freigeber (beide Rollen — reine Leseaktion auf bereits für sie sichtbare Daten, keine neue Rechteausweitung) können den Export auslösen
- Performance: Export einer durchschnittlichen Firma (geschätzt < 50 Geräte) sollte innerhalb weniger Sekunden abgeschlossen sein; harte Grenze für sehr grosse Firmen ist Teil der Architektur-Abklärung
- Die neuen Microsoft-Graph-Berechtigungen (Zugriff auf die Vorlagen-/Archiv-Bibliothek) müssen als Application Permission in der bestehenden Azure-AD-App-Registrierung ergänzt und von einem Admin freigegeben (Consent) werden

## Open Questions
- [ ] Welche konkrete SharePoint-Site soll die beiden neuen Dokumentbibliotheken ("Prüfbericht-Vorlagen" und "Generierte Prüfberichte") enthalten — eine bestehende Site oder eine neu anzulegende? Muss der Nutzer festlegen/einrichten, bevor `/backend` die Graph-Anbindung konfigurieren kann.
- [x] Wie wird die Standard-Vorlage technisch bereitgestellt — **entschieden in `/architecture`:** als normale Datei mit reserviertem Namen in derselben Vorlagen-Bibliothek, nicht im Code/Repo (siehe Tech Design)
- [x] Technischer Ansatz für die Word→PDF-Umwandlung inkl. der farblichen Hervorhebung — **entschieden in `/architecture`:** Microsoft Graph übernimmt die eigentliche PDF-Konvertierung, die Farbhervorhebung wird über ein vorbereitetes Platzhalterfeld in der Zellformatierung gelöst, das der Admin aus einer Musterzeile kopiert (siehe Tech Design)
- [x] Platzhalter-Syntax — **entschieden in `/architecture`:** siehe Tech Design, finale Feldliste/Anleitung folgt als Teil von `/backend`
- [x] Azure-AD-App-Registrierung — **entschieden in `/architecture`:** bestehende Registrierung aus PROJ-1/2 wird um eine zusätzliche, auf die konkrete Site beschränkte Graph-Berechtigung erweitert (siehe Tech Design), keine separate Registrierung nötig
- [ ] Exakter Name der Metadaten-Spalte für die Firma-Zuordnung in der Vorlagen-Bibliothek sowie der reservierte Dateiname der Standard-Vorlage — kleinschrittig in `/backend` zusammen mit dem Nutzer final benannt, sobald die Site steht

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Vorlagen sind Word-Dokumente, verwaltet in einer SharePoint-Dokumentbibliothek, nicht im Admin-Tool selbst editierbar | Admin kennt Word bereits aus dem bisherigen manuellen Prozess; kein Aufwand für einen eigenen Vorlagen-Editor im Tool | 2026-10-05 |
| Zuordnung Vorlage↔Firma über eine Metadaten-Spalte direkt in SharePoint, keine eigene Oberfläche im Admin-Tool | Admin-Tool hat laut PRD bewusst keine eigene Datenbank; vermeidet eine neue Speicherung nur für diese Zuordnung | 2026-10-05 |
| Export verwendet immer die komplette aktuell gefilterte Geräteliste (Firma + Lagerort + Standort + Letzte-Prüfung-Filter), keine Checkbox-Einzelauswahl | Konsistent mit den bestehenden CSV-Exports im Kundenportal-Repo (PROJ-8/PROJ-10); vermeidet zusätzlichen UI-Aufwand für eine Mehrfachauswahl | 2026-10-05 |
| Pro Gerät erscheint nur der aktuellste aktive Prüfbericht, nicht die ganze Historie | Entspricht exakt dem bisherigen, manuell erstellten Referenzformat (ein Prüftermin pro Zeile); gleiches Konzept wie die bestehende PB_Bemerkung-Logik (PROJ-3/4) | 2026-10-05 |
| Geräte ganz ohne aktiven Prüfbericht werden aus dem PDF ausgeschlossen statt mit leeren Prüf-Feldern angezeigt | Das PDF soll ausschliesslich ein Nachweisdokument bereits erfolgter Prüfungen sein; ein frisch angelegtes, nie geprüftes Gerät gehört fachlich nicht in diesen Bericht | 2026-10-05 |
| Fehlt eine firmenspezifische Vorlage ganz, wird eine Standard-Vorlage verwendet; ist eine zugewiesene Vorlage hingegen defekt/nicht auffindbar, erscheint stattdessen ein Fehler | Unterscheidet bewusst zwischen "noch nicht eingerichtet" (unkritisch, Fallback sinnvoll) und "war eingerichtet, jetzt kaputt" (potenziell falsches/generisches Dokument für einen Kunden, der eigentlich sein individuelles Format erwartet — lieber ein klarer Fehler als ein stiller, möglicherweise unpassender Fallback) | 2026-10-05 |
| Prüfergebnis-Farbcodierung: "Freigabe" = grün, "keine Freigabe" = rot, "letzte Freigabe" = neutral/ohne Farbe | Entspricht exakt dem Beispiel-PDF des Nutzers (dort sind nur Freigabe/keine Freigabe farblich hervorgehoben, letzte Freigabe erscheint neutral) | 2026-10-05 |
| Generiertes PDF wird sowohl zum Download angeboten als auch automatisch in einer eigenen SharePoint-Archiv-Bibliothek (ein Ordner pro Firma) abgelegt | Nutzerwunsch: durchsuchbares Archiv aller je generierten Berichte, zusätzlich zum sofortigen Download für den direkten Versand | 2026-10-05 |
| Bei mehreren fälschlich gleichzeitig zugewiesenen Vorlagen für eine Firma gilt die zuletzt geänderte Datei als aktiv | Deterministisches, einfach nachvollziehbares Verhalten ohne zusätzliche Fehlerbehandlung für einen seltenen Pflegefehler | 2026-10-05 |
| Sowohl Bearbeiter als auch Freigeber dürfen den Export auslösen | Reine Leseaktion auf Daten, die beide Rollen ohnehin bereits vollständig einsehen können — keine neue Rechteausweitung nötig | 2026-10-05 |

### Technical Decisions
<!-- Added by /architecture -->
| Decision | Rationale | Date |
|----------|-----------|------|
| Microsoft Graph API statt direkter SharePoint-REST-API | Ein Protokoll/Auth-Muster für Dateizugriff, Metadaten UND die PDF-Konvertierung; von Microsoft aktiv weiterentwickelt | 2026-10-05 |
| PDF-Konvertierung über die in Microsoft 365 eingebaute Graph-Funktion ("als PDF herunterladen"), keine selbst betriebene Konvertierungs-Software | Vermeidet Betrieb/Wartung einer zusätzlichen Komponente (z.B. LibreOffice) in der schlanken Vercel-Serverless-Umgebung; nutzt die ohnehin vorhandene Microsoft-365-Lizenz; rendert mit demselben Office-Layout-Engine wie Word selbst, dadurch hohe visuelle Treue | 2026-10-05 |
| Platzhalter-Ersetzung inkl. Tabellen-Wiederholung über eine dedizierte Word-Templating-Bibliothek (docxtemplater), nicht über eine eigene HTML/PDF-Vorlagensprache | Vorlagen bleiben waschechte, in Word frei gestaltbare Dokumente (Logo, Layout, Schriftart) — der Admin braucht kein neues Werkzeug zu lernen, nur eine Platzhalter-Syntax | 2026-10-05 |
| Farbliche Zellhervorhebung über ein vorbereitetes Platzhalterfeld in der Zellformatierung, das der Admin 1:1 aus einer mitgelieferten Musterzeile kopiert, statt einer generischen "Bedingte Formatierung"-Funktion | Datengetriebene Zellfarben lassen sich mit reinem Text-Merge nicht lösen; ein vorgefertigtes Kopiervorlagen-Element hält die Vorlagenerstellung für den Admin trotzdem praktikabel, ohne dass er die Word-Dateistruktur verstehen muss | 2026-10-05 |
| Standard-Vorlage ist eine normale Datei mit reserviertem, festem Namen in derselben Vorlagen-Bibliothek (nicht im Code/Repo hinterlegt) | Konsistent mit dem Grundprinzip "Admin pflegt alles direkt in SharePoint, ohne Code-Deploy" — auch die Standard-Vorlage bleibt damit vom Admin frei anpassbar | 2026-10-05 |
| Erweiterung der bestehenden Azure-AD-App-Registrierung (PROJ-1/2) um eine zusätzliche Graph-Berechtigung, beschränkt auf die konkrete SharePoint-Site (statt tenant-weitem SharePoint-Zugriff) | Eine App-Registrierung statt zwei hält die Nutzerverwaltung einfach; auf die Site beschränkter Zugriff folgt dem Prinzip "kleinstmögliche Rechteausweitung", analog zur RLS-Denkweise im Kundenportal-Repo | 2026-10-05 |
| Zwei getrennte Dokumentbibliotheken (Vorlagen vs. generiertes Archiv), nicht eine gemeinsame | Vermeidet Verwechslungsgefahr zwischen "editierbarer Vorlage" und "fertigem Ergebnisdokument"; eigene Ordnerstruktur (ein Ordner pro Firma) ist nur im Archiv sinnvoll, nicht bei den Vorlagen | 2026-10-05 |

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
    └── Fehler → verständliche Fehlermeldung (z.B. "Keine Geräte gefunden", "Vorlage nicht gefunden")

Neuer Export-Vorgang ("PDF generieren", server-seitig)
├── 1. Liest die aktuell gefilterte Geräteliste inkl. aktuellstem aktivem Prüfbericht je Gerät (bestehende PROJ-3/4-Logik, unverändert)
├── 2. Ermittelt die für die aktuelle Firma zuständige Vorlage in SharePoint (Metadaten-Abfrage über Microsoft Graph) — fällt auf die Standard-Vorlage zurück, falls keine gefunden; meldet einen Fehler, falls eine Zuordnung existiert, die zugehörige Datei aber nicht mehr auffindbar ist
├── 3. Befüllt die Vorlage mit Firma-, Geräte- und Prüfbericht-Daten, inkl. der farblichen Hervorhebung je Prüfergebnis
├── 4. Wandelt das befüllte Dokument serverseitig über Microsoft Graph in ein PDF um
├── 5. Legt das PDF automatisch im Archiv ab (Bibliothek "Generierte Prüfberichte", Unterordner der jeweiligen Firma, wird bei Bedarf automatisch angelegt)
└── 6. Liefert dasselbe PDF gleichzeitig als Download an den Bearbeiter zurück
```

### Datenmodell (in Textform)

- **Vorlagen-Ablage:** Eine SharePoint-Dokumentbibliothek "Prüfbericht-Vorlagen". Jede Datei darin ist eine Word-Vorlage mit einer Metadaten-Spalte "Firma" (Freitext, exakter Firmenname wie in Dataverse) — maximal eine aktive Vorlage pro Firma (bei einem Pflegefehler mit mehreren Treffern gilt die zuletzt geänderte Datei, siehe Product Decisions). Eine einzelne, besonders benannte Datei ohne Firma-Zuordnung dient als Standard-Vorlage für Firmen ohne eigene Zuordnung.
- **Archiv-Ablage:** Eine zweite, getrennte Dokumentbibliothek "Generierte Prüfberichte". Darin wird pro Firma automatisch ein Unterordner angelegt (beim ersten Export dieser Firma), in dem alle bisher für diese Firma generierten PDFs chronologisch benannt (Firma + Zeitstempel) gesammelt werden.
- **Platzhalter-Feldpool in der Vorlage:** Einmalig der Firmenname, sowie innerhalb einer sich automatisch wiederholenden Tabellenzeile pro Gerät: alle Gerätestammdaten (Gerätename, Kunden-ID, Barcode, Seriennummer, Lagerort, Standort, Herstelljahr, Erstgebrauch, Ablegereife, Zubehör, Bemerkungen), die zugehörigen Artikel-Stammdaten (Typ, Dimension, Hersteller) sowie die Daten des aktuellsten aktiven Prüfberichts (Datum, Prüfer, Ergebnis, Bemerkung) inklusive eines speziellen, vorbereiteten Feldes für die ergebnisabhängige Zellfarbe.
- **Keine neue Datenbank/Tabelle:** Sowohl die Vorlagen-Zuordnung als auch das Archiv leben vollständig in SharePoint; das Admin-Tool selbst bleibt wie in der PRD festgelegt ohne eigene Datenbank.

### Technische Entscheidungen (Begründung)
Siehe Decision Log → Technical Decisions oben.

### Abhängigkeiten (Packages)
- Eine Word-Templating-Bibliothek für die Platzhalter-Ersetzung inkl. Tabellen-Wiederholung (docxtemplater) — einzige neue Abhängigkeit
- Keine neuen Pakete für die PDF-Konvertierung selbst — läuft über die bestehende Microsoft-Graph-Anbindung, die für diese Funktion um einen zusätzlichen Berechtigungs-Scope erweitert wird (gleiches Authentifizierungsmuster wie die bestehende Dataverse-Anbindung aus PROJ-2, nur mit anderem Scope)

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
