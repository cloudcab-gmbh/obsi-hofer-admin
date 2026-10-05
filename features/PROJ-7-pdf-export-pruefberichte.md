# PROJ-7: PDF-Export Prüfberichte (kundenspezifisches Template)

## Status: Planned
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
- [ ] Welche konkrete SharePoint-Site/-Bibliothek dient als Vorlagen-Ablage, und wie heisst die Metadaten-Spalte für die Firma-Zuordnung (z.B. Text-Spalte mit exaktem Firmennamen, oder Lookup-Spalte)? Vom Nutzer einzurichten bzw. in `/architecture` final festzulegen.
- [ ] Wie wird die Standard-Vorlage technisch bereitgestellt — selbst als Datei in derselben SharePoint-Bibliothek (ohne Firma-Zuordnung, als "default" markiert), oder fest im Code/Repo hinterlegt? Zu klären in `/architecture`.
- [ ] Technischer Ansatz für die Word→PDF-Umwandlung inkl. der verpflichtenden farblichen Hervorhebung (z.B. Microsoft-Graph-eigene Konvertierung plus Vorverarbeitung der Vorlage, oder eine andere Merge-Technologie) — bewusst keine technische Festlegung in dieser Spec, da Sache von `/architecture`. Risiko: datengetriebene Zellfarben in einer reinen Word-Mail-Merge-Vorlage sind technisch anspruchsvoller als reiner Text-Merge und könnten die Wahl der Architektur einschränken.
- [ ] Exakte Liste und Benennung der als Platzhalter verfügbaren Felder (siehe Product Decisions für die inhaltliche Liste) muss für die Admin-Dokumentation/Anleitung zur Vorlagen-Erstellung technisch festgelegt werden (z.B. Platzhalter-Syntax) — Sache von `/architecture`/`/backend`.
- [ ] Muss die Azure-AD-App-Registrierung für die neuen Graph-Berechtigungen erweitert werden, oder braucht es eine separate App-Registrierung für den SharePoint-Zugriff? Abhängig von der in `/architecture` gewählten Lösung.

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

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
