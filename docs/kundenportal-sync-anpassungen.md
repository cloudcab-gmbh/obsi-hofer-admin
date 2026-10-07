# Übergabe: Anpassungen am Kundenportal-Sync für das Admin-Tool

**Von:** Repo `obsi-hofer-admin` (internes Admin-Tool)
**An:** Repo Kundenportal (`obsi-hoferkundenportal.vercel.app`)
**Stand:** 2026-10-06

> **Status 2026-10-07: vollständig umgesetzt und deployt.** Im Kundenportal-Repo als PROJ-12 (Firma-Filter, inzwischen Pflichtparameter — ohne `firmaId` wird abgelehnt) und PROJ-13 (Portal-Zugang nur für Kontakte mit Häkchen `bmvcc_kundenportal`). Bemerkungen kommen aus `bmvcc_bemerkungen`, der nächtliche Sync-Cron ist entfernt, das `ignoreCommand` nutzt `VERCEL_GIT_PREVIOUS_SHA`. Die vier Rückmeldepunkte sind in der Admin-Spec PROJ-5 beantwortet (Laufzeit eines Firma-Syncs gemessen: 8 s). Dieses Dokument bleibt als Übergabe-Historie erhalten.

Dieses Dokument beschreibt, was im Kundenportal-Repo geändert werden muss, damit das Admin-Tool den Sync gezielt pro Firma auslösen kann. Es ist die Grundlage für eine eigene Spec im Kundenportal-Repo. Die Umsetzung erfolgt dort, im Kundenportal-Repo; das Admin-Tool ruft nur den Endpoint auf.

## Hintergrund

Bisher synchronisiert der Kundenportal-Sync (`/api/cron/sync-dataverse`) jede Nacht um 03:00 Uhr **alle** Firmen aus Dataverse. Künftig löst ein **Freigeber im Admin-Tool** den Sync manuell und **nur für eine Firma** aus, wenn deren Daten fertig bearbeitet sind. Vorher legt er pro Kontakt fest, wer Zugang zum Kundenportal bekommt (Häkchen `bmvcc_kundenportal`).

Im Admin-Tool bereits fertig und in Produktion:
- **Kontakt-Freigabe (Admin PROJ-8):** Seite `/sync-freigabe`, auf der ein Freigeber das Häkchen `bmvcc_kundenportal` pro Kontakt setzt oder entzieht.

Im Admin-Tool geplant, wartet auf diese Anpassung:
- **Sync-Freigabe (Admin PROJ-5):** Button „Freigeben & synchronisieren“ auf derselben Seite, der den Endpoint für die aktuell gewählte Firma aufruft. Gesperrt, solange kein Kontakt der Firma freigegeben ist.

## Was im Kundenportal-Repo zu tun ist

### 1. Firma-Filter für den Sync-Endpoint
- `/api/cron/sync-dataverse` nimmt eine **Firma-ID** entgegen (Dataverse-GUID `bmvcc_firmaid` der Tabelle `bmvcc_firma`).
- Synchronisiert werden nur die Daten **dieser** Firma: Firma, Standorte, Geräte, Prüfberichte, Kontakte.
- **Artikel** (`dv_artikel`, firmenübergreifende Stammdaten) werden bei jedem Aufruf komplett mitsynchronisiert (kleine Datenmenge, bewusste Vereinfachung).
- **Sicherheitsregel:** Ohne Firma-ID oder mit einer ungültigen/unbekannten Firma-ID wird der Aufruf **abgelehnt**. Der Endpoint darf nie still einen globalen Sync aller Firmen ausführen.
- Absicherung weiterhin über `CRON_SECRET`.

### 2. Nur freigegebene Kontakte erhalten Portal-Zugang
- Portal-Benutzer werden nur aus Kontakten der Tabelle **`bmvcc_kontakt`** übernommen, die
  - `bmvcc_kundenportal = true` haben,
  - aktiv sind (`statecode = 0`),
  - eine E-Mail-Adresse in `bmvcc_mail` haben.
- **Firma-Zuordnung über `bmvcc_relation`** (Felder `bmvcc_firma` → `bmvcc_firma`, `bmvcc_person` → `bmvcc_kontakt`, Rolle in `bmvcc_role_description`). Der Lookup `bmvcc_parent_account` auf dem Kontakt und die N:N-Beziehung Firma↔Kontakt sind in den echten Daten **leer** und taugen nicht als Quelle.
- Ein Kontakt kann mehreren Firmen zugeordnet sein (aktuell 11 Kontakte). Das Häkchen gilt dann für alle diese Firmen.
- Wird das Häkchen entzogen oder der Kontakt inaktiv, verliert die Person ihren Portal-Zugang beim **nächsten Sync dieser Firma**. Es gibt keinen sofortigen Entzug.

### 3. Gerät-Bemerkungen aus der richtigen Spalte
- Der Sync überträgt aktuell `bmvcc_notitzen` als Bemerkungen eines Geräts. Diese Spalte enthält kurze Kennungen (z.B. „105 Akra“, „A020-030“).
- Die echten Bemerkungen stehen in **`bmvcc_bemerkungen`** (teils mehrzeilig). Das Admin-Tool verwendet seit 2026-10-06 diese Spalte.

### 4. Nächtlichen Cron entfernen
- Den Cron-Eintrag (03:00 Uhr) aus `vercel.json` entfernen. Der Sync läuft künftig ausschliesslich manuell über das Admin-Tool.

## Voraussetzungen ausserhalb des Codes

- **Dataverse-Rechte:** Der App-Benutzer des Kundenportal-Syncs hat eine eigene Sicherheitsrolle (getrennt vom Admin-Tool). Diese Rolle braucht zusätzlich **Lesen auf `bmvcc_kontakt` und `bmvcc_relation`**.
- **Secret:** `CRON_SECRET` im Kundenportal muss in Vercel (Production) identisch sein mit `KUNDENPORTAL_CRON_SECRET` im Admin-Tool.

## Verifizierte Fakten aus Dataverse (2026-10-06, rein lesend geprüft)

| Thema | Befund |
|---|---|
| Kontakt-Tabelle | `bmvcc_kontakt`, Entity-Set `bmvcc_kontakts`, 596 Kontakte, davon 551 aktiv |
| Freigabe-Spalte | `bmvcc_kundenportal` (Boolean); aktuell bei keinem Kontakt gesetzt |
| E-Mail | `bmvcc_mail`, bei 522 von 596 Kontakten vorhanden |
| Name | `bmvcc_name_1` = Nachname, `bmvcc_name_2` = Vorname (48 ohne Vorname) |
| Zuordnung | `bmvcc_relation`, Entity-Set `bmvcc_relations`: 557 Einträge, alle aktiv, alle mit Firma und Person, keine Duplikate |
| Abdeckung | 546 Kontakte mindestens einer Firma zugeordnet; 13 aktive Kontakte ohne Firma; 28 von 305 Firmen ohne Kontakt |
| Bemerkungen Gerät | `bmvcc_bemerkungen` (380 Geräte befüllt) vs. `bmvcc_notitzen` (402, Kennungen) |

## Was das Admin-Tool zurück braucht

Diese Punkte bitte nach der Umsetzung festhalten (z.B. in der Spec im Kundenportal-Repo). Sie beantworten die offenen Fragen der Admin-Spec PROJ-5:

1. **Übergabe der Firma:** Query-Parameter oder JSON-Body? Name des Feldes?
2. **Antwortformat:** HTTP-Statuscodes und Inhalt bei Erfolg und Fehler, insbesondere ob die Anzahl übertragener Datensätze geliefert wird.
3. **Laufzeit:** Wie lange dauert ein Sync einer grossen Firma, und reicht die `maxDuration` des Endpoints auf Vercel?
4. **Parallele Läufe:** Was passiert, wenn zwei Syncs derselben Firma gleichzeitig laufen?

## Nicht Teil dieser Anpassung

- Oberfläche zum Auslösen des Syncs: liegt im Admin-Tool (Admin PROJ-5).
- Verlauf/Status vergangener Sync-Läufe: Admin PROJ-6, später.
- Benachrichtigung von Kunden über neue Daten.
