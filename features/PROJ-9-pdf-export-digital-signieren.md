# PROJ-9: PDF-Export digital signieren (Firmen-Siegel)

## Status: Planned
**Created:** 2026-10-07
**Last Updated:** 2026-10-07

## Dependencies
- Requires: PROJ-7 (PDF-Export Prüfberichte) — signiert genau das dort erzeugte PDF, vor Download und Archiv-Ablage
- **Extern (kostenpflichtig, Auswahl offen):** Zertifikat für ein elektronisches Firmen-Siegel von einer Zertifizierungsstelle, der gängige PDF-Viewer vertrauen (Adobe Approved Trust List), samt Signierdienst mit Programmierschnittstelle und Zeitstempeldienst. Gratis-Zertifizierungsstellen (z.B. für Webseiten-Zertifikate) eignen sich dafür nicht; ein selbst erstelltes Zertifikat zeigt beim Kunden "Gültigkeit unbekannt"

## User Stories
- Als OBSI Hofer möchte ich, dass jeder exportierte Prüfbericht mit dem elektronischen Siegel der Firma signiert ist, damit Kunden und Auditoren nachprüfen können, dass er von uns stammt.
- Als Kunde möchte ich beim Öffnen des PDFs sehen, dass es gültig von OBSI Hofer signiert und seither nicht verändert wurde, damit ich mich auf den Inhalt verlassen kann.
- Als Bearbeiter möchte ich, dass die Signatur automatisch beim Export entsteht, ohne zusätzlichen Schritt oder persönliche Bestätigung.
- Als OBSI Hofer möchte ich, dass ein Prüfbericht auch nach Jahren noch als gültig signiert prüfbar ist, damit er als Nachweis taugt, auch wenn das Zertifikat inzwischen erneuert wurde.
- Als OBSI Hofer möchte ich, dass nie ein unsignierter Prüfbericht hinausgeht, sobald die Signatur eingeführt ist.

## Out of Scope
- Persönliche (qualifizierte) Unterschrift einzelner Prüfer — bewusst nicht, ein Firmen-Siegel reicht (Nutzer-Entscheidung)
- Signieren des künftigen PDF-Exports im Kundenportal — eigenes Feature dort (siehe `docs/kundenportal-pdf-export-idee.md`); dieser Mechanismus kann dafür wiederverwendet werden
- Nachträgliches Signieren bereits erstellter bzw. im SharePoint-Archiv liegender PDFs
- Signieren anderer Dokumente als des Prüfbericht-PDFs
- Prüfen von Signaturen im Admin-Tool — die Prüfung erfolgt beim Empfänger im PDF-Viewer
- Auswahl oder Verwaltung von Zertifikaten in der Oberfläche — Konfiguration erfolgt einmalig ausserhalb der App

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

- [ ] Angenommen die Signatur ist aktiviert, wenn ein Bearbeiter oder Freigeber einen PDF-Export auslöst, dann ist das heruntergeladene PDF mit dem Firmen-Siegel von OBSI Hofer signiert
- [ ] Angenommen ein signiertes PDF wird in Adobe Acrobat Reader geöffnet, wenn der Empfänger es betrachtet, dann zeigt der Viewer ohne weitere Einrichtung an, dass das Dokument gültig von "OBSI Hofer GmbH" signiert und seit der Signatur nicht verändert wurde
- [ ] Angenommen ein signiertes PDF wird nachträglich verändert, wenn es erneut geöffnet wird, dann zeigt der Viewer die Signatur als ungültig an
- [ ] Angenommen die Signatur ist aktiviert, wenn ein PDF signiert wird, dann enthält es einen Zeitstempel einer vertrauenswürdigen Stelle, sodass die Signatur auch nach Ablauf des Zertifikats als gültig zum Signaturzeitpunkt prüfbar bleibt
- [ ] Angenommen die Signatur ist aktiviert, wenn ein PDF erzeugt wird, dann trägt jede Seite einen dezenten sichtbaren Vermerk "Elektronisch signiert durch OBSI Hofer GmbH" mit Datum und Uhrzeit der Signatur
- [ ] Angenommen die Signatur ist aktiviert, wenn das PDF zusätzlich im SharePoint-Archiv abgelegt wird (PROJ-7), dann ist die Archivkopie dasselbe signierte PDF wie der Download
- [ ] Angenommen die Signatur ist aktiviert und der Signierdienst ist nicht erreichbar, antwortet nicht rechtzeitig oder lehnt ab, wenn ein Export ausgelöst wird, dann wird kein PDF heruntergeladen oder archiviert, und der Bearbeiter sieht die Meldung "Der Prüfbericht konnte nicht signiert werden. Bitte später erneut versuchen."
- [ ] Angenommen die Signatur ist noch nicht aktiviert, wenn ein Export ausgelöst wird, dann funktioniert der PDF-Export unverändert wie bisher (unsigniert, ohne Vermerk)
- [ ] Angenommen die Signatur ist aktiviert, wenn der Export erfolgreich war, dann ändern sich Dateiname, Inhalt und Layout des Berichts gegenüber PROJ-7 nicht — abgesehen vom Signaturvermerk

## Edge Cases
- Zertifikat ist abgelaufen oder gesperrt → Signierdienst lehnt ab → Export wird abgebrochen (wie Ausfall), mit Hinweis, dass die Signatur-Einrichtung geprüft werden muss
- Zeitstempeldienst nicht erreichbar, Signierdienst schon → kein PDF ohne Zeitstempel; Behandlung wie Ausfall (Export abbrechen)
- Sehr grosser Bericht (viele Seiten) → wird als Ganzes signiert; die Signatur darf den Export nicht wesentlich verlangsamen (Ziel: wenige Sekunden zusätzlich)
- Mehrere Bearbeiter exportieren gleichzeitig → jede Signatur unabhängig, keine gegenseitige Blockade
- Nach einer Zertifikatserneuerung → neue Exporte mit neuem Zertifikat; frühere PDFs bleiben dank Zeitstempel gültig prüfbar
- Fehler in der Konfiguration (Zugangsdaten zum Signierdienst fehlen/falsch) bei aktivierter Signatur → Export wird abgebrochen mit verständlicher Meldung, keine technischen Details zu Zugangsdaten in der Oberfläche
- Viewer ohne Signaturanzeige (z.B. einfacher Browser-PDF-Viewer) oder Ausdruck → der sichtbare Vermerk zeigt die Signatur trotzdem an (ohne kryptografische Prüfbarkeit)

## Technical Requirements (optional)
- Security: Der geheime Signaturschlüssel verlässt nie den Signierdienst bzw. dessen geschützte Hardware; Zugangsdaten zum Dienst nur serverseitig
- Performance: Signatur fügt dem Export nur wenige Sekunden hinzu
- Kompatibilität: Signatur nach dem gängigen PDF-Signaturstandard, gültig angezeigt in Adobe Acrobat Reader ohne zusätzliche Einrichtung beim Empfänger

## Open Questions
- [ ] Anbieter von Zertifikat und Signierdienst (z.B. Swisscom Trust Services, SwissSign, internationale Zertifizierungsstellen) — Angebote einholen; Kosten und Konditionen klären. Die Wahl bestimmt die Schnittstelle und ist Voraussetzung für `/architecture`
- [ ] Siegel-Stufe nach Schweizer Recht (geregeltes elektronisches Siegel nach ZertES vs. fortgeschrittenes Siegel) — mit dem Anbieter klären, was für den Zweck "Herkunft + Unverfälschtheit nachweisen" angemessen ist
- [ ] Genauer Wortlaut und Position des sichtbaren Vermerks (Fusszeile jeder Seite angenommen)

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Elektronisches Firmen-Siegel statt persönlicher Unterschrift der Prüfer | Ziel ist der Nachweis von Herkunft und Unverfälschtheit; läuft vollautomatisch ohne Handlung einer Person (Nutzer-Entscheidung) | 2026-10-07 |
| Fällt der Signierdienst aus, wird der Export abgebrochen — nie ein unsigniertes PDF | Die Signatur ist laut Nutzer zwingend; ein unsignierter Bericht beim Kunden wäre schlimmer als ein kurzer Ausfall | 2026-10-07 |
| Mit Zeitstempel einer vertrauenswürdigen Stelle | Prüfberichte werden jahrelang aufbewahrt; ohne Zeitstempel wird die Signatur nach Ablauf des Zertifikats nicht mehr als gültig angezeigt | 2026-10-07 |
| Zusätzlich sichtbarer, dezenter Vermerk auf jeder Seite | Signatur auch beim Ausdruck oder in Viewern ohne Signaturanzeige erkennbar | 2026-10-07 |
| Einführung über einen Schalter: bis zur Aktivierung läuft der Export unverändert unsigniert, ab Aktivierung gilt "nur signiert" | Code kann vor Abschluss der Anbieterwahl fertig und deployt sein, ohne den PDF-Export zu blockieren (gleiches Muster wie der Sync-Schalter in PROJ-5) | 2026-10-07 |
| Archivkopie im SharePoint ist dasselbe signierte PDF | Archiv und Kundendokument sollen identisch und gleichermassen nachweisfähig sein | 2026-10-07 |
| Kein Nachsignieren alter PDFs, kein Signieren des künftigen Kundenportal-PDFs in diesem Feature | Umfang klein halten; Kundenportal-PDF ist ein eigenes Feature, kann den Mechanismus aber übernehmen | 2026-10-07 |
| Keine Gratis-Zertifizierungsstelle | Gratis-Zertifikate bestätigen nur Domains (Webseiten), nicht die Firma, und werden für Dokumentsignaturen nicht als gültig angezeigt | 2026-10-07 |

### Technical Decisions
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
