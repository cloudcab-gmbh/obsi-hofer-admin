# PROJ-3: Geräte-Verwaltung

## Status: Planned
**Created:** 2026-10-05
**Last Updated:** 2026-10-05

## Dependencies
- Requires: PROJ-1 (Entra-ID-Login mit Rollen) — für eingeloggte Nutzer mit Rolle Bearbeiter/Freigeber
- Requires: PROJ-2 (Dataverse-Web-API-Anbindung) — für Lesen/Schreiben der Gerätedaten

## User Stories
- Als Bearbeiter möchte ich zuerst eine Firma auswählen und danach nur deren Geräte sehen, damit ich nicht durch die Geräte aller Kunden suchen muss.
- Als Bearbeiter möchte ich innerhalb einer Firma nach Gerätename/Barcode/Seriennummer suchen und nach Lagerort filtern können, damit ich ein bestimmtes Gerät schnell finde.
- Als Bearbeiter möchte ich die Stammdaten eines Geräts (Name, Barcode, Seriennummer, Lagerort, Bemerkungen, Zubehör, Herstelljahr, Erstgebrauch, Ablegereife) bearbeiten können, damit die Daten korrekt und aktuell bleiben.
- Als Bearbeiter möchte ich den aktuellen Prüfstatus eines Geräts einsehen können, auch wenn ich ihn hier nicht ändern kann, damit ich weiss, ob eine Prüfung ansteht.
- Als Freigeber möchte ich dieselben Geräte-Verwaltungsfunktionen nutzen können wie ein Bearbeiter, da sich die Rollen hier nicht unterscheiden.

## Out of Scope
- **Neuanlage neuer Geräte** — bewusste Abweichung vom ursprünglichen PRD-Eintrag, siehe Product Decisions; neue Geräte entstehen weiterhin direkt in Dataverse/Dynamics
- Löschen von Geräten — konsistent mit der PRD-Philosophie, keine Fachdaten echt zu löschen; "Ablegereife" dient bereits als Marker für ausser Betrieb genommene Geräte
- Bearbeitung der Prüfungs-Felder (letzte Prüfung, Betriebsmittelstatus, Prüfer) — gehört exklusiv zu PROJ-4 (Prüfberichte-Verwaltung), hier nur read-only angezeigt
- Ändern der Artikel-Verknüpfung eines Geräts — bei Anlage (ausserhalb dieses Tools) einmalig gesetzt, danach fix
- Ändern der Firma-Zuordnung eines Geräts — ebenfalls fix nach Anlage
- Konfliktschutz bei gleichzeitiger Bearbeitung (optimistic locking) — bewusst nicht, Last-Write-Wins; konsistent mit PROJ-2 Product Decisions
- Datums-Plausibilitätsprüfung (z.B. Ablegereife muss nach Erstgebrauch liegen) — bewusst nicht für den ersten Wurf
- Pagination/"Mehr laden" in der Geräteliste — bei erwarteter Firmengrösse (wenige Dutzend bis ~200 Geräte) nicht nötig; PROJ-2s Paging-Mechanismus bleibt vorerst ungenutzt
- Bulk-Bearbeitung mehrerer Geräte gleichzeitig
- Bearbeitung von Artikel-Stammdaten selbst — bleiben read-only (PRD Non-Goal)

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

- [ ] Angenommen ein Bearbeiter oder Freigeber öffnet PROJ-3, wenn die Seite lädt, dann wird zuerst eine Firma-Auswahl angezeigt, bevor irgendwelche Geräte geladen werden
- [ ] Angenommen eine Firma wurde ausgewählt, wenn die Geräteliste lädt, dann werden ausschliesslich Geräte dieser Firma angezeigt
- [ ] Angenommen eine Firma mit Geräten ist ausgewählt, wenn der Nutzer einen Suchbegriff eingibt, der zu Gerätename/Barcode/Seriennummer passt, dann werden nur die passenden Geräte angezeigt
- [ ] Angenommen eine Firma mit Geräten ist ausgewählt, wenn der Nutzer einen Lagerort-Filter wählt, dann werden nur Geräte an diesem Lagerort angezeigt
- [ ] Angenommen eine ausgewählte Firma hat keine Geräte, wenn die Liste geladen wird, dann wird ein klarer Hinweis ("Keine Geräte gefunden") statt einer leeren Fläche angezeigt
- [ ] Angenommen ein Bearbeiter öffnet ein Gerät, wenn die Detailansicht lädt, dann werden alle Stammdaten sowie die Prüfungs-Felder (read-only) angezeigt
- [ ] Angenommen ein Bearbeiter ändert ein oder mehrere Stammdatenfelder und das Gerätename-Feld ist nicht leer, wenn er speichert, dann werden die Änderungen in Dataverse übernommen
- [ ] Angenommen ein Bearbeiter leert das Gerätename-Feld, wenn er speichern will, dann wird eine Validierungsfehlermeldung angezeigt und nicht gespeichert
- [ ] Angenommen Dataverse ist beim Speichern nicht erreichbar, wenn der Bearbeiter speichert, dann wird eine verständliche Fehlermeldung angezeigt und die eingegebenen Änderungen bleiben im Formular erhalten
- [ ] Angenommen ein Bearbeiter betrachtet das Bearbeitungsformular, wenn er die Artikel-Verknüpfung oder Firma-Zuordnung ändern möchte, dann sind diese Felder nicht editierbar (read-only/ausgegraut)

## Edge Cases
- Zwei Bearbeiter öffnen und speichern dasselbe Gerät gleichzeitig → Last-Write-Wins, keine Warnung (siehe Product Decisions)
- Ein Gerät wird von einem anderen Prozess (z.B. Dataverse-Sync oder PROJ-4) geändert, während ein Bearbeiter es gerade offen hat → beim Speichern wird einfach überschrieben (kein Konfliktschutz, s.o.)
- Firma hat sehr viele Geräte (~200) → komplette Liste wird geladen, keine Pagination nötig (siehe Open Questions für den Fall, dass sich das ändert)
- Nutzer navigiert direkt zu einem Gerät (z.B. über ein altes Lesezeichen), ohne vorher eine Firma gewählt zu haben → siehe Open Questions
- Firma-Dropdown bei vielen Firmen → durchsuchbare Auswahl (Combobox) statt einfacher Dropdown-Liste

## Technical Requirements (optional)
- Alle Lese-/Schreibzugriffe laufen über die generischen Funktionen aus PROJ-2 (`getRecord`, `listRecords`, `updateRecord`)
- Zugriff nur für eingeloggte Nutzer mit Rolle Bearbeiter oder Freigeber (PROJ-1)

## Open Questions
- [ ] Was passiert, wenn jemand direkt zu einer Geräte-Detailseite navigiert (z.B. per Lesezeichen), ohne vorher eine Firma gewählt zu haben? Technische Entscheidung, wird in `/architecture` geklärt
- [ ] Falls sich die Annahme "wenige Dutzend bis ~200 Geräte pro Firma" als falsch herausstellt, muss Pagination nachgerüstet werden — PROJ-2 unterstützt das bereits (Paging-Cursor), die UI müsste dann ergänzt werden

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Keine Neuanlage von Geräten in PROJ-3 (Abweichung vom ursprünglichen PRD-Eintrag) | Neue Geräte entstehen weiterhin ausserhalb des Tools, direkt in Dataverse/Dynamics; PROJ-3 deckt das Tagesgeschäft (Stammdaten/Status pflegen) ab | 2026-10-05 |
| Prüfungs-Felder (letzte Prüfung, Status, Prüfer) sind in PROJ-3 nur lesend | Sauberer Schnitt nach Single Responsibility: diese Felder werden ausschliesslich über das Anlegen eines Prüfberichts in PROJ-4 gesetzt, analog zum (dort allerdings vermischten) Verhalten der bestehenden Power App | 2026-10-05 |
| Artikel-Verknüpfung und Firma-Zuordnung sind nach Anlage unveränderlich | Verhindert versehentliches Verschieben von Geräten zwischen Kunden oder Austauschen der Artikel-Referenz | 2026-10-05 |
| Pflicht: Firma zuerst auswählen, bevor Geräte geladen werden | Dieses Tool zeigt (anders als das Kundenportal) Geräte über alle Firmen hinweg — ohne Firma-Zwang müsste eine unübersichtlich grosse Gesamtliste geladen werden | 2026-10-05 |
| Volltextsuche + Lagerort-Filter innerhalb der Firma | Übernommen aus der bewährten Legacy-App-UX, ohne deren Status-Tabs (da Status hier nur read-only ist) | 2026-10-05 |
| Nur Gerätename ist Pflichtfeld, keine Datums-Plausibilitätsprüfung | Einfachheit für den ersten Wurf, entspricht dem bisherigen freien Umgang in der Legacy-App | 2026-10-05 |
| Last-Write-Wins bei gleichzeitiger Bearbeitung, kein Konfliktschutz | Konsistent mit der PROJ-2-Entscheidung; bei wenigen gleichzeitigen internen Nutzern ein unwahrscheinliches Szenario | 2026-10-05 |
| Keine Pagination in der Geräteliste | Erwartete Firmengrösse (wenige Dutzend bis ~200 Geräte) macht das Laden der kompletten Liste praktikabel | 2026-10-05 |
| Kein Löschen von Geräten | Konsistent mit der PRD-Philosophie, keine Fachdaten echt zu löschen; Ablegereife dient bereits als "ausser Betrieb"-Marker | 2026-10-05 |
| Bearbeiter und Freigeber werden bei der Geräte-Verwaltung gleich behandelt | Die Rollenunterscheidung aus dem PRD betrifft nur die Sync-Freigabe (PROJ-5), nicht die Datenpflege | 2026-10-05 |

### Technical Decisions
<!-- Added by /architecture -->
| Decision | Rationale | Date |
|----------|-----------|------|

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
