# PROJ-9: PDF-Export digital signieren (Firmen-Siegel)

## Status: Approved
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
- [x] Genauer Wortlaut und Position des sichtbaren Vermerks → Fusszeile jeder Seite, zentriert, 7 pt grau; Test: "TEST-Signatur – nicht gültig – OBSI Hofer GmbH, TT.MM.JJJJ HH:MM", produktiv: "Elektronisch signiert durch OBSI Hofer GmbH, TT.MM.JJJJ HH:MM" — am ersten Test-PDF vom Nutzer bestätigt (2026-10-07)

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
| Signaturformat PAdES mit Zeitstempel (Baseline B-T) | Von Adobe Reader geprüft und von allen recherchierten Anbietern unterstützt; Zeitstempel für Langzeit-Prüfbarkeit | 2026-10-07 |
| Signatur-Ablauf im eigenen Server-Code, nur das Unterschreiben der Prüfsumme über austauschbaren Schlüssel-Baustein | Phase 1 → Phase 2 ohne Umbau; in Phase 2 bleibt der Schlüssel beim Anbieter (nur Prüfsumme wird übertragen) | 2026-10-07 |
| `@signpdf` (Signaturfeld/Einbetten; umgesetzt mit `placeholder-pdf-lib` statt `placeholder-plain`, siehe Implementation Notes) + `pkijs`/`asn1js` (Signatur-Container, Zeitstempel) | Verbreitete, aktiv gepflegte Bibliotheken; die mitgelieferten `@signpdf`-Signer (P12/node-forge) können keinen Zeitstempel und kein Unterschreiben beim Anbieter, daher eigener Signer auf `pkijs`-Basis | 2026-10-07 |
| Signaturfeld nachträglich in das fertige pdfmake-PDF statt Signatur im pdfmake-Layout | PROJ-7-Layout bleibt unangetastet; pdfmake bietet keinen Zugang zum Signieren | 2026-10-07 |
| Sichtbarer Vermerk als pdfmake-Fusszeile auf jeder Seite, Signaturfeld selbst unsichtbar | Vermerk auf jeder Seite verlangt (Spec), sichtbare Signaturfelder gäbe es nur auf einer Seite | 2026-10-07 |
| Signatur-Modus `aus`/`test`/`produktiv` per Umgebungsvariable, Umgebung über Vercels automatische Kennung | Muster wie `KUNDENPORTAL_SYNC_AKTIV` (PROJ-5); die automatische Kennung kann nicht versehentlich falsch gepflegt werden | 2026-10-07 |
| Test-Zertifikat/-Schlüssel nur in `.env.local` und Vercel-Preview-Umgebung | Physische Trennung zusätzlich zur Modus-Regel: in Production existiert der Test-Schlüssel gar nicht | 2026-10-07 |
| Begrenzte Wartezeit (ca. 10–15 s) auf den Zeitstempeldienst, danach Abbruch | "Nie unsigniert" bei gleichzeitig vorhersehbarer Antwortzeit des Exports | 2026-10-07 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

> Stand 2026-10-07: Fokus Phase 1 (Test-Zertifikat). Phase 2 ist so vorbereitet, dass nur der "Schlüssel-Baustein" und die Konfiguration getauscht werden.

### A) Ablauf / Bausteine
Keine neue Seite und keine neuen Bedienelemente — die Signatur hängt sich in den bestehenden Export (PROJ-7) zwischen "PDF erzeugen" und "Download/Archiv":

```
"PDF generieren" (Geräteliste, unverändert)
+-- Server Action generatePdfAction (bestehend)
    +-- Signatur-Modus bestimmen (NEU)
    |     aus | test | produktiv  — aus Konfiguration + Umgebung (Produktion/Preview/lokal)
    +-- PDF erzeugen (bestehend, pdfmake)
    |     + Fusszeile mit Signaturvermerk auf jeder Seite (NEU, nur wenn Modus ≠ aus)
    +-- PDF signieren (NEU, Baustein "PDF-Signatur")
    |   +-- Signaturfeld ins fertige PDF einfügen (unsichtbar, der sichtbare Teil ist die Fusszeile)
    |   +-- Prüfsumme des PDFs berechnen
    |   +-- Schlüssel-Baustein unterschreibt die Prüfsumme
    |   |     Phase 1: Test-Schlüssel aus der Server-Konfiguration
    |   |     Phase 2: Signierdienst des Anbieters (nur die Prüfsumme wird übertragen)
    |   +-- Zeitstempel für die Unterschrift beim Zeitstempeldienst holen
    |   |     Phase 1: Gratis-Dienst (z.B. freetsa.org) · Phase 2: Dienst des Anbieters
    |   +-- Unterschrift + Zertifikat + Zeitstempel ins PDF einbetten
    +-- Archiv-Ablage im SharePoint (bestehend) — im Testmodus übersprungen (NEU)
    +-- Download an den Browser (bestehend)
        Fehler beim Signieren → kein Download, Meldung "Der Prüfbericht konnte nicht signiert werden. Bitte später erneut versuchen."
```

### B) Datenmodell (in Worten)
Keine Datenbank, keine neuen Dataverse-Felder. Neu ist nur Server-Konfiguration (Umgebungsvariablen, in `.env.local.example` dokumentiert):
- **Signatur-Modus:** `aus` (Standard, wenn nicht gesetzt) / `test` / später `produktiv`
- **Test-Zertifikat und Test-Schlüssel** (Phase 1): einmalig selbst erstellt; Name im Zertifikat "OBSI Hofer GmbH (TEST)". Nur in `.env.local` und in den Vercel-Umgebungsvariablen für **Preview** hinterlegt — nie für Production, nie im Repo
- **Adresse des Zeitstempeldienstes**
- Phase 2 zusätzlich: Zugangsdaten zum Signierdienst des Anbieters (Art je nach Anbieter, z.B. Client-Zertifikat)

**Modus-Regel:**

| Konfiguration | Lokal / Preview | Production |
|---|---|---|
| nicht gesetzt / `aus` | unsigniert wie bisher | unsigniert wie bisher |
| `test` | Test-Signatur, Test-Vermerk, kein Archiv | **wird ignoriert** → unsigniert wie bisher + Warnung im Server-Log |
| `produktiv` (Phase 2) | echtes Siegel | echtes Siegel |
| unbekannter Wert / Zugangsdaten fehlen bei aktivem Modus | Export abgebrochen mit verständlicher Meldung (ohne Details zu Zugangsdaten) | ebenso |

Die Umgebung (Production vs. Preview vs. lokal) erkennt die App an der von Vercel automatisch gesetzten Umgebungskennung — nicht an einer selbst gepflegten Variable, damit sie nicht versehentlich falsch gesetzt werden kann.

### C) Technische Entscheidungen (Begründung)
- **Signatur nach PAdES (europäischer PDF-Signaturstandard), Stufe "mit Zeitstempel"**: genau das, was Adobe Reader prüft und als gültig anzeigt, und was die Anbieter (Swisscom, GlobalSign, SwissSign) in Phase 2 liefern. Der Zeitstempel sorgt dafür, dass die Signatur auch nach Ablauf des Zertifikats prüfbar bleibt.
- **Signieren im eigenen Server-Code, Unterschreiben über austauschbaren Schlüssel-Baustein**: Alles rund ums PDF (Signaturfeld, Prüfsumme, Einbetten, Zeitstempel) ist in beiden Phasen gleich. Nur das eigentliche Unterschreiben der Prüfsumme wechselt: Phase 1 lokal mit dem Test-Schlüssel, Phase 2 beim Anbieter (dort verlässt der Schlüssel nie dessen Hardware — erfüllt die Security-Anforderung). So entsteht in Phase 2 kein Umbau.
- **Sichtbarer Vermerk als Fusszeile über pdfmake, nicht als sichtbares Signaturfeld**: Die Fusszeile wird beim Erzeugen auf jede Seite gesetzt und ist damit Teil des signierten Inhalts; ein sichtbares Signaturfeld gäbe es nur auf einer Seite. Datum/Uhrzeit im Vermerk in Schweizer Zeit, unmittelbar vor dem Signieren bestimmt (kann vom Zeitstempel um Sekunden abweichen — der Zeitstempel ist der rechtlich massgebliche Zeitpunkt). Wortlaut/Position: unten auf jeder Seite, klein und grau — bleibt bis zum ersten Test-PDF als offene Frage stehen.
- **Signaturfeld nachträglich ins fertige PDF**: Das Layout aus PROJ-7 (Spaltenbreiten, Seitenumbrüche) bleibt unangetastet; das Signieren ergänzt das PDF nur, statt es neu aufzubauen.
- **Testmodus in Production wird ignoriert statt Export zu blockieren**: Eine Fehlkonfiguration darf weder Test-PDFs an Kunden ausliefern noch den Export für alle Bearbeiter lahmlegen (Spec-Entscheidung).
- **Kein Ausweichen auf "ohne Zeitstempel" oder "unsigniert"** bei Ausfall im aktiven Modus: Spec-Entscheidung "nie unsigniert"; die Wartezeit auf den Zeitstempeldienst ist begrenzt (ca. 10–15 Sekunden), danach Abbruch mit Meldung.
- **Kein UI-Umbau**: Der Bearbeiter merkt die Signatur nur an der Fusszeile und ggf. an einer neuen Fehlermeldung — konsistent mit "ohne zusätzlichen Schritt".

### D) Abhängigkeiten (Pakete)
- `@signpdf/signpdf`, `@signpdf/placeholder-plain`, `@signpdf/utils` — Signaturfeld ins fertige PDF einfügen und die Signatur an der richtigen Stelle einbetten
- `pkijs` + `asn1js` — Signatur-Container nach PAdES aufbauen, Zeitstempel beim Zeitstempeldienst anfordern und einbauen; erlaubt das Unterschreiben "von aussen" (Phase 2: beim Anbieter)
- Kein Paket für die Test-Schlüssel selbst — Signieren mit der in Node eingebauten Krypto-Schnittstelle
- Test-Zertifikat: einmalig mit OpenSSL erstellt (Anleitung kommt in `.env.local.example`/Implementation Notes)

### E) Tests
- Unit-Tests für die Modus-Regel (alle Zeilen der Tabelle oben, insbesondere "test in Production → aus")
- Unit-Test: signiertes Test-PDF enthält Signatur, Zertifikat und Zeitstempel; nach Veränderung eines Bytes ist die Signatur ungültig (Zeitstempeldienst im Test simuliert)
- Archiv-Ablage im Testmodus übersprungen; Fehler beim Signieren → kein Download, richtige Meldung
- Manuell: Test-PDF lokal in Adobe Acrobat Reader öffnen (Signatur vorhanden, "unverändert", Warnung zum Unterzeichner erwartet)

## Implementation Notes (Backend, Phase 1)

**Umgesetzt 2026-10-07** — neues Modul `src/lib/pdf-signatur/`:
- `konfiguration.ts` — Modus-Regel (`ermittleSignaturKonfiguration`), Test-Schlüssel-Baustein, `SignaturFehler` (Kategorie `konfiguration` / `dienst`), sichtbarer Vermerk (`baueSignaturVermerk`, Schweizer Zeit). Production wird über `VERCEL_ENV === "production"` erkannt; dort wird `test` ignoriert (unsigniert + `console.warn`), auch wenn dort gar kein Test-Schlüssel hinterlegt ist. `produktiv` und unbekannte Werte → Konfigurationsfehler. Geprüft werden außerdem: Zertifikat und Schlüssel vorhanden, lesbar, zusammengehörig, RSA, nicht abgelaufen.
- `zeitstempel.ts` — RFC-3161-Anfrage an den Zeitstempeldienst (Standard `https://freetsa.org/tsr`, überschreibbar), Wartezeit max. 15 s, Prüfung der Antwort: Status "granted", Hash und Nonce passen zur Anfrage. Die kryptografische Prüfung des Tokens übernimmt der PDF-Viewer.
- `signiere-pdf.ts` — `CadesSigner` baut den Signatur-Container nach PAdES Baseline B-T (signierte Attribute contentType, messageDigest, signingCertificateV2; kein signingTime-Attribut, die Zeit steht im Signaturfeld; Zeitstempel als unsigniertes Attribut). `signierePdf` fügt per `@signpdf/placeholder-pdf-lib` ein unsichtbares Signaturfeld (SubFilter `ETSI.CAdES.detached`, 16 KB Platz) ins fertige PDF ein und bettet die Signatur ein. Unterschrieben wird über den Schlüssel-Baustein (`SignaturSchluessel.unterschreibe`) — in Phase 2 wird nur dieser durch den Signierdienst des Anbieters ersetzt.
- Eingebunden in `generatePruefberichtPdf` (`export.ts`): Signatur-Konfiguration wird **zuerst** ermittelt (Konfigurationsfehler bricht ab, bevor Dataverse/SharePoint angefragt werden). Im Testmodus: Fusszeile mit Test-Vermerk → signieren → **keine Archiv-Ablage**. Modus `aus`: Ablauf exakt wie bisher.
- Fusszeile: neues optionales `signaturVermerk` in `buildDocumentDefinition`/`erzeugePdf` (pdfmake `footer`, 7 pt, grau, zentriert, innerhalb des unteren Seitenrands — Spaltenbreiten und Seitenumbrüche unverändert).
- `generatePdfAction` (`geraete/actions.ts`): `SignaturFehler` → "Der Prüfbericht konnte nicht signiert werden. Bitte später erneut versuchen." (Dienst) bzw. "… Die Signatur-Einrichtung muss geprüft werden." (Konfiguration); Details nur im Server-Log.
- Neue Umgebungsvariablen (dokumentiert in `.env.local.example`, inkl. OpenSSL-Befehl für das Test-Zertifikat): `PDF_SIGNATUR_MODUS`, `PDF_SIGNATUR_TEST_ZERTIFIKAT`, `PDF_SIGNATUR_TEST_SCHLUESSEL`, `PDF_SIGNATUR_ZEITSTEMPEL_URL` (optional). PEM direkt, mit `\n` oder base64-kodiert.

**Abweichung vom Tech Design:** `@signpdf/placeholder-pdf-lib` (+ `pdf-lib`) statt `@signpdf/placeholder-plain` — letzteres zieht eine alte pdfkit-Version mit einer als kritisch gemeldeten `crypto-js`-Abhängigkeit nach (`npm audit`). pdf-lib schreibt das PDF beim Einfügen des Signaturfelds neu (ohne Objekt-Streams), der Inhalt und das Layout bleiben unverändert.

**Tests:** `konfiguration.test.ts` (Modus-Matrix inkl. Test in Production, fehlende/falsche/abgelaufene Zertifikate, PEM-Formate, Vermerk), `zeitstempel.test.ts` (mit aufgezeichneter echter freetsa.org-Antwort in `__fixtures__/`: Hash/Nonce/Status/HTTP-/Netzwerkfehler), `signiere-pdf.test.ts` (Signatur gültig, Zeitstempel und Zertifikat eingebettet, Veränderung erkannt, Fehler → kein PDF), `export.test.ts` (Testmodus: Vermerk, Signatur, kein Archiv, kein unsignierter Rückfall; Konfigurationsfehler vor jedem Datenzugriff), `actions.test.ts` (Fehlermeldungen ohne technische Details), `pdf-generator.test.ts` (Fusszeile nur mit Vermerk, Layout unverändert). Test-Zertifikate werden zur Laufzeit erzeugt (`test-helfer.ts`) — kein privater Schlüssel im Repo.

**Manuell verifiziert (2026-10-07):** PDF mit echtem freetsa.org-Zeitstempel signiert; `openssl cms -verify` gegen das Test-Zertifikat → "Verification successful"; nach Änderung eines Bytes → "content verify error". **Vom Nutzer lokal verifiziert (2026-10-07):** Echter Prüfbericht-Export mit `PDF_SIGNATUR_MODUS=test` in Adobe Acrobat Reader — Test-Vermerk auf jeder Seite, Signatur "OBSI Hofer GmbH (TEST)" mit Zeitstempel als unverändert erkannt (Warnung zum unbekannten Unterzeichner wie erwartet), keine Ablage im SharePoint-Archiv. Nebenbei: lokal fehlte `SHAREPOINT_STANDARD_VORLAGE_PFAD` (PROJ-7) in `.env.local`, vom Nutzer aus Vercel nachgetragen.

## QA Test Results

**Tested:** 2026-10-07 (Phase 1 — Testmodus)
**App URL:** http://localhost:3000 (lokal, `PDF_SIGNATUR_MODUS=test`)
**Tester:** QA Engineer (AI) + manueller Adobe-Reader-Test durch den Nutzer

**Umfang:** Nur Phase 1. Die Kriterien unter "Phase 2 (Produktivmodus)" sind erst mit dem echten Siegel testbar und hier **nicht** geprüft.

### Acceptance Criteria Status (Phase 1)

#### AC-1: Testmodus lokal/Preview → mit Test-Zertifikat signiert, mit Zeitstempel des Gratis-Dienstes
- [x] Unit-Tests (`signiere-pdf.test.ts`, `export.test.ts`, `konfiguration.test.ts`: aktiv ohne `VERCEL_ENV`, mit `preview`/`development`)
- [x] Manuell: PDF mit echtem freetsa.org-Zeitstempel signiert, `openssl cms -verify` → "Verification successful"; Nutzer: echter Export in Adobe Reader zeigt Signatur "OBSI Hofer GmbH (TEST)" mit Zeitstempel

#### AC-2: Sichtbarer Test-Vermerk auf jeder Seite
- [x] Fusszeile nur mit Vermerk, Layout (Ränder, Spaltenbreiten) unverändert (`pdf-generator.test.ts`); Wortlaut und Schweizer Zeit (`konfiguration.test.ts`); vom Nutzer im echten Export bestätigt

#### AC-3: Testmodus → keine Ablage im SharePoint-Archiv
- [x] `export.test.ts` (Upload nie aufgerufen); vom Nutzer bestätigt

#### AC-4: Adobe Reader zeigt Signatur vorhanden + Dokument unverändert (Warnung zum Unterzeichner erwartet)
- [x] Vom Nutzer in Adobe Acrobat Reader bestätigt

#### AC-5: Nachträglich verändertes Test-PDF → Signatur ungültig
- [x] `signiere-pdf.test.ts` (ein Byte geändert → Prüfsumme passt nicht); manuell mit `openssl cms -verify` → "content verify error"

#### AC-6: Testmodus in Production konfiguriert → unsigniert wie bisher + Warnung im Log
- [x] `konfiguration.test.ts` (auch ohne hinterlegten Test-Schlüssel in Production); Pfad `aus` inkl. Archiv unverändert (`export.test.ts`)

#### AC-7: Testmodus + Zeitstempel/Signatur schlägt fehl → kein PDF, Meldung wie im Produktivmodus
- [x] `export.test.ts` (kein Rückfall auf unsigniert, kein Archiv), `zeitstempel.test.ts` (Netzwerkfehler, HTTP-Fehler, Ablehnung, falscher Hash/Nonce, unlesbare Antwort), `actions.test.ts` (Meldung "Der Prüfbericht konnte nicht signiert werden. Bitte später erneut versuchen.")
- [x] ~~Siehe BUG-1: in ca. 1 von 128 Exporten scheitert die Zeitstempel-Anfrage ohne äusseren Grund~~ — behoben 2026-10-07

#### AC-8: Weder Test- noch Produktivmodus → Export unverändert
- [x] `export.test.ts` (Aufruf von `erzeugePdf` wie bisher, kein Signieren, Archiv-Ablage); alle bestehenden PROJ-7-Tests unverändert grün

### Edge Cases Status

#### EC-1: Zertifikat abgelaufen → Abbruch mit Hinweis auf die Einrichtung
- [x] `konfiguration.test.ts`; Meldung "… Die Signatur-Einrichtung muss geprüft werden." (`actions.test.ts`)

#### EC-2: Zeitstempeldienst nicht erreichbar → kein PDF ohne Zeitstempel
- [x] `zeitstempel.test.ts` + `export.test.ts`; Wartezeit auf 15 s begrenzt

#### EC-3: Sehr grosser Bericht
- [x] 150 Seiten / 205 KB in 262 ms signiert (ohne Netzwerk-Latenz des Zeitstempeldienstes, real ca. 1 s zusätzlich)

#### EC-4: Gleichzeitige Exporte
- [x] Signieren ist zustandslos (Konfiguration, Zertifikat und Signatur-Container pro Aufruf neu); die gemeinsame `@signpdf`-Instanz speichert nur `lastSignature`, das nicht verwendet wird

#### EC-5: Konfigurationsfehler → verständliche Meldung, keine Details
- [x] Fehlend, unlesbar, nicht zusammengehörig, kein RSA, unbekannter Modus, `produktiv` (noch nicht verfügbar) → Abbruch **vor** jedem Dataverse-/SharePoint-Zugriff; Meldung ohne Variablennamen (`actions.test.ts`), Details nur im Server-Log

#### EC-6: Viewer ohne Signaturanzeige / Ausdruck
- [x] Vermerk ist normaler Seiteninhalt (Fusszeile), unabhängig vom Viewer sichtbar

#### EC-7 (zusätzlich): Sonderzeichen im Signatur-Grund
- [x] BUG-2 behoben 2026-10-07

#### EC-8 (zusätzlich): Nonce der Zeitstempel-Anfrage mit führendem Null-Byte
- [x] BUG-1 behoben 2026-10-07

### Security Audit Results
- [x] Signatur nicht über Oberfläche/Anfrage beeinflussbar — Modus, Zertifikat, Schlüssel und Zeitstempel-URL ausschliesslich aus Server-Umgebungsvariablen
- [x] Test-Signatur in Production unmöglich: Modus wird anhand des von Vercel gesetzten `VERCEL_ENV` ignoriert; Test-Schlüssel laut Doku nur in `.env.local`/Preview
- [x] Kein privater Schlüssel im Repo (Test-Zertifikate zur Laufzeit erzeugt; die Fixture ist eine öffentliche Zeitstempel-Antwort); `.env.local` git-ignored
- [x] Fehlermeldungen in der Oberfläche ohne technische Details/Variablennamen
- [x] Authentifizierung/Autorisierung unverändert: PDF-Export nur angemeldet, Geräte weiterhin serverseitig auf die Session-Firma eingeschränkt (QA BUG-1 aus PROJ-7 bleibt wirksam, Tests grün)
- [x] Zeitstempel-Antwort wird gegen Hash und Nonce der eigenen Anfrage geprüft; Transport per HTTPS; Wartezeit begrenzt
- [x] `test-helfer.ts` und Fixture werden von keinem App-Code importiert (nicht im Produktions-Bundle)
- [x] Neue Pakete (`@signpdf/*`, `pdf-lib`, `pkijs`, `asn1js`): keine `npm audit`-Funde
- Hinweis (nicht PROJ-9): `npm audit` meldet ältere Funde in `sharp` und `source-map-js` (über `next`/`postcss`, high) sowie `uuid` (über `exceljs`, moderate) — separat prüfen

### Automatisierte Tests
- [x] `npm test`: 28 Dateien, 315 Tests grün
- [x] `npm run test:e2e`: 18/18 grün (Regression Zugriffsschutz)
- Kein neuer E2E-Test: Der PDF-Export ist nur angemeldet erreichbar, und der Entra-ID-Login ist (wie bei allen bisherigen Features) nicht automatisierbar; abgedeckt durch Unit-Tests und den manuellen Adobe-Test
- Cross-Browser/Responsive: nicht relevant — keine Änderung an der Oberfläche

### Bugs Found

#### BUG-1: Zeitstempel-Anfrage scheitert sporadisch (Nonce mit führendem Null-Byte)
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Testmodus aktiv, PDF wiederholt exportieren
  2. `holeZeitstempel` erzeugt eine 8-Byte-Zufalls-Nonce und setzt nur das höchste Bit auf 0; ist das erste Byte danach `0x00` (Wahrscheinlichkeit 1/128), ist die Nonce nicht minimal DER-kodiert
  3. Expected: Zeitstempel wird ausgestellt
  4. Actual: OpenSSL-basierte Zeitstempeldienste (u.a. freetsa.org) lehnen die Anfrage ab ("illegal padding", lokal mit `openssl ts -query -text` reproduziert) → Export bricht mit "Bitte später erneut versuchen" ab; ein erneuter Versuch klappt meist
- **Priority:** Fix before deployment (betrifft auch Phase 2)
- **Status:** ✅ Behoben (2026-10-07) — neue Funktion `minimaleGanzzahlBytes()` in `zeitstempel.ts` kodiert die Nonce immer minimal (überflüssige Null-Bytes entfernt, genau ein Null-Byte vor einem Wert ≥ 0x80); die bisherige Bit-Maske entfällt. Regressionstests in `zeitstempel.test.ts` (Grenzfälle, 2000 Zufalls-Nonces, Nonce-Vergleich mit führendem Null-Byte). Gegenprobe: `openssl ts -query -text` liest die vorher abgelehnte Nonce `0056…` jetzt korrekt; echte Anfragen an freetsa.org mit `0056…` und `ab56…` werden ausgestellt und bestehen die Hash-/Nonce-Prüfung

#### BUG-2: Gedankenstrich im Signatur-Grund wird verstümmelt
- **Severity:** Low
- **Steps to Reproduce:**
  1. Test-signiertes PDF in Adobe Reader öffnen → Signatureigenschaften → Grund
  2. Expected: "TEST-Signatur – nicht gültig"
  3. Actual: "–" wird als Steuerzeichen (Byte `0x13`) gespeichert, weil `@signpdf/placeholder-pdf-lib` den Grund ohne Unicode-Kodierung schreibt (`PDFString.of`); "ü" ist korrekt. Der sichtbare Vermerk in der Fusszeile ist nicht betroffen
- **Priority:** Fix before deployment (klein: im Grund nur Zeichen aus dem PDF-Standardzeichensatz verwenden, z.B. "-")
- **Status:** ✅ Behoben (2026-10-07) — neue Funktion `fuerPdfSignaturText()` in `signiere-pdf.ts`, angewendet auf den Signatur-Grund: typografische Striche → "-", typografische Anführungszeichen → ' bzw. ", alle übrigen Zeichen ausserhalb der druckbaren Latin-1-Zeichen (= PDFDocEncoding) → "?"; Umlaute bleiben. Greift damit auch für Phase 2. Tests in `signiere-pdf.test.ts` (Ersetzungen, Steuerzeichen/Emoji, Grund im fertigen PDF = "TEST-Signatur - nicht gültig")

### Summary
- **Acceptance Criteria (Phase 1):** 8/8 erfüllt
- **Bugs Found:** 2 total (0 critical, 0 high, 1 medium, 1 low) — beide behoben (2026-10-07)
- **Security:** Pass
- **Production Ready (Phase 1):** YES — keine Critical/High-Bugs; in Production bleibt die Signatur ohnehin aus. PROJ-9 gilt laut Spec erst mit Phase 2 als "Deployed"
- **Recommendation:** ~~BUG-1 und BUG-2 vor dem Push beheben~~ — beide behoben; Phase 1 deployen

## Deployment
_To be added by /deploy_
