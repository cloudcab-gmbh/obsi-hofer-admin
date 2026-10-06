# PROJ-5: Sync-Freigabe pro Firma

## Status: Planned
**Created:** 2026-10-06
**Last Updated:** 2026-10-06

## Dependencies
- Requires: PROJ-1 (Entra-ID-Login mit Rollen) — nur Freigeber dürfen den Sync auslösen
- Requires: PROJ-2 (Dataverse-Web-API-Anbindung) — u.a. für die Anzeige der freigegebenen Kontakte im Bestätigungsdialog
- Requires: PROJ-8 (Kundenportal-Zugang pro Kontakt) — ein Sync ist erst möglich, wenn mindestens ein Kontakt der Firma freigegeben ist; beide Features teilen sich die Seite `/sync-freigabe`
- Nutzt die globale Firma-Session aus PROJ-3 (`firma-session.ts`)
- **Cross-Repo-Abhängigkeit (Voraussetzung):** Der bestehende Endpoint `/api/cron/sync-dataverse` im Kundenportal-Repo muss um einen Firma-Filter erweitert werden (synct heute global) und künftig nur Kontakte mit gesetztem Freigabe-Häkchen als Portal-Benutzer übernehmen (siehe PROJ-8). Artikel werden bei jeder Firma-Freigabe mitsynchronisiert (PRD). Der nächtliche Cron (`vercel.json`, 03:00 Uhr) im Kundenportal-Repo entfällt
- Wird vorausgesetzt von: PROJ-6 (Sync-Status/-Verlauf einsehen)

## User Stories
- Als Freigeber möchte ich den Sync ins Kundenportal gezielt für die aktuell gewählte Firma auslösen, damit Kunden die Daten genau dann sehen, wenn ich sie für fertig bearbeitet halte.
- Als Freigeber möchte ich vor dem Auslösen eine Zusammenfassung bestätigen (Firma, Anzahl freigegebener Kontakte), damit ich nicht versehentlich die falsche Firma oder unfertige Daten übertrage.
- Als Freigeber möchte ich nach dem Auslösen sehen, ob der Sync erfolgreich war, damit ich bei einem Fehler reagieren kann.
- Als Freigeber möchte ich daran gehindert werden, eine Firma ohne freigegebene Kontakte zu synchronisieren, damit keine Daten im Portal landen, die niemand sehen kann.
- Als Bearbeiter möchte ich diese Funktion nicht sehen, da die Freigabe gegenüber dem Kunden dem Freigeber vorbehalten ist.

## Out of Scope
- Kontakte fürs Kundenportal freigeben/entziehen — PROJ-8 (gleiche Seite, eigenes Feature)
- Verlauf/Status vergangener Sync-Läufe (letzter Lauf pro Firma, Erfolg/Fehler, Zeitpunkt) — PROJ-6
- Sync mehrerer oder aller Firmen auf einmal — immer genau die aktuell gewählte Firma
- Automatische oder zeitgesteuerte Syncs — PRD-Non-Goal, nur manuell per Freigabe
- Teil-Sync (nur bestimmte Geräte/Prüfberichte einer Firma) — es wird immer die ganze Firma übertragen (plus Artikel)
- Abbrechen eines laufenden Syncs
- Eigene Sync-Logik im Admin-Tool — es wird ausschliesslich der bestehende Endpoint des Kundenportals aufgerufen (PRD-Constraint)
- Benachrichtigung der Kunden über neue Daten — Sache des Kundenportals

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

- [ ] Angenommen ein Freigeber hat eine Firma gewählt und mindestens ein aktiver Kontakt dieser Firma ist fürs Kundenportal freigegeben, wenn er `/sync-freigabe` öffnet, dann sieht er unterhalb der Kontaktliste (PROJ-8) einen aktiven Button "Freigeben & synchronisieren"
- [ ] Angenommen kein aktiver Kontakt der gewählten Firma ist freigegeben, wenn die Seite lädt, dann ist der Sync-Button deaktiviert und ein Hinweis "Zuerst mindestens einen Kontakt fürs Kundenportal freigeben" wird angezeigt
- [ ] Angenommen der Freigeber gibt auf derselben Seite den ersten Kontakt frei, wenn die Freigabe gespeichert ist, dann wird der Sync-Button ohne Neuladen der Seite aktiv
- [ ] Angenommen der Sync-Button ist aktiv, wenn der Freigeber darauf klickt, dann erscheint ein Bestätigungsdialog mit dem Firmennamen und der Anzahl freigegebener Kontakte, und der Sync startet erst nach Bestätigung
- [ ] Angenommen der Bestätigungsdialog ist offen, wenn der Freigeber abbricht, dann wird kein Sync ausgelöst
- [ ] Angenommen der Freigeber bestätigt, wenn der Sync läuft, dann zeigt der Button "Synchronisiere…", ist gesperrt, und ein erneutes Auslösen ist bis zur Antwort nicht möglich
- [ ] Angenommen der Kundenportal-Endpoint meldet Erfolg, wenn der Sync abgeschlossen ist, dann erscheint eine Erfolgsmeldung mit dem Firmennamen (und der Anzahl übertragener Datensätze, sofern der Endpoint sie liefert)
- [ ] Angenommen der Kundenportal-Endpoint meldet einen Fehler oder ist nicht erreichbar, wenn der Sync ausgelöst wurde, dann erscheint eine verständliche Fehlermeldung und der Button ist wieder aktiv
- [ ] Angenommen der Sync wird ausgelöst, wenn der Endpoint aufgerufen wird, dann werden ausschliesslich die Daten der gewählten Firma (plus Artikel) synchronisiert, nicht die anderer Firmen
- [ ] Angenommen ein Benutzer hat nur die Rolle "Bearbeiter", wenn er `/sync-freigabe` direkt aufruft oder den Sync über einen nachgebauten Request auslösen will, dann wird der Zugriff serverseitig verweigert
- [ ] Angenommen keine Firma ist in der Session gewählt, wenn ein Freigeber `/sync-freigabe` öffnet, dann erscheint derselbe Hinweis mit Link zu `/start` wie bei `/geraete` (kein Sync-Button)

## Edge Cases
- Sync dauert länger als die maximale Laufzeit einer Server-Anfrage → verständliche Meldung, dass das Ergebnis unbekannt ist (der Sync kann trotzdem im Hintergrund durchgelaufen sein), statt einer technischen Timeout-Fehlermeldung; Kontrolle später über PROJ-6
- Zwei Freigeber lösen den Sync für dieselbe Firma fast gleichzeitig aus → wird im Admin-Tool nicht verhindert; das Verhalten des Endpoints bei parallelen Läufen ist offen (siehe Open Questions)
- Firmenwechsel während ein Sync läuft → der laufende Sync betrifft weiterhin die ursprünglich bestätigte Firma; die Ergebnismeldung nennt diese Firma
- Kontakt-Freigabe wird zwischen Seitenaufruf und Bestätigung (z.B. in einem anderen Tab) entzogen, sodass kein Kontakt mehr freigegeben ist → die Voraussetzung wird beim Auslösen serverseitig erneut geprüft, der Sync wird dann abgelehnt
- Endpoint-Zugangsdaten (Secret/URL) fehlen oder sind falsch konfiguriert → verständliche Fehlermeldung ("Sync ist nicht konfiguriert"), keine technischen Details zu Secrets in der Oberfläche
- Kundenportal-Endpoint unterstützt den Firma-Filter noch nicht (Cross-Repo-Erweiterung nicht ausgerollt) → darf auf keinen Fall versehentlich einen globalen Sync aller Firmen auslösen (siehe Open Questions)
- Firma hat keine Geräte/Prüfberichte → Sync ist trotzdem erlaubt (überträgt dann nur Firma, Kontakte und Artikel)

## Technical Requirements (optional)
- Security: Auslösen ausschliesslich für Benutzer mit Rolle "Freigeber", serverseitig durchgesetzt; das Endpoint-Secret (`KUNDENPORTAL_CRON_SECRET`) verlässt nie den Server
- Konfiguration über die bereits dokumentierten Umgebungsvariablen `KUNDENPORTAL_SYNC_URL` und `KUNDENPORTAL_CRON_SECRET`
- Performance: abhängig vom Kundenportal-Endpoint; die Oberfläche muss während der gesamten Laufzeit einen klaren Ladezustand zeigen

## Open Questions
- [ ] Schnittstelle des erweiterten Kundenportal-Endpoints: Wie wird die Firma übergeben (Parameter/Format), und was liefert die Antwort (Erfolg/Fehler, Anzahl übertragener Datensätze)? — wird im Kundenportal-Repo festgelegt
- [ ] Wie lange dauert ein Sync einer typischen/grossen Firma? Passt das in die maximale Laufzeit einer Server-Anfrage auf Vercel, oder muss der Endpoint asynchron arbeiten?
- [ ] Wie verhält sich der Endpoint, wenn er ohne bzw. mit unbekanntem Firma-Filter aufgerufen wird? (Muss sicherstellen, dass nie versehentlich global synchronisiert wird)
- [ ] Ist der Endpoint gegen zwei parallele Läufe für dieselbe Firma robust (idempotent)?

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Sync wird immer für die aktuell gewählte Session-Firma ausgelöst, keine Firmenliste auf der Seite | Konsistent mit Geräte/Prüfberichte; Firmenwechsel wie gewohnt über `/start` | 2026-10-06 |
| Sync ist gesperrt, solange kein aktiver Kontakt der Firma fürs Kundenportal freigegeben ist | Verhindert, dass Daten im Portal landen, die niemand sehen kann; erzwingt die vom Nutzer gewünschte Reihenfolge "erst Kontakte freigeben, dann synchronisieren" | 2026-10-06 |
| Bestätigungsdialog mit Zusammenfassung (Firma, Anzahl freigegebener Kontakte) vor dem Auslösen | Nach dem Sync sehen Kunden die Daten — Schutz vor versehentlichem Klick oder falscher Firma | 2026-10-06 |
| Oberfläche wartet auf das Ergebnis des Endpoints und zeigt Erfolg/Fehler direkt an | Freigeber bekommt sofort Gewissheit; ein dauerhafter Verlauf bleibt PROJ-6 vorbehalten | 2026-10-06 |
| Kontakt-Freigabe (PROJ-8) und Sync-Auslösung (PROJ-5) auf derselben Seite `/sync-freigabe` | Ein zusammenhängender Arbeitsablauf für den Freigeber; der Menüpunkt existiert bereits (PROJ-1) | 2026-10-06 |
| Parallele Syncs derselben Firma durch verschiedene Freigeber werden im Admin-Tool nicht verhindert, nur die Mehrfachauslösung durch denselben Benutzer | Seltener Fall bei wenigen Freigebern; Robustheit ist Sache des Endpoints (Open Question) | 2026-10-06 |

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
