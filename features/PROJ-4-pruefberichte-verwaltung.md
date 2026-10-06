# PROJ-4: Prüfberichte-Verwaltung

## Status: Deployed
**Created:** 2026-10-05
**Last Updated:** 2026-10-06

## Dependencies
- Requires: PROJ-1 (Entra-ID-Login mit Rollen) — für eingeloggte Nutzer mit Rolle Bearbeiter/Freigeber
- Requires: PROJ-2 (Dataverse-Web-API-Anbindung) — für Lesen/Schreiben der Prüfbericht- und Gerätedaten
- Requires: PROJ-3 (Geräte-Verwaltung) — ein Prüfbericht gehört immer zu einem Gerät; nutzt dieselbe Firma-Session (`src/lib/firma-session.ts`)

## User Stories
- Als Bearbeiter möchte ich für ein Gerät einen neuen Prüfbericht erfassen können, damit der aktuelle Prüfstatus dokumentiert ist.
- Als Bearbeiter möchte ich die Prüfhistorie eines Geräts einsehen können, damit ich nachvollziehen kann, wann und mit welchem Ergebnis zuletzt geprüft wurde.
- Als Bearbeiter möchte ich einen bestehenden Prüfbericht bearbeiten können (z.B. Tippfehler korrigieren), ohne dafür einen neuen anlegen zu müssen.
- Als Bearbeiter möchte ich einen fehlerhaften Prüfbericht stornieren können, ohne ihn unwiederbringlich zu löschen.
- Als Bearbeiter möchte ich firmenweit alle Prüfberichte einsehen und nach Gerät/Ergebnis filtern können, damit ich einen Überblick habe, nicht nur gerätebezogen.
- Als Freigeber möchte ich dieselben Pflege-Funktionen nutzen können wie ein Bearbeiter, da sich die Rollen hier nicht unterscheiden.

## Out of Scope
- Neuanlage/Bearbeitung von Geräten selbst — bleibt PROJ-3; ein Prüfbericht referenziert nur ein bestehendes Gerät (fix, nicht änderbar)
- Echtes Löschen von Prüfberichten — bewusst nicht, siehe PRD Non-Goal; Stornieren ersetzt das
- Reaktivierung stornierter Prüfberichte — Stornieren ist endgültig, siehe Product Decisions
- Bearbeitung eines stornierten Prüfberichts (auch Bemerkungen) — komplett read-only nach dem Stornieren
- Manuelle Eingabe/Änderung des Prüfer-Felds — automatisch aus dem eingeloggten Nutzer abgeleitet (derselbe Kürzel-Algorithmus wie die Legacy-Power-App)
- Einschränkung des Prüfdatums auf Vergangenheit/Gegenwart — frei wählbar, auch rückwirkende Erfassung
- Zusätzliche Berechtigungsstufe fürs Stornieren — Bearbeiter und Freigeber gleichbehandelt, wie der Rest von PROJ-4
- Pagination in der `/pruefberichte`-Übersicht — analog PROJ-3 vorerst nicht nötig (gleiche Firmengrössen-Annahme)
- Konfliktschutz bei gleichzeitiger Bearbeitung (optimistic locking) — Last-Write-Wins, konsistent mit PROJ-2/PROJ-3

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

- [ ] Angenommen ein Bearbeiter öffnet ein Gerät (PROJ-3), wenn die Detailseite lädt, dann wird zusätzlich die Prüfbericht-Historie dieses Geräts angezeigt (neueste zuerst, stornierte standardmässig ausgeblendet)
- [ ] Angenommen ein Gerät hat noch keinen Prüfbericht, wenn die Historie lädt, dann wird ein klarer Leer-Hinweis statt einer leeren Tabelle angezeigt
- [ ] Angenommen ein Bearbeiter legt einen neuen Prüfbericht für ein Gerät an und gibt Prüfdatum und Ergebnis ein, wenn er speichert, dann wird der Prüfbericht angelegt und die Status-Felder des Geräts (letzte Prüfung, Betriebsmittelstatus, Prüfer) werden automatisch aktualisiert
- [ ] Angenommen ein Bearbeiter öffnet das Formular für einen neuen Prüfbericht, wenn es lädt, dann ist das Prüfdatum mit dem heutigen Datum vorausgefüllt und das Prüfer-Feld zeigt automatisch die aus dem eingeloggten Namen abgeleiteten Initialen (read-only)
- [ ] Angenommen ein Bearbeiter lässt Prüfdatum oder Ergebnis leer, wenn er speichern will, dann wird eine Validierungsfehlermeldung angezeigt und nicht gespeichert
- [ ] Angenommen ein Bearbeiter bearbeitet den aktuellsten (nicht stornierten) Prüfbericht eines Geräts, wenn er speichert, dann werden auch die Status-Felder des Geräts entsprechend aktualisiert
- [ ] Angenommen ein Bearbeiter bearbeitet einen Prüfbericht, der nicht der aktuellste für sein Gerät ist, wenn er speichert, dann bleiben die Status-Felder des Geräts unverändert
- [ ] Angenommen ein Bearbeiter storniert den aktuellsten aktiven Prüfbericht eines Geräts, wenn die Stornierung gespeichert wird, dann werden die Status-Felder des Geräts auf den nächstälteren aktiven Prüfbericht zurückgesetzt (oder geleert, falls keiner existiert)
- [ ] Angenommen ein Bearbeiter storniert einen Prüfbericht, der nicht der aktuellste ist, wenn die Stornierung gespeichert wird, dann bleiben die Status-Felder des Geräts unverändert
- [ ] Angenommen ein Prüfbericht ist storniert, wenn ein Bearbeiter ihn öffnet, dann sind alle Felder read-only und es gibt keine Möglichkeit, ihn zu reaktivieren
- [ ] Angenommen keine Firma ist in der Session ausgewählt, wenn ein Bearbeiter `/pruefberichte` öffnet, dann erscheint derselbe Hinweis wie bei `/geraete` mit Link zu `/start`
- [ ] Angenommen eine Firma ist ausgewählt, wenn `/pruefberichte` lädt, dann werden alle nicht stornierten Prüfberichte der Geräte dieser Firma angezeigt, mit Suche nach Gerät und Filter nach Ergebnis
- [ ] Angenommen Dataverse ist beim Speichern nicht erreichbar, wenn der Bearbeiter speichert, dann wird eine verständliche Fehlermeldung angezeigt und die Eingaben bleiben im Formular erhalten

## Edge Cases
- Gerät hat noch keinen Prüfbericht → Historie zeigt einen Leer-Hinweis statt einer leeren Tabelle
- Alle Prüfberichte eines Geräts sind storniert → Gerät-Status-Felder bleiben auf dem zuletzt gültigen Stand bzw. leer (siehe Product Decisions); Historie zeigt "Keine aktiven Prüfberichte" mit einer Option, auch stornierte anzuzeigen
- Zwei Prüfberichte eines Geräts mit demselben Prüfdatum → "aktuellster" muss zusätzlich eindeutig bestimmbar sein, damit die Kaskadenlogik deterministisch bleibt (technische Entscheidung, siehe Open Questions)
- Gleichzeitige Bearbeitung/Stornierung desselben Prüfberichts durch zwei Nutzer → Last-Write-Wins, konsistent mit PROJ-2/PROJ-3
- Eingeloggter Name enthält kein durch Leerzeichen getrenntes zweites Wort (z.B. nur ein Vorname) → Fallback bei der Prüfer-Kürzel-Berechnung nötig (technische Entscheidung, siehe Open Questions)

## Technical Requirements (optional)
- Alle Lese-/Schreibzugriffe laufen über die generischen Funktionen aus PROJ-2 (`getRecord`, `listRecords`, `createRecord`, `updateRecord`)
- Zugriff nur für eingeloggte Nutzer mit Rolle Bearbeiter oder Freigeber (PROJ-1)
- Prüfer-Kürzel wird aus `session.user.name` abgeleitet, exakt nach demselben Algorithmus wie die bestehende Power App (siehe Product Decisions)

## Open Questions
_Keine offenen Fragen mehr — Tie-Breaking und Prüfer-Kürzel-Fallback wurden in `/architecture` festgelegt, siehe Tech Design._

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Zugriff sowohl über die Gerät-Detailseite (Historie + neuer Bericht) als auch über eine eigenständige, firmenweite `/pruefberichte`-Übersicht | Deckt beide Arbeitsweisen ab: gerätebezogen prüfen und firmenweiten Überblick behalten; nutzt den bereits bestehenden Header-Link | 2026-10-05 |
| Neuanlage eines Prüfberichts aktualisiert automatisch die Status-Felder des Geräts (letzte Prüfung, Betriebsmittelstatus, Prüfer) | Ein neuer Bericht ist immer der aktuellste; entspricht der Kaskade der Legacy-Power-App und der Grundannahme aus PROJ-3 (Status-Felder dort bewusst read-only) | 2026-10-05 |
| Bearbeiten aktualisiert die Gerät-Status-Felder nur, wenn der bearbeitete Bericht der aktuellste (nicht stornierte) für sein Gerät ist | Verhindert, dass eine Korrektur an einem alten Bericht versehentlich den aktuell angezeigten Gerätestatus überschreibt | 2026-10-05 |
| Prüfer-Feld automatisch aus dem eingeloggten Namen abgeleitet (Kürzel-Algorithmus 1:1 aus der Legacy-App übernommen: erste 2 Buchstaben Vorname + erste 2 Buchstaben nach dem ersten Leerzeichen, beides klein), nicht editierbar | Konsistenz mit bereits in Dataverse vorhandenen historischen Prüfer-Kürzeln; verhindert Falschzuordnung | 2026-10-05 |
| Stornieren für Bearbeiter und Freigeber gleichermassen möglich (keine zusätzliche Berechtigungsstufe) | Konsistent mit PROJ-3s Grundsatz, dass sich die beiden Rollen bei der Datenpflege nicht unterscheiden (nur Sync-Freigabe ist Freigeber-exklusiv) | 2026-10-05 |
| Storniert = endgültig, keine Reaktivierung; stornierter Bericht ist komplett read-only (auch Bemerkungen) | Einfache, klare Regel; bei einem Fehler wird stattdessen ein neuer, korrekter Bericht angelegt statt den alten wiederzubeleben | 2026-10-05 |
| Stornieren des aktuellsten aktiven Berichts setzt die Gerät-Status-Felder auf den nächstälteren aktiven Bericht zurück (oder leert sie, falls keiner existiert) | Verhindert, dass das Gerät nach einer Stornierung einen ungültigen (stornierten) Stand weiterhin anzeigt | 2026-10-05 |
| Ergebnis-Werte 1:1 aus der Legacy-App übernommen ("Freigabe"/"keine Freigabe"/"letzte Freigabe") | Bestehende Badge-Farben (`status-badge.ts`) und Dataverse-Spalte (`bmvcc_inspectionresult`) bereits vorhanden/kompatibel | 2026-10-05 |
| Prüfdatum frei wählbar (auch rückwirkend), Vorschlagswert = heute, keine Zukunfts-Einschränkung | Erlaubt nachträgliches Erfassen vergangener Prüfungen, ohne künstliche Hürden | 2026-10-05 |
| Stornierte Prüfberichte standardmässig in Listen ausgeblendet, über einen Filter einblendbar | Hält Historie/Übersicht auf das Relevante fokussiert, ohne Nachvollziehbarkeit zu verlieren | 2026-10-05 |
| `/pruefberichte`-Übersicht mit Suche nach Gerät + Filter nach Ergebnis, sortiert nach Prüfdatum absteigend | Analog zur bewährten PROJ-3-Geräteliste-UX | 2026-10-05 |

### Technical Decisions
<!-- Added by /architecture -->
| Decision | Rationale | Date |
|----------|-----------|------|
| Server Actions statt eigener API-Routen | Konsistent mit PROJ-3; direkter Aufruf der PROJ-2-Funktionen | 2026-10-05 |
| Gerät-Status-Kaskade läuft in derselben Server Action wie Speichern/Stornieren | Vermeidet inkonsistenten Zwischenzustand bei nur teilweise durchlaufender Logik | 2026-10-05 |
| "Aktuellster aktiver Bericht" wird bei Bedarf frisch ermittelt (Prüfdatum, dann Erstellungszeitpunkt, beides absteigend), nicht zwischengespeichert | Vermeidet Stale-Data; nutzt das von Dataverse automatisch gepflegte Erstellungszeitpunkt-Feld als Tie-Breaker, kein neues Feld nötig | 2026-10-05 |
| Prüfer-Kürzel-Berechnung als eigene, reine Funktion mit Fallback (ganzer Name auf 4 Zeichen gekürzt, falls kein Leerzeichen enthalten) | Deterministisch und testbar; deckt den Edge Case ungewöhnlicher Namen ab | 2026-10-05 |
| Stornieren als eigene Server Action, nicht über die generische Bearbeiten-Funktion | Macht die Absicht im Code klar, ermöglicht eigene Bestätigungs-UI vor einem endgültigen Schritt | 2026-10-05 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### A) Component Structure
```
Gerät-Detailseite (PROJ-3, erweitert)
+-- Prüfbericht-Historie (Tabelle: Datum, Ergebnis-Badge, Prüfer, Bemerkungen)
|   +-- Stornierte standardmässig ausgeblendet, Checkbox "auch stornierte anzeigen"
|   +-- Leer-Zustand ("Noch keine Prüfberichte")
+-- "Neuer Prüfbericht"-Button
    +-- Formular: Prüfdatum (vorausgefüllt: heute), Ergebnis (Dropdown), Bemerkungen (optional)
        Prüfer automatisch/read-only angezeigt

Prüfbericht-Detailseite (/pruefberichte/[id])
+-- Kontext-Info: zugehöriges Gerät (read-only, Link zurück zum Gerät)
+-- Formular (editierbar: Prüfdatum, Ergebnis, Bemerkungen) — komplett read-only, falls storniert
+-- "Stornieren"-Button mit Bestätigungsdialog (ausgeblendet, wenn bereits storniert)

Prüfberichte-Übersicht (/pruefberichte)
+-- Hinweis mit Link zu /start, falls keine Firma in der Session gewählt
+-- Suchfeld (Gerätename/Barcode) + Ergebnis-Filter + "auch stornierte anzeigen"-Checkbox
+-- Tabelle (Gerät, Datum, Ergebnis-Badge, Prüfer), sortiert nach Prüfdatum absteigend
+-- Leer-Zustand
```

### B) Data Model (plain language)
Kein eigenes Datenmodell — alle Daten kommen live aus Dataverse über PROJ-2. Jeder Prüfbericht hat: zugehöriges Gerät (fix), Prüfdatum, Ergebnis (Freigabe/keine Freigabe/letzte Freigabe), Prüfer (automatisch), Bemerkungen (optional) und ein Storniert-Flag.

**"Aktuellster aktiver Prüfbericht" eines Geräts** wird bei jedem relevanten Vorgang (Neuanlage, Bearbeiten, Stornieren) frisch aus Dataverse ermittelt — nicht zwischengespeichert, um Stale-Data zu vermeiden: zuerst nach Prüfdatum absteigend sortiert, bei zwei Berichten mit demselben Datum entscheidet zusätzlich der (von Dataverse automatisch gepflegte) Erstellungszeitpunkt, ebenfalls absteigend *(löst die offene Tie-Breaking-Frage aus der Spec)*. Nur nicht-stornierte Berichte zählen dabei mit.

### C) Tech Decisions
- **Server Actions statt eigener API-Routen**, analog PROJ-3: Anlegen/Bearbeiten/Stornieren rufen direkt die PROJ-2-Funktionen auf, kein eigener REST-Layer.
- **Kaskaden-Logik (Gerät-Status aktualisieren) läuft in derselben Server Action** wie das Speichern/Stornieren eines Prüfberichts, nicht als separater Folgeschritt — vermeidet einen inkonsistenten Zwischenzustand, falls nur ein Teil durchläuft.
- **"Aktuellster aktiver Bericht" wird bei Bedarf frisch ermittelt**, siehe Data Model — löst zugleich die Tie-Breaking-Frage über das Dataverse-Systemfeld für den Erstellungszeitpunkt (kein neues Feld nötig).
- **Prüfer-Kürzel-Berechnung als eigene, reine Funktion** (Session-Name → Kürzel, erste 2 Buchstaben vor dem ersten Leerzeichen + erste 2 Buchstaben danach, beides klein): Fallback, falls der Name kein Leerzeichen enthält (z.B. nur ein Wort) → ganzer Name auf 4 Zeichen gekürzt, klein geschrieben *(löst die offene Fallback-Frage aus der Spec)*.
- **Stornieren als eigene, einfache Server Action**, nicht über die generische Bearbeiten-Funktion — macht die Absicht im Code klar und ermöglicht eine eigene Bestätigungs-UI (shadcn `alert-dialog`, bereits installiert) vor diesem endgültigen Schritt.
- **Formular-Validierung mit Zod + react-hook-form** (Prüfdatum und Ergebnis Pflicht, Bemerkungen optional), analog PROJ-3.
- **Kein eigener Zwischenspeicher/Cache**, passend zum PRD-Grundsatz "live lesen, keine eigene Datenhaltung".

### D) Dependencies
- Keine neuen shadcn-Komponenten nötig — `alert-dialog`, `select`, `input`, `table`, `card`, `badge` sind bereits installiert und in Verwendung (PROJ-1/PROJ-3)
- Keine neuen npm-Pakete

## Implementation Notes (Frontend)

Umgesetzt (UI + Server Actions + Domänenlogik in einem Schritt, wie bei PROJ-3 — kein separater `/backend`-Durchlauf nötig, da PROJ-2 bereits die Backend-Schicht ist):

- `src/lib/dataverse/pruefberichte.ts` — generische Funktionen (`listPruefberichteForGeraet`, `listPruefberichteForGeraete`, `getPruefbericht`, `getAktuellsterAktiverPruefbericht`, `createPruefbericht`, `updatePruefbericht`, `stornierePruefbericht`) plus `syncGeraetStatusFromPruefberichte()`
- `src/lib/pruefer-kuerzel.ts` — `computePrueferKuerzel()`, 1:1 aus der Legacy-Power-App-Formel übernommen, mit Fallback für Namen ohne Leerzeichen
- `src/app/(protected)/pruefberichte/actions.ts` — Server Actions mit Zod-Validierung (Prüfdatum + Ergebnis Pflicht)
- `src/components/pruefbericht-tabelle.tsx`, `pruefbericht-historie.tsx`, `pruefberichte-uebersicht.tsx`, `pruefbericht-form.tsx` — UI-Komponenten
- Neue Routen `src/app/(protected)/pruefberichte/page.tsx` (Übersicht), `.../neu/page.tsx` (Anlegen), `.../[id]/page.tsx` (Bearbeiten/Stornieren); `src/app/(protected)/geraete/[id]/page.tsx` erweitert um die Prüfbericht-Historie
- Neue shadcn-Komponente `checkbox` installiert (für "auch stornierte anzeigen")

**Von der Spec abweichende Implementierungs-Entscheidung (Korrektur während der Umsetzung):** Die Spec beschreibt "Neuanlage aktualisiert immer die Gerät-Felder, Bearbeiten nur wenn aktuellster" als zwei getrennte Regeln. Da das Prüfdatum frei und auch rückwirkend wählbar ist (Product Decision), kann ein neu angelegter Bericht ein älteres Datum haben als ein bereits bestehender — "neu = immer aktuellster" stimmt dann nicht mehr. Implementiert wurde stattdessen eine einzige, konsistente Regel für Anlegen/Bearbeiten/Stornieren: nach jeder Änderung wird der tatsächlich aktuellste aktive Bericht für das Gerät frisch ermittelt (`syncGeraetStatusFromPruefberichte`) und die Gerät-Felder darauf abgeglichen. Für den normalen, nicht-rückwirkenden Fall ist das Ergebnis identisch mit der Spec-Beschreibung; der Edge Case (rückwirkende Neuanlage) wird dadurch zusätzlich korrekt behandelt, ohne dass die Spec das explizit verlangt hätte.

**Skalierungs-Vorkehrung:** `listPruefberichteForGeraete()` (für die firmenweite Übersicht) fragt die Gerät-IDs in 20er-Blöcken ab (`chunk()`-Hilfsfunktion) statt einer einzigen OR-Filterkette über bis zu ~200 Geräte-IDs — sonst drohte ein Dataverse-URL-Längenlimit. Gleiches Muster wie `chunk()` im Kundenportal-Repo (`src/lib/sync/batch.ts`).

**Offene Verifikationspunkte gegen die echte Dataverse-Umgebung** (wie bei PROJ-2/PROJ-3 in dieser Umgebung nicht gegen echte Daten testbar):
- `"bmvcc_Gearaet@odata.bind"` (Navigationseigenschaft für den Gerät-Lookup beim Anlegen eines Prüfberichts): Schreibweise ist ein begründetes Best-Guess (Schema-Namens-Konvention), nicht verifiziert — siehe Kommentar in `pruefberichte.ts`. Falls das beim ersten echten Anlegen fehlschlägt, muss hier die exakte Schreibweise aus dem Power-Platform-Customizer nachgetragen werden.
- Mehrfeld-`$orderby` (`"bmvcc_inspectiondate desc,createdon desc"`) für die Tie-Breaking-Regel — Standard-OData-Syntax, aber nicht gegen die echte Umgebung getestet

**Nicht möglich in dieser Umgebung:** Echter Login/echte Dataverse-Daten. Alle neuen/erweiterten Routen (`/pruefberichte`, `/pruefberichte/neu`, `/pruefberichte/[id]`, `/geraete/[id]`) wurden per Smoke-Test gegen den laufenden Dev-Server geprüft (korrekte Weiterleitung zu `/login` ohne Absturz) — die eigentliche Funktionalität muss der Nutzer im Browser mit echtem Login verifizieren.

## QA Test Results

**Tested:** 2026-10-05
**Tester:** QA Engineer (AI)
**Hinweis zur Testmethode:** Der Nutzer hat angekündigt, das eigentliche Bearbeiten/Speichern/Stornieren erst am Schluss selbst im Browser mit echtem Login zu testen. Diese Runde deckt daher Code-Review, Security-Audit, automatisierte Unit-Tests (35 neue, 97 insgesamt) und Smoke-Tests der Routen gegen den laufenden Dev-Server ab — **die eigentliche End-to-End-Funktionalität des Schreibpfads (Anlegen/Bearbeiten/Stornieren gegen echte Dataverse-Daten) ist noch nicht verifiziert**, weder durch den Nutzer noch durch diese QA-Runde.

### Acceptance Criteria Status
Funktional/strukturell per Code-Review verifiziert; Schreibpfad (Anlegen/Bearbeiten/Stornieren gegen echte Daten) noch ausstehend, siehe Hinweis oben.

- [x] Prüfbericht-Historie auf der Gerät-Detailseite, neueste zuerst, stornierte ausgeblendet (Code-Review: `PruefberichtHistorie` filtert standardmässig)
- [x] Leer-Hinweis bei noch keinem Prüfbericht
- [ ] Neuanlage + Kaskade auf Gerät-Status — **unit-getestet (Mock-Ebene)**, aber nicht live gegen echtes Dataverse geprüft; Risiko: unverifizierter `@odata.bind`-Navigationsname, siehe Implementation Notes
- [x] Prüfdatum vorausgefüllt mit heute, Prüfer automatisch/read-only (Code-Review + Unit-Test für `computePrueferKuerzel`)
- [x] Validierungsfehler bei leerem Prüfdatum/Ergebnis (Unit-Test: `actions.test.ts`)
- [ ] Bearbeiten des aktuellsten Berichts aktualisiert Gerät-Status — unit-getestet, nicht live geprüft
- [ ] Bearbeiten eines nicht-aktuellsten Berichts lässt Gerät-Status unverändert — unit-getestet (`getAktuellsterAktiverPruefbericht` liefert dann einen anderen Bericht), nicht live geprüft
- [ ] Stornieren des aktuellsten Berichts setzt Gerät-Status auf nächstältesten zurück — unit-getestet, nicht live geprüft
- [x] Stornieren eines nicht-aktuellsten Berichts lässt Gerät-Status unverändert (Code-Review: Kaskade ermittelt immer den aktuellsten unabhängig vom gerade stornierten)
- [ ] **Storniert = komplett read-only** — UI verhindert es, serverseitig NICHT durchgesetzt → siehe BUG-1 (High)
- [x] Hinweis + Link zu `/start` ohne Firma-Session (Code-Review, identisches Muster wie PROJ-3)
- [x] Firmenweite Übersicht mit Suche + Ergebnis-Filter, sortiert nach Datum absteigend (Code-Review + Smoke-Test)
- [x] Verständliche Fehlermeldung + Datenerhalt bei Speicherfehler (Code-Review: `register()` unkontrolliert, kein `reset()` im Fehlerfall, analog PROJ-3)

### Edge Cases Status
- [x] Gerät ohne Prüfbericht → Leer-Hinweis
- [x] Alle Prüfberichte eines Geräts storniert → `getAktuellsterAktiverPruefbericht` liefert `null`, Gerät-Felder werden geleert (Unit-Test vorhanden)
- [x] Zwei Berichte mit gleichem Prüfdatum → Tie-Breaking über `createdon desc` (Code-Review, OData-Syntax nicht live verifiziert)
- [x] Last-Write-Wins bei gleichzeitiger Bearbeitung (Code-Review: kein Konfliktschutz, wie geplant)
- [x] Name ohne Leerzeichen bei der Prüfer-Kürzel-Berechnung → Fallback getestet (`pruefer-kuerzel.test.ts`)

### Security Audit Results (Red Team / Code Review)
- [x] Zugriff nur für eingeloggte Bearbeiter/Freigeber (proxy.ts-Gate, gilt auch für Server Actions derselben Route)
- [x] GUID-Validierung für `geraetId`/Prüfbericht-`id` verhindert OData-Injection (dieselbe Absicherung wie PROJ-3, jetzt zusätzlich unit-getestet)
- [x] Keine XSS-Angriffsfläche (React-Auto-Escaping, kein `dangerouslySetInnerHTML`)
- [x] Keine Secrets im Client-Bundle
- [ ] BUG: siehe BUG-1 (High) — Stornieren-Schutz nur clientseitig
- [ ] BUG: siehe BUG-2 (Medium) — Ergebnis-Wert serverseitig nicht auf die drei erlaubten Werte beschränkt
- [ ] BUG: siehe BUG-3 (Medium) — `geraetId` bei Bearbeiten/Stornieren wird vom Aufrufer vertraut statt aus dem Datensatz selbst abgeleitet

### Bugs Found

#### BUG-1: Stornierter Prüfbericht ist serverseitig weiterhin bearbeitbar
- **Severity:** High
- **Steps to Reproduce:**
  1. Ein Prüfbericht ist storniert (`bmvcc_isarchived = true`)
  2. Die UI (`PruefberichtForm`) deaktiviert zwar alle Felder und blendet den Speichern-Button aus, sobald `pruefbericht.storniert` true ist
  3. `updatePruefberichtAction`/`updatePruefbericht` prüfen den Storniert-Status des Ziel-Berichts aber an keiner Stelle, bevor sie die Änderung schreiben
  4. Erwartet: Ein serverseitiger Versuch, einen stornierten Bericht zu bearbeiten, wird abgelehnt (die Spec verlangt "komplett read-only", nicht nur UI-seitig)
  5. Tatsächlich: Ein direkter Aufruf der Server Action (z.B. nach Reaktivieren eines alten Browser-Tabs mit noch aktivem Formular, oder durch einen manuell nachgebauten Request) würde den stornierten Bericht trotzdem ändern
- **Priority:** Fix before deployment
- **Status:** ✅ Fixed (2026-10-05) — `updatePruefbericht()`/`stornierePruefbericht()` laden den Bestandsdatensatz zuerst (`getPruefbericht()`) und lehnen mit einer `DataverseError("validation_error", ...)` ab, wenn er bereits storniert ist. Regressionstests: `pruefberichte.test.ts` ("rejects editing an already stornierten Prüfbericht…", "rejects stornieren an already stornierten Prüfbericht again").

#### BUG-2: Ergebnis-Wert wird serverseitig nicht auf die drei erlaubten Werte beschränkt
- **Severity:** Medium
- **Steps to Reproduce:**
  1. `pruefberichtSchema` in `actions.ts` prüft `ergebnis` nur auf "nicht leer", nicht auf Zugehörigkeit zu `ERGEBNIS_OPTIONEN` ("Freigabe"/"keine Freigabe"/"letzte Freigabe")
  2. Erwartet: Nur die drei definierten Werte werden akzeptiert
  3. Tatsächlich: Ein beliebiger nicht-leerer String würde die Validierung passieren und (falls das Dataverse-Feld kein strenges Choice/Options-Set ist, sondern Freitext) gespeichert — Anzeige würde dann als neutrale graue Badge erscheinen, ohne Fehlermeldung
- **Priority:** Fix before deployment
- **Status:** ✅ Fixed (2026-10-05) — `ergebnis` nutzt jetzt `z.enum(ERGEBNIS_OPTIONEN)` statt einer reinen Nicht-leer-Prüfung. Regressionstest: `actions.test.ts` ("rejects an Ergebnis value outside the three allowed options").

#### BUG-3: `geraetId` bei Bearbeiten/Stornieren wird vom Aufrufer übernommen statt aus dem Datensatz abgeleitet
- **Severity:** Medium
- **Steps to Reproduce:**
  1. `updatePruefbericht(id, geraetId, input)` und `stornierePruefbericht(id, geraetId)` aktualisieren den Prüfbericht über `id`, synchronisieren den Gerät-Status aber über den separat übergebenen `geraetId`-Parameter
  2. Aktuell immer konsistent, da beide UI-Aufrufstellen `geraetId` korrekt aus dem bereits geladenen Prüfbericht ableiten
  3. Erwartet: Die Kaskade sollte robust gegen einen falschen/inkonsistenten `geraetId`-Parameter sein, z.B. durch Ableitung aus `_bmvcc_gearaet_value` des Datensatzes selbst
  4. Tatsächlich: Bei einem (aktuell nicht auftretenden, aber nicht ausgeschlossenen) Aufruf mit falschem `geraetId` würde das eigentlich betroffene Gerät NICHT neu synchronisiert, ein unbeteiligtes Gerät hingegen schon (dort allerdings folgenlos, da die Synchronisation immer den tatsächlichen Istzustand abfragt)
- **Priority:** Nice to have (keine beobachtete reale Auswirkung, aber ein Robustheits-/Verteidigungslinie-Gewinn für wenig Aufwand)
- **Status:** ✅ Fixed (2026-10-05) — gleich mitbehoben, da dieselbe Codestelle betroffen war: `updatePruefbericht(id, input)` und `stornierePruefbericht(id)` nehmen `geraetId` gar nicht mehr als Parameter entgegen, sondern lesen `_bmvcc_gearaet_value` aus dem geladenen Datensatz und geben ihn zurück (`{ geraetId }`) — die Server Actions nutzen diesen Rückgabewert für die Cache-Revalidierung. Regressionstests: `pruefberichte.test.ts` ("re-syncs the Gerät status derived from the record itself"), `actions.test.ts` ("revalidates using the geraetId returned by updatePruefbericht, not a caller-supplied one").

### Retest (2026-10-05)
Alle drei Bugs behoben, Testsuite um 5 neue Fälle erweitert (35 → 40 in diesem Feature, 97 → 102 gesamt im Projekt). `npm test` (102/102), `npm run lint` und `npm run build` (inkl. TypeScript-Check) alle grün.

**Nachtrag (2026-10-05, Nutzerwunsch):** Die firmenweite Übersicht übernimmt jetzt den auf `/geraete` gewählten Filter (siehe PROJ-3 Implementation Notes/`geraete-filter-session.ts`): Lagerort-/Standort-/Letzte-Prüfung-Einschränkung wirkt sich direkt auf die einbezogenen Geräte aus (mit Hinweistext + Link zurück zu `/geraete`), der Suchbegriff wird als Vorschlagswert ins eigene, weiterhin unabhängig änderbare Suchfeld der Übersicht übernommen.

### Summary
- **Acceptance Criteria:** 7/13 vollständig verifiziert (Code-Review + Unit-Test), 6/13 unit-getestet aber noch nicht live gegen echtes Dataverse geprüft (ausstehend laut Nutzeransage)
- **Bugs Found:** 3 total (0 critical, 1 high, 2 medium, 0 low) — **alle 3 behoben**
- **Security:** Keine offenen Findings mehr
- **Neue Unit-Tests:** 40 insgesamt für dieses Feature (`pruefer-kuerzel.test.ts`, `pruefberichte.test.ts`, `actions.test.ts`) — Testsuite insgesamt jetzt 102/102 grün
- **Production Ready:** Bedingt — der Code ist bereit (keine offenen Bugs), aber der Schreibpfad (Anlegen/Bearbeiten/Stornieren gegen echtes Dataverse, insbesondere der unverifizierte `@odata.bind`-Navigationsname) ist laut Nutzeransage noch nicht live getestet.
- **Recommendation:** Nutzer verifiziert jetzt den Schreibpfad live im Browser. Falls das Anlegen eines Prüfberichts an der Navigationseigenschaft scheitert, zuerst das beheben, dann erneut kurz testen, bevor auf `/deploy` gegangen wird.

## QA Test Results — Runde 2 (Live-Verifikation)

**Tested:** 2026-10-06
**Tester:** QA Engineer (AI)
**Testmethode:** Der Nutzer hat Anlegen, Bearbeiten und Stornieren im Browser mit echtem Login gegen die produktive Dataverse-Umgebung durchgeführt. Diese Runde verifiziert das Ergebnis **rein lesend** direkt in Dataverse (Metadaten-Abfragen + Abgleich der resultierenden Datensätze, keine eigenen Schreibzugriffe), plus Unit-/E2E-Testsuiten.

### Vorab behobener Blocker (Konfiguration, kein Code-Bug)
- Erstes Anlegen scheiterte mit `missing prvAppendTobmvcc_equipmentrecord`: Das Setzen des Gerät-Lookups beim Anlegen erfordert in Dataverse das Recht **"Anfügen an" (Append To) auf der Tabelle Geraete** (zusätzlich zu Erstellen + Anfügen auf Prüfbericht). Vom Nutzer in der Sicherheitsrolle des App-Benutzers "# OBSI Hofer Admin" ergänzt — danach funktionierte das Anlegen. **Für künftige Umgebungen/Rollen-Setups dokumentiert.**

### Verifikation gegen die echten Dataverse-Metadaten
- [x] Navigationseigenschaft des Gerät-Lookups ist exakt `bmvcc_Gearaet` (`ReferencingEntityNavigationPropertyName` von `bmvcc_gearaet → bmvcc_equipmentrecord`) — der bisher unverifizierte Best-Guess in `createPruefbericht()` ist **korrekt**
- [x] Alle beschriebenen Spalten existieren mit passendem Typ: `bmvcc_inspectionresult`/`bmvcc_inspector`/`bmvcc_remark` String, `bmvcc_isarchived` Boolean, `bmvcc_inspectiondate` und Gerät `bmvcc_letztepruefung` DateTime **DateOnly/TimeZoneIndependent** (Schreiben als `YYYY-MM-DD` daher ohne Zeitzonen-Verschiebung), `bmvcc_betriebsmittelstatus`/`bmvcc_pruefer` String
- [x] Mehrfeld-`$orderby` `bmvcc_inspectiondate desc,createdon desc` wird von Dataverse akzeptiert (Tie-Breaking-Regel funktioniert syntaktisch)

### Live-Nachweis aus den Datensätzen (Gerät GRT-07918, 2026-10-06)
| Zeit (UTC) | Aktion durch "# OBSI Hofer Admin" | Ergebnis |
|---|---|---|
| 14:24 | Prüfbericht vom 23.07.2026 storniert | `bmvcc_isarchived = true` |
| 14:37 | Neuer Prüfbericht angelegt | Prüfer `robi` (korrekt aus "Robert Bienz"), Lookup auf das Gerät gesetzt |
| 14:39 | Neuer Prüfbericht bearbeitet | Ergebnis → "letzte Freigabe" |
| danach | Gerät-Status | Letzte Prüfung 06.10.2026 / Status "letzte Freigabe" / Prüfer `robi` — **identisch mit dem aktuellsten aktiven Prüfbericht** |

Zusätzlich für alle 20 in den letzten 2 Tagen geänderten Prüfberichte geprüft: Gerät-Status-Felder überall konsistent mit dem jeweils aktuellsten aktiven Bericht.

### Acceptance Criteria Status (Stand Runde 2)
- [x] Historie auf der Gerät-Detailseite (Runde 1, vom Nutzer im Browser genutzt)
- [x] Leer-Hinweis ohne Prüfbericht (Runde 1)
- [x] **Neuanlage + Kaskade auf Gerät-Status — live verifiziert** (GRT-07918)
- [x] Prüfdatum vorausgefüllt, Prüfer automatisch/read-only — **live verifiziert** (Kürzel `robi`)
- [x] Validierung bei leerem Prüfdatum/Ergebnis (Unit-Test)
- [x] **Bearbeiten des aktuellsten Berichts aktualisiert Gerät-Status — live verifiziert**
- [ ] Bearbeiten eines nicht-aktuellsten Berichts lässt Gerät-Status unverändert — weiterhin nur unit-getestet, nicht live vorgeführt
- [x] **Stornieren — live verifiziert** (Schreibpfad funktioniert, Gerät-Status danach konsistent)
- [ ] Stornieren eines nicht-aktuellsten Berichts — nur Code-Review/Unit-Test, nicht live vorgeführt
- [x] Storniert = read-only (UI + serverseitig, BUG-1 aus Runde 1 behoben, Regressionstest vorhanden)
- [x] Hinweis + Link zu `/start` ohne Firma (Runde 1)
- [x] Firmenweite Übersicht mit Suche + Ergebnis-Filter — siehe aber BUG-4 (Filter verfehlt Altdaten-Schreibweise)
- [x] Fehlermeldung + Datenerhalt bei Speicherfehler — **live beobachtet**: der Berechtigungsfehler wurde verständlich angezeigt (inkl. Dataverse-Detail), keine abgestürzte Seite

### Bugs Found (Runde 2)

#### BUG-4: Altdaten mit Ergebnis "Letzte Freigabe" (grosses L) werden nicht überall erkannt
- **Severity:** Low
- **Befund:** In Dataverse existieren neben "letzte Freigabe" auch Werte "Letzte Freigabe" (Stichprobe: 4 von 2000 Prüfberichten, 2 Geräte-Status). Das Badge (`status-badge.ts`) normalisiert Gross-/Kleinschreibung bereits korrekt, andere Stellen vergleichen exakt.
- **Steps to Reproduce:**
  1. Einen Prüfbericht mit Ergebnis "Letzte Freigabe" (Altdaten, grosses L) öffnen
  2. Erwartet: Ergebnis-Auswahl zeigt "letzte Freigabe"; Speichern ohne Änderung funktioniert
  3. Tatsächlich: Die Auswahl findet keinen passenden Eintrag (leer/ungültig); Speichern wird serverseitig mit "Bitte ein gültiges Ergebnis auswählen." abgelehnt, bis man den Wert neu wählt
  4. Ebenso: In `/pruefberichte` findet der Ergebnis-Filter "letzte Freigabe" diese Berichte nicht; im PDF-Export (PROJ-7) bleibt die Ergebnis-Zelle ungefärbt
- **Workaround:** Wert im Formular einmal neu auswählen und speichern (korrigiert den Datensatz dauerhaft)
- **Priority:** Nice to have — sehr wenige betroffene Datensätze, Workaround vorhanden. Mögliche Behebung: Ergebnis beim Lesen (`mapPruefbericht`) case-insensitiv auf die kanonischen `ERGEBNIS_OPTIONEN` abbilden, oder die 4+2 Datensätze einmalig in Dataverse korrigieren
- **Status:** ✅ Fixed (2026-10-06, Nutzer-Entscheidung: im Code beheben) — neue Funktion `normalisiereErgebnis()` (`pruefberichte.ts`) bildet jeden gelesenen Ergebnis-Wert case-/whitespace-insensitiv auf die kanonische Schreibweise ab; unbekannte Werte bleiben unverändert. Wirkt an einer Stelle (`mapPruefbericht`) für Formular, Übersichtsfilter und PDF-Export. Die Gerät-Status-Felder werden bei der nächsten Prüfbericht-Änderung des Geräts ebenfalls in kanonischer Schreibweise geschrieben (Kaskade übernimmt den normalisierten Wert); das Gerät-Badge normalisierte bereits zuvor. Regressionstests in `pruefberichte.test.ts` ("maps a legacy Ergebnis with different casing…", `describe("normalisiereErgebnis")`). `npm test` 185/185, Lint, TypeScript und Build grün.

### Automatisierte Tests
- `npm test`: 182/182 grün
- `npm run test:e2e`: grün, inkl. neuer Suite `tests/PROJ-4-pruefberichte-verwaltung.spec.ts` (Zugriffsschutz für `/pruefberichte`, `/pruefberichte/neu`, `/pruefberichte/[id]`, `/geraete/[id]` — Chromium + Mobile Safari). Die Schreibfunktionen selbst sind bewusst nicht als E2E automatisiert: sie würden in die produktive Dataverse-Umgebung schreiben, und der Microsoft-Login ist nicht automatisierbar
- Nicht durchgeführt: Cross-Browser-/Responsive-Test der eingeloggten Seiten (benötigt echten Login)

### Security (Runde 2)
- [x] Server Actions sind durch das Proxy-Rollen-Gate (`bearbeiter`/`freigeber`) geschützt; neue E2E-Tests bestätigen den Redirect zu `/login` ohne Session
- [x] Prüfer-Kürzel wird serverseitig aus der Session abgeleitet, nicht vom Client übernommen
- [x] Keine neuen Findings

### Summary (Runde 2)
- **Acceptance Criteria:** 11/13 erfüllt und überwiegend live verifiziert; 2/13 (Bearbeiten/Stornieren eines *nicht*-aktuellsten Berichts) nur unit-getestet
- **Bugs:** 1 neu (0 critical, 0 high, 0 medium, 1 low — BUG-4, **behoben**); alle Bugs aus Runde 1 bleiben behoben — keine offenen Bugs
- **Production Ready:** **JA** — keine offenen Bugs; der zuvor kritische Unsicherheitspunkt (`@odata.bind`-Name) ist gegen die Metadaten verifiziert und live bestätigt
- **Recommendation:** Freigegeben (Status **Approved**), bereit für `/deploy`.

## Deployment
- **Production URL:** https://obsi-hofer-admin.vercel.app
- **Deployed:** 2026-10-06 (automatisch via Vercel bei Push auf `main`, letzter Commit `907ca46`)
- **Tag:** `v1.4.0-PROJ-4`
- **Voraussetzung (vom Nutzer erledigt):** Sicherheitsrolle des App-Benutzers "# OBSI Hofer Admin" um **"Anfügen an" (Append To) auf Geraete** ergänzt; auf Prüfbericht sind Erstellen, Schreiben und Anfügen nötig. Keine neuen Umgebungsvariablen.
- **Verifiziert:**
  - Pre-Deployment: `npm run build`, `npm run lint`, `npx tsc --noEmit`, `npm test` (185/185) und `npm run test:e2e` grün; keine Secrets im Repo; alle Umgebungsvariablen in `.env.local.example` dokumentiert
  - Produktion: `/login` antwortet mit HTTP 200; `/pruefberichte`, `/pruefberichte/neu` und `/geraete` leiten ohne Session per 307 auf `/login` um
  - Schreibpfad live in Produktion: Anlegen, Bearbeiten und Stornieren am 2026-10-06 durch den Nutzer, anhand der Dataverse-Datensätze verifiziert (siehe QA Runde 2)
  - Nicht separat live geprüft: die Normalisierung der Altdaten-Schreibweise (BUG-4-Fix, nur Unit-Test) — beim nächsten Öffnen eines Berichts mit "Letzte Freigabe" kurz kontrollieren
