# PROJ-9: PDF-Export digital signieren (Firmen-Siegel)

## Status: Architected
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
- [ ] Genauer Wortlaut und Position des sichtbaren Vermerks (Fusszeile jeder Seite angenommen; Architektur: unten, klein, grau) — am ersten Test-PDF festlegen

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
| `@signpdf` (Signaturfeld/Einbetten) + `pkijs`/`asn1js` (Signatur-Container, Zeitstempel) | Verbreitete, aktiv gepflegte Bibliotheken; die mitgelieferten `@signpdf`-Signer (P12/node-forge) können keinen Zeitstempel und kein Unterschreiben beim Anbieter, daher eigener Signer auf `pkijs`-Basis | 2026-10-07 |
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

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
