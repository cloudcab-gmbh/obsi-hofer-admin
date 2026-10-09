# Auftrag ans Kundenportal: Portal-Zugang pro Standort

> Gegenstück zu **PROJ-11** im Admin-Tool (`features/PROJ-11-kundenportal-zugang-pro-standort.md`).
> Erstellt 2026-10-09 für die Claude-Code-Session im Kundenportal-Repo. Status: **erledigt — im Kundenportal deployt (PROJ-15, Tag v1.11.0-PROJ-15, 2026-10-09)**.

## Rückmeldungen aus dem Kundenportal
- **2026-10-09:** Applikationsbenutzer des Kundenportals kann `bmvcc_portalzugang` lesen (rein lesend geprüft). Stand: 8 Zugänge für 4 Kontakte, keine verwaisten Datensätze; die 4 Kontakte mit Zugang sind genau die 4 mit `bmvcc_kundenportal`. Im Portal als **PROJ-15 (P1)** spezifiziert. Massgeblich wird nur noch die Tabelle — das Häkchen `bmvcc_kundenportal` prüft das Portal danach nicht mehr. Rückmeldung folgt nach dem Deploy.
- **2026-10-09 — deployt** (Kundenportal PROJ-15, Tag `v1.11.0-PROJ-15`): Zugang und sichtbare Standorte kommen ausschliesslich aus `bmvcc_portalzugang`. Das Portal liest `bmvcc_kundenportal` nicht mehr (auch nicht beim Sync) — das Admin-Tool kann es als Übergangsfeld abbauen, ohne dass das Portal bricht. Der Sync pro Firma übernimmt die Zugänge der Standorte dieser Firma; gelöschte Zugänge verschwinden beim nächsten Sync der Firma (ohne 20-%-Schwelle). Kontakte mit Zugang werden auch ohne Relation zur Firma synchronisiert. Live getestet: bestehende Benutzer unverändert, Teil-Freigabe zeigt nur den freigegebenen Standort, Entzug + Sync ergibt "Kein Zugang".
- **Hinweis für Admin-Tool PROJ-12 (Sync pro Standort):** Wechselt ein Standort die Firma, wirkt ein Zugang zu ihm erst wieder, wenn die neue Firma synchronisiert ist.

## Ausgangslage
Bisher entscheidet das Ja/Nein-Feld `bmvcc_kundenportal` am Kontakt (`bmvcc_kontakt`), ob ein Kontakt Portal-Benutzer wird (Kundenportal PROJ-13). Ein Portal-Benutzer sieht alle Standorte seiner Firma.

Ab jetzt geben Freigeber im Admin-Tool **pro Standort** frei. Gespeichert wird das in einer neuen Dataverse-Tabelle. Die bestehenden Freigaben sind bereits übernommen: Wer bisher freigegeben war, hat jetzt einen Zugang zu allen Standorten seiner Firmen. Für bestehende Benutzer ändert sich also nichts, solange niemand Zugänge entzieht.

## Neue Dataverse-Tabelle "Portalzugang"
- Logischer Name `bmvcc_portalzugang`, Entity-Set `bmvcc_portalzugangs`
- Primärschlüssel `bmvcc_portalzugangid`, Name `bmvcc_name` (nur Anzeige, z.B. "Max Muster – Pratteln")
- Lookup `bmvcc_kontakt` → `bmvcc_kontakt` (Web-API: `_bmvcc_kontakt_value`, Navigation `bmvcc_Kontakt`)
- Lookup `bmvcc_standort` → `bmvcc_organizationlocation` (Web-API: `_bmvcc_standort_value`, Navigation `bmvcc_Standort`)
- Alternativer Schlüssel `bmvcc_kontaktzustandort` (Kontakt + Standort), keine Doppelungen

**Regeln:**
- Ein Datensatz = dieser Kontakt hat Zugang zu diesem Standort. **Entziehen = Datensatz wird gelöscht** (nicht deaktiviert). Es gilt nur: vorhanden = Zugang.
- Datensätze mit leerem Kontakt- oder Standort-Verweis (verwaist nach Löschungen) sind zu ignorieren.
- Ein Kontakt kann Zugänge zu Standorten mehrerer Firmen haben.

## Was umzusetzen ist
1. **Sync** (`/api/cron/sync-dataverse`, pro Firma wie bisher): die Portalzugänge der Standorte der synchronisierten Firma mit übernehmen. Zugänge, die in Dataverse gelöscht wurden, müssen beim nächsten Sync dieser Firma auch im Portal verschwinden.
2. **Portal-Benutzer:** Ein Kontakt wird Portal-Benutzer, wenn er mindestens einen Portalzugang hat. Das Admin-Tool setzt `bmvcc_kundenportal` vorerst automatisch genau so ("hat mindestens einen Zugang", über alle Firmen). Massgeblich soll künftig die Tabelle sein.
3. **Sichtbarkeit:** Ein Portal-Benutzer sieht nur Geräte und Prüfberichte der Standorte, für die er einen Portalzugang hat, auch bei Firmen mit mehreren Standorten. Das muss serverseitig bzw. über die Zugriffsregeln gelten, nicht nur in der Oberfläche.
4. Verliert ein Kontakt seinen letzten Zugang, darf er nach dem nächsten Sync nichts mehr sehen.

## Voraussetzung in Dataverse (bitte prüfen und zurückmelden)
Der Applikationsbenutzer des Kundenportals braucht **Lesezugriff auf `bmvcc_portalzugang`**. Ohne diesen Zugriff schlägt der Sync fehl oder findet keine Zugänge.

## Abnahmekriterien
- Kontakt mit Zugang nur zu Standort A sieht nach dem Sync nur Geräte/Prüfberichte von A, nicht von B
- Zugang im Admin-Tool entzogen + Sync → Standort ist im Portal nicht mehr sichtbar
- Letzter Zugang entzogen + Sync → kein Zugriff mehr aufs Portal
- Firmen mit einem Standort und bestehende Benutzer: unverändertes Verhalten
- Verwaiste Datensätze (leerer Verweis) führen weder zu Fehlern noch zu Zugriff
- Kontakt mit Zugängen bei zwei Firmen sieht bei beiden genau seine Standorte

## Nicht Teil dieses Auftrags
- Sync pro Standort (Parameter `standortId`): kommt später als eigenes Feature (Admin-Tool PROJ-12)
- Änderungen an der Tabelle selbst: Pflege nur über das Admin-Tool

## Bitte zurückmelden, wenn deployt
Dann kann das Admin-Tool `bmvcc_kundenportal` als Übergangsfeld behandeln und später abbauen.
