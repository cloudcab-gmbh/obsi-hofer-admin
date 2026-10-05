# PROJ-4: Prüfberichte-Verwaltung

## Status: Planned
**Created:** 2026-10-05
**Last Updated:** 2026-10-05

## Dependencies
- Requires: PROJ-1 (Entra-ID-Login mit Rollen) — für eingeloggte Nutzer mit Rolle Bearbeiter/Freigeber
- Requires: PROJ-2 (Dataverse-Web-API-Anbindung) — für Lesen/Schreiben der Prüfbericht- und Gerätedaten
- Requires: PROJ-3 (Geräte-Verwaltung) — ein Prüfbericht gehört immer zu einem Gerät; nutzt dieselbe Firma-Session (`src/lib/firma-session.ts`)

## User Stories
- Als Bearbeiter möchte ich für ein Gerät einen neuen Prüfbericht erfassen können, damit der aktuelle Prüfstatus dokumentiert ist.
- Als Bearbeiter möchte ich die Prüfhistorie eines Geräts einsehen können, damit ich nachvollziehen kann, wann und mit welchem Ergebnis zuletzt geprüft wurde.
- Als Bearbeiter möchte ich einen bestehenden Prüfbericht bearbeiten können (z.B. Tippfehler korrigieren), ohne dafür einen neuen anlegen zu müssen.
- Als Bearbeiter möchte ich einen fehlerhaften Prüfbericht stornieren können, ohne ihn unwiederbringlich zu löschen.
- Als Bearbeiter möchte ich firmenweit alle Prüfberichte einsehen und nach Gerät/Ergebnis filtern können, damit ich einen Überblick habe, nicht nur gerätebezogen.
- Als Freigeber möchte ich dieselben Pflege-Funktionen nutzen können wie ein Bearbeiter, da sich die Rollen hier nicht unterscheiden.

## Out of Scope
- Neuanlage/Bearbeitung von Geräten selbst — bleibt PROJ-3; ein Prüfbericht referenziert nur ein bestehendes Gerät (fix, nicht änderbar)
- Echtes Löschen von Prüfberichten — bewusst nicht, siehe PRD Non-Goal; Stornieren ersetzt das
- Reaktivierung stornierter Prüfberichte — Stornieren ist endgültig, siehe Product Decisions
- Bearbeitung eines stornierten Prüfberichts (auch Bemerkungen) — komplett read-only nach dem Stornieren
- Manuelle Eingabe/Änderung des Prüfer-Felds — automatisch aus dem eingeloggten Nutzer abgeleitet (derselbe Kürzel-Algorithmus wie die Legacy-Power-App)
- Einschränkung des Prüfdatums auf Vergangenheit/Gegenwart — frei wählbar, auch rückwirkende Erfassung
- Zusätzliche Berechtigungsstufe fürs Stornieren — Bearbeiter und Freigeber gleichbehandelt, wie der Rest von PROJ-4
- Pagination in der `/pruefberichte`-Übersicht — analog PROJ-3 vorerst nicht nötig (gleiche Firmengrössen-Annahme)
- Konfliktschutz bei gleichzeitiger Bearbeitung (optimistic locking) — Last-Write-Wins, konsistent mit PROJ-2/PROJ-3

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

- [ ] Angenommen ein Bearbeiter öffnet ein Gerät (PROJ-3), wenn die Detailseite lädt, dann wird zusätzlich die Prüfbericht-Historie dieses Geräts angezeigt (neueste zuerst, stornierte standardmässig ausgeblendet)
- [ ] Angenommen ein Gerät hat noch keinen Prüfbericht, wenn die Historie lädt, dann wird ein klarer Leer-Hinweis statt einer leeren Tabelle angezeigt
- [ ] Angenommen ein Bearbeiter legt einen neuen Prüfbericht für ein Gerät an und gibt Prüfdatum und Ergebnis ein, wenn er speichert, dann wird der Prüfbericht angelegt und die Status-Felder des Geräts (letzte Prüfung, Betriebsmittelstatus, Prüfer) werden automatisch aktualisiert
- [ ] Angenommen ein Bearbeiter öffnet das Formular für einen neuen Prüfbericht, wenn es lädt, dann ist das Prüfdatum mit dem heutigen Datum vorausgefüllt und das Prüfer-Feld zeigt automatisch die aus dem eingeloggten Namen abgeleiteten Initialen (read-only)
- [ ] Angenommen ein Bearbeiter lässt Prüfdatum oder Ergebnis leer, wenn er speichern will, dann wird eine Validierungsfehlermeldung angezeigt und nicht gespeichert
- [ ] Angenommen ein Bearbeiter bearbeitet den aktuellsten (nicht stornierten) Prüfbericht eines Geräts, wenn er speichert, dann werden auch die Status-Felder des Geräts entsprechend aktualisiert
- [ ] Angenommen ein Bearbeiter bearbeitet einen Prüfbericht, der nicht der aktuellste für sein Gerät ist, wenn er speichert, dann bleiben die Status-Felder des Geräts unverändert
- [ ] Angenommen ein Bearbeiter storniert den aktuellsten aktiven Prüfbericht eines Geräts, wenn die Stornierung gespeichert wird, dann werden die Status-Felder des Geräts auf den nächstälteren aktiven Prüfbericht zurückgesetzt (oder geleert, falls keiner existiert)
- [ ] Angenommen ein Bearbeiter storniert einen Prüfbericht, der nicht der aktuellste ist, wenn die Stornierung gespeichert wird, dann bleiben die Status-Felder des Geräts unverändert
- [ ] Angenommen ein Prüfbericht ist storniert, wenn ein Bearbeiter ihn öffnet, dann sind alle Felder read-only und es gibt keine Möglichkeit, ihn zu reaktivieren
- [ ] Angenommen keine Firma ist in der Session ausgewählt, wenn ein Bearbeiter `/pruefberichte` öffnet, dann erscheint derselbe Hinweis wie bei `/geraete` mit Link zu `/start`
- [ ] Angenommen eine Firma ist ausgewählt, wenn `/pruefberichte` lädt, dann werden alle nicht stornierten Prüfberichte der Geräte dieser Firma angezeigt, mit Suche nach Gerät und Filter nach Ergebnis
- [ ] Angenommen Dataverse ist beim Speichern nicht erreichbar, wenn der Bearbeiter speichert, dann wird eine verständliche Fehlermeldung angezeigt und die Eingaben bleiben im Formular erhalten

## Edge Cases
- Gerät hat noch keinen Prüfbericht → Historie zeigt einen Leer-Hinweis statt einer leeren Tabelle
- Alle Prüfberichte eines Geräts sind storniert → Gerät-Status-Felder bleiben auf dem zuletzt gültigen Stand bzw. leer (siehe Product Decisions); Historie zeigt "Keine aktiven Prüfberichte" mit einer Option, auch stornierte anzuzeigen
- Zwei Prüfberichte eines Geräts mit demselben Prüfdatum → "aktuellster" muss zusätzlich eindeutig bestimmbar sein, damit die Kaskadenlogik deterministisch bleibt (technische Entscheidung, siehe Open Questions)
- Gleichzeitige Bearbeitung/Stornierung desselben Prüfberichts durch zwei Nutzer → Last-Write-Wins, konsistent mit PROJ-2/PROJ-3
- Eingeloggter Name enthält kein durch Leerzeichen getrenntes zweites Wort (z.B. nur ein Vorname) → Fallback bei der Prüfer-Kürzel-Berechnung nötig (technische Entscheidung, siehe Open Questions)

## Technical Requirements (optional)
- Alle Lese-/Schreibzugriffe laufen über die generischen Funktionen aus PROJ-2 (`getRecord`, `listRecords`, `createRecord`, `updateRecord`)
- Zugriff nur für eingeloggte Nutzer mit Rolle Bearbeiter oder Freigeber (PROJ-1)
- Prüfer-Kürzel wird aus `session.user.name` abgeleitet, exakt nach demselben Algorithmus wie die bestehende Power App (siehe Product Decisions)

## Open Questions
- [ ] Exakte Tie-Breaking-Regel, wenn zwei Prüfberichte eines Geräts dasselbe Prüfdatum haben (z.B. nach Erstellungszeitpunkt oder Datensatz-ID) — wird in `/architecture` festgelegt
- [ ] Fallback-Verhalten der Prüfer-Kürzel-Berechnung bei ungewöhnlichen Namen (nur ein Wort, mehrere Nachnamen) — wird in `/architecture` festgelegt

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Zugriff sowohl über die Gerät-Detailseite (Historie + neuer Bericht) als auch über eine eigenständige, firmenweite `/pruefberichte`-Übersicht | Deckt beide Arbeitsweisen ab: gerätebezogen prüfen und firmenweiten Überblick behalten; nutzt den bereits bestehenden Header-Link | 2026-10-05 |
| Neuanlage eines Prüfberichts aktualisiert automatisch die Status-Felder des Geräts (letzte Prüfung, Betriebsmittelstatus, Prüfer) | Ein neuer Bericht ist immer der aktuellste; entspricht der Kaskade der Legacy-Power-App und der Grundannahme aus PROJ-3 (Status-Felder dort bewusst read-only) | 2026-10-05 |
| Bearbeiten aktualisiert die Gerät-Status-Felder nur, wenn der bearbeitete Bericht der aktuellste (nicht stornierte) für sein Gerät ist | Verhindert, dass eine Korrektur an einem alten Bericht versehentlich den aktuell angezeigten Gerätestatus überschreibt | 2026-10-05 |
| Prüfer-Feld automatisch aus dem eingeloggten Namen abgeleitet (Kürzel-Algorithmus 1:1 aus der Legacy-App übernommen: erste 2 Buchstaben Vorname + erste 2 Buchstaben nach dem ersten Leerzeichen, beides klein), nicht editierbar | Konsistenz mit bereits in Dataverse vorhandenen historischen Prüfer-Kürzeln; verhindert Falschzuordnung | 2026-10-05 |
| Stornieren für Bearbeiter und Freigeber gleichermassen möglich (keine zusätzliche Berechtigungsstufe) | Konsistent mit PROJ-3s Grundsatz, dass sich die beiden Rollen bei der Datenpflege nicht unterscheiden (nur Sync-Freigabe ist Freigeber-exklusiv) | 2026-10-05 |
| Storniert = endgültig, keine Reaktivierung; stornierter Bericht ist komplett read-only (auch Bemerkungen) | Einfache, klare Regel; bei einem Fehler wird stattdessen ein neuer, korrekter Bericht angelegt statt den alten wiederzubeleben | 2026-10-05 |
| Stornieren des aktuellsten aktiven Berichts setzt die Gerät-Status-Felder auf den nächstälteren aktiven Bericht zurück (oder leert sie, falls keiner existiert) | Verhindert, dass das Gerät nach einer Stornierung einen ungültigen (stornierten) Stand weiterhin anzeigt | 2026-10-05 |
| Ergebnis-Werte 1:1 aus der Legacy-App übernommen ("Freigabe"/"keine Freigabe"/"letzte Freigabe") | Bestehende Badge-Farben (`status-badge.ts`) und Dataverse-Spalte (`bmvcc_inspectionresult`) bereits vorhanden/kompatibel | 2026-10-05 |
| Prüfdatum frei wählbar (auch rückwirkend), Vorschlagswert = heute, keine Zukunfts-Einschränkung | Erlaubt nachträgliches Erfassen vergangener Prüfungen, ohne künstliche Hürden | 2026-10-05 |
| Stornierte Prüfberichte standardmässig in Listen ausgeblendet, über einen Filter einblendbar | Hält Historie/Übersicht auf das Relevante fokussiert, ohne Nachvollziehbarkeit zu verlieren | 2026-10-05 |
| `/pruefberichte`-Übersicht mit Suche nach Gerät + Filter nach Ergebnis, sortiert nach Prüfdatum absteigend | Analog zur bewährten PROJ-3-Geräteliste-UX | 2026-10-05 |

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
