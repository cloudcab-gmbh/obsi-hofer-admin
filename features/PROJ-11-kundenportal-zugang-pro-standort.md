# PROJ-11: Kundenportal-Zugang pro Standort

## Status: Approved
**Created:** 2026-10-08
**Last Updated:** 2026-10-08

## Dependencies
- Requires: PROJ-8 (Kundenportal-Zugang pro Kontakt) — Kontaktliste und Häkchen auf `/sync-freigabe`, die hier auf Standorte umgestellt werden
- Requires: PROJ-10 (Standort als Arbeitskontext) — der "aktuelle Standort", für den freigegeben wird
- Requires: PROJ-1 (Rolle Freigeber)
- **Dataverse (vom Nutzer anzulegen):** Eine neue Zuordnung "Kundenportal-Zugang" zwischen Kontakt und Standort — heute existiert laut Schema-Prüfung (2026-10-08) **keinerlei** Beziehung Kontakt ↔ Standort (Kontakte hängen nur über `bmvcc_relation` an der Firma). Form der Zuordnung legt `/architecture` fest; dazu die nötigen Rechte für den App-Benutzer
- **Cross-Repo (Kundenportal, dort separat einzuplanen — Auftrag: [docs/kundenportal-auftrag-portalzugang.md](../docs/kundenportal-auftrag-portalzugang.md)):** Der Sync übernimmt die Standort-Freigaben, und ein Kontakt sieht im Portal nur Geräte und Prüfberichte seiner freigegebenen Standorte. Bis dahin funktioniert das Portal unverändert weiter (siehe Übergang)
- Bezug zu PROJ-12: Der Sync bleibt in diesem Feature pro Firma und überträgt die Freigaben aller Standorte; Sync pro Standort folgt in PROJ-12

## User Stories
- Als Freigeber möchte ich auf der Freigabe-Seite alle Kontakte der Firma sehen und anhaken, wer Zugang zum aktuell gewählten Standort bekommt, damit z.B. der Hauswart einer Niederlassung nur seine Niederlassung im Kundenportal sieht.
- Als Freigeber möchte ich auf einen Blick sehen, für welche anderen Standorte ein Kontakt bereits freigegeben ist, damit ich die Zugänge einer Firma insgesamt im Griff habe.
- Als Kontakt eines Kunden möchte ich im Kundenportal nur die Geräte und Prüfberichte der Standorte sehen, für die ich zuständig bin.
- Als Freigeber möchte ich bei Firmen mit nur einem Standort genauso arbeiten wie bisher, ohne zusätzliche Schritte.
- Als OBSI Hofer möchte ich, dass bei der Umstellung niemand seinen bestehenden Portalzugang verliert.

## Out of Scope
- Sync pro Standort und Sync-Verlauf pro Standort → **PROJ-12** (in PROJ-11 bleibt der Sync pro Firma)
- Die Umsetzung der Standort-Einschränkung im Kundenportal selbst — eigenes Feature im Kundenportal-Repo
- Anlegen, Bearbeiten oder Löschen von Kontakten, E-Mail-Adressen oder Rollen (weiterhin Stammdaten aus Bexio/Dataverse, PRD Non-Goal)
- Freigabe für mehrere Standorte auf einmal (z.B. "alle Standorte") — Freigaben werden pro aktuellem Standort gesetzt; bei Bedarf Standort wechseln
- Bearbeiter (ohne Rolle Freigeber) — Freigaben bleiben Freigebern vorbehalten (wie PROJ-8)
- Benachrichtigung der Kontakte über neue oder entzogene Zugänge

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

**Liste und Freigabe**
- [ ] Angenommen ein Freigeber hat Firma und Standort gewählt, wenn er `/sync-freigabe` öffnet, dann sieht er wie bisher alle aktiven Kontakte der Firma (Name, E-Mail, Rolle) und pro Kontakt ein Häkchen "Kundenportal" für den aktuellen Standort; die Überschrift der Liste nennt den Standort
- [ ] Angenommen ein Kontakt mit E-Mail ist für den aktuellen Standort nicht freigegeben, wenn der Freigeber das Häkchen setzt, dann wird die Freigabe für genau diesen Standort sofort in Dataverse gespeichert und bleibt nach Neuladen erhalten
- [ ] Angenommen ein Kontakt ist für den aktuellen Standort freigegeben, wenn der Freigeber das Häkchen entfernt, dann wird nur die Freigabe für diesen Standort entzogen; Freigaben für andere Standorte bleiben unverändert
- [ ] Angenommen ein Kontakt ist zusätzlich für andere Standorte der Firma freigegeben, wenn die Liste lädt, dann sieht der Freigeber bei diesem Kontakt einen Hinweis mit den Namen dieser Standorte (z.B. "auch freigegeben für: Pratteln, Boningen")
- [ ] Angenommen die Firma hat genau einen Standort, wenn der Freigeber die Seite öffnet, dann sieht und bedient er die Liste wie bisher (ohne zusätzlichen Schritt)
- [ ] Angenommen die Firma hat mehrere Standorte und noch keiner ist gewählt, wenn der Freigeber die Seite öffnet, dann sieht er statt der Kontaktliste einen Hinweis mit Link zur Startseite (wie Geräteliste/Prüfberichte in PROJ-10)
- [ ] Angenommen ein Kontakt ist mehreren Firmen zugeordnet, wenn der Freigeber ihn für einen Standort freigibt, dann gilt die Freigabe nur für diesen Standort — der bisherige Hinweis "Freigabe gilt auch für weitere Firmen" (PROJ-8) entfällt

**Unverändert aus PROJ-8**
- [ ] Angenommen ein Kontakt hat keine E-Mail-Adresse, dann ist sein Häkchen deaktiviert ("Keine E-Mail-Adresse hinterlegt"); eine bestehende Freigabe kann trotzdem entzogen werden
- [ ] Angenommen ein Kontakt ist inaktiv, dann erscheint er nicht in der Liste
- [ ] Angenommen die Liste wird angezeigt, dann ist der Hinweis sichtbar, dass Änderungen erst mit dem nächsten Sync im Kundenportal wirksam werden
- [ ] Angenommen ein Benutzer hat nur die Rolle Bearbeiter, dann wird der Zugriff auf Seite und Freigabe-Änderung serverseitig verweigert
- [ ] Angenommen das Speichern schlägt fehl, dann erscheint eine verständliche Fehlermeldung und das Häkchen zeigt wieder den gespeicherten Zustand

**Umstellung und Übergang**
- [ ] Angenommen ein Kontakt ist heute (PROJ-8) für das Kundenportal freigegeben, wenn PROJ-11 eingeführt wird, dann ist er danach für **alle Standorte aller seiner Firmen** freigegeben — niemand verliert seinen Zugang (einmalige Übernahme)
- [ ] Angenommen ein Kontakt ist für mindestens einen Standort freigegeben, dann ist auch das bisherige Häkchen "Kundenportal" am Kontakt gesetzt; ist er für keinen Standort mehr freigegeben, wird es entfernt — so funktioniert das heutige Kundenportal in der Übergangszeit unverändert weiter
- [ ] Angenommen eine Firma soll synchronisiert werden (PROJ-5), dann ist der Sync möglich, sobald mindestens ein Kontakt für mindestens einen Standort der Firma freigegeben ist

## Edge Cases
- **Standort wird in Dataverse gelöscht oder einer anderen Firma zugeordnet** → Freigaben für diesen Standort gelten nicht mehr bzw. nur bei der neuen Firma; im Admin-Tool erscheinen nur Standorte der aktuellen Firma
- **Kontakt verliert die Zuordnung zur Firma** (Bexio-Relation entfernt) → erscheint nicht mehr in der Liste; bestehende Standort-Freigaben bei dieser Firma bleiben in Dataverse, ob sie im Portal noch greifen, entscheidet der Kundenportal-Sync (wie bisher bei inaktiven Kontakten)
- **Letzte Standort-Freigabe eines Kontakts wird entzogen** → bisheriges Häkchen am Kontakt wird entfernt (Übergangsregel)
- **Kontakt mit Freigabe bei Firma A wird bei Firma B (anderer Standort) freigegeben** → beide Freigaben bestehen unabhängig
- **Gleichnamige Firmen** (z.B. Bilfinger-Niederlassungen, PROJ-10) → Freigaben hängen am Standort, also eindeutig der richtigen Niederlassung zugeordnet
- **Zwei Freigeber ändern gleichzeitig** → Last-Write-Wins (wie PROJ-8)
- **Schnelles Mehrfachklicken** → Häkchen während des Speicherns gesperrt (wie PROJ-8)
- **Standortwechsel bei offener Seite** → Liste zeigt danach die Freigaben des neuen Standorts
- **Übernahme bei Kontakten ohne Firmen-Zuordnung** (PROJ-8: aktuell 13) → kein Standort, keine Übernahme; bisheriges Häkchen bleibt wie es ist

## Technical Requirements (optional)
- Security: Freigabe nur für Standorte der aktuellen Firma der Sitzung und nur durch Freigeber (serverseitig geprüft, wie PROJ-8/PROJ-10)
- Performance: Liste lädt nicht spürbar langsamer als heute
- Dataverse-Rechte des App-Benutzers für die neue Zuordnung (lesen, anlegen, entfernen) sind vom Nutzer zu erteilen und zu verifizieren

## Open Questions
- [x] Form der neuen Zuordnung in Dataverse → eigene Tabelle "Portalzugang" (Kontakt, Standort), siehe Tech Design (2026-10-08)
- [x] Exakter Tabellen- und Feldname → `bmvcc_portalzugangs` / `bmvcc_kontakt` / `bmvcc_standort`, aus dem Schema gelesen (2026-10-09)
- [ ] Kundenportal: Umsetzung der Standort-Einschränkung — Auftrag am 2026-10-09 formuliert ([docs/kundenportal-auftrag-portalzugang.md](../docs/kundenportal-auftrag-portalzugang.md)); offen bis zur Rückmeldung, dass er im Kundenportal deployt ist
- [x] Wer führt die einmalige Übernahme aus und wann? → Skript mit Probelauf, vom Entwickler lokal ausgeführt, nach dem Anlegen der Tabelle und vor dem Deployment (2026-10-08)

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Freigabe pro Standort statt pro Kontakt: Freigeber sieht alle Kontakte der Firma und hakt an, wer Zugang zum aktuellen Standort bekommt | Nutzer-Entscheidung; Zuständigkeiten bei Kunden mit mehreren Standorten abbilden | 2026-10-08 |
| Im Kundenportal sieht ein Kontakt nur seine freigegebenen Standorte | Eigentlicher Nutzen der Zuordnung (Nutzer-Entscheidung); erfordert Anpassung im Kundenportal-Repo | 2026-10-08 |
| Bisheriges Firmen-Häkchen wird durch die Standort-Freigabe abgelöst; bestehende Freigaben werden einmalig auf alle Standorte aller Firmen des Kontakts übernommen | Eine Ebene statt zwei; niemand verliert seinen Zugang (Nutzer-Entscheidung) | 2026-10-08 |
| Übergang: Admin-Tool zuerst; das bisherige Häkchen wird automatisch mitgeführt ("mindestens ein Standort freigegeben") | Kundenportal funktioniert unverändert weiter, bis es die Standort-Einschränkung umsetzt; Admin-Tool muss nicht auf das andere Repo warten (Nutzer-Entscheidung) | 2026-10-08 |
| Hinweis auf weitere freigegebene Standorte pro Kontakt | Überblick über alle Zugänge einer Firma ohne Standortwechsel | 2026-10-08 |
| Sync bleibt pro Firma; Voraussetzung "mindestens ein Kontakt für mindestens einen Standort freigegeben" | Sync pro Standort ist PROJ-12; Voraussetzung aus PROJ-5 sinngemäss übertragen | 2026-10-08 |
| Freigabe immer für den aktuellen Standort, kein "für alle Standorte" | Einfach und eindeutig; passt zur Arbeitsweise aus PROJ-10 | 2026-10-08 |

### Technical Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Eigene Dataverse-Tabelle "Portalzugang" (Kontakt, Standort) statt N:N-Beziehung | "Erstellt von/am" automatisch, erweiterbar, einfach für den Kundenportal-Sync (Nutzer-Entscheidung) | 2026-10-08 |
| Entziehen = Datensatz löschen | Eindeutige Regel "vorhanden = Zugang" für Admin-Tool und Kundenportal | 2026-10-08 |
| Alternativer Schlüssel Kontakt + Standort empfohlen | Dataverse verhindert Doppelungen selbst, auch bei gleichzeitigen Klicks | 2026-10-08 |
| Serverseitige Prüfung: Kontakt gehört zur Firma der Sitzung, Standort ist deren aktueller Standort | Direkt aufrufbare Server Action; schliesst die PROJ-8-Lücke "beliebiger Kontakt änderbar" | 2026-10-08 |
| Bisheriges Feld `bmvcc_kundenportal` wird automatisch mitgeführt ("mindestens ein Portalzugang, über alle Firmen") | Heutiges Kundenportal läuft im Übergang unverändert | 2026-10-08 |
| Einmalige Übernahme als lokales Skript mit Probelauf, wiederholbar ohne Doppelungen | Kontrolliert und vorab prüfbar; nur einmal nötig | 2026-10-08 |
| Portalzugänge der Liste in einer gebündelten Abfrage | Keine Abfrage pro Kontakt, Liste nicht langsamer als heute | 2026-10-08 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Ausgangslage
- Schema-Prüfung (2026-10-08, nur lesend): keine Beziehung Kontakt ↔ Standort; Kontakte hängen über `bmvcc_relation` an Firmen, Standorte über `bmvcc_bexiofirma` an einer Firma.
- PROJ-8 speichert die Freigabe heute als Ja/Nein-Feld `bmvcc_kundenportal` am Kontakt; die Freigabe-Aktion prüft Rolle, aktiven Kontakt und E-Mail, aber **nicht**, ob der Kontakt zur aktuellen Firma gehört (wird mit PROJ-11 ergänzt).
- PROJ-10 liefert den aktuellen Standort über den Arbeitskontext.

### A) Bausteine
```
/sync-freigabe (nur Freigeber, bestehend)
+-- Arbeitskontext (PROJ-10): Firma + aktueller Standort
|     kein Standort gewählt (mehrere Standorte) → Hinweis mit Link zur Startseite
+-- Kontaktliste (bestehend, angepasst)
|   +-- Überschrift nennt den Standort (bei mehreren Standorten / gleichnamigen Firmen)
|   +-- pro Kontakt: Häkchen "Kundenportal" = Zugang zum AKTUELLEN Standort
|   +-- Hinweis "auch freigegeben für: <andere Standorte dieser Firma>"
|   +-- Hinweis "Freigabe gilt auch für weitere Firmen" (PROJ-8) entfällt
+-- Sync auslösen / Verlauf (bestehend, pro Firma)
      Voraussetzung neu: mind. ein Portalzugang für einen Standort der Firma

Freigabe ändern (Server, angepasst)
+-- prüft: Freigeber? Kontakt aktiv + E-Mail (nur beim Freigeben)?
+-- prüft NEU: Kontakt gehört zur Firma der Sitzung, Standort ist der aktuelle Standort dieser Firma
+-- legt den Portalzugang an bzw. löscht ihn
+-- führt das bisherige Häkchen am Kontakt mit (Übergang):
      gesetzt, solange mindestens ein Portalzugang des Kontakts existiert (über alle Firmen), sonst entfernt

Einmalige Übernahme (Skript, vom Entwickler lokal ausgeführt)
+-- Probelauf: listet, welche Portalzugänge entstehen würden (keine Änderung)
+-- Echtlauf: für jeden heute freigegebenen Kontakt × jeden Standort jeder seiner Firmen ein Portalzugang
+-- wiederholbar ohne Doppelungen
```

### B) Datenmodell (in Worten)
**Neue Dataverse-Tabelle "Portalzugang"** (vom Nutzer anzulegen, Vorgehen wie Sync-Läufe in PROJ-6):
- Name (Pflichtfeld der Tabelle, vom Tool gefüllt, z.B. "Max Muster – Pratteln")
- Kontakt (Verweis auf Kontakt, Pflicht)
- Standort (Verweis auf Standort, Pflicht)
- "Erstellt von / am" führt Dataverse automatisch → nachvollziehbar, wer wann freigegeben hat
- Empfehlung: alternativer Schlüssel (Kontakt + Standort), damit Dataverse Doppelungen selbst verhindert

Ein Datensatz = ein Kontakt hat Zugang zu einem Standort. **Entziehen = Datensatz löschen** (kein Deaktivieren), damit für das Kundenportal gilt: "vorhanden = Zugang".

Rechte für den App-Benutzer: auf "Portalzugang" Lesen, Erstellen, Löschen, Anfügen; auf Kontakt und Standort "Anfügen an". Das bisherige Schreibrecht auf `bmvcc_kontakt` bleibt (Häkchen im Übergang).

**Bisheriges Feld `bmvcc_kundenportal`** bleibt bestehen und wird automatisch mitgeführt ("hat mindestens einen Portalzugang"), bis das Kundenportal die Tabelle auswertet. Danach kann es entfallen (separater Aufräumschritt).

**Für das Kundenportal-Repo** (Übergabe, dort umzusetzen): Der Sync liest die Portalzugänge der Standorte der synchronisierten Firma; ein Portal-Benutzer sieht nur Geräte/Prüfberichte der Standorte, für die ein Portalzugang existiert.

### C) Technische Entscheidungen (Begründung)
- **Eigene Tabelle statt N:N-Beziehung** (Nutzer-Entscheidung): "wer/wann" automatisch, erweiterbar, für den Kundenportal-Sync einfach abzufragen.
- **Löschen statt Deaktivieren**: eindeutige Regel für beide Repos; die Historie "wer hat wann freigegeben" gilt für bestehende Zugänge, Entzüge sind über die Dataverse-Überwachung nachvollziehbar, falls aktiviert.
- **Prüfung der Zugehörigkeit auf dem Server**: Kontakt muss über eine aktive Relation zur Firma der Sitzung gehören, Standort muss der aktuelle Standort dieser Firma sein — die Aktion ist direkt aufrufbar (Lehre aus PROJ-4/PROJ-10). Schliesst nebenbei die Lücke aus PROJ-8, dass beliebige Kontakte geändert werden konnten.
- **Häkchen am Kontakt automatisch mitführen**: hält das heutige Kundenportal ohne Änderung lauffähig; die Regel "mindestens ein Zugang über alle Firmen" ist exakt die Bedeutung des bisherigen Felds.
- **Einmalige Übernahme als Skript mit Probelauf** statt automatisch im Tool: kontrolliert, vorab prüfbar, nur einmal nötig; wiederholbar ohne Doppelungen. Ablauf: Tabelle anlegen → Rechte → Probelauf → Echtlauf → Deployment.
- **Liste lädt in wenigen gebündelten Abfragen**: Kontakte der Firma (wie bisher) + Portalzugänge dieser Kontakte für die Standorte der Firma (eine Abfrage) — kein Laden pro Kontakt.
- **Sync-Voraussetzung**: "mindestens ein Portalzugang für einen Standort der Firma" statt "mindestens ein Kontakt mit Häkchen".

### D) Abhängigkeiten (Pakete)
Keine neuen Pakete.

### E) Tests
- Unit-Tests: Freigeben/Entziehen legt an bzw. löscht; Häkchen-Mitführung (erster Zugang setzt, letzter entzogener Zugang entfernt, Zugänge bei anderen Firmen halten es); Ablehnung bei fremdem Kontakt, fremdem Standort, Bearbeiter, fehlender E-Mail; keine Doppelungen
- Unit-Tests der Übernahme-Logik (Probelauf/Echtlauf, Wiederholbarkeit, Kontakte ohne Firma)
- Komponententests: Hinweis "auch freigegeben für", Standort in der Überschrift, Hinweis ohne gewählten Standort
- Manuell: Tabelle/Rechte in Dataverse, Probelauf gegen echte Daten, Freigeben/Entziehen live, Kundenportal-Sync unverändert lauffähig (Übergang)

## Implementation Notes (Frontend + Backend)

**Umgesetzt 2026-10-09** — Oberfläche und Server-Logik zusammen (wie PROJ-10).

**Dataverse-Tabelle** (vom Nutzer angelegt, Schema am 2026-10-09 gelesen): Entity-Set `bmvcc_portalzugangs`, Primärname `bmvcc_name`, Lookups `bmvcc_kontakt` (Navigation `bmvcc_Kontakt`) und `bmvcc_standort` (`bmvcc_Standort`), alternativer Schlüssel `bmvcc_kontaktzustandort` (Kontakt + Standort) aktiv. Abweichung vom Entwurf: Lookups nicht als Pflicht markiert, Löschverhalten "Verknüpfung entfernen" statt Löschweitergabe → das Tool setzt immer beide Verweise und ignoriert Datensätze mit leerem Verweis (Waisen).

**Datenzugriff**
- `records.ts`: neu `deleteRecord()`.
- Neu `src/lib/dataverse/portalzugaenge.ts`: `listPortalzugaengeForKontakte()` (gebündelt, 20er-Blöcke, Waisen ignoriert), `erstellePortalzugang()` (idempotent; Doppel-Schlüssel bei gleichzeitigen Klicks gilt als Erfolg), `entfernePortalzugang()` (löscht alle passenden, "schon weg" ist ok).
- `kontakte.ts`: `listKundenportalKontakteForFirma(firmaId, standorte, aktuellerStandortId)` liefert `freigegeben` (aktueller Standort) und `weitereStandorte` (Namen anderer Standorte DIESER Firma); die Abfrage nach "weiteren Firmen" entfällt. Neu `setStandortFreigabe()`: prüft aktive Relation Kontakt ↔ Firma (schliesst PROJ-8-Lücke), beim Freigeben aktiv + E-Mail, legt an/löscht, führt danach `bmvcc_kundenportal` mit ("mindestens ein Portalzugang, über alle Firmen"). `setKundenportalFreigabe()` (PROJ-8) entfernt. Neu `hatZugangBeiFirma()`.

**Server Actions** (`sync-freigabe/actions.ts`)
- `setKundenportalFreigabeAction(kontaktId, standortId, freigegeben)`: Freigeber-Prüfung, Zod-GUIDs, Standort muss dem aktuellen Standort der Sitzung entsprechen (sonst "Firma oder Standort wurden inzwischen gewechselt. Bitte die Seite neu laden.").
- `syncFirmaAction`: Voraussetzung jetzt "mindestens ein Kontakt mit E-Mail und Portalzugang zu irgendeinem Standort der Firma" (Standorte der Firma werden dafür geladen).

**Oberfläche**
- `/sync-freigabe`: lädt den Arbeitskontext; ohne feststehenden Standort `KontextHinweis` (wie Geräte/Prüfberichte). Liste mit Titel "Kundenportal-Zugang — Firma · Standort" (bei einem Standort nur Firma), `key` aus Firma + Standort.
- `KundenportalKontakte`: Häkchen gilt für den angezeigten Standort; Badge "auch freigegeben für: …" statt "Freigabe gilt auch für weitere Firmen"; Sync-Zähler zählt Zugänge zu allen Standorten der Firma.

**Einmalige Übernahme**
- Planung `src/lib/portalzugang-uebernahme.ts` (`planeUebernahme`, getestet), Skript `scripts/portalzugaenge-uebernehmen.ts` (Probelauf standardmässig, `--echtlauf` legt an), ausgeführt mit `npx tsx …` (neue Entwicklungsabhängigkeit `tsx`).
- **Probelauf 2026-10-09** gegen echte Daten: 4 freigegebene Kontakte → 8 Portalzugänge, 0 bereits vorhanden, 0 Kontakte ohne Firma/Standort.
- **Echtlauf ausgeführt 2026-10-09** (auf Freigabe des Nutzers): 8 Portalzugänge angelegt; anschliessender Probelauf zur Kontrolle: 0 anzulegen, 8 bereits vorhanden. Kontakte und deren Häkchen unverändert.

**Tests:** neu `portalzugaenge.test.ts`, `portalzugang-uebernahme.test.ts`; neu geschrieben `kontakte.test.ts`; erweitert `sync-freigabe/actions.test.ts` (Standort-Abgleich, Standort-ID-Prüfung), `kundenportal-kontakte.test.tsx` (Standort im Aufruf/Titel, Badge, Sync-Zähler). 400 Tests grün, Typecheck/Lint sauber.

## QA Test Results

**Tested:** 2026-10-09
**App URL:** http://localhost:3000
**Tester:** QA Engineer (AI) + Browser-Test durch den Nutzer (Punkte 1–3 der Testanleitung)

### Acceptance Criteria Status

#### Liste und Freigabe
- [x] Alle aktiven Kontakte der Firma mit Häkchen für den aktuellen Standort — Nutzer-Test + `kontakte.test.ts`
- [x] Häkchen setzen legt den Portalzugang für genau diesen Standort an und bleibt nach Neuladen — Nutzer-Test (Eintrag in Dataverse) + Unit-Tests
- [x] Häkchen entfernen entzieht nur diesen Standort — Nutzer-Test + `kontakte.test.ts`, `portalzugaenge.test.ts`
- [x] Hinweis "auch freigegeben für: …" mit den anderen Standorten der Firma — Nutzer-Test (Standortwechsel) + Komponententest
- [x] Firma mit einem Standort: Bedienung wie bisher
- [x] Mehrere Standorte ohne Wahl → Hinweis mit Link zur Startseite (`KontextHinweis`)
- [x] Kontakt mehrerer Firmen: Freigabe gilt nur für den Standort; Hinweis "Freigabe gilt auch für weitere Firmen" entfernt (Komponententest)
- [x] Überschrift nennt den Standort — bei Firmen mit mehreren Standorten bzw. gleichnamigen Firmen ("Firma · Standort"); bei Firmen mit einem Standort nur die Firma, konsistent mit Header-Regel aus PROJ-10 (bewusste Auslegung)

#### Unverändert aus PROJ-8
- [x] Ohne E-Mail: Häkchen gesperrt, Entziehen möglich (serverseitig: E-Mail nur beim Freigeben geprüft)
- [x] Inaktive Kontakte nicht in der Liste
- [x] Hinweis "wirksam mit dem nächsten Sync"
- [x] Bearbeiter: Seite und Aktion serverseitig verweigert (`actions.test.ts`)
- [x] Fehler beim Speichern: Meldung + Rücksetzen (bestehende Komponententests)

#### Umstellung und Übergang
- [x] Einmalige Übernahme: Probelauf 4 Kontakte → 8 Zugänge; Echtlauf am 2026-10-09, Kontroll-Probelauf 0 offen / 8 vorhanden; Nutzer sah die übernommenen Freigaben (Andrea Häfliger, Sibylle Bienz) als gesetzt
- [x] Bisheriges Häkchen wird mitgeführt (erster Zugang setzt, letzter entfernt, Zugänge bei anderen Firmen halten es) — `kontakte.test.ts`
- [x] Sync-Voraussetzung "mindestens ein Kontakt mit E-Mail für irgendeinen Standort der Firma" — `actions.test.ts` (neuer QA-Test: nur anderer Standort freigegeben → Sync erlaubt). **Manuell nicht prüfbar:** lokal fehlt `KUNDENPORTAL_SYNC_AKTIV=true` in `.env.local`, daher ist der Button lokal gesperrt (die Ursache ist dieser Sicherheitsschalter aus PROJ-5, nicht das Kundenportal); in Production ist der Schalter gesetzt

### Edge Cases Status
- [x] Standortwechsel bei offener Seite → Aktion lehnt ab ("Firma oder Standort wurden inzwischen gewechselt …"), kein Schreiben in den falschen Standort (`actions.test.ts`)
- [x] Gleichzeitige Klicks / Doppelungen → Häkchen gesperrt während Speichern; Dataverse-Schlüssel + idempotentes Anlegen (`portalzugaenge.test.ts`)
- [x] Bereits von jemand anderem entfernt → kein Fehler
- [x] Gleichnamige Firmen → Freigabe hängt am Standort, eindeutig
- [x] Übernahme wiederholbar, Kontakte ohne Firma/Standort gemeldet statt Fehler (`portalzugang-uebernahme.test.ts`; echte Daten: 0 solche Kontakte)
- [ ] Siehe BUG-1: verwaiste Portalzugänge nach Löschen eines Standorts/Kontakts
- [x] BUG-2 behoben 2026-10-09: Firma ohne Standort — Hinweis statt Liste, Sync/Verlauf nutzbar

### Security Audit Results
- [x] Nur Freigeber (Seite + Server Action), unverändert
- [x] Kontakt muss über eine aktive Relation zur Firma der Sitzung gehören — schliesst die PROJ-8-Lücke (direkter Aufruf mit beliebiger Kontakt-ID)
- [x] Standort muss der aktuelle Standort der Sitzung sein (vom Browser übergebene Standort-ID wird abgeglichen)
- [x] Alle IDs per Zod-GUID bzw. `requireValidGuid` geprüft, bevor sie in OData-Filter/-Pfade gelangen (Injection)
- [x] Übernahme-Skript: liest Zugangsdaten nur aus `.env.local`, standardmässig Probelauf, nicht Teil des App-Bundles
- [x] Neue Abhängigkeit `tsx` nur als Entwicklungsabhängigkeit; keine neuen Audit-Funde

### Automatisierte Tests
- [x] `npm test`: 33 Dateien, 401 Tests grün
- [x] `npm run test:e2e`: 24/24 grün (Zugriffsschutz `/sync-freigabe` bereits durch PROJ-8-Suite abgedeckt; kein neuer E2E-Test, da Login nicht automatisierbar und Aktionen in produktive Daten schreiben)

### Bugs Found

#### BUG-1: Verwaiste Portalzugänge nach Löschen eines Standorts oder Kontakts
- **Severity:** Low
- **Steps to Reproduce:**
  1. Kontakt für einen Standort freigeben
  2. Standort (oder Kontakt) in Dataverse löschen
  3. Expected: Portalzugang verschwindet mit
  4. Actual: Lookups der Tabelle stehen auf "Verknüpfung entfernen" — der Portalzugang bleibt mit leerem Verweis stehen. Das Tool ignoriert solche Waisen; das bisherige Häkchen am Kontakt wird aber erst bei der nächsten Änderung neu berechnet, und das Kundenportal muss Waisen ebenfalls ignorieren
- **Priority:** Nice to have — Empfehlung: in Dataverse für beide Beziehungen "Löschweitergabe" einstellen

#### BUG-2: Firma ohne Standort — Freigabe-Seite und Sync nicht mehr nutzbar
- **Severity:** Low
- **Steps to Reproduce:**
  1. Firma ohne Standort wählen (laut PROJ-10-Analyse einzelne Firmen, u.a. leere Hüllen)
  2. `/sync-freigabe` öffnen
  3. Expected: unklar — vor PROJ-11 war ein Sync (nur Kontakte) möglich
  4. Actual: Hinweis "keine Standorte erfasst", weder Freigabe noch Sync. Fachlich folgerichtig (ohne Standort gibt es nichts freizugeben bzw. im Portal zu sehen), aber eine Verhaltensänderung
- **Priority:** Nice to have — bewusst so lassen oder Sync-Bereich auch ohne Standort anzeigen
- **Status:** ✅ Behoben (2026-10-09) — bei einer Firma ohne Standort zeigt `/sync-freigabe` statt der Kontaktliste den Hinweis "Für diese Firma sind keine Standorte erfasst …"; Sync und Verlauf bleiben nutzbar. Der Sync ist dort nur möglich, wenn die Firma schon einmal übertragen wurde (bestehende Regel aus PROJ-5/6), damit sich entzogene Zugänge ins Portal bringen lassen. Komponententest `sync-freigabe-bereich.test.tsx`.

### Summary
- **Acceptance Criteria:** alle erfüllt (Sync-Voraussetzung per Test, manuell lokal wegen Sicherheitsschalter nicht prüfbar)
- **Bugs Found:** 2 total (0 critical, 0 high, 0 medium, 2 low) — BUG-2 behoben; BUG-1 wartet auf die Dataverse-Einstellung (Löschweitergabe)
- **Security:** Pass (inkl. Schliessen der PROJ-8-Lücke)
- **Production Ready:** YES
- **Recommendation:** Deployen; in Dataverse Löschweitergabe für die beiden Verweise einstellen (BUG-1); Kundenportal-Repo über die Tabelle und die Waisen-Regel informieren

## Deployment
_To be added by /deploy_
