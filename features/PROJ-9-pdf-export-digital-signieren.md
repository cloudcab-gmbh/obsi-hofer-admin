# PROJ-9: PDF-Export digital signieren (Firmen-Siegel)

## Status: Planned
**Created:** 2026-10-07
**Last Updated:** 2026-10-07

## Dependencies
- Requires: PROJ-7 (PDF-Export Prüfberichte) — signiert genau das dort erzeugte PDF, vor Download und Archiv-Ablage
- **Phase 1 (Testphase):** keine externe Abhängigkeit — selbst erstelltes Test-Zertifikat und Gratis-Zeitstempeldienst (z.B. freetsa.org)
- **Phase 2, extern (kostenpflichtig, Auswahl offen):** Zertifikat für ein elektronisches Firmen-Siegel von einer Zertifizierungsstelle, der gängige PDF-Viewer vertrauen (Adobe Approved Trust List), samt Signierdienst mit Programmierschnittstelle und Zeitstempeldienst. Gratis-Zertifizierungsstellen (z.B. für Webseiten-Zertifikate) eignen sich dafür nicht; ein selbst erstelltes Zertifikat zeigt beim Kunden "Gültigkeit unbekannt"

## Phasen
Das Feature wird in zwei Phasen umgesetzt (Refinement 2026-10-07), damit die Entwicklung nicht auf die Anbieterwahl warten muss:

| | Phase 1: Testphase | Phase 2: Echtes Firmen-Siegel |
|---|---|---|
| Zertifikat | selbst erstelltes Test-Zertifikat | Firmen-Siegel einer Zertifizierungsstelle auf der Adobe Approved Trust List |
| Zeitstempel | Gratis-Zeitstempeldienst (z.B. freetsa.org) | Zeitstempeldienst des Anbieters |
| Wo signiert | nur lokal und in Vercel-Preview-Deployments — **nie in Produktion** | Produktion |
| SharePoint-Archiv | keine Ablage im Archiv (nur Download) | Ablage wie in PROJ-7 |
| Sichtbarer Vermerk | mit Test-Kennzeichnung, z.B. "TEST-Signatur – nicht gültig – OBSI Hofer GmbH, 07.10.2026 14:30" | "Elektronisch signiert durch OBSI Hofer GmbH" mit Datum und Uhrzeit |
| Anzeige in Adobe Reader | gelbe Warnung "Gültigkeit unbekannt" (erwartet) | gültig signiert, ohne Einrichtung beim Empfänger |

Der Wechsel von Phase 1 zu Phase 2 erfolgt über die Konfiguration (Zertifikat, Signier- und Zeitstempeldienst austauschen). Der Teil, der die Signatur ins PDF einbettet, wird übernommen; die Anbindung an den Signierdienst des Anbieters kommt in Phase 2 dazu. Phase 1 darf deployt werden (in Produktion bleibt die Signatur aus); PROJ-9 gilt erst mit Phase 2 als "Deployed".

## User Stories
- Als OBSI Hofer möchte ich, dass jeder exportierte Prüfbericht mit dem elektronischen Siegel der Firma signiert ist, damit Kunden und Auditoren nachprüfen können, dass er von uns stammt.
- Als Kunde möchte ich beim Öffnen des PDFs sehen, dass es gültig von OBSI Hofer signiert und seither nicht verändert wurde, damit ich mich auf den Inhalt verlassen kann.
- Als Bearbeiter möchte ich, dass die Signatur automatisch beim Export entsteht, ohne zusätzlichen Schritt oder persönliche Bestätigung.
- Als OBSI Hofer möchte ich, dass ein Prüfbericht auch nach Jahren noch als gültig signiert prüfbar ist, damit er als Nachweis taugt, auch wenn das Zertifikat inzwischen erneuert wurde.
- Als OBSI Hofer möchte ich, dass nie ein unsignierter Prüfbericht hinausgeht, sobald die Signatur eingeführt ist.
- Als Entwickler möchte ich die Signatur schon vor der Anbieterwahl mit einem Test-Zertifikat vollständig aufbauen und testen können, ohne dass ein Test-PDF zu Kunden oder ins Archiv gelangt.

## Out of Scope
- Persönliche (qualifizierte) Unterschrift einzelner Prüfer — bewusst nicht, ein Firmen-Siegel reicht (Nutzer-Entscheidung)
- Signieren des künftigen PDF-Exports im Kundenportal — eigenes Feature dort (siehe `docs/kundenportal-pdf-export-idee.md`); dieser Mechanismus kann dafür wiederverwendet werden
- Nachträgliches Signieren bereits erstellter bzw. im SharePoint-Archiv liegender PDFs
- Signieren anderer Dokumente als des Prüfbericht-PDFs
- Prüfen von Signaturen im Admin-Tool — die Prüfung erfolgt beim Empfänger im PDF-Viewer
- Auswahl oder Verwaltung von Zertifikaten in der Oberfläche — Konfiguration erfolgt einmalig ausserhalb der App
- Signieren mit dem Test-Zertifikat in Produktion (Phase 1 nur lokal und in Previews)
- Eigene SharePoint-Test-Bibliothek für die Testphase — im Testmodus wird stattdessen gar nicht archiviert

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

**Phase 1 (Testmodus)**
- [ ] Angenommen der Testmodus ist lokal oder in einem Preview-Deployment eingeschaltet, wenn ein PDF-Export ausgelöst wird, dann ist das heruntergeladene PDF mit dem Test-Zertifikat signiert und trägt einen Zeitstempel des Gratis-Zeitstempeldienstes
- [ ] Angenommen der Testmodus ist eingeschaltet, wenn ein PDF erzeugt wird, dann trägt jede Seite den sichtbaren Vermerk mit Test-Kennzeichnung ("TEST-Signatur – nicht gültig – …") samt Datum und Uhrzeit
- [ ] Angenommen der Testmodus ist eingeschaltet, wenn ein Export erfolgreich war, dann wird das PDF **nicht** im SharePoint-Archiv abgelegt
- [ ] Angenommen ein Test-signiertes PDF wird in Adobe Acrobat Reader geöffnet, dann zeigt der Viewer die Signatur als vorhanden und das Dokument als seit der Signatur unverändert an (die Warnung "Gültigkeit unbekannt" zum Unterzeichner ist erwartet)
- [ ] Angenommen ein Test-signiertes PDF wird nachträglich verändert, wenn es erneut geöffnet wird, dann zeigt der Viewer die Signatur als ungültig an
- [ ] Angenommen der Testmodus ist in Produktion konfiguriert (Fehlkonfiguration), wenn ein Export ausgelöst wird, dann wird nicht mit dem Test-Zertifikat signiert, sondern unverändert wie bisher unsigniert exportiert und archiviert, und im Server-Log erscheint eine Warnung
- [ ] Angenommen der Testmodus ist eingeschaltet und Zeitstempeldienst oder Signatur schlagen fehl, wenn ein Export ausgelöst wird, dann wird kein PDF heruntergeladen und dieselbe Fehlermeldung wie im Produktivmodus angezeigt
- [ ] Angenommen weder Testmodus noch Produktivmodus sind eingeschaltet, wenn ein Export ausgelöst wird, dann funktioniert der PDF-Export unverändert wie bisher (unsigniert, ohne Vermerk, mit Archiv-Ablage)

**Phase 2 (Produktivmodus mit echtem Siegel — "Signatur aktiviert")**

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
- Gratis-Zeitstempeldienst in der Testphase langsam oder nicht erreichbar → wie Ausfall behandeln (Export abbrechen); kein Ausweichen auf "ohne Zeitstempel", damit die Ausfallbehandlung realistisch getestet wird
- Test-PDF wird trotz allem weitergegeben → die sichtbare Test-Kennzeichnung und die Viewer-Warnung machen klar, dass es keine gültige Signatur trägt
- Viewer ohne Signaturanzeige (z.B. einfacher Browser-PDF-Viewer) oder Ausdruck → der sichtbare Vermerk zeigt die Signatur trotzdem an (ohne kryptografische Prüfbarkeit)

## Technical Requirements (optional)
- Security: Der geheime Signaturschlüssel verlässt nie den Signierdienst bzw. dessen geschützte Hardware; Zugangsdaten zum Dienst nur serverseitig
- Security (Phase 1): Test-Zertifikat und -Schlüssel nur serverseitig (Umgebungsvariablen lokal/Preview), nie im Repo und nie in der Produktions-Umgebung hinterlegt; ausschliesslich für Tests erzeugt, nie für echte Dokumente verwendet
- Austauschbarkeit: Zertifikat, Signier- und Zeitstempeldienst sind Konfiguration, kein Code — der Wechsel Phase 1 → Phase 2 erfordert keinen Umbau der Einbettung ins PDF
- Performance: Signatur fügt dem Export nur wenige Sekunden hinzu
- Kompatibilität: Signatur nach dem gängigen PDF-Signaturstandard, gültig angezeigt in Adobe Acrobat Reader ohne zusätzliche Einrichtung beim Empfänger

## Open Questions
- [ ] Anbieter von Zertifikat und Signierdienst (z.B. Swisscom Trust Services, SwissSign, internationale Zertifizierungsstellen) — Angebote einholen; Kosten und Konditionen klären. Die Wahl bestimmt die Schnittstelle zum Signierdienst und ist Voraussetzung für **Phase 2**; `/architecture` für Phase 1 kann ohne sie starten (Refinement 2026-10-07)
- [ ] Siegel-Stufe nach Schweizer Recht (geregeltes elektronisches Siegel nach ZertES vs. fortgeschrittenes Siegel) — mit dem Anbieter klären, was für den Zweck "Herkunft + Unverfälschtheit nachweisen" angemessen ist
- [ ] Genauer Wortlaut und Position des sichtbaren Vermerks (Fusszeile jeder Seite angenommen)

## Anbieter-Recherche (2026-10-07, öffentliche Webseiten — Preise bei keinem Anbieter veröffentlicht)

| Kriterium | Swisscom Trust Services | SwissSign | GlobalSign DSS | Skribble |
|---|---|---|---|---|
| Adobe Approved Trust List | ✅ | ✅ | ✅ | (nutzt Swisscom) |
| Organisations-Siegel | fortgeschritten + geregelt (ZertES), fortgeschritten + qualifiziert (eIDAS) | Organisations-Siegel nach ZertES/eIDAS | fortgeschrittenes + qualifiziertes Siegel (eIDAS) | Organisations-Signatur nur im Scale-Plan |
| Automatisch per API, nur Hash übertragen | ✅ ausdrücklich | ✅ REST-API | ✅ REST-API, Zertifikat + Zeitstempel + Sperrstatus in einem Aufruf | API, eher Signatur-Workflows |
| Zeitstempel | qualifizierter Zeitstempel kombinierbar | ✅ | ✅ inklusive | k.A. |
| Preise | nur auf Anfrage; Siegel-Pakete ab **50'000 Einheiten/Jahr** (XS) | nur auf Anfrage | nur auf Anfrage | Scale-Plan nur auf Anfrage |
| Einrichtung | Erklärung + Zertifikatsantrag, Identifikation der zeichnungsberechtigten Person; fortgeschrittenes Siegel: Client-Zertifikat für die API; geregeltes Siegel: Schlüssel auf FIPS-zertifizierter Hardware (z.B. YubiKey, Azure Key Vault HSM); Zertifikat 3 Jahre gültig | Identifikation laut Anbieter inklusive | Organisation wird vor Aktivierung validiert | — |

**Einschätzung:** Für das Admin-Tool reicht ein **fortgeschrittenes Siegel** (Herkunft + Unverfälschtheit) — einfacher einzurichten als das geregelte (keine eigene Schlüssel-Hardware). Erwartetes Volumen grob einige hundert Signaturen pro Jahr (305 Firmen × wenige Exporte) — Swisscoms kleinstes veröffentlichtes Siegel-Paket (50'000) ist dafür deutlich überdimensioniert; ein kleineres Kontingent oder Preis pro Signatur gezielt anfragen. Skribble ist eine Signatur-Plattform mit Workflows und für reines automatisches Siegeln voraussichtlich überdimensioniert.

**Empfohlenes Vorgehen:** Offerten bei **Swisscom Trust Services** (fortgeschrittenes ZertES-Siegel + qualifizierter Zeitstempel, kleines Volumen) und **GlobalSign DSS** (Vergleich, entwicklerfreundlich) einholen, **SwissSign** als dritte Option.

Quellen: trustservices.swisscom.com (ZertES-Siegel, Service-Pakete, Hilfe-Center Siegel-Einrichtung), docs.globalsign.com (DSS-FAQ), globalsign.com/document-signing, swisssign.com (Suchtreffer; Seiten blockierten den Abruf), helpx.adobe.com (AATL-Mitglieder), skribble.com (Preise, E-Siegel).

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
| Umsetzung in zwei Phasen: zuerst mit selbst erstelltem Test-Zertifikat, später mit echtem Firmen-Siegel | Entwicklung und Tests müssen nicht auf Anbieterwahl und Offerten warten; ein Test-Zertifikat erfüllt das Kriterium "gültig ohne Einrichtung beim Empfänger" nicht und ist daher nur für Tests geeignet (Nutzer-Entscheidung) | 2026-10-07 |
| Test-Signatur nur lokal und in Vercel-Previews, nie in Produktion; Fehlkonfiguration in Produktion → unsigniert wie bisher + Log-Warnung | Kein Kunde soll ein PDF mit Warnung "Gültigkeit unbekannt" erhalten (Nutzer-Entscheidung); die Rückfallregel verhindert, dass eine falsche Konfiguration Test-PDFs ausliefert oder den Export in Produktion blockiert | 2026-10-07 |
| Im Testmodus keine Ablage im SharePoint-Archiv | Lokal und Preview nutzen vermutlich dieselbe Bibliothek "Kunden" wie Produktion; Test-PDFs sollen das echte Kundenarchiv nicht verunreinigen, eine eigene Test-Bibliothek wäre unnötiger Einrichtungsaufwand (Nutzer-Entscheidung) | 2026-10-07 |
| Gratis-Zeitstempeldienst in der Testphase | Ganzer Ablauf inkl. Zeitstempel und Ausfallbehandlung wird schon in Phase 1 getestet (Nutzer-Entscheidung) | 2026-10-07 |
| Sichtbarer Vermerk im Testmodus mit Test-Kennzeichnung | Ein versehentlich weitergegebenes Test-PDF ist sofort als nicht gültig erkennbar (Nutzer-Entscheidung) | 2026-10-07 |
| Ein Feature mit zwei Phasen statt Aufteilung in zwei Features; "Deployed" erst mit Phase 2 | Weniger Verwaltungsaufwand; Phase 1 hat für Kunden keinen eigenständigen Nutzen (Nutzer-Entscheidung) | 2026-10-07 |
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
