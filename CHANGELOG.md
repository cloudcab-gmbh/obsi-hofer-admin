# Changelog

Alle für Nutzer relevanten Änderungen am Admin-Tool. Neueste Version zuerst. Versionen entsprechen den Git-Tags `vX.Y.Z-PROJ-N`.

## [Unveröffentlicht] – Branch `zeiterfassung` · PROJ-13 bis PROJ-18 Zeiterfassung
Noch nicht in Production — wird beim Deploy zur nächsten Version. Nur für Freigeber.
### Neu
- Menüpunkt „Zeiterfassung“ mit den Reitern Übersicht, Zeitnachweis, Personen, Ferien und Feiertage.
- Personen (PROJ-14):
  - Alle Personen aus den Zeiteinträgen, mit Name, „nicht auswerten“ und Austritt.
  - Arbeitsmodell mit Versionen (Pensum, Arbeitstage, gültig ab).
  - Gleitzeit- und Ferien-Startsaldo am Stichtag sowie Ferienanspruch.
- Zeitnachweis (PROJ-13):
  - Pro Person und Monat Tag für Tag Kommen/Gehen, Ist, Soll, Abweichung, Gleitzeit, Essen und Bemerkungen.
  - Saldo Vormonat sowie Gleitzeit in Stunden und Tagen.
  - Feiertage, Krankheit und Komp. GLZ werden berücksichtigt.
  - Fehlendes „Gehen“ nachtragen, Einträge für einen Tag erfassen und einzelne Einträge löschen. Der Power-Automate-Flow rechnet die Totals danach neu.
- Ferien (PROJ-15):
  - Ferien von–bis erfassen (nur Tage mit Soll, halbe Tage möglich, mit Vorschau), umstellen und löschen.
  - Feriensaldo mit Anspruch × Pensum, Gutschrift am 1. Januar und Restferien-Übertrag.
  - Jahresübersicht aller Personen.
  - Kennzeichnung „Frei“.
- Zeitnachweis als PDF (PROJ-16): Download pro Person und Monat, A4 hoch, mit „Erstellt von“.
- Übersicht (PROJ-17):
  - Alle Mitarbeitenden eines Monats mit Gleitzeit, Ist/Soll, Abwesenheiten und Ferien.
  - Grafiken für Gleitzeit und Ferien.
  - Warnungen, z.B. kein Arbeitsmodell, offene Einträge, negativer Feriensaldo.
- Feiertage (PROJ-18): Pro Jahr übernehmen und pflegen, auch betriebliche und halbe Feiertage. Ohne Pflege gelten die gesetzlichen Feiertage Aargau.

## [1.12.2] – 2026-10-20 · PROJ-7 PDF-Export Prüfberichte (kundenspezifisches Template)
### Neu
- Vorbereitet: Das PDF kann unten rechts ein Visum (Unterschrift) tragen. Es ist noch ausgeschaltet; bis zur Freigabe ändert sich am PDF nichts.

## [1.12.1] – 2026-10-20 · PROJ-7 PDF-Export Prüfberichte (kundenspezifisches Template)
### Geändert
- Die Zeilen im PDF sind fest sortiert: nach Lagerort, dann Artikel, Typ, Serien-Nr. und Scancode.
- Die Fusszeile des PDF zeigt neu die Seitenzahl im Format „Seite X von Y“.
### Entfernt
- Das frühere Häkchen „Kundenportal“ pro Kontakt ist seit dem 11.10.2026 auch in Dataverse gelöscht; der Portalzugang wird nur noch pro Standort vergeben.

## [1.12.0] – 2026-10-11 · PROJ-12 Sync-Freigabe und -Verlauf pro Standort
### Neu
- Sync pro Standort ist aktiv (vom Kundenportal bestätigt am 11.10.2026): Freigeber übertragen gezielt einen Standort, die übrigen Standorte der Firma bleiben im Kundenportal unverändert.
- Wechselt ein Standort die Firma, genügt ein Standort-Lauf bei der neuen Firma.

## [1.11.1] – 2026-10-11 · PROJ-10 Standort als Arbeitskontext
### Geändert
- Bei Firmen mit mehreren Standorten steht im PDF-Kopf der volle Standort-Name statt Firmenname und Kurzname; bei Firmen mit einem Standort weiterhin der Firmenname.
- Das Logo im PDF-Kopf ist kleiner.

## [1.11.0] – 2026-10-09 · PROJ-12 Sync-Freigabe und -Verlauf pro Standort
### Neu
- Sync-Freigabe und Sync-Verlauf pro Standort vorbereitet; bis zur Aktivierung überträgt die Freigabe-Seite weiterhin die ganze Firma.

## [1.10.1] – 2026-10-09 · PROJ-11 Kundenportal-Zugang pro Standort
### Geändert
- Das Admin-Tool pflegt das alte Häkchen „Kundenportal“ pro Kontakt nicht mehr mit; das Kundenportal wertet nur noch die Zugänge pro Standort aus.

## [1.10.0] – 2026-10-09 · PROJ-11 Kundenportal-Zugang pro Standort
### Neu
- Freigeber vergeben den Kundenportal-Zugang neu pro Kontakt und Standort; bestehende Freigaben wurden übernommen.
### Behoben
- Sync und Sync-Verlauf bleiben auch für eine Firma ohne Standort nutzbar.

## [1.9.0] – 2026-10-08 · PROJ-10 Standort als Arbeitskontext
### Neu
- Auf der Startseite wird nach der Firma auch der Standort gewählt; Geräte, Prüfberichte und PDF beziehen sich auf diesen Standort.
- Bei Firmen mit genau einem Standort wird dieser automatisch gewählt.
- Das PDF wird im Ordner des Standorts abgelegt.
### Behoben
- Gleichnamige Firmen sind auf der Freigabe-Seite unterscheidbar.

## [1.8.2] – 2026-10-08 · PROJ-3 Geräte-Verwaltung
### Geändert
- Die Geräteliste ist standardmässig nach letzter Prüfung sortiert, die neueste zuerst.

## [1.8.1] – 2026-10-08 · PROJ-3 Geräte-Verwaltung
### Neu
- Die Anzahl der gefilterten Geräte wird über dem PDF-Button angezeigt.

## [1.8.0] – 2026-10-07 · PROJ-9 PDF-Export digital signieren (Firmen-Siegel)
### Neu
- Technische Grundlage für das digitale Signieren des PDF (Testmodus); im Produktivbetrieb ändert sich noch nichts, das PDF bleibt vorerst unsigniert.

## [1.7.1] – 2026-10-07 · PROJ-3 Geräte-Verwaltung
### Neu
- Die Geräteliste lässt sich per Klick auf die Spalten sortieren.
### Behoben
- Auf kleinen Bildschirmen klappt die Kopfzeile in ein Menü zusammen.
- Eine bereits übertragene Firma kann auch ohne freigegebene Kontakte erneut synchronisiert werden.

## [1.7.0] – 2026-10-07 · PROJ-6 Sync-Status/-Verlauf einsehen
### Neu
- Der Verlauf der Sync-Läufe pro Firma ist einsehbar: Zeitpunkt, Erfolg oder Fehler, Details aufklappbar.

## [1.6.0] – 2026-10-07 · PROJ-5 Sync-Freigabe pro Firma
### Neu
- Freigeber lösen den Sync zum Kundenportal gezielt für eine Firma aus, statt dass er automatisch nachts läuft.
- Der Menüpunkt dazu heisst „Freigabe“.

## [1.5.0] – 2026-10-06 · PROJ-8 Kundenportal-Zugang pro Kontakt (abgelöst durch PROJ-11)
### Neu
- Freigeber setzen pro Kontakt einer Firma das Häkchen „Kundenportal“, um ihm den Portalzugang zu geben oder zu entziehen.

## [1.4.0] – 2026-10-06 · PROJ-4 Prüfberichte-Verwaltung
### Neu
- Prüfberichte können erfasst, bearbeitet und storniert werden; stornierte Prüfberichte bleiben erhalten, sind aber nicht mehr bearbeitbar.
### Geändert
- Das PDF wird direkt erzeugt, im Stil der Excel-Vorlagen, mit Logo und OBSI-Hofer-Kontaktblock; die Firmen-Vorlage liegt jahresunabhängig unter festem Namen im Prüfberichte-Ordner.
- Beim Wechsel der Firma werden die Filter der Geräteliste zurückgesetzt.
### Behoben
- Wörter im PDF werden nicht mehr mitten im Wort umgebrochen, und Tabellenzeilen bleiben beim Seitenumbruch zusammen.

## [1.3.0] – 2026-10-06 · PROJ-7 PDF-Export Prüfberichte (kundenspezifisches Template)
### Neu
- Aus der Geräteliste lässt sich ein PDF-Prüfbericht nach der Vorlage der Firma erzeugen; es wird zum Download angeboten und im SharePoint-Jahresordner der Firma abgelegt.
- Die Geräteliste hat einen Filter nach Tagen seit der letzten Prüfung und eine Spalte mit der Bemerkung des Prüfberichts.
- Das Gerät-Formular ist kompakter angeordnet.

## [1.2.0] – 2026-10-05 · PROJ-3 Geräte-Verwaltung
### Neu
- Geräte der gewählten Firma anzeigen und bearbeiten, live in Dataverse.
- Die Firma wird einmal auf der Startseite gewählt und gilt für die ganze Sitzung.
- Die Geräteliste zeigt Kunden-ID und letzte Prüfung.

## [1.1.0] – 2026-10-05 · PROJ-2 Dataverse-Web-API-Anbindung
### Neu
- Anbindung an Dataverse als Grundlage für das Lesen und Speichern der Daten.

## [1.0.0] – 2026-10-05 · PROJ-1 Entra-ID-Login mit Rollen (Bearbeiter/Freigeber)
### Neu
- Anmeldung mit dem Microsoft-365-Firmenkonto; die Rolle Bearbeiter oder Freigeber bestimmt, was man im Tool tun darf.
