# PROJ-5: Sync-Freigabe pro Firma

## Status: In Progress
**Created:** 2026-10-06
**Last Updated:** 2026-10-07

## Dependencies
- Requires: PROJ-1 (Entra-ID-Login mit Rollen) — nur Freigeber dürfen den Sync auslösen
- Requires: PROJ-2 (Dataverse-Web-API-Anbindung) — u.a. für die Anzeige der freigegebenen Kontakte im Bestätigungsdialog
- Requires: PROJ-8 (Kundenportal-Zugang pro Kontakt) — ein Sync ist erst möglich, wenn mindestens ein Kontakt der Firma freigegeben ist; beide Features teilen sich die Seite `/sync-freigabe`
- Nutzt die globale Firma-Session aus PROJ-3 (`firma-session.ts`)
- **Cross-Repo-Abhängigkeit (Voraussetzung):** Der bestehende Endpoint `/api/cron/sync-dataverse` im Kundenportal-Repo muss um einen Firma-Filter erweitert werden (synct heute global) und künftig nur Kontakte mit gesetztem Freigabe-Häkchen als Portal-Benutzer übernehmen (siehe PROJ-8). Artikel werden bei jeder Firma-Freigabe mitsynchronisiert (PRD). Der nächtliche Cron (`vercel.json`, 03:00 Uhr) im Kundenportal-Repo entfällt
- Wird vorausgesetzt von: PROJ-6 (Sync-Status/-Verlauf einsehen)

## User Stories
- Als Freigeber möchte ich den Sync ins Kundenportal gezielt für die aktuell gewählte Firma auslösen, damit Kunden die Daten genau dann sehen, wenn ich sie für fertig bearbeitet halte.
- Als Freigeber möchte ich vor dem Auslösen eine Zusammenfassung bestätigen (Firma, Anzahl freigegebener Kontakte), damit ich nicht versehentlich die falsche Firma oder unfertige Daten übertrage.
- Als Freigeber möchte ich nach dem Auslösen sehen, ob der Sync erfolgreich war, damit ich bei einem Fehler reagieren kann.
- Als Freigeber möchte ich daran gehindert werden, eine Firma ohne freigegebene Kontakte zu synchronisieren, damit keine Daten im Portal landen, die niemand sehen kann.
- Als Bearbeiter möchte ich diese Funktion nicht sehen, da die Freigabe gegenüber dem Kunden dem Freigeber vorbehalten ist.

## Out of Scope
- Kontakte fürs Kundenportal freigeben/entziehen — PROJ-8 (gleiche Seite, eigenes Feature)
- Verlauf/Status vergangener Sync-Läufe (letzter Lauf pro Firma, Erfolg/Fehler, Zeitpunkt) — PROJ-6
- Sync mehrerer oder aller Firmen auf einmal — immer genau die aktuell gewählte Firma
- Automatische oder zeitgesteuerte Syncs — PRD-Non-Goal, nur manuell per Freigabe
- Teil-Sync (nur bestimmte Geräte/Prüfberichte einer Firma) — es wird immer die ganze Firma übertragen (plus Artikel)
- Abbrechen eines laufenden Syncs
- Eigene Sync-Logik im Admin-Tool — es wird ausschliesslich der bestehende Endpoint des Kundenportals aufgerufen (PRD-Constraint)
- Benachrichtigung der Kunden über neue Daten — Sache des Kundenportals

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

- [ ] Angenommen ein Freigeber hat eine Firma gewählt und mindestens ein aktiver Kontakt dieser Firma ist fürs Kundenportal freigegeben, wenn er `/sync-freigabe` öffnet, dann sieht er unterhalb der Kontaktliste (PROJ-8) einen aktiven Button "Freigeben & synchronisieren"
- [ ] Angenommen kein aktiver Kontakt der gewählten Firma ist freigegeben, wenn die Seite lädt, dann ist der Sync-Button deaktiviert und ein Hinweis "Zuerst mindestens einen Kontakt fürs Kundenportal freigeben" wird angezeigt
- [ ] Angenommen der Freigeber gibt auf derselben Seite den ersten Kontakt frei, wenn die Freigabe gespeichert ist, dann wird der Sync-Button ohne Neuladen der Seite aktiv
- [ ] Angenommen der Sync-Button ist aktiv, wenn der Freigeber darauf klickt, dann erscheint ein Bestätigungsdialog mit dem Firmennamen und der Anzahl freigegebener Kontakte, und der Sync startet erst nach Bestätigung
- [ ] Angenommen der Bestätigungsdialog ist offen, wenn der Freigeber abbricht, dann wird kein Sync ausgelöst
- [ ] Angenommen der Freigeber bestätigt, wenn der Sync läuft, dann zeigt der Button "Synchronisiere…", ist gesperrt, und ein erneutes Auslösen ist bis zur Antwort nicht möglich
- [ ] Angenommen der Kundenportal-Endpoint meldet Erfolg, wenn der Sync abgeschlossen ist, dann erscheint eine Erfolgsmeldung mit dem Firmennamen (und der Anzahl übertragener Datensätze, sofern der Endpoint sie liefert)
- [ ] Angenommen der Kundenportal-Endpoint meldet einen Fehler oder ist nicht erreichbar, wenn der Sync ausgelöst wurde, dann erscheint eine verständliche Fehlermeldung und der Button ist wieder aktiv
- [ ] Angenommen der Sync wird ausgelöst, wenn der Endpoint aufgerufen wird, dann werden ausschliesslich die Daten der gewählten Firma (plus Artikel) synchronisiert, nicht die anderer Firmen
- [ ] Angenommen ein Benutzer hat nur die Rolle "Bearbeiter", wenn er `/sync-freigabe` direkt aufruft oder den Sync über einen nachgebauten Request auslösen will, dann wird der Zugriff serverseitig verweigert
- [ ] Angenommen keine Firma ist in der Session gewählt, wenn ein Freigeber `/sync-freigabe` öffnet, dann erscheint derselbe Hinweis mit Link zu `/start` wie bei `/geraete` (kein Sync-Button)

## Edge Cases
- Sync dauert länger als die maximale Laufzeit einer Server-Anfrage → verständliche Meldung, dass das Ergebnis unbekannt ist (der Sync kann trotzdem im Hintergrund durchgelaufen sein), statt einer technischen Timeout-Fehlermeldung; Kontrolle später über PROJ-6
- Zwei Freigeber lösen den Sync für dieselbe Firma fast gleichzeitig aus → wird im Admin-Tool nicht verhindert; das Verhalten des Endpoints bei parallelen Läufen ist offen (siehe Open Questions)
- Firmenwechsel während ein Sync läuft → der laufende Sync betrifft weiterhin die ursprünglich bestätigte Firma; die Ergebnismeldung nennt diese Firma
- Kontakt-Freigabe wird zwischen Seitenaufruf und Bestätigung (z.B. in einem anderen Tab) entzogen, sodass kein Kontakt mehr freigegeben ist → die Voraussetzung wird beim Auslösen serverseitig erneut geprüft, der Sync wird dann abgelehnt
- Endpoint-Zugangsdaten (Secret/URL) fehlen oder sind falsch konfiguriert → verständliche Fehlermeldung ("Sync ist nicht konfiguriert"), keine technischen Details zu Secrets in der Oberfläche
- Kundenportal-Endpoint unterstützt den Firma-Filter noch nicht (Cross-Repo-Erweiterung nicht ausgerollt) → darf auf keinen Fall versehentlich einen globalen Sync aller Firmen auslösen (siehe Open Questions)
- Firma hat keine Geräte/Prüfberichte → Sync ist trotzdem erlaubt (überträgt dann nur Firma, Kontakte und Artikel)

## Technical Requirements (optional)
- Security: Auslösen ausschliesslich für Benutzer mit Rolle "Freigeber", serverseitig durchgesetzt; das Endpoint-Secret (`KUNDENPORTAL_CRON_SECRET`) verlässt nie den Server
- Konfiguration über die bereits dokumentierten Umgebungsvariablen `KUNDENPORTAL_SYNC_URL` und `KUNDENPORTAL_CRON_SECRET`
- Performance: abhängig vom Kundenportal-Endpoint; die Oberfläche muss während der gesamten Laufzeit einen klaren Ladezustand zeigen

## Open Questions
_Geklärt am 2026-10-07 durch Lesen des Kundenportal-Codes (dort PROJ-12, lokal committet, noch nicht gepusht):_
- [x] Schnittstelle — `GET {KUNDENPORTAL_SYNC_URL}?firmaId=<GUID>` mit Header `Authorization: Bearer <CRON_SECRET>`. Antwort 200: `{ entities: [{ slug, fetched, added, updated, deleted, skippedDueToThreshold }], warnings: [], errors: [] }` (Slugs: firmen, artikel, kontakte, standorte, geraete, pruefberichte, relationen). **Auch bei 200 können `errors` Teilfehler enthalten** (eine Entität scheitert, die übrigen laufen weiter). Fehler: 400 ungültige GUID, 404 Firma unbekannt, 401 falsches Secret, 500 `{ error, message }` bei Abbruch
- [x] Ohne/mit unbekanntem Firma-Filter — unbekannte Firma → 404, ungültige ID → 400, leerer Parameter → 400. **Aber: ganz ohne `firmaId`-Parameter läuft weiterhin ein globaler Sync aller Firmen** (Filter dort bewusst optional). Das Admin-Tool muss daher selbst sicherstellen, dass es nie ohne geprüfte Firma-ID aufruft (siehe Tech Design)
- [x] Parallele Läufe — keine Sperre im Endpoint; zwei Läufe derselben Firma schreiben dieselben Daten (Upserts) → unkritisch, akzeptiert
- [ ] Tatsächliche Laufzeit eines Firma-Syncs — nicht gemessen. Endpoint erlaubt bis 300 s (`maxDuration`). Ob das Admin-Tool auf seinem Vercel-Plan ebenfalls bis 300 s warten darf, ist beim ersten Live-Test zu prüfen
- [ ] Wirkung des Kundenportal-Häkchens — im Portal erst mit dessen PROJ-13 (aktuell Roadmap). Bis dahin erhält dort weiterhin jeder aktive Kontakt mit passender E-Mail Zugang (`access.ts`). Der Firma-Sync verschlechtert das nicht (der bisherige nächtliche Gesamt-Sync hat bereits alle Kontakte übertragen), die Freigabe aus PROJ-8 wirkt aber erst danach

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Sync wird immer für die aktuell gewählte Session-Firma ausgelöst, keine Firmenliste auf der Seite | Konsistent mit Geräte/Prüfberichte; Firmenwechsel wie gewohnt über `/start` | 2026-10-06 |
| Sync ist gesperrt, solange kein aktiver Kontakt der Firma fürs Kundenportal freigegeben ist | Verhindert, dass Daten im Portal landen, die niemand sehen kann; erzwingt die vom Nutzer gewünschte Reihenfolge "erst Kontakte freigeben, dann synchronisieren" | 2026-10-06 |
| Bestätigungsdialog mit Zusammenfassung (Firma, Anzahl freigegebener Kontakte) vor dem Auslösen | Nach dem Sync sehen Kunden die Daten — Schutz vor versehentlichem Klick oder falscher Firma | 2026-10-06 |
| Oberfläche wartet auf das Ergebnis des Endpoints und zeigt Erfolg/Fehler direkt an | Freigeber bekommt sofort Gewissheit; ein dauerhafter Verlauf bleibt PROJ-6 vorbehalten | 2026-10-06 |
| Kontakt-Freigabe (PROJ-8) und Sync-Auslösung (PROJ-5) auf derselben Seite `/sync-freigabe` | Ein zusammenhängender Arbeitsablauf für den Freigeber; der Menüpunkt existiert bereits (PROJ-1) | 2026-10-06 |
| Parallele Syncs derselben Firma durch verschiedene Freigeber werden im Admin-Tool nicht verhindert, nur die Mehrfachauslösung durch denselben Benutzer | Seltener Fall bei wenigen Freigebern; Robustheit ist Sache des Endpoints (Open Question) | 2026-10-06 |

### Technical Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Aufruf des Kundenportal-Endpoints ausschliesslich serverseitig in einer Server Action | Das Secret darf nie in den Browser; konsistent mit allen bisherigen Schreibaktionen (PROJ-3/4/8) | 2026-10-07 |
| Das Admin-Tool ruft den Endpoint nie ohne geprüfte Firma-ID auf (GUID-Prüfung vor dem Aufruf, Parameter immer gesetzt) | Der Endpoint synchronisiert ohne `firmaId` weiterhin **alle** Firmen — der Schutz vor einem versehentlichen Gesamt-Sync muss daher im Admin-Tool liegen | 2026-10-07 |
| Die Firma-ID kommt vom Bestätigungsdialog (die angezeigte Firma), nicht erneut aus der Session | Erfüllt den Edge Case "Firmenwechsel während des Syncs betrifft weiterhin die bestätigte Firma"; ein Freigeber darf ohnehin jede Firma synchronisieren, also kein zusätzliches Berechtigungsrisiko | 2026-10-07 |
| Serverseitige Wiederholung der Voraussetzung "mindestens ein aktiver, freigegebener Kontakt mit E-Mail" unmittelbar vor dem Aufruf, über dieselbe Kontakt-Abfrage wie PROJ-8 | Sperre darf sich nicht über einen anderen Tab oder einen Direktaufruf umgehen lassen; keine zweite, abweichende Logik | 2026-10-07 |
| Freigeber-Prüfung über die bestehende Funktion aus PROJ-8 (`lib/auth/freigeber.ts`) | Bereits vorhanden und getestet | 2026-10-07 |
| Ergebnis in vier Stufen: Erfolg / mit Teilfehlern abgeschlossen / fehlgeschlagen / Ergebnis unbekannt (Zeitüberschreitung oder Verbindungsabbruch) | Der Endpoint meldet Teilfehler mit HTTP 200; ein reines "OK/Fehler" würde einen teilweise misslungenen Sync als Erfolg anzeigen | 2026-10-07 |
| Gemeinsame Client-Hülle für Kontakt-Bereich (PROJ-8) und Sync-Bereich, die die aktuelle Anzahl freigegebener Kontakte hält | Der Sync-Button muss sofort aktiv werden, sobald im Kontakt-Bereich das erste Häkchen gespeichert ist — ohne Neuladen (Akzeptanzkriterium) | 2026-10-07 |
| Maximale Laufzeit der Seite auf 300 s angehoben, Wartezeit auf den Endpoint knapp darunter begrenzt | Gleiche Obergrenze wie der Endpoint; die eigene Begrenzung sorgt für eine verständliche "Ergebnis unbekannt"-Meldung statt eines harten Plattform-Abbruchs | 2026-10-07 |
| Bestätigungsdialog mit shadcn `alert-dialog` (bereits installiert) | Gleiche Komponente wie beim Stornieren in PROJ-4 | 2026-10-07 |
| Sicherheitsschalter `KUNDENPORTAL_SYNC_AKTIV` (nur bei exakt `"true"` aktiv) — ergänzt in `/frontend` | Ob der Produktions-Endpoint den Firma-Filter schon kennt, lässt sich nicht gefahrlos prüfen: ein Testaufruf an einen alten Endpoint würde genau den Gesamt-Sync auslösen. Der Schalter wird erst nach dem Kundenportal-Deploy gesetzt; bis dahin ist der Button deaktiviert, und Code kann jederzeit gefahrlos nach `main` (Auto-Deploy) | 2026-10-07 |
| Zusätzliche Erkennung im Ergebnis: meldet der Endpoint mehr als eine geladene Firma, wird das als Problem angezeigt statt als Erfolg | Zweite Verteidigungslinie, falls der Schalter versehentlich zu früh gesetzt wird — der Freigeber sieht sofort, dass der Filter nicht gegriffen hat | 2026-10-07 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### A) Component Structure
```
/sync-freigabe (bestehende Seite aus PROJ-8, nur Freigeber)
+-- Zugriffsprüfung "nur Freigeber" + Hinweis ohne Firma (unverändert aus PROJ-8)
+-- NEU: gemeinsame Hülle (hält "Anzahl freigegebener Kontakte" live)
    +-- Bereich "Kundenportal-Zugang" (PROJ-8, unverändert, meldet jede gespeicherte Änderung an die Hülle)
    +-- NEU: Bereich "Ins Kundenportal übertragen"
        +-- Kurztext: was übertragen wird (Firma, Standorte, Geräte, Prüfberichte, Kontakte + alle Artikel)
        +-- Kein Kontakt freigegeben → Button deaktiviert + Hinweis
        |   "Zuerst mindestens einen Kontakt fürs Kundenportal freigeben"
        +-- Button "Freigeben & synchronisieren"
        |   +-- Bestätigungsdialog: "Daten von <Firma> ins Kundenportal übertragen?
        |       <N> Kontakte haben Zugriff." [Abbrechen] [Übertragen]
        +-- Während des Syncs: Button "Synchronisiere…", gesperrt
        +-- Ergebnis-Meldung (bleibt bis zum nächsten Sync sichtbar)
            +-- Erfolg: "<Firma> wurde ins Kundenportal übertragen." + Zahlen je Bereich
            |   (z.B. Geräte: 12 aktualisiert, 1 neu)
            +-- Mit Teilfehlern: Hinweis + Liste der gemeldeten Fehler
            +-- Fehlgeschlagen: verständlicher Grund (Firma unbekannt, nicht konfiguriert, Portal-Fehler)
            +-- Ergebnis unbekannt: "Keine Antwort vom Kundenportal erhalten — der Sync kann trotzdem
                durchgelaufen sein." (Kontrolle später über PROJ-6)
```

### B) Data Model (plain language)
Kein eigenes Datenmodell, nichts wird im Admin-Tool gespeichert:
- **Eingabe:** die Firma-ID der bestätigten Firma.
- **Vor dem Aufruf geprüft:** Benutzer ist Freigeber; Firma-ID ist eine gültige GUID; die Firma hat mindestens einen aktiven, freigegebenen Kontakt mit E-Mail (gleiche Abfrage wie PROJ-8); Ziel-URL und Secret sind konfiguriert.
- **Aufruf:** an den Kundenportal-Endpoint, immer mit Firma-ID.
- **Antwort:** pro Datenbereich die Zahlen geladen/neu/aktualisiert/gelöscht, plus Listen von Warnungen und Fehlern — wird in eine der vier Ergebnisstufen übersetzt und angezeigt, nicht gespeichert (Verlauf = PROJ-6).

### C) Tech Decisions (für PM erklärt)
- **Das Secret bleibt auf dem Server:** Der Browser löst nur eine Aktion im Admin-Tool aus; erst der Server spricht mit dem Kundenportal.
- **Schutz vor dem Gesamt-Sync liegt im Admin-Tool:** Der Kundenportal-Endpoint würde ohne Firma-Angabe alle Firmen übertragen. Das Admin-Tool prüft die Firma-ID deshalb vor jedem Aufruf und schickt sie immer mit.
- **Die Sperre wird doppelt geprüft:** Der Button ist ohne freigegebenen Kontakt deaktiviert, und der Server prüft es beim Auslösen noch einmal — falls in einem anderen Tab gerade die letzte Freigabe entzogen wurde.
- **Ehrliche Ergebnisanzeige:** Das Kundenportal meldet auch teilweise misslungene Läufe als "erledigt". Das Admin-Tool unterscheidet deshalb Erfolg, Teilfehler, Fehler und "keine Antwort erhalten".
- **Button wird live freigeschaltet:** Kontakt- und Sync-Bereich teilen sich die Zahl der freigegebenen Kontakte, damit der Button nach dem ersten Häkchen ohne Neuladen aktiv wird.

### D) Dependencies
- Keine neuen Pakete, keine neuen shadcn-Komponenten (`alert-dialog`, `button`, `card` vorhanden)
- Umgebungsvariablen (bereits dokumentiert): `KUNDENPORTAL_SYNC_URL`, `KUNDENPORTAL_CRON_SECRET` — Werte in Vercel (Production) prüfen; das Secret muss dem `CRON_SECRET` des Kundenportals entsprechen
- **Cross-Repo vor dem Live-Test:** Die 5 lokalen Commits im Kundenportal-Repo (u.a. Firma-Filter PROJ-12) müssen gepusht und deployt sein, sonst ignoriert der Produktions-Endpoint den `firmaId`-Parameter und würde **alle** Firmen synchronisieren

## Implementation Notes (Frontend)

Umgesetzt in einem Durchlauf (UI + Server Action + Endpoint-Aufruf), wie bei PROJ-3/4/8:

- `src/lib/kundenportal-sync.ts` — `istSyncKonfiguriert()` (Schalter + URL + Secret) und `starteFirmaSync(firmaId, firmaName)`: GUID-Prüfung vor jedem Aufruf (wirft, nie ein Aufruf ohne Firma), `GET …?firmaId=` mit Bearer-Secret, `cache: "no-store"`, Timeout 285 s. Übersetzt die Antwort in vier Stufen (erfolg / teilweise / fehler / unbekannt) mit deutschen Bereichsnamen; 200 mit `errors`/`warnings` → "teilweise"; mehr als eine geladene Firma → zusätzliches Problem "Firma-Filter offenbar nicht aktiv"
- `src/app/(protected)/sync-freigabe/actions.ts` — neue Server Action `syncFirmaAction(firmaId)`: Freigeber-Prüfung, `z.guid()`, Schalter, serverseitige Wiederholung der Sperre (mind. ein aktiver, freigegebener Kontakt mit E-Mail, über `listKundenportalKontakteForFirma` aus PROJ-8), Firmenname aus Dataverse
- `src/components/sync-ausloesen.tsx` — Sync-Bereich: Hinweise (nicht aktiviert / kein Kontakt), Button mit Bestätigungsdialog (Firma + Anzahl Kontakte), "Synchronisiere…", Ergebnis mit Farbe je Stufe, Problemliste und Zahlentabelle; `try/catch` um den Aufruf (Lehre aus PROJ-8 BUG-1)
- `src/components/sync-freigabe-bereich.tsx` — gemeinsame Hülle, hält die live Anzahl freigegebener Kontakte mit E-Mail
- `src/components/kundenportal-kontakte.tsx` (PROJ-8) — neue optionale Rückmeldung `onZugriffeChange`
- `src/app/(protected)/sync-freigabe/page.tsx` — nutzt die Hülle, `export const maxDuration = 300` (laut gebündelter Next.js-Doku gilt das auf Seitenebene auch für deren Server Actions)
- `.env.local.example` — neue Variable `KUNDENPORTAL_SYNC_AKTIV` dokumentiert
- Tests: `kundenportal-sync.test.ts` (12), `sync-freigabe/actions.test.ts` (+8), `sync-ausloesen.test.tsx` (6) — `npm test` 231/231, Lint, TypeScript, Build grün

**Abweichung vom Tech Design:** Sicherheitsschalter `KUNDENPORTAL_SYNC_AKTIV` und die Mehr-als-eine-Firma-Erkennung zusätzlich eingeführt (siehe Technical Decisions). Die Sperre zählt nur freigegebene Kontakte **mit E-Mail** (nur diese können sich anmelden) — konsistent mit der serverseitigen Prüfung.

**Nicht verifiziert:** Ein echter Aufruf des Kundenportal-Endpoints (bewusst nicht ausgeführt, solange dort der Firma-Filter nicht deployt ist) und die Oberfläche mit echtem Freigeber-Login.
**Live-Fund (2026-10-07):** Nach dem Setzen der Variablen in Vercel zeigte die Seite weiterhin "noch nicht aktiviert", ohne erkennbaren Grund. Angepasst: der Hinweis nennt jetzt die **Namen** (nie Werte) der fehlenden Einstellungen (`fehlendeSyncEinstellungen()`); der Schalter akzeptiert `true` unabhängig von Gross-/Kleinschreibung und umgebenden Leerzeichen; URL und Secret werden vor der Verwendung getrimmt (ein Leerzeichen im Secret hätte sonst zu 401 geführt). Typische Ursache bleibt ein fehlendes Redeploy nach dem Setzen der Variablen bzw. die falsche Umgebung (nicht *Production*). +3 Tests, `npm test` 234/234.

**Live-Vorfall (2026-10-07): ungewollter Gesamt-Sync.** Erster Test-Sync für "Cloudcab GmbH" übertrug alle 305 Firmen (Firma 305, Geräte 8358, Prüfberichte 25397 — 0 gelöscht, 6 Prüfberichte neu; inhaltlich identisch mit dem früheren nächtlichen Gesamt-Sync, kein Datenverlust). Die Mehr-als-eine-Firma-Erkennung hat das sofort als Problem angezeigt. **Ursache (im Kundenportal-Repo):** dessen `vercel.json`-`ignoreCommand` vergleicht nur `HEAD^..HEAD`; die Commits wurden gesammelt gepusht, der letzte (`acf8b52`) ändert nur Doku → Vercel hat den Build übersprungen, in Produktion lief weiter der alte Endpoint ohne Firma-Filter. Das Admin-Tool hat korrekt `?firmaId=` gesendet. **Massnahmen:** Schalter `KUNDENPORTAL_SYNC_AKTIV` wieder ausschalten; Kundenportal: `ignoreCommand` auf `VERCEL_GIT_PREVIOUS_SHA` umstellen und den Firma-Filter tatsächlich deployen; erst danach Schalter wieder setzen. Das Admin-Tool hat keine `vercel.json` und ist von dieser Falle nicht betroffen.


**Zum Aktivieren (in dieser Reihenfolge):**
1. Kundenportal-Repo: die lokalen Commits (Firma-Filter PROJ-12 u.a.) pushen und Deploy abwarten
2. Vercel (Admin-Tool, Production): `KUNDENPORTAL_SYNC_URL` und `KUNDENPORTAL_CRON_SECRET` prüfen (Secret = `CRON_SECRET` des Kundenportals), dann `KUNDENPORTAL_SYNC_AKTIV=true` setzen und neu deployen

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
