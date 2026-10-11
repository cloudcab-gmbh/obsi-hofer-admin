# Konsistenzprüfung Admin-Tool ↔ Kundenportal – Stand 2026-10-11

**Zweck:** Funde zur späteren Bearbeitung festhalten. Nichts davon ist bisher umgesetzt.
**Methode:** Rein lesender Vergleich von Code und Doku beider Repos. Dataverse und das laufende Portal wurden nicht abgefragt.
**Repos:** A = `D:\claude\obsi-hofer-admin` (dieses Repo), P = `D:\claude\test-project` (Kundenportal, Remote `rob581/kundenportal-obsi-hofer`). Zeilennummern beziehen sich auf den Stand vom 2026-10-11 und können sich verschieben.

**Was zusammenpasst:**
- **Sync-Aufruf:** Pfad, GET, Bearer-Secret, `firmaId` Pflicht, `standortId` optional, GUID-Prüfung.
- **Antwort:** `scope`, `entities`, `warnings`, `errors`.
- **Dataverse:** alle Tabellen- und Spaltennamen, und Prüfergebnisse als Text mit denselben Farben.
- **Aufräumen:** Der nächtliche Cron ist entfernt, `bmvcc_kundenportal` fragt kein Code mehr ab.

## Vorgeschlagenes Vorgehen

1. Der Nutzer entscheidet K1 (Storno). Empfehlung: Das Portal blendet `ist_archiviert = true` aus.
2. Admin-Repo: Doku aufräumen (D-A) und die kleinen Code-Punkte K5–K7 beheben, mit Tests.
3. Auftrag ans Portal schreiben: K1, K2, K8, K9 und die Doku-Liste D-P. Ablage wie bisher in `P/docs/`, umsetzen in einer Portal-Session.

---

## Code und Daten

### K1 – Hoch: stornierte Prüfberichte bleiben im Portal sichtbar · Entscheidung offen

**Admin-Tool:**
- „Stornieren“ setzt `bmvcc_isarchived = true` (`A/src/lib/dataverse/pruefberichte.ts:262`).
- Alle Lesevorgänge schliessen stornierte Berichte aus (`:97`, `:120`, `:182`): Verlauf, aktuellster Bericht, PB_Bemerkung, PDF-Export (`:162`) und Gerätestatus (`:195-201`).

**Portal:**
- Der Sync übernimmt das Feld als `ist_archiviert` (`P/src/lib/sync/jobs.ts:168`).
- Keine Abfrage filtert danach, nur nach `deleted_at`:
  - `P/src/lib/pruefberichte/queries.ts:28` (Verlauf pro Gerät) und `:99` (Übersicht und CSV)
  - `P/src/lib/geraete/queries.ts:140` („Bemerkung Prüfung“)
  - `P/src/lib/dashboard/queries.ts:107` (Zähler)
- Das ist eine bewusste Entscheidung des Portals: `P/features/PROJ-4-pruefberichte-liste.md:59` („archiviert = historisch, nicht ungültig“) und `P/features/PROJ-3-geraete-uebersicht.md:101`. Sie wurde getroffen, als nur 1 von 25'399 Berichten archiviert war.

**Folge:**
- Ein im Admin-Tool stornierter Bericht erscheint im Portal als normaler Eintrag.
- „Bemerkung Prüfung“ kann aus ihm stammen. Status, letzte Prüfung und Prüfer des Geräts kommen dagegen aus dem letzten gültigen Bericht, eine Portal-Zeile mischt also zwei Berichte.
- Das Admin-PDF und das Portal sind sich nicht einig, welcher Bericht der aktuelle ist.

**Empfehlung:** Das Portal filtert `ist_archiviert = true` überall aus und passt seine Entscheidungen in PROJ-3, PROJ-4 und PROJ-9 an. Damit erledigt sich auch K4.

### K2 – Mittel: Kontakt mit deaktivierter Bexio-Relation behält den Zugang, ist im Admin-Tool aber nicht mehr sichtbar

**Admin-Tool:**
- Listet nur aktive Kontakte mit aktiver Relation zur Firma (`A/src/lib/dataverse/kontakte.ts:76`, `:102`).
- Eine Freigabe-Änderung verlangt eine aktive Relation (`:172`).

**Portal:**
- Für den Zugang zählen nur ein aktiver Kontakt und ein Portalzugang, Relationen nicht (`P/src/lib/auth/access.ts:12-17`, `:32-47`).
- Der Sync filtert Relationen nicht nach Status (`P/src/lib/sync/run-sync.ts:342`).

**Folge:** Wird eine Relation in Bexio deaktiviert, kann sich die Person weiter anmelden. Im Admin-Tool lässt sich ihr Zugang nicht mehr entziehen. Ähnlich bei einem inaktiven Kontakt: Wird er in Dataverse wieder aktiviert, gilt sein alter Zugang still wieder.

**Optionen:**
- Das Portal verlangt zusätzlich eine aktive Relation zur Firma des Standorts.
- Das Admin-Tool zeigt auch Kontakte, die einen Portalzugang zum Standort haben, aber keine aktive Relation mehr, damit der Zugang entzogen werden kann.

### K3 – Mittel: zwei Prüfberichte am selben Tag, drei verschiedene Auswahlregeln

- **Admin, Gerätestatus:** Prüfdatum absteigend, dann `createdon` absteigend (`A/src/lib/dataverse/pruefberichte.ts:183`).
- **Admin, PDF und PB_Bemerkung:** nur Prüfdatum, bei Gleichstand zufällig (`:131`, `:146-172`).
- **Portal:** Prüfdatum, dann „hat eine Bemerkung“, dann kleinere ID (`P/src/lib/geraete/queries.ts:115-123`).

**Folge:** Bei den 269 Altfällen aus der Portal-Rückmeldung können Gerätestatus, PDF und Portal je einen anderen Bericht anzeigen.

**Empfehlung:** Eine gemeinsame Regel festlegen, z.B. Prüfdatum, dann `createdon` absteigend, und in beiden Repos umsetzen.

### K4 – Niedrig: Berichte mit `bmvcc_isarchived = null`

Der Admin-Filter `eq false` schliesst null-Werte aus, das Portal behandelt sie wie false und zeigt sie (`P/src/lib/sync/jobs.ts:168`). Das ist nur relevant, wenn es solche Werte in Dataverse gibt; das ist nicht geprüft. Mit K1 erledigt sich der Punkt.

### K5 – Niedrig bis mittel, Admin: es werden höchstens 500 Datensätze geladen

`A/src/lib/dataverse/records.ts:62-76` liefert einen Cursor für die nächste Seite, aber niemand nutzt ihn:
- `listGeraeteForStandorte`: `top: 500` (`A/src/lib/dataverse/geraete.ts:396`)
- `listPruefberichteForGeraete`: `top: 500` pro Block von 20 Geräten (`A/src/lib/dataverse/pruefberichte.ts:125`)
- `listFirmen`: `top: 500` (`A/src/lib/dataverse/geraete.ts:265`)

Das Portal holt alle Seiten (`P/src/lib/sync/dataverse-client.ts:52-67`).

**Folge:** Ein Standort mit mehr als 500 Geräten wird im Admin-Tool abgeschnitten. Ebenso Berichte, wenn 20 Geräte zusammen mehr als 500 haben; dann fehlt im PDF der aktuelle Bericht. Ob echte Daten an diese Grenze kommen, ist nicht geprüft.

**Zuerst:** die grössten Standorte und Firmen in Dataverse zählen.

### K6 – Niedrig, Admin: Anzeige des Sync-Ergebnisses

- **Falsche Meldung bei 404:** Jede 404-Antwort wird als „Firma … nicht gefunden“ gemeldet (`A/src/lib/kundenportal-sync.ts:142-152`). Das Portal sendet 404 aber auch für einen unbekannten oder firmenfremden Standort (`P/src/app/api/cron/sync-dataverse/route.ts:48-52`). Die falsche Meldung landet auch im Verlauf (`A/src/app/(protected)/sync-freigabe/actions.ts:176`). Lösung: den `error`-Text des Portals auswerten oder bei einem Standort-Lauf eine eigene Meldung zeigen.
- **Rohe Bezeichnung:** `BEREICH_NAMEN` (`A/src/lib/kundenportal-sync.ts:44-52`) kennt den Bereich `portalzugaenge` nicht, den das Portal liefert (`P/src/lib/sync/run-sync.ts:295-301`). Angezeigt wird der rohe Name. Der Admin-Test deckt diesen Bereich nicht ab.

### K7 – Niedrig, Admin: knapper Timeout

- Das Portal hat `maxDuration = 300` (`P/src/app/api/cron/sync-dataverse/route.ts:14`).
- Das Admin-Tool wartet bis 285 s auf das Portal (`A/src/lib/kundenportal-sync.ts:16`). Die Server Action läuft mit `maxDuration = 300` (`A/src/app/(protected)/sync-freigabe/page.tsx:25`), davor und danach kommen Dataverse-Aufrufe (`actions.ts:120-159`, `:176`).

**Folge:** Ein sehr langer Lauf kann die 300 s überschreiten. Dann bricht Vercel die Action ab, und es entsteht kein Verlaufseintrag.

**Zusätzlich:** Eine Antwort mit Status 200, die kein JSON ist (z.B. eine Login-Seite), zählt bei einem Firmen-Lauf als „erfolg“ mit 0 Bereichen (`A/src/lib/kundenportal-sync.ts:136`). Standort-Läufe schützt die `scope`-Prüfung.

### K8 – Niedrig, Portal: Erfolgsmail bei jedem manuellen Sync

`CRON_NOTIFY_ON_SUCCESS=true` war als Überwachung des nächtlichen Crons gedacht (`P/.env.local.example`). Jetzt verschickt `P/src/app/api/cron/sync-dataverse/route.ts:64-73` bei jedem Sync aus dem Admin-Tool eine Erfolgsmail. Gesetzt ist das im Beispiel; ob auch in Vercel, ist nicht geprüft.

Veraltete Kommentare zum Cron: `route.ts:11-13` und `:65-69`, `route.test.ts:125`.

### K9 – Niedrig, Portal: `CRON_SECRET` fehlt in `P/.env.local.example`

Der Endpoint verlangt die Variable (`route.ts:17`). Ohne sie antwortet er mit 500 und verschickt eine Mail an den Betrieb.

### K10 – Kosmetisch: Datumsformate und Bezeichnungen

**Datumsformate:**
- Herstelljahr: Admin-PDF `MM.JJJJ`, Portal nur das Jahr.
- Ablegereife: Admin-PDF `MM.JJJJ`, Portal das volle Datum, im CSV als ISO.
- `bmvcc_erstgebrauch`: synchronisiert das Portal noch nicht. Für PROJ-14 ist das geplant.
- Der Kommentar in `A/src/lib/dataverse/geraete.ts:6-9` nennt die Spalte noch „unverifiziert“, sie existiert aber.

**Bezeichnungen:**
- Prüfbericht-Bemerkung (`bmvcc_remark`): Admin-Liste „PB_Bemerkung“, Admin-PDF „Bemerkungen“, Portal „Bemerkung Prüfung“.
- Geräte-Bemerkung (`bmvcc_bemerkungen`): Admin-Formular „Bemerkungen“, Portal „Bemerkungen Gerät“.

**Nicht verifiziert:** Das Portal liest die Mobilnummer des Kontakts aus `mobile_phone` ohne `bmvcc_`-Präfix (`P/src/lib/sync/jobs.ts:79`, `:88`). Das Admin-Tool nutzt diese Spalte nicht.

---

## Doku

### D-X: Widersprüche zwischen den Repos

1. **Aktivierung des Standort-Syncs:**
   - `P/features/PROJ-16-sync-pro-standort.md:245`, `:250-251`: deployt und live über das Admin-Tool getestet am 2026-10-09.
   - `A/features/PROJ-12-…:253-256`: der Schalter sei am 2026-10-09 nicht gesetzt gewesen. `:264-267`: aktiv seit dem 2026-10-11, getestet „vom Kundenportal“.
   - Laut `vercel env ls` wurde der Schalter am 2026-10-09 angelegt.
   - **Korrektur in A:** Portal-Deploy und Schalter am 2026-10-09, bestätigt am 2026-10-11. Ebenso `A/features/INDEX.md:47`.
2. **Abbau des Häkchens fehlt in der Portal-Doku:**
   - `P/features/PROJ-15-portal-zugang-pro-standort.md:86`: Frage noch offen. `:34` und `:82` sind erledigt. `:113` sagt „Spalte bleibt“, obwohl Migration 0014 sie entfernt hat.
   - Die Rückmeldung des Portals liegt nur in A (`A/docs/kundenportal-rueckmeldung-2026-10-11.md`). Eine Kopie in `P/docs/` wäre sinnvoll.
3. **Portal-PROJ-13 nicht als abgelöst markiert:** `P/features/PROJ-13-…:3-5`, `P/docs/PRD.md:25` und `P/features/INDEX.md:30` beschreiben das Häkchen noch als geltende Regel. Nötig ist der Hinweis „abgelöst durch PROJ-15, Feld gelöscht am 2026-10-11“.
4. **Portal-PROJ-14 (PDF) kennt den neuen Kopf nicht:**
   - `P/features/PROJ-14-pdf-export-pruefberichte.md:48` beschreibt den Kopf mit Firmenname, ohne Logo-Grösse.
   - Die offene Frage aus `P/docs/admin-tool-hinweis-pdf-kopf-2026-10-11.md` gehört zu den Open Questions (`:85-88`).
   - Der Hinweis sollte unter Dependencies verlinkt sein (`:14`), und Last Updated (`:5`) ist zu aktualisieren.
5. **Dateiname in Portal-PROJ-14:** `:55` nennt `<Datum> … - <Firma>.pdf`, `:101` sagt aber „identisch zum Admin-Tool“. Im Admin-Tool lautet er `… - <Firma> - <Kurzname>[ - <Lagerort>].pdf`. Festzulegen, was das Portal macht.
6. **Standort-Filter fehlt in Portal-PROJ-14:**
   - `:8` und `:41` sind um den Standort-Filter zu ergänzen.
   - `:12`: PROJ-15 ist deployt, nicht nur geplant.
   - `:62` und `:81`: PROJ-13 durch PROJ-15 ersetzen.
7. **Auftrag Standort-Sync noch „offen“:** `A/docs/kundenportal-auftrag-sync-pro-standort.md:4` auf erledigt setzen (Kundenportal PROJ-16, `v1.13.0-PROJ-16`). Die Frage in `:39` ist beantwortet.
8. **PDF-Idee veraltet:**
   - `A/docs/kundenportal-pdf-export-idee.md:5` sagt „nicht eingeplant“, im Portal ist sie als PROJ-14 spezifiziert.
   - Die Punkte in `:43-53` sind beantwortet und abzuhaken.
   - `:51` zeigt den alten Dateinamen.
9. **Regel zum Firmenwechsel in A-PROJ-12 veraltet:** `A/features/PROJ-12-…:14` und `:56` sagen „erst nach Sync der neuen Firma“. Laut Portal genügt ein Standort-Lauf bei der neuen Firma.
10. **Spaltensatz des PDF:** Das Portal verweist auf den „Standardsatz“ des Admin-Tools mit 14 Spalten, das Admin-Repo dokumentiert ihn aber nirgends. Er steckt in der Excel-Vorlage `_PBVorlage/pruefberichtraport.xlsx`. Die Spalten in A-PROJ-7 auflisten. `P/features/PROJ-14-…:51` nutzt noch die alte Bezeichnung „Bemerkungen“.
11. **Erledigt-Vermerke fehlen:** In `A/features/INDEX.md:46` (Abhängigkeit PROJ-11) sowie in `A/features/PROJ-11-…:12` und `A/features/PROJ-12-…:12` fehlt „erledigt 2026-10-09 (dort PROJ-15 bzw. 16 deployt)“.

### D-A: nur im Admin-Repo

1. `A/docs/PRD.md:25`: PROJ-9 steht auf „Planned“, INDEX und Spec auf „Approved“.
2. **A-PROJ-10, PDF-Kopf:**
   - Akzeptanzkriterium `:60` und Tech Design `:170` und `:213` beschreiben noch den alten Kopf.
   - `:213` zeigt ausserdem den alten Ablagepfad.
   - Last Updated `:5` ist zu aktualisieren, im Nachtrag fehlt Commit `81876a6`.
3. **A-PROJ-11:** Last Updated `:5` ist zu aktualisieren. Die Edge Cases `:58` und `:64` beschreiben noch die Übergangsregel zum Häkchen.
4. **A-PROJ-12:** `:167` („Schalter bleibt aus“) und `:259-262` („Noch offen“) sind überholt. Aus dem Live-Test fehlt noch die Bestätigung von Schritt 3 (Verlauf mit Standort und Badge „ganze Firma“).
5. **PRD sagt noch „pro Firma“:** `A/docs/PRD.md:4`, `:9` und `:49` auf „pro Firma bzw. Standort“ ändern.
6. **A-PROJ-5:** Hinweis „erweitert durch PROJ-11 und PROJ-12“ ergänzen. Die Liste der Bereiche in `:63` ohne `portalzugaenge` und die Voraussetzung Häkchen in `:12` sind veraltet.
7. `A/features/INDEX.md:56-57`: Die Empfohlene Baureihenfolge ist überholt.
8. `A/features/PROJ-7-…:86`: Der Decision Log widerspricht der Änderung vom 2026-10-06 zur Quelle der Vorlage (`:34`, `:125`).

### D-P: nur im Portal-Repo

1. **Status:** PROJ-4 und PROJ-5 stehen im Spec-Kopf auf „Approved“, sind aber seit dem 2026-09-18 deployt.
2. **PROJ-1 beschreibt noch den Nacht-Cron um 03:00:**
   - Betroffen sind `:12-13`, `:29`, `:46`, `:68`, `:90`, `:107` und `:170-171`.
   - Es fehlen die Löschbremse mit Mindestanzahl und die Portalzugang-Entität.
   - Nötig ist ein Nachtrag.
3. **PRD:** `P/docs/PRD.md:38` nennt einen „periodischen Sync-Job“, `:39` Passkey als „spätere Option“ (ist deployt).
4. **PROJ-11 (Login-Quote):**
   - Die Quote basiert noch auf dem Häkchen. Migration 0012 nutzt die entfernte Spalte `ist_portal_freigegeben`.
   - Cron-Verweise in `:118`, `:163` und `:187`.
   - Nötig ist ein Nachtrag zu PROJ-15.
5. **PROJ-12:** Die User Story „vollständiger Sync“ in `:12` widerspricht der Entscheidung in `:53`. Im Edge Case `:37` fehlt die Mindestanzahl der Löschbremse.
6. **PROJ-13:** Out of Scope `:28` widerspricht der beantworteten Frage in `:61`.
7. **PROJ-15:** `:30` sagt „kommt später“, ist aber umgesetzt in PROJ-16.
8. `P/docs/management-summary-login-umbau.md:32`: Erwähnt den Nacht-Cron. Das Dokument ist historisch, höchstens ein Statushinweis.
