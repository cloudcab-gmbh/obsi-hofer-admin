# PROJ-12: Sync-Freigabe und -Verlauf pro Standort

## Status: In Progress
**Created:** 2026-10-09
**Last Updated:** 2026-10-09

## Dependencies
- Requires: PROJ-5 (Sync-Freigabe pro Firma) — Button, Bestätigungsdialog, Aufruf des Kundenportal-Syncs
- Requires: PROJ-6 (Sync-Status/-Verlauf) — Verlauf und Dataverse-Tabelle `bmvcc_synclauf`
- Requires: PROJ-10 (Standort als Arbeitskontext) — der aktuelle Standort
- Requires: PROJ-11 (Kundenportal-Zugang pro Standort) — Zugänge pro Standort als Voraussetzung
- **Cross-Repo (Kundenportal, dort separat einzuplanen — Auftrag: [docs/kundenportal-auftrag-sync-pro-standort.md](../docs/kundenportal-auftrag-sync-pro-standort.md)):** Der Sync-Endpoint muss zusätzlich einen Standort annehmen und dann nur diesen Standort übertragen, ohne die übrigen Standorte der Firma im Portal zu verändern
- **Dataverse (vom Nutzer anzulegen):** In der Tabelle der Sync-Läufe eine Spalte "Standort" (Verweis auf Standort) + Rechte für den App-Benutzer
- Hinweis aus dem Kundenportal (2026-10-09): Wechselt ein Standort die Firma, wirkt ein Zugang zu ihm erst wieder, wenn die neue Firma synchronisiert ist

## User Stories
- Als Freigeber möchte ich einen Standort ins Kundenportal übertragen, sobald dessen Prüfungen fertig sind, ohne halbfertige Daten anderer Standorte derselben Firma mitzuschicken.
- Als Freigeber möchte ich im Verlauf sehen, wann der aktuelle Standort zuletzt übertragen wurde und mit welchem Ergebnis — einschliesslich der früheren Übertragungen der ganzen Firma.
- Als Freigeber möchte ich bei Firmen mit nur einem Standort genauso arbeiten wie bisher.
- Als Freigeber möchte ich im Bestätigungsdialog eindeutig sehen, welcher Standort welcher Firma übertragen wird.
- Als OBSI Hofer möchte ich, dass ein Standort nur übertragen wird, wenn dort jemand Zugang hat (oder ein entzogener Zugang ins Portal gebracht werden muss).

## Out of Scope
- "Ganze Firma übertragen" als zusätzliche Option — bewusst nicht; es wird immer der aktuelle Standort übertragen (Nutzer-Entscheidung)
- Mehrere Standorte auf einmal übertragen
- Automatische oder geplante Übertragung (PRD Non-Goal)
- Umbau des Kundenportal-Syncs selbst — eigenes Feature im Kundenportal-Repo
- Nachträgliche Zuordnung alter Firmen-Läufe zu Standorten (sie bleiben "ganze Firma")

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

**Übertragen**
- [ ] Angenommen ein Freigeber hat Firma und Standort gewählt, wenn er "Freigeben & synchronisieren" bestätigt, dann werden nur die Daten dieses Standorts (Geräte, Prüfberichte, Portal-Zugänge zu diesem Standort) samt Firmen-Stammdaten und Artikeln ins Kundenportal übertragen
- [ ] Angenommen ein Standort wird übertragen, dann bleiben die Daten der übrigen Standorte derselben Firma im Kundenportal unverändert
- [ ] Angenommen der Freigeber öffnet den Bestätigungsdialog, dann nennt er Firma und Standort (z.B. "Die Daten von „Bilfinger … AG · Pratteln“ werden übertragen"; bei Firmen mit einem Standort wie bisher nur die Firma)
- [ ] Angenommen die Firma hat genau einen Standort, dann verhält sich der Sync für den Freigeber wie bisher

**Voraussetzung**
- [ ] Angenommen mindestens ein Kontakt mit E-Mail hat Zugang zu diesem Standort, dann ist "Freigeben & synchronisieren" aktiv
- [ ] Angenommen kein Kontakt hat Zugang zu diesem Standort, aber der Standort wurde schon einmal übertragen (durch einen Standort-Lauf oder einen früheren Lauf der ganzen Firma, der nicht vollständig fehlschlug), dann ist der Sync trotzdem möglich — damit ein entzogener letzter Zugang ins Portal gelangt
- [ ] Angenommen kein Kontakt hat Zugang zu diesem Standort und er wurde nie übertragen, dann ist der Button gesperrt mit dem Hinweis, zuerst einen Kontakt für diesen Standort freizugeben
- [ ] Die Voraussetzungen werden serverseitig erneut geprüft (z.B. letzter Zugang in einem anderen Tab entzogen)
- [ ] Angenommen der Standort wurde inzwischen gewechselt (anderer Tab), wenn der Freigeber bestätigt, dann wird nicht übertragen und er wird aufgefordert, die Seite neu zu laden

**Verlauf**
- [ ] Angenommen ein Standort-Lauf wird ausgeführt, dann wird er im Verlauf mit Firma **und** Standort gespeichert (Zeitpunkt, Dauer, Freigeber, Ergebnis wie PROJ-6)
- [ ] Angenommen der Freigeber betrachtet den Verlauf, dann sieht er die Läufe des aktuellen Standorts sowie die früheren Läufe der ganzen Firma (vor PROJ-12), letztere gekennzeichnet als "ganze Firma"; Läufe anderer Standorte erscheinen nicht
- [ ] Angenommen eine Firma ohne Standort (PROJ-11 BUG-2), dann bleibt der bisherige Firmen-Sync für sie möglich (nur Firmen-Stammdaten/Kontakte; Voraussetzung: schon einmal übertragen) und wird als "ganze Firma" protokolliert

**Übergang**
- [ ] Angenommen das Kundenportal unterstützt den Sync pro Standort noch nicht, dann darf das Admin-Tool keinen Standort-Sync auslösen (Reihenfolge: Kundenportal zuerst; Absicherung wie bei PROJ-5, damit ein veraltetes Portal nicht stillschweigend die ganze Firma überträgt)

## Edge Cases
- **Standort wechselt in Dataverse die Firma** → Zugänge zu ihm wirken im Portal erst nach einem Sync bei der neuen Firma (Hinweis Kundenportal); im Admin-Tool erscheint er bei der neuen Firma
- **Gleichnamige Firmen** (Bilfinger) → Dialog und Verlauf nennen den Anzeigenamen mit Standort (PROJ-10)
- **Sync läuft, Freigeber wechselt den Standort** → der bestätigte Standort wird zu Ende übertragen und protokolliert (wie Firmenwechsel in PROJ-5)
- **Sync-Dauer / Zeitüberschreitung** → wie PROJ-5 ("Ergebnis unbekannt"), Verlaufseintrag mit Standort
- **Verlaufseintrag kann nicht gespeichert werden** → Sync-Ergebnis wird trotzdem angezeigt (wie PROJ-6)
- **Alter Firmen-Lauf mit Ergebnis "fehler"** → zählt nicht als "schon übertragen" (Regel aus PROJ-6)
- **Zwei Freigeber übertragen gleichzeitig verschiedene Standorte derselben Firma** → beide Läufe unabhängig, je ein Verlaufseintrag

## Technical Requirements (optional)
- Security: Standort serverseitig gegen den Arbeitskontext geprüft; nur Freigeber
- Der Standort-Parameter darf nie dazu führen, dass mehr als die gewählte Firma übertragen wird (bestehende Absicherungen aus PROJ-5 bleiben)

## Open Questions
- [ ] Kundenportal: Schnittstelle für den Standort — Vorschlag: Parameter `standortId` zusätzlich zu `firmaId`; in der Antwort Rückmeldung des Umfangs (übertragener Standort bzw. Anzahl geladener Standorte). Auftrag formuliert 2026-10-09 ([docs/kundenportal-auftrag-sync-pro-standort.md](../docs/kundenportal-auftrag-sync-pro-standort.md)): Parameter `standortId`, Rückmeldung `scope` in der Antwort; offen bis zur Rückmeldung des Kundenportals
- [ ] Werden Kontakte/Zugänge anderer Standorte bei einem Standort-Lauf im Portal unverändert gelassen? (Erwartung: ja) — mit Kundenportal klären
- [x] Exakter Name der neuen Verlaufsspalte → `bmvcc_standort` (Navigation `bmvcc_Standort`), aus dem Schema gelesen (2026-10-09)

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Sync überträgt immer nur den aktuellen Standort; keine Option "ganze Firma" | Freigabe genau dann, wenn ein Standort fertig ist; einfache Bedienung (Nutzer-Entscheidung) | 2026-10-09 |
| Verlauf zeigt Läufe des aktuellen Standorts + frühere Firmen-Läufe (gekennzeichnet) | Vollständige Historie, ohne Läufe anderer Standorte (Nutzer-Entscheidung) | 2026-10-09 |
| Voraussetzung: Zugang zu genau diesem Standort, Ausnahme "schon einmal übertragen" (auch durch alten Firmen-Lauf) | Kein Übertragen von Standorten, die niemand sieht; Entzug des letzten Zugangs bleibt übertragbar (Nutzer-Entscheidung, Regel aus PROJ-5/6 übertragen) | 2026-10-09 |
| Kundenportal zuerst, Admin-Tool schaltet danach um; Absicherung gegen ein Portal, das den Standort ignoriert | Gleiche Lehre wie PROJ-5 (Live-Vorfall Gesamt-Sync 2026-10-07) | 2026-10-09 |
| Firmen ohne Standort behalten den Firmen-Sync | Konsistent mit PROJ-11 BUG-2-Fix | 2026-10-09 |

### Technical Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Neuer Schalter `KUNDENPORTAL_STANDORT_SYNC_AKTIV`; aus = heutiger Firmen-Sync | Admin-Tool kann vor dem Kundenportal deployt werden; kein stiller Gesamt-Sync durch ein Portal ohne Standort-Parameter (Lehre PROJ-5) | 2026-10-09 |
| Antwortprüfung: Portal muss den Standort-Umfang zurückmelden, sonst "teilweise" + Warnung | Zweite Verteidigungslinie, analog "mehrere Firmen"-Erkennung | 2026-10-09 |
| Neue optionale Spalte "Standort" in `bmvcc_synclauf`; leer = ganze Firma | Keine Migration alter Läufe; Firmen ohne Standort abgedeckt | 2026-10-09 |
| Löschverhalten der neuen Spalte "Verknüpfung entfernen" | Verlauf bleibt erhalten, auch wenn ein Standort gelöscht wird | 2026-10-09 |
| "Schon übertragen" = Lauf ≠ "fehler" unter den angezeigten Läufen (Standort + ganze Firma) | Eine nachvollziehbare Regel, deckungsgleich mit dem sichtbaren Verlauf | 2026-10-09 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Ausgangslage
- Heute ruft das Admin-Tool `/api/cron/sync-dataverse?firmaId=…` im Kundenportal auf (Pflicht-Parameter seit Kundenportal PROJ-12). Absicherungen: GUID-Prüfung, Schalter `KUNDENPORTAL_SYNC_AKTIV`, Erkennung "mehr als eine Firma übertragen" in der Antwort.
- Verlauf: Tabelle `bmvcc_synclauf` mit Verweis auf die Firma; "schon einmal übertragen" = ein Lauf, der nicht "fehler" ist.

### A) Bausteine
```
/sync-freigabe (nur Freigeber, bestehend)
+-- Kontaktliste (PROJ-11, unverändert)
+-- "Ins Kundenportal übertragen" (angepasst)
|   +-- Text/Dialog: "Firma · Standort" (bei einem Standort nur Firma)
|   +-- Button aktiv, wenn: Kontakt mit E-Mail hat Zugang zu DIESEM Standort
|   |     oder der Standort wurde schon übertragen (Standort-Lauf oder früherer Firmen-Lauf)
+-- Sync-Verlauf (angepasst)
      Läufe dieses Standorts + frühere Läufe "ganze Firma" (gekennzeichnet)

Sync auslösen (Server, angepasst)
+-- prüft: Freigeber, Standort = aktueller Standort der Sitzung, Voraussetzung (serverseitig wiederholt)
+-- ruft das Kundenportal mit Firma + Standort auf
|     Firma ohne Standort → wie bisher nur mit Firma ("ganze Firma")
+-- prüft die Antwort: hat das Portal wirklich nur diesen Standort übertragen?
|     nein → Ergebnis "teilweise" mit deutlicher Warnung (wie heute bei "mehrere Firmen")
+-- speichert den Verlaufseintrag mit Firma UND Standort
```

### B) Daten (in Worten)
**Neue Spalte in `bmvcc_synclauf`** (vom Nutzer anzulegen): **Standort** — Nachschlagen auf Standort (`bmvcc_organizationlocation`), nicht Pflicht. Leer = Lauf der ganzen Firma (alle Läufe vor PROJ-12 und Läufe von Firmen ohne Standort). Löschverhalten "Verknüpfung entfernen" (Verlauf soll erhalten bleiben, auch wenn ein Standort gelöscht wird). Rechte: App-Benutzer braucht "Anfügen an" auf Standort.

**Verlauf eines Standorts** = Läufe der Firma mit diesem Standort **oder** ohne Standort, neueste zuerst; "Mehr laden" mit demselben Filter. Name des Eintrags: "Firma · Standort – Zeitpunkt".

**Neuer Schalter `KUNDENPORTAL_STANDORT_SYNC_AKTIV`** (Vercel-Umgebungsvariable, wie `KUNDENPORTAL_SYNC_AKTIV` aus PROJ-5):
- nicht gesetzt → das Admin-Tool synchronisiert wie bisher die **ganze Firma** (heutiges Verhalten, Verlaufseintrag ohne Standort) — so kann PROJ-12 vor dem Kundenportal deployt werden, ohne Schaden
- `true` → Sync pro Standort; erst setzen, wenn das Kundenportal den Standort-Parameter deployt hat

### C) Technische Entscheidungen (Begründung)
- **Schalter statt hartem Umschalten**: gleiche Lehre wie PROJ-5 (Live-Vorfall 2026-10-07) — ein Portal, das den Standort-Parameter (noch) nicht kennt, würde ihn ignorieren und die ganze Firma übertragen. Mit dem Schalter bestimmt der Nutzer den Zeitpunkt; bis dahin bleibt alles wie heute.
- **Zweite Absicherung über die Antwort**: Das Kundenportal soll im Ergebnis zurückmelden, für welchen Standort es übertragen hat (bzw. wie viele Standorte es geladen hat). Weicht das ab, meldet das Admin-Tool "teilweise" mit Warnung statt "Erfolg" — analog zur bestehenden "mehrere Firmen"-Erkennung.
- **Leerer Standort = ganze Firma** statt eigener Kennzeichnung: keine Datenmigration für alte Läufe nötig; Firmen ohne Standort und alte Läufe fallen automatisch darunter.
- **"Schon übertragen" aus den angezeigten Läufen**: dieselben Läufe, die der Verlauf zeigt (Standort + ganze Firma), entscheiden — eine Regel, die Freigeber sehen und nachvollziehen können.
- **Standort-Prüfung gegen die Sitzung** wie in PROJ-11 (Standortwechsel in anderem Tab → "bitte neu laden").

### D) Abhängigkeiten (Pakete)
Keine neuen Pakete.

### E) Ablauf der Einführung
1. Nutzer: Spalte "Standort" in `bmvcc_synclauf` anlegen + Rechte
2. Admin-Tool PROJ-12 deployen (Schalter aus → Verhalten wie heute)
3. Kundenportal: Standort-Parameter umsetzen und deployen (Auftrag wird formuliert)
4. Nutzer: `KUNDENPORTAL_STANDORT_SYNC_AKTIV=true` in Vercel setzen + Redeploy → Sync pro Standort aktiv

### F) Tests
- Unit-Tests: Voraussetzung pro Standort (Zugang/"schon übertragen" inkl. alter Firmen-Läufe und "fehler"-Läufe), Verlaufsfilter, Verlaufseintrag mit/ohne Standort, Schalter aus/an, Antwortprüfung (Portal ignoriert Standort → "teilweise"), Standortwechsel
- Manuell: mit Schalter aus wie heute; nach Portal-Deploy mit Schalter an: Standort A übertragen, Standort B im Portal unverändert

## Implementation Notes (Frontend + Backend)

**Umgesetzt 2026-10-09** — Oberfläche und Server-Logik zusammen.

**Dataverse:** Spalte `bmvcc_standort` (Nachschlagen auf Standort, optional, Navigation `bmvcc_Standort`, Löschverhalten "Verknüpfung entfernen") in `bmvcc_synclauf` vom Nutzer angelegt, Schema am 2026-10-09 gelesen.

**Server**
- `sync-laeufe.ts`: `SyncLauf.standortId` (null = ganze Firma); `erstelleSyncLauf` bindet optional den Standort und benennt "Firma · Standort – Zeitpunkt"; `listSyncLaeufeForFirma(firmaId, { vor, standortId })` filtert auf "dieser Standort oder ohne Standort".
- `kundenportal-sync.ts`: neuer Schalter `istStandortSyncAktiv()` (`KUNDENPORTAL_STANDORT_SYNC_AKTIV`); `starteFirmaSync(firmaId, bezeichnung, standort?)` sendet `standortId` und prüft die Antwort: fehlt `scope.standortId` oder weicht er ab bzw. wurden mehr als ein Standort geladen → "teilweise" mit Warnung "Standort-Filter ist dort offenbar nicht aktiv".
- `syncFirmaAction(firmaId, standortId)`: mit Schalter + Standort → Standort muss der aktuelle Standort der Sitzung sein ("bitte neu laden"), Voraussetzung "Kontakt mit E-Mail und Zugang zu DIESEM Standort" bzw. "schon übertragen" (Läufe dieses Standorts oder der ganzen Firma), Verlaufseintrag mit Standort. Ohne Schalter (oder ohne Standort) exakt wie bisher die ganze Firma. `ladeSyncLaeufeAction(…, standortId)` für "Mehr anzeigen".

**Oberfläche**
- `/sync-freigabe`: Verlauf mit Standort-Filter; `standortSync` = Standort vorhanden + Schalter aktiv.
- "Ins Kundenportal übertragen": beim Standort-Sync Text/Dialog mit "Firma · Standort" und Hinweis, dass die übrigen Standorte unverändert bleiben; Sperrhinweis "… für diesen Standort freigeben"; der Zähler der Kontaktliste zählt dann nur Zugänge zu diesem Standort.
- Sync-Verlauf: Läufe ohne Standort mit Badge "ganze Firma" (nur in der Standort-Ansicht); Leer-Text "Noch kein Sync für diesen Standort."

**Schalter:** `KUNDENPORTAL_STANDORT_SYNC_AKTIV` in `.env.local.example` dokumentiert. **Bleibt aus**, bis das Kundenportal den Auftrag `docs/kundenportal-auftrag-sync-pro-standort.md` deployt hat — bis dahin verhält sich die Freigabe-Seite exakt wie vor PROJ-12 (Verlauf zeigt weiterhin alle Läufe, da alle bisherigen ohne Standort sind).

**Tests:** erweitert `sync-laeufe.test.ts` (Standort binden/benennen, Filter, ungültige ID), `kundenportal-sync.test.ts` (Schalter, `standortId`-Parameter, Antwortprüfung), `sync-freigabe/actions.test.ts` (Standort-Sync, Schalter aus, Standortwechsel, Zugang nur zu anderem Standort reicht nicht, "schon übertragen" durch Firmen-Lauf, ungültige ID), `sync-verlauf.test.tsx` (Badge "ganze Firma", Leer-Text); bestehende Erwartungen auf die neuen Aufrufe angepasst. 421 Tests grün, Typecheck/Lint sauber.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
