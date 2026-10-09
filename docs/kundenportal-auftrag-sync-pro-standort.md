# Auftrag ans Kundenportal: Sync pro Standort

> Gegenstück zu **PROJ-12** im Admin-Tool (`features/PROJ-12-sync-freigabe-und-verlauf-pro-standort.md`).
> Erstellt 2026-10-09 für die Claude-Code-Session im Kundenportal-Repo. Status: **offen**.

## Ausgangslage
Das Admin-Tool löst heute den Sync pro Firma aus: `GET /api/cron/sync-dataverse?firmaId=<GUID>` mit `Authorization: Bearer <CRON_SECRET>` (`firmaId` ist Pflicht seit eurem PROJ-12). Übertragen werden Firma, alle Standorte, Geräte, Prüfberichte, Kontakte, Relationen, Portalzugänge (euer PROJ-15) und Artikel.

Neu soll der Freigeber **einen einzelnen Standort** übertragen können, sobald dessen Prüfungen fertig sind, ohne halbfertige Daten anderer Standorte derselben Firma mitzuschicken.

## Was umzusetzen ist
1. **Neuer optionaler Parameter `standortId`** (GUID) zusätzlich zur Pflicht-`firmaId`:
   `GET /api/cron/sync-dataverse?firmaId=<GUID>&standortId=<GUID>`
2. **Mit `standortId`** wird nur dieser Standort übertragen:
   - der Standort selbst, seine Geräte und deren Prüfberichte
   - die Portalzugänge zu **diesem** Standort, inkl. Entfernen gelöschter Zugänge zu diesem Standort (wie in PROJ-15, ohne 20-%-Schwelle)
   - die Kontakte, die einen Zugang zu diesem Standort haben oder hatten, soweit für den Zugang nötig
   - Firmen-Stammdaten und Artikel wie bisher
3. **Alles andere der Firma bleibt im Portal unverändert:** Geräte, Prüfberichte und Portalzugänge der übrigen Standorte werden weder gelöscht noch verändert. Die bisherige Lösch-Logik der Firma (z.B. "Geräte, die nicht mehr kommen, entfernen") darf bei einem Standort-Lauf nur innerhalb dieses Standorts greifen.
4. **Ohne `standortId`** bleibt alles exakt wie heute (ganze Firma). Das Admin-Tool nutzt das weiterhin für Firmen ohne Standort.
5. **Prüfungen:** `standortId` muss eine GUID sein und zur übergebenen `firmaId` gehören. Sonst Ablehnung mit 400 bzw. 404 und verständlicher Meldung, ohne etwas zu übertragen.

## Rückmeldung des Umfangs in der Antwort (wichtig)
Das Admin-Tool prüft die Antwort als zweite Absicherung. Bitte im JSON-Ergebnis zusätzlich zurückgeben, wofür übertragen wurde, z.B.:
```
"scope": { "firmaId": "<GUID>", "standortId": "<GUID oder null>" }
```
Der Eintrag `entities` für `standorte` soll bei einem Standort-Lauf `fetched: 1` melden. Fehlt `scope.standortId` oder weicht er ab, wertet das Admin-Tool den Lauf als "teilweise" mit Warnung, weil der Standort-Filter dann offenbar nicht aktiv war.

## Abnahmekriterien
- Standort A übertragen → Geräte/Prüfberichte/Zugänge von A aktualisiert; Standort B derselben Firma im Portal unverändert, auch dessen Löschungen und Zugänge
- Zugang zu A in Dataverse entzogen + Standort-Lauf A → Zugang zu A weg; Zugänge desselben Kontakts zu B bleiben
- Gerät von A in Dataverse gelöscht + Standort-Lauf A → Gerät im Portal weg; Geräte von B unberührt
- Lauf ohne `standortId` → Verhalten exakt wie bisher
- `standortId` einer anderen Firma → abgelehnt, nichts übertragen
- Antwort enthält `scope` mit `firmaId` und `standortId`

## Bekannter Sonderfall (eure Rückmeldung zu PROJ-15)
Wechselt ein Standort die Firma, wirkt ein Zugang zu ihm erst wieder, wenn die neue Firma bzw. dieser Standort bei der neuen Firma synchronisiert ist. Bitte prüfen, ob ein Standort-Lauf bei der neuen Firma dafür genügt.

## Übergang
Das Admin-Tool schickt `standortId` erst, wenn dort der Schalter `KUNDENPORTAL_STANDORT_SYNC_AKTIV=true` gesetzt ist. Bitte nach dem Deploy zurückmelden; erst dann wird der Schalter gesetzt.
