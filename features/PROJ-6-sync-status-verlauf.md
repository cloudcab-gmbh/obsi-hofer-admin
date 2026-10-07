# PROJ-6: Sync-Status/-Verlauf einsehen

## Status: Planned
**Created:** 2026-10-07
**Last Updated:** 2026-10-07

## Dependencies
- Requires: PROJ-5 (Sync-Freigabe pro Firma) — jeder dort ausgelöste Sync wird hier protokolliert und angezeigt
- Requires: PROJ-1 (Entra-ID-Login mit Rollen) — Anzeige nur für Freigeber, "ausgelöst von" aus dem eingeloggten Benutzer
- Requires: PROJ-2 (Dataverse-Web-API-Anbindung) — Speichern und Lesen der Sync-Läufe
- **Dataverse-Voraussetzung:** eine neue Tabelle für Sync-Läufe muss in Dataverse angelegt werden (vom Nutzer im Power-Platform-Maker; Struktur legt `/architecture` fest), und der App-Benutzer "# OBSI Hofer Admin" braucht darauf Erstellen + Lesen (+ Anfügen für die Firma-Verknüpfung)

## Ausgangslage (geprüft 2026-10-07)
- Das Kundenportal protokolliert Sync-Läufe nirgends (keine Tabelle, nur Betriebs-E-Mails bei Problemen) — der Verlauf entsteht neu
- Das Admin-Tool hat laut PRD keine eigene Datenbank → Speicherort ist Dataverse
- Seit PROJ-5 und dem Wegfall des nächtlichen Crons ist das Admin-Tool der einzige Auslöser des Syncs

## User Stories
- Als Freigeber möchte ich auf der Freigabe-Seite sehen, wann die gewählte Firma zuletzt ins Kundenportal übertragen wurde und mit welchem Ergebnis, damit ich weiss, ob die Kunden aktuelle Daten sehen.
- Als Freigeber möchte ich den Verlauf aller bisherigen Syncs einer Firma sehen, damit ich nachvollziehen kann, wann und von wem Daten freigegeben wurden.
- Als Freigeber möchte ich bei einem Lauf die Details (übertragene Zahlen, gemeldete Probleme) aufklappen können, damit ich Fehler auch später noch analysieren kann.
- Als Freigeber möchte ich bei einem Lauf mit "Ergebnis unbekannt" (Zeitüberschreitung) später nachsehen können, was protokolliert wurde, statt im Ungewissen zu bleiben.

## Out of Scope
- Firmenübergreifende Übersicht aller Läufe bzw. "welche Firma wurde wie lange nicht synchronisiert" — bewusst nicht, Anzeige nur für die gewählte Firma
- Anzeige für Bearbeiter (z.B. Hinweis in der Geräteliste) — nur Freigeber
- Protokollieren von Ablehnungen vor dem Aufruf (z.B. kein Kontakt freigegeben, Sync nicht aktiviert) — dabei wird nichts übertragen
- Nachträgliches Aktualisieren eines Laufs mit Ergebnis "unbekannt", falls der Sync im Hintergrund doch erfolgreich war — das Kundenportal liefert diese Information nicht
- Erneut-Auslösen eines Syncs direkt aus dem Verlauf — der Sync wird immer über den Button aus PROJ-5 ausgelöst
- Löschen oder Bearbeiten von Verlaufseinträgen in der Oberfläche
- Nachtragen früherer Läufe (z.B. des ungewollten Gesamt-Syncs vom 2026-10-07 oder der früheren nächtlichen Cron-Läufe) — der Verlauf beginnt mit dem Deploy dieses Features
- Export des Verlaufs

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

- [ ] Angenommen ein Freigeber löst einen Sync aus (PROJ-5), wenn der Kundenportal-Endpoint aufgerufen wurde, dann wird ein Verlaufseintrag mit Firma, Zeitpunkt, ausgelöst von (Name des Freigebers), Ergebnis (Erfolg / mit Problemen / fehlgeschlagen / unbekannt), Zahlen je Bereich und gemeldeten Problemen gespeichert — unabhängig vom Ergebnis
- [ ] Angenommen der Sync wird schon im Admin-Tool abgelehnt (z.B. kein Kontakt freigegeben), wenn der Freigeber auslösen will, dann wird kein Verlaufseintrag angelegt
- [ ] Angenommen eine Firma ist gewählt, wenn ein Freigeber die Freigabe-Seite öffnet, dann sieht er unter dem Sync-Bereich den letzten Lauf dieser Firma (Zeitpunkt, Ergebnis) hervorgehoben und darunter den Verlauf, neueste zuerst
- [ ] Angenommen die Firma hat mehr als 20 Läufe, wenn der Verlauf lädt, dann werden die neuesten 20 angezeigt und ältere lassen sich über "Mehr anzeigen" nachladen
- [ ] Angenommen ein Verlaufseintrag wird angezeigt, wenn der Freigeber ihn aufklappt, dann sieht er die Zahlentabelle (Geladen/Neu/Abgeglichen/Gelöscht je Bereich) und die gemeldeten Probleme, in derselben Darstellung wie direkt nach dem Sync
- [ ] Angenommen das Ergebnis eines Laufs ist "Erfolg", "mit Problemen", "fehlgeschlagen" oder "unbekannt", wenn er im Verlauf angezeigt wird, dann ist das Ergebnis farblich wie in PROJ-5 unterscheidbar (grün / orange / rot / orange)
- [ ] Angenommen ein Freigeber hat gerade einen Sync ausgelöst, wenn das Ergebnis da ist, dann erscheint der neue Lauf ohne Neuladen der Seite oben im Verlauf
- [ ] Angenommen die Firma wurde noch nie über das Admin-Tool synchronisiert, wenn der Verlauf lädt, dann wird ein klarer Hinweis "Noch kein Sync für diese Firma" statt einer leeren Liste angezeigt
- [ ] Angenommen das Speichern des Verlaufseintrags schlägt fehl, wenn der Sync selbst durchgelaufen ist, dann wird das Sync-Ergebnis trotzdem vollständig angezeigt, zusammen mit dem Hinweis, dass der Lauf nicht im Verlauf gespeichert werden konnte
- [ ] Angenommen der Verlauf kann nicht geladen werden (z.B. Dataverse nicht erreichbar), wenn die Freigabe-Seite öffnet, dann bleiben Kontakt-Freigabe und Sync-Button bedienbar und nur der Verlaufsbereich zeigt eine verständliche Fehlermeldung
- [ ] Angenommen ein Benutzer hat nur die Rolle "Bearbeiter", wenn er versucht, den Verlauf abzurufen, dann wird der Zugriff serverseitig verweigert

## Edge Cases
- Sync mit Ergebnis "unbekannt" (Zeitüberschreitung/Verbindungsabbruch) → wird als "unbekannt" protokolliert, ohne Zahlen; bleibt so stehen (kein nachträgliches Aktualisieren)
- Der Aufruf der Server Action selbst bricht ab (z.B. Verbindungsabbruch zwischen Browser und Admin-Tool, veraltete Seite nach einem Deploy) → der Server kann den Lauf trotzdem protokolliert haben; beim Neuladen der Seite erscheint er im Verlauf
- Zwei Freigeber synchronisieren dieselbe Firma fast gleichzeitig → zwei separate Einträge, beide sichtbar
- Ungewollter Gesamt-Sync (Endpoint ohne Firma-Filter, siehe PROJ-5 Live-Vorfall) → Eintrag wird der ausgelösten Firma zugeordnet, Ergebnis "mit Problemen" inklusive des Hinweises auf die übertragenen Firmen
- Sehr viele gemeldete Probleme oder sehr lange Fehlermeldungen → werden vollständig gespeichert bzw. bei Überschreiten der Speichergrenze gekürzt, mit Hinweis "gekürzt"
- Firmenwechsel → Verlauf zeigt die Läufe der neu gewählten Firma (gleiches Verhalten wie Kontakt-Liste, PROJ-8)
- Der auslösende Freigeber verlässt später die Firma OBSI Hofer → der gespeicherte Name bleibt im Verlauf stehen (Momentaufnahme, nicht verknüpft)

## Technical Requirements (optional)
- Security: Lesen des Verlaufs nur für Freigeber, serverseitig durchgesetzt; Schreiben ausschliesslich als Teil des Sync-Vorgangs (kein eigener Schreibzugang von aussen)
- Speicherort: Dataverse (PRD: keine eigene Datenbank)
- Der Verlauf darf das Auslösen des Syncs nicht verzögern oder verhindern

## Open Questions
- [ ] Struktur und Name der neuen Dataverse-Tabelle (Spalten, Lookup auf die Firma, Speichergrenze für Zahlen/Probleme) — festzulegen in `/architecture`, anzulegen durch den Nutzer
- [ ] Aufbewahrungsdauer — vorerst unbegrenzt (wenige Läufe pro Tag zu erwarten); ob später alte Einträge automatisch entfernt werden sollen, ist offen

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Vollständiger Verlauf (jeder Lauf ein Eintrag) statt nur "letzter Lauf" an der Firma | Nachvollziehbarkeit, wann und von wem Daten an Kunden freigegeben wurden; Fehleranalyse auch im Nachhinein | 2026-10-07 |
| Anzeige nur auf der Freigabe-Seite, für die gewählte Firma | Passt zum bestehenden Ablauf (Firma wählen → Kontakte → Sync → Verlauf); firmenübergreifende Übersicht bewusst weggelassen | 2026-10-07 |
| Nur für Freigeber, kein Hinweis für Bearbeiter | Hält den Umfang klein; die Freigabe-Seite ist bereits Freigeber-exklusiv | 2026-10-07 |
| Protokolliert wird jeder tatsächliche Aufruf ans Kundenportal (alle vier Ergebnisse), nicht die Ablehnungen davor | Ein Eintrag soll bedeuten "es wurde etwas ans Portal geschickt"; Ablehnungen übertragen nichts | 2026-10-07 |
| Liste mit aufklappbaren Details; die neuesten 20, ältere über "Mehr anzeigen" | Übersichtlich, Details nur bei Bedarf; gleiche Darstellung wie direkt nach dem Sync (PROJ-5) | 2026-10-07 |
| Speicherort Dataverse (neue Tabelle) | PRD: keine eigene Datenbank; das Kundenportal protokolliert nicht | 2026-10-07 |
| Scheitert das Speichern des Verlaufs, wird das Sync-Ergebnis trotzdem angezeigt (mit Hinweis) | Der Sync ist das Wichtigere; ein fehlender Verlaufseintrag darf den Freigeber nicht über das tatsächliche Ergebnis im Unklaren lassen | 2026-10-07 |
| Ist der Verlauf nicht ladbar, bleibt der Rest der Seite bedienbar | Kontakt-Freigabe und Sync dürfen nicht von der Verlaufsanzeige abhängen | 2026-10-07 |
| "Ausgelöst von" als gespeicherter Name (Momentaufnahme) | Bleibt lesbar, auch wenn ein Benutzer später entfernt wird | 2026-10-07 |
| Verlauf beginnt mit dem Deploy, keine nachgetragenen früheren Läufe | Frühere Läufe (Cron, Vorfall vom 2026-10-07) sind nirgends strukturiert gespeichert | 2026-10-07 |

### Technical Decisions
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
