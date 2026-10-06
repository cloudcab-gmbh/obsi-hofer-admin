# PROJ-8: Kundenportal-Zugang pro Kontakt

## Status: Approved
**Created:** 2026-10-06
**Last Updated:** 2026-10-06

## Dependencies
- Requires: PROJ-1 (Entra-ID-Login mit Rollen) — nur Freigeber dürfen Kontakte freigeben
- Requires: PROJ-2 (Dataverse-Web-API-Anbindung) — Lesen der Kontakte/Firmen-Zuordnung, Schreiben des Freigabe-Häkchens
- Nutzt die globale Firma-Session aus PROJ-3 (`firma-session.ts`)
- Wird vorausgesetzt von: PROJ-5 (Sync-Freigabe pro Firma) — ein Sync ist erst möglich, wenn mindestens ein Kontakt der Firma freigegeben ist
- **Cross-Repo-Abhängigkeit:** Der Sync im Kundenportal-Repo muss künftig nur Kontakte mit gesetztem Freigabe-Häkchen als Portal-Benutzer übernehmen und den Zugang entzogener Kontakte sperren — dort separat umzusetzen (zusammen mit dem Firma-Filter aus PROJ-5)
- **Dataverse-Voraussetzung:** Der App-Benutzer "# OBSI Hofer Admin" braucht zusätzlich **Lesen auf `bmvcc_relation`** (Firma↔Kontakt-Zuordnung — vom Nutzer am 2026-10-06 erteilt, Lesezugriff verifiziert) und **Schreiben auf `bmvcc_kontakt`** (vom Nutzer am 2026-10-06 erteilt). Per `RetrieveUserPrivileges` verifiziert: prvReadbmvcc_relation, prvReadbmvcc_Kontakt und prvWritebmvcc_Kontakt jeweils auf Organisationsebene — mehr ist nicht nötig, da nur ein Feld eines bestehenden Kontakts geändert wird (kein Erstellen/Anfügen)

## Datengrundlage (verifiziert gegen Dataverse, 2026-10-06, rein lesend)
- Kontakte liegen in der eigenen Tabelle **`bmvcc_kontakt`** ("Kontakt", 596 Datensätze, davon 551 aktiv), nicht in der Standard-Tabelle `contact`
- Freigabe-Spalte: **`bmvcc_kundenportal`** (Ja/Nein, Anzeigename "Kundenportal") — aktuell bei allen Kontakten leer, d.h. noch niemand freigegeben
- E-Mail: `bmvcc_mail` (bei 522 von 596 Kontakten vorhanden); Name: `bmvcc_name_1` / `bmvcc_name_2`
- Zuordnung Firma↔Kontakt: über die Tabelle **`bmvcc_relation`** ("Relation", aus Bexio: Firma, Person, Rolle). Der direkte Lookup `bmvcc_parent_account` und die N:N-Beziehung Firma↔Kontakt sind in den echten Daten **nicht befüllt** und taugen nicht als Quelle

## User Stories
- Als Freigeber möchte ich für die aktuell gewählte Firma alle zugehörigen Kontakte sehen, damit ich entscheiden kann, wer Zugang zum Kundenportal bekommt.
- Als Freigeber möchte ich einen Kontakt per Häkchen fürs Kundenportal freigeben, damit diese Person nach dem nächsten Sync die Daten ihrer Firma im Portal sieht.
- Als Freigeber möchte ich einem Kontakt die Freigabe wieder entziehen können, damit eine Person (z.B. nach einem Stellenwechsel) keinen Zugang mehr hat.
- Als Freigeber möchte ich auf einen Blick erkennen, welche Kontakte nicht freigegeben werden können (keine E-Mail), damit ich weiss, wo zuerst die Stammdaten ergänzt werden müssen.
- Als Bearbeiter möchte ich diese Funktion nicht sehen, da Portal-Zugänge eine Freigeber-Entscheidung sind.

## Out of Scope
- Bearbeitung anderer Kontaktdaten (Name, E-Mail, Telefon, Adresse, Rolle) — bleiben Stammdaten aus Bexio/Dataverse (PRD-Non-Goal, nur das Freigabe-Häkchen ist eine bewusste Ausnahme)
- Neuanlage oder Löschen von Kontakten sowie Ändern der Firma-Zuordnung
- Inaktive Kontakte — werden ausgeblendet, nicht angezeigt oder freigegeben
- Sofortiges Sperren eines Portal-Zugangs beim Entziehen — wirkt erst mit dem nächsten Sync der Firma (PROJ-5)
- Auslösen des Syncs selbst — PROJ-5
- Verlauf, wer wann welchen Kontakt freigegeben hat — nicht vorgesehen (Dataverse-eigene Änderungshistorie bleibt unberührt)
- Einladungs-E-Mails o.ä. an freigegebene Kontakte — Sache des Kundenportals
- Kontakt-Freigabe über alle Firmen hinweg in einer Liste — immer nur für die aktuell gewählte Firma

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

- [ ] Angenommen ein Freigeber hat eine Firma gewählt, wenn er `/sync-freigabe` öffnet, dann sieht er eine Liste aller aktiven Kontakte dieser Firma mit Name, E-Mail, Rolle und einem Häkchen "Kundenportal"
- [ ] Angenommen ein Kontakt hat eine E-Mail-Adresse und ist nicht freigegeben, wenn der Freigeber das Häkchen setzt, dann wird die Freigabe sofort in Dataverse gespeichert und bleibt nach einem Neuladen der Seite erhalten
- [ ] Angenommen ein Kontakt ist freigegeben, wenn der Freigeber das Häkchen entfernt, dann wird die Freigabe sofort in Dataverse entzogen
- [ ] Angenommen ein Kontakt hat keine E-Mail-Adresse, wenn die Liste lädt, dann ist sein Häkchen deaktiviert und ein Hinweis "Keine E-Mail-Adresse hinterlegt" wird angezeigt
- [ ] Angenommen ein Kontakt ist in Dataverse inaktiv, wenn die Liste lädt, dann erscheint er nicht in der Liste
- [ ] Angenommen die Liste wird angezeigt, wenn der Freigeber sie betrachtet, dann ist ein Hinweis sichtbar, dass Änderungen an der Freigabe erst mit dem nächsten Sync im Kundenportal wirksam werden
- [ ] Angenommen ein Benutzer hat nur die Rolle "Bearbeiter", wenn er `/sync-freigabe` direkt aufruft oder eine Freigabe-Änderung auslösen will, dann wird der Zugriff verweigert (nicht nur der Menüpunkt ausgeblendet)
- [ ] Angenommen keine Firma ist in der Session gewählt, wenn ein Freigeber `/sync-freigabe` öffnet, dann erscheint derselbe Hinweis mit Link zu `/start` wie bei `/geraete`
- [ ] Angenommen die gewählte Firma hat keine aktiven Kontakte, wenn die Liste lädt, dann wird ein klarer Leer-Hinweis statt einer leeren Tabelle angezeigt
- [ ] Angenommen das Speichern einer Freigabe-Änderung schlägt fehl (z.B. Dataverse nicht erreichbar, fehlende Berechtigung), wenn der Freigeber das Häkchen ändert, dann wird eine verständliche Fehlermeldung angezeigt und das Häkchen zeigt wieder den tatsächlich gespeicherten Zustand

## Edge Cases
- Kontakt ist mehreren Firmen zugeordnet (mehrere `bmvcc_relation`-Einträge) → erscheint bei jeder dieser Firmen; das Häkchen ist eine Eigenschaft des Kontakts, gilt also für alle seine Firmen gleichzeitig (Hinweis in der Liste, wenn ein Kontakt mehreren Firmen zugeordnet ist)
- Kontakt ist derselben Firma mehrfach zugeordnet (z.B. mit zwei Rollen) → erscheint nur einmal, Rollen zusammengefasst (kommt in den echten Daten aktuell nicht vor, Absicherung für künftige Bexio-Daten)
- Kontakt ohne Rolle (84 von 557 Relationen) → Rolle wird als "—" angezeigt
- Aktiver Kontakt ohne jede Firmen-Zuordnung in `bmvcc_relation` (aktuell 13) → erscheint bei keiner Firma und kann nicht freigegeben werden; Zuordnung muss in Bexio gepflegt werden
- Firma ohne zugeordnete Kontakte (aktuell 28 von 305) → Leer-Hinweis, der auf die fehlende Zuordnung in Bexio hinweist; die Firma kann dadurch auch nicht synchronisiert werden (PROJ-5)
- Kontakt hat ein gesetztes Häkchen, aber inzwischen keine E-Mail mehr → bleibt freigegeben, Häkchen kann entfernt, aber nicht neu gesetzt werden; Hinweis "Keine E-Mail-Adresse hinterlegt"
- Inaktiver Kontakt mit gesetztem Häkchen → bleibt in Dataverse unverändert (wird nur ausgeblendet); ob er im Portal Zugriff behält, entscheidet der Kundenportal-Sync
- Zwei Freigeber ändern gleichzeitig denselben Kontakt → Last-Write-Wins, konsistent mit PROJ-3/PROJ-4
- Schnelles mehrfaches Klicken auf dasselbe Häkchen → es darf kein widersprüchlicher Endzustand entstehen; während eine Änderung gespeichert wird, ist das Häkchen dieses Kontakts gesperrt
- Firma mit sehr vielen Kontakten → Liste bleibt ohne Pagination bedienbar (gleiche Firmengrössen-Annahme wie PROJ-3)
- Firmenwechsel während die Seite offen ist → Liste zeigt danach die Kontakte der neuen Firma (gleiches Verhalten wie die Filter-Zurücksetzung aus PROJ-3)

## Technical Requirements (optional)
- Security: Lesen und Schreiben ausschliesslich für Benutzer mit Rolle "Freigeber" — serverseitig durchgesetzt, nicht nur über die Sichtbarkeit des Menüpunkts
- Es wird ausschliesslich die Spalte `bmvcc_kundenportal` geschrieben, keine anderen Kontaktfelder
- Alle Zugriffe über die generischen Dataverse-Funktionen aus PROJ-2

## Open Questions
- [x] Welche Kontakt-Rollen gibt es, sollen bestimmte ausgeblendet werden? — **geklärt (2026-10-06, nach Erteilen des Leserechts):** `bmvcc_role_description` ist Freitext aus Bexio (403 verschiedene Werte, 84 leer, z.B. "Geschäftsführer", "Hauswart"), keine Status-Rolle wie "ehemalig" → Rolle wird unverändert angezeigt, nichts ausgeblendet
- [x] Ist die Zuordnung über `bmvcc_relation` vollständig gepflegt? — **geklärt:** 557 Relationen, alle mit Firma und Person, keine Duplikate; 546 Kontakte zugeordnet, 11 davon mehreren Firmen; 13 aktive Kontakte ohne Zuordnung; 277 von 305 Firmen haben mindestens einen Kontakt (siehe Edge Cases)

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Kontakt-Freigabe als eigenes Feature (PROJ-8), getrennt von der Sync-Auslösung (PROJ-5), beide auf derselben Seite `/sync-freigabe` | Getrennt test- und deploybar (andere Tabelle, andere Aktion), aber für den Freigeber ein zusammenhängender Arbeitsablauf: erst Zugänge festlegen, dann synchronisieren | 2026-10-06 |
| Nur Freigeber dürfen Kontakte freigeben oder die Freigabe entziehen | Ein Portal-Zugang ist eine Zugriffsentscheidung gegenüber dem Kunden, keine normale Datenpflege; `/sync-freigabe` bleibt damit komplett Freigeber-exklusiv | 2026-10-06 |
| Kontakte ohne E-Mail-Adresse sind nicht freigebbar (Häkchen deaktiviert + Hinweis) | Ein Portal-Login ohne E-Mail ist nicht möglich; der Freigeber sieht trotzdem, wo Stammdaten fehlen | 2026-10-06 |
| Inaktive Kontakte werden ausgeblendet | Hält die Liste auf relevante Personen fokussiert; ein inaktiver Kontakt soll keinen neuen Zugang bekommen | 2026-10-06 |
| Freigabe-Änderungen werden sofort in Dataverse gespeichert, im Portal aber erst mit dem nächsten Sync wirksam (Hinweis auf der Seite) | Kein zusätzlicher Mechanismus zum Kundenportal nötig; konsistent mit dem Grundsatz "Sync nur manuell per Freigabe" | 2026-10-06 |
| Bewusste, eng begrenzte Ausnahme vom PRD-Non-Goal "Keine Bearbeitung von Kontakten": nur das Häkchen `bmvcc_kundenportal` wird geschrieben | Die Portal-Zugangsentscheidung gehört fachlich ins Admin-Tool; alle übrigen Kontaktdaten bleiben Bexio/Dataverse-Stammdaten | 2026-10-06 |
| Firma↔Kontakt-Zuordnung über `bmvcc_relation` (Bexio-Relation) | Einzige in den echten Daten befüllte Verknüpfung; `bmvcc_parent_account` und die N:N-Beziehung sind leer | 2026-10-06 |

### Technical Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Neue, wiederverwendbare serverseitige Prüfung "nur Freigeber", auf Seiten- UND Aktionsebene | Der bestehende Zugriffsschutz (`proxy.ts`) lässt Bearbeiter und Freigeber gleichermassen durch, der Header blendet den Menüpunkt nur aus. Die Spec verlangt eine echte serverseitige Sperre; dieselbe Prüfung braucht PROJ-5 für den Sync-Button | 2026-10-06 |
| Server Action pro Häkchen-Änderung (statt Sammel-"Speichern"-Button), mit sofortiger Anzeige und Rücksetzen bei Fehler | Spec verlangt sofortiges Speichern; Rücksetzen auf den gespeicherten Zustand bei Fehler erfüllt das Fehler-Kriterium; konsistent mit den Server Actions aus PROJ-3/4 | 2026-10-06 |
| E-Mail-Regel wird serverseitig erneut geprüft: Freigeben ohne E-Mail wird abgelehnt, Entziehen ist immer erlaubt | Die deaktivierte Checkbox allein liesse sich mit einem nachgebauten Request umgehen (gleiche Lehre wie QA BUG-1 in PROJ-4); Entziehen muss auch bei fehlender E-Mail möglich bleiben (Edge Case) | 2026-10-06 |
| Firmen-Zuordnung über `bmvcc_relation`, Kontakte danach gebündelt in Blöcken nachgeladen | Einzige befüllte Verknüpfung (verifiziert); Blockweises Laden vermeidet zu lange Dataverse-Abfragen — gleiches Muster wie bei Geräten/Prüfberichten | 2026-10-06 |
| "Auch anderen Firmen zugeordnet" wird aus einer zweiten Abfrage auf `bmvcc_relation` für die angezeigten Kontakte ermittelt | Ohne diese Info würde ein Freigeber nicht merken, dass ein Häkchen auch für andere Firmen gilt (Edge Case, aktuell 11 Kontakte) | 2026-10-06 |
| Der Seiten-Rahmen `/sync-freigabe` wird von PROJ-8 angelegt; die Anzahl freigegebener Kontakte wird auf Seitenebene bereitgehalten | PROJ-5 hängt seinen Sync-Bereich darunter und braucht genau diese Zahl (Button-Sperre, Bestätigungsdialog) — ohne erneutes Laden | 2026-10-06 |
| Keine neuen Pakete und keine neuen shadcn-Komponenten | `checkbox`, `table`, `card`, `badge` sind bereits installiert | 2026-10-06 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### A) Component Structure
```
/sync-freigabe (neue Seite, nur für Freigeber)
+-- Zugriffsprüfung "nur Freigeber"
|   +-- Bearbeiter → Weiterleitung auf "Kein Zugang" (wie bei fehlender Rolle)
+-- Keine Firma gewählt → Hinweis + Link zu /start (gleiches Muster wie /geraete)
+-- Bereich "Kundenportal-Zugang" (PROJ-8)
|   +-- Überschrift mit Firmenname
|   +-- Hinweis: "Änderungen werden mit dem nächsten Sync im Kundenportal wirksam."
|   +-- Kontakt-Tabelle (alphabetisch nach Name)
|   |   +-- Spalten: Name, E-Mail, Rolle, Kundenportal (Häkchen)
|   |   +-- Kein E-Mail → Häkchen deaktiviert + Hinweis "Keine E-Mail-Adresse hinterlegt"
|   |   |   (bereits gesetztes Häkchen bleibt entfernbar)
|   |   +-- Mehreren Firmen zugeordnet → Hinweis "gilt auch für weitere Firmen"
|   |   +-- Während des Speicherns: Häkchen dieses Kontakts gesperrt
|   |   +-- Fehler: Meldung + Häkchen springt auf den gespeicherten Zustand zurück
|   +-- Leer-Zustand: "Dieser Firma sind in Bexio keine Kontakte zugeordnet."
+-- [Platz für PROJ-5: Sync-Bereich mit Button, nutzt die Anzahl freigegebener Kontakte]
```

### B) Data Model (plain language)
Kein eigenes Datenmodell — alles live aus Dataverse:
- **Welche Kontakte gehören zur Firma:** alle Relationen (`bmvcc_relation`) mit dieser Firma → liefert je Kontakt die Person und die Rolle. Mehrere Relationen derselben Person zur selben Firma werden zu einem Eintrag zusammengefasst, Rollen kommagetrennt.
- **Kontaktdaten:** zu diesen Personen aus `bmvcc_kontakt` Name (Name 1 + Name 2), E-Mail, Aktiv-Status und das Häkchen "Kundenportal". Inaktive werden verworfen.
- **Weitere Firmen:** für die angezeigten Kontakte eine zweite Relations-Abfrage, ob sie noch anderen Firmen zugeordnet sind (nur ja/nein für den Hinweis).
- **Geschrieben wird ausschliesslich** das Feld "Kundenportal" (Ja/Nein) eines einzelnen Kontakts.

### C) Tech Decisions (für PM erklärt)
- **Echte Zugriffssperre für Nicht-Freigeber:** Heute lässt der Zugriffsschutz alle Mitarbeitenden mit Bearbeiter- oder Freigeber-Rolle auf jede Seite. Für diese Seite und die Häkchen-Aktion kommt eine zusätzliche Prüfung "nur Freigeber" hinzu — auf der Seite selbst und bei jeder Speicher-Aktion, damit sie sich nicht über einen direkten Aufruf umgehen lässt. Dieselbe Prüfung nutzt später PROJ-5.
- **Jedes Häkchen speichert sofort:** Kein separater Speichern-Knopf. Die Änderung wird sofort angezeigt; schlägt das Speichern fehl, erscheint eine Meldung und das Häkchen springt zurück — so zeigt die Liste nie einen Zustand, der nicht in Dataverse steht.
- **Regeln werden auf dem Server geprüft, nicht nur in der Anzeige:** Freigeben ohne E-Mail wird vom Server abgelehnt, auch wenn jemand die deaktivierte Checkbox umgeht. Entziehen ist immer erlaubt.
- **Zuordnung über Bexio-Relationen:** Die einzige tatsächlich gepflegte Verbindung zwischen Firma und Kontakt; Rollen kommen von dort mit.
- **Vorbereitet für PROJ-5:** Die Seite wird so aufgebaut, dass der Sync-Bereich später einfach darunter ergänzt wird und die Zahl der freigegebenen Kontakte direkt mitbekommt.

### D) Dependencies
- Keine neuen Pakete
- Keine neuen shadcn-Komponenten (`checkbox`, `table`, `card`, `badge` vorhanden)
- Dataverse-Rechte: bereits erteilt und verifiziert (siehe Dependencies)

## Implementation Notes (Frontend)

Umgesetzt in einem Durchlauf (UI + Server Action + Datenzugriff), wie bei PROJ-3/PROJ-4 — kein separater `/backend`-Schritt nötig, da PROJ-2 bereits die Backend-Schicht ist:

- `src/lib/auth/freigeber.ts` — neue, wiederverwendbare Prüfung `istFreigeber()` / `aktuellerBenutzerIstFreigeber()` (auch für PROJ-5 gedacht)
- `src/lib/dataverse/kontakte.ts` — `listKundenportalKontakteForFirma()` (Relationen der Firma → aktive Kontakte in 20er-Blöcken → zweite Relations-Abfrage für "weitere Firmen"; Rollen zusammengefasst; Name "Vorname Nachname", sortiert nach Nachname) und `setKundenportalFreigabe()` (schreibt nur `bmvcc_kundenportal`; Freigeben serverseitig nur für aktive Kontakte mit E-Mail, Entziehen immer)
- `src/app/(protected)/sync-freigabe/actions.ts` — Server Action `setKundenportalFreigabeAction()` mit eigener Freigeber-Prüfung und Zod-Validierung
- `src/app/(protected)/sync-freigabe/page.tsx` — neue Seite: Freigeber-Prüfung, Hinweis ohne Firma, Fehlerzustand, `key={firmaId}` für sauberen Neuaufbau bei Firmenwechsel
- `src/components/kundenportal-kontakte.tsx` — Kontakttabelle mit sofort speicherndem Häkchen (Anzeige sofort, Rücksetzen + Fehlermeldung bei Fehler, Häkchen während des Speicherns gesperrt), Zähler "X von Y Kontakten freigegeben", Leer-Zustand, Hinweis bei Kontakten mehrerer Firmen
- Unit-Tests: `kontakte.test.ts` (12) und `sync-freigabe/actions.test.ts` (5) — `npm test` 202/202, Lint, TypeScript und Build grün

**Abweichungen vom Tech Design (bewusst):**
- Bearbeiter werden nicht auf `/kein-zugang` weitergeleitet, sondern sehen auf der Seite selbst den Hinweis "nur für Freigeber". Grund: `proxy.ts` leitet Benutzer mit gültiger Rolle (also auch Bearbeiter) von `/kein-zugang` sofort auf `/start` zurück — eine Weiterleitung dorthin wäre wirkungslos bzw. verwirrend
- Zusätzlich zum Spec-Umfang wird auch das Freigeben eines **inaktiven** Kontakts serverseitig abgelehnt (die UI zeigt inaktive ohnehin nicht an; Absicherung gegen Direktaufrufe)

**Gefundener Stolperstein:** Zod 4 prüft bei `z.string().uuid()` die RFC-Versionsbits — echte Dataverse-IDs (z.B. `…-f111-…`) würden abgelehnt. Die Action nutzt daher `z.guid()`; ein Regressionstest mit einer echten Dataverse-ID-Form deckt das ab.

**Gegen echtes Dataverse verifiziert (rein lesend, 2026-10-06):** Die drei Abfragen (Relationen der Firma inkl. `statecode`-Filter, aktive Kontakte per ID-Block, Relationen zu *anderen* Firmen per `ne`) werden akzeptiert und liefern plausible Ergebnisse (z.B. 19 Kontakte bei "Dottikon Exclusive Synthesis AG"; Mehrfach-Zuordnung bei "4Viertel" korrekt erkannt). **Nicht** verifiziert: das eigentliche Schreiben des Häkchens und die Oberfläche mit echtem Freigeber-Login — beides steht für den Nutzer-Test aus.

## QA Test Results

**Tested:** 2026-10-06
**Tester:** QA Engineer (AI)
**Testmethode:** Der Nutzer hat die Seite mit echtem Freigeber-Login in Produktion bedient (Häkchen gesetzt, nach Neuladen erhalten, wieder entfernt). QA hat das Ergebnis rein lesend in Dataverse verifiziert, den Code gegen alle Kriterien/Edge Cases geprüft und die Testsuiten ausgeführt. Keine eigenen Schreibzugriffe.

### Live-Nachweis
- Kontakt "Robert Bienz" (Cloudcab GmbH): Häkchen gesetzt → nach Neuladen weiterhin gesetzt ("1 von 1 Kontakten freigegeben", Screenshot Nutzer); danach entfernt → in Dataverse `bmvcc_kundenportal = false`, geändert 2026-10-06 15:30 UTC von "# OBSI Hofer Admin"
- Keine anderen Kontakte durch die App verändert (alle übrigen kürzlich geänderten Kontakte stammen von "Robert Bienz" direkt in Dataverse, vor dem Test)
- Produktion: `/sync-freigabe` leitet ohne Session per 307 auf `/login` um

### Acceptance Criteria Status
- [x] Liste aller aktiven Kontakte der Firma mit Name, E-Mail, Rolle, Häkchen — live (Screenshot) + Abfragen gegen echte Daten verifiziert
- [x] Häkchen setzen speichert sofort und bleibt nach Neuladen — **live verifiziert**
- [x] Häkchen entfernen entzieht sofort — **live verifiziert** (Dataverse-Datensatz)
- [x] Ohne E-Mail: Häkchen deaktiviert + Hinweis — Code-Review; serverseitig zusätzlich abgelehnt (Unit-Test)
- [x] Inaktive Kontakte nicht in der Liste — Code-Review + Unit-Test (Filter `statecode eq 0`, gegen echte Daten akzeptiert)
- [x] Hinweis "wirksam mit dem nächsten Sync" sichtbar — live (Screenshot)
- [x] Bearbeiter: Zugriff serverseitig verweigert (Seite + Action) — Code-Review + Unit-Test `actions.test.ts`
- [x] Ohne Firma: Hinweis mit Link zu `/start` — Code-Review (gleiches Muster wie `/geraete`)
- [x] Firma ohne Kontakte: Leer-Hinweis — Code-Review + Unit-Test
- [x] Fehler beim Speichern: Meldung + Rücksetzen — gemeldete und geworfene Fehler, nach Behebung von BUG-1 (Komponententests)

### Edge Cases Status
- [x] Kontakt mehrerer Firmen → Hinweis "Freigabe gilt auch für weitere Firmen" (gegen echte Daten verifiziert: "4Viertel")
- [x] Mehrfache Relation derselben Person → ein Eintrag, Rollen zusammengefasst (Unit-Test)
- [x] Kontakt ohne Rolle → "—" (live, Screenshot)
- [x] Freigegebener Kontakt ohne E-Mail → entfernbar, nicht neu setzbar (Code-Review + Unit-Test "always allows revoking")
- [x] Schnelles Mehrfachklicken → Häkchen während des Speicherns gesperrt (Code-Review)
- [x] Firmenwechsel → Neuaufbau über `key={firmaId}` (Code-Review)
- [x] Gleichzeitige Bearbeitung → Last-Write-Wins (wie geplant)

### Security Audit (Red Team)
- [x] Freigeber-Sperre auf Seiten- UND Action-Ebene; ein Bearbeiter kann die Action nicht direkt aufrufen (Unit-Test)
- [x] Nur `bmvcc_kundenportal` wird geschrieben (Unit-Test prüft den exakten Payload)
- [x] GUID-Validierung vor jedem `$filter` (Firma-ID, Kontakt-IDs) → keine OData-Injection (Unit-Test)
- [x] E-Mail-/Aktiv-Regel serverseitig durchgesetzt, nicht nur über die deaktivierte Checkbox
- [x] Keine XSS-Fläche (React-Escaping, kein `dangerouslySetInnerHTML`), keine Secrets im Client
- [x] Ein Freigeber kann über die Action beliebige Kontakt-IDs ändern, auch anderer Firmen — **kein Finding**: Freigeber sind für alle Firmen berechtigt (gleiche Rechte wie über die Firmenauswahl)

### Bugs Found

#### BUG-1: Häkchen bleibt gesperrt und zeigt einen nicht gespeicherten Zustand, wenn der Aufruf selbst fehlschlägt
- **Severity:** Medium
- **Steps to Reproduce:**
  1. `/sync-freigabe` öffnen
  2. Verbindung zum Server unterbrechen (z.B. offline) — oder: Seite offen lassen, während Vercel eine neue Version deployt (alte Server-Action-ID ist danach ungültig, kommt bei Auto-Deploy auf `main` regelmässig vor)
  3. Ein Häkchen ändern
  4. Erwartet: Fehlermeldung, Häkchen springt auf den gespeicherten Zustand zurück (AC "Fehler beim Speichern")
  5. Tatsächlich: `aendereFreigabe()` in `kundenportal-kontakte.tsx` wartet ohne `try/catch` auf die Action; wirft der Aufruf, wird weder zurückgesetzt noch eine Meldung gezeigt, und der Kontakt bleibt in "speichernd" → Häkchen zeigt den neuen, **nicht gespeicherten** Zustand und ist bis zum Neuladen gesperrt. Gleiches gilt, wenn die Action vor ihrem eigenen `try` wirft (z.B. Fehler beim Lesen der Session)
- **Workaround:** Seite neu laden — zeigt den tatsächlichen Stand
- **Priority:** Fix before deployment (verletzt das Akzeptanzkriterium und den Grundsatz "Liste zeigt nie einen Zustand, der nicht in Dataverse steht")
- **Status:** ✅ Fixed (2026-10-06) — `aendereFreigabe()` umschliesst den Aufruf mit `try/catch/finally`: die Sperre wird immer aufgehoben, und bei einem geworfenen Fehler wird wie bei einer gemeldeten Ablehnung zurückgesetzt und "Die Änderung konnte nicht gespeichert werden. Bitte die Seite neu laden und erneut versuchen." angezeigt. Neue Komponententests `src/components/kundenportal-kontakte.test.tsx` (4 Fälle: Erfolg, gemeldeter Fehler, geworfener Fehler, E-Mail-Sperre); per Gegenprobe bestätigt, dass der BUG-1-Test mit dem alten Code fehlschlägt. `npm test` 206/206, Lint, TypeScript und Build grün

### Automatisierte Tests
- `npm test`: 202/202 grün (17 für PROJ-8: `kontakte.test.ts`, `sync-freigabe/actions.test.ts`)
- `npm run test:e2e`: 18/18 grün, inkl. neuer Suite `tests/PROJ-8-kundenportal-zugang-pro-kontakt.spec.ts` (Zugriffsschutz `/sync-freigabe`, Chromium + Mobile Safari)
- Nicht durchgeführt: Cross-Browser-/Responsive-Test der eingeloggten Seite (benötigt echten Login); Tabelle ist per `overflow-x-auto` für schmale Bildschirme vorbereitet

### Summary
- **Acceptance Criteria:** 10/10 erfüllt (3 davon live verifiziert)
- **Bugs Found:** 1 total (0 critical, 0 high, 1 medium, 0 low) — **behoben**, keine offenen Bugs
- **Security:** keine Findings
- **Production Ready:** **JA** — Status **Approved**, bereit für `/deploy`

## Deployment
_To be added by /deploy_
