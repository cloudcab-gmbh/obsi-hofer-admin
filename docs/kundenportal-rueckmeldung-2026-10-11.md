# Rückmeldung vom Kundenportal – Stand 2026-10-11

**Von:** Repo Kundenportal (`kundenportal-obsi-hofer`)
**An:** Repo Admin-Tool (`obsi-hofer-admin`)
**Bezug:** Aufträge `kundenportal-auftrag-portalzugang.md`, `kundenportal-auftrag-sync-pro-standort.md`, Idee `kundenportal-pdf-export-idee.md`

## 1. Sync pro Standort (euer PROJ-12 / Kundenportal PROJ-16): live und bestätigt

- Mit gesetztem Schalter `KUNDENPORTAL_STANDORT_SYNC_AKTIV=true` getestet: Der Standort-Lauf liefert `scope.standortId`, und `standorte.fetched` ist 1. Andere Standorte bleiben unverändert. **Der Schalter kann aktiv bleiben.**
- Für alle Läufe gilt jetzt: Die 20-%-Löschbremse greift erst ab mehr als 10 vorher bekannten Einträgen. Portalzugänge werden weiterhin immer gelöscht, ohne Bremse.
- Firmenwechsel eines Standorts: Ein Standort-Lauf bei der **neuen** Firma genügt.

## 2. Was Kunden im Portal neu sehen (relevant für Rückfragen und euren PDF-Export)

- **Standort-Filter und Spalte „Standort“** in der Geräte-Übersicht, nur wenn ein Kontakt mehr als einen Standort einer Firma freigegeben hat. Eine Standort-Auswahl beim Login gibt es bewusst nicht. Alle freigegebenen Standorte einer Firma sind gemeinsam sichtbar, der Filter schränkt nur ein. Er gilt auch für den CSV-Export.
- **Neue Spalte „Bemerkung Prüfung“:** die Bemerkung des aktuellen Prüfberichts, also des neuesten nicht gelöschten nach Prüfdatum. Sie steht auch im CSV-Export.
- **Umbenennung:** Die Bemerkung am Gerät heisst jetzt **„Bemerkungen Gerät“**, in Übersicht, Export und Detailseite. Das entspricht der Benennung, die für den PDF-Export geplant ist.

## 3. Erfolgsmessung

- Die Login-Quote zählt Firmen, für deren Standorte mindestens ein aktiver Kontakt einen Portalzugang hat.
- `bmvcc_kundenportal` wird vom Portal weder gelesen noch beim Sync abgefragt und **kann bei euch abgebaut werden**.

## 4. Hinweise zur Datenqualität in Dataverse (rein lesend festgestellt)

- **1'726 Prüfberichte ohne Gerätezuordnung** (`_bmvcc_gearaet_value` leer). Sie erscheinen im Portal nirgends.
- **4 E-Mail-Adressen gehören zu je 2 aktiven Kontakten**, jeweils derselben Firma (Bexio-Dubletten). Das Portal fasst ihre Zugänge zusammen, eine Bereinigung in Bexio wäre trotzdem sinnvoll.
- **269 Geräte haben zwei Prüfberichte am selben Prüfdatum** (Altdaten). Das Portal zeigt dafür eine feste Bemerkung, bevorzugt eine vorhandene. Laut euch ist künftig nur noch ein Prüfbericht pro Tag möglich.

## 5. PDF-Export im Portal (eure Idee `kundenportal-pdf-export-idee.md`)

Als **Kundenportal PROJ-14** spezifiziert, Status „Planned“, noch nicht gebaut. Entschieden:
- **Spalten:** euer Standardsatz (Lagerort, Artikel, Typ, Serien-Nr., Scancode, Hersteller, Herstelljahr, Erstgebrauch, Ablegereife, Zubehör, Geprüft, Prüfer, Prüfergebnis, Bemerkungen) **plus** die Portal-Zusatzspalten der Firma, ohne Doppelte. Keine SharePoint-Vorlagen (Option A erweitert).
- **Zwei Bemerkungen:** „Bemerkungen“ ist die Bemerkung des letzten Prüfberichts, „Bemerkungen Gerät“ die Zusatzspalte.
- **Geräte:** nur geprüfte, je eine Zeile mit dem letzten Prüfbericht, nach den aktiven Filtern der Übersicht. Dazu gehören künftig auch die Standort-Einschränkung und der Standort-Filter.
- **„Erstgebrauch“:** wird dafür in den Sync aufgenommen.
- **Farben:** „Freigabe“ grün, „keine Freigabe“ rot, „letzte Freigabe“ gelb/orange.
- **Layout, Kopfbereich und Dateiname:** identisch zu euch, ohne Portal-Hinweis.
- **Offen bis zur Architektur:** Code kopieren oder als gemeinsames Paket teilen, und die Laufzeit bei grossen Firmen.
