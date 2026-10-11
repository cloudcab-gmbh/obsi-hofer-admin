# Hinweis ans Kundenportal: PDF-Kopfbereich geändert – Stand 2026-10-11

**Von:** Repo Admin-Tool (`obsi-hofer-admin`)
**An:** Repo Kundenportal (`kundenportal-obsi-hofer`)
**Bezug:** Kundenportal PROJ-14 (PDF-Export im Portal), dort entschieden: „Layout, Kopfbereich und Dateiname identisch zum Admin-Tool“. Rückmeldung `kundenportal-rueckmeldung-2026-10-11.md`, Abschnitt 5.

## Was sich geändert hat

Der Kopfbereich des PDF-Exports im Admin-Tool wurde am 2026-10-11 angepasst (Commit `81876a6`, Tag `v1.11.1-PROJ-10`). Das betrifft nur den Kopf, nicht Tabelle oder Dateiname.

| | Vorher | Jetzt |
|---|---|---|
| Logo | 70 pt breit | **30 pt breit** (gleiche Datei `logo_small.png`) |
| Name unter dem Titel, Firma mit **einem** Standort | Firmenname | Firmenname (unverändert) |
| Name unter dem Titel, Firma mit **mehreren** Standorten oder gleichnamige Firmen | Firmenname, darunter der gekürzte Standort-Name (12 pt, normal) | **nur der volle Standort-Name** (14 pt, fett), kein Firmenname |

„Voller Standort-Name“ ist der Name des Standorts aus Dataverse, ungekürzt, z.B. „Bilfinger Industrial Services Schweiz AG - Pratteln“. Vorher wurde der Firmenname vorne abgeschnitten („Pratteln“).

Unverändert sind der Titel „Prüfbericht Absturzsicherungen“ (14 pt, fett) und der OBSI-Hofer-Kontaktblock rechts.

## Was weiterhin den Kurznamen nutzt

Der **Dateiname** verwendet weiterhin den gekürzten Standort-Namen, z.B. `<Datum> Prüfbericht Absturzsicherungen - <Firma> - Pratteln.pdf`. Dasselbe gilt für die SharePoint-Ablage, die das Portal nicht betrifft.

## Wo im Code

`src/lib/pruefbericht-export/pdf-generator.ts`, Funktion `buildKopfbereich`: Logo-Breite und Kopfname (`standortName ?? firmaName`). Wer den Code kopiert oder als gemeinsames Paket übernimmt (bei euch offen bis zur Architektur), bekommt die Änderung automatisch mit. Der Aufrufer übergibt `standortName` nur bei Firmen mit mehreren Standorten bzw. gleichnamigen Firmen, dann mit dem vollen Namen.

## Offene Frage für euer PROJ-14

Im Portal kann ein Kontakt mehrere Standorte einer Firma gleichzeitig sehen, eine Standort-Auswahl gibt es nicht. Der Kopf des Admin-Tools geht immer von genau einem Standort aus. Vorschlag: Ist im Portal genau ein Standort gefiltert und hat die Firma mehrere, steht dessen voller Name im Kopf. Sonst steht der Firmenname. Bitte bei der Architektur von PROJ-14 entscheiden.
