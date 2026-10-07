# PROJ-6: Sync-Status/-Verlauf einsehen

## Status: Deployed
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
- [x] Struktur und Name der neuen Dataverse-Tabelle — **festgelegt in `/architecture`** (siehe Tech Design B)
- [x] Tabelle "Sync-Lauf" angelegt (Nutzer, 2026-10-07) — **per Metadaten verifiziert:** Tabelle `bmvcc_synclauf`, Entity-Set `bmvcc_synclaufs`; Spalten `bmvcc_name` (Text 200, Primär), `bmvcc_firma` (Lookup → `bmvcc_firma`, Navigationseigenschaft `bmvcc_Firma`), `bmvcc_gestartedam` (Datum+Uhrzeit, UserLocal; Anzeigename mit Tippfehler "Gestarted am"), `bmvcc_dauersekunden` (Ganzzahl), `bmvcc_ausgelostvon` (Text 200), `bmvcc_ergebnis` (Text 20), `bmvcc_meldung` (Text 500), `bmvcc_details` (Memo 100'000)
- [x] Rechte vollständig (verifiziert per RetrieveUserPrivileges, 2026-10-07): Erstellen, Lesen, Anfügen auf Sync-Lauf und "Anfügen an" auf Firma, jeweils Organisation. Ursprünglich fehlte "Anfügen" (prvAppendbmvcc_SyncLauf) — stattdessen wurde dort "Anfügen an" gesetzt (unnötig, harmlos). Ohne "Anfügen" scheitert das Setzen des Firma-Lookups
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
| Neue eigene Dataverse-Tabelle "Sync-Lauf" mit wenigen festen Spalten plus einer mehrzeiligen Spalte "Details" für Zahlen und Probleme | Zahlen je Bereich und Problemlisten sind variabel (Anzahl Bereiche/Probleme); eine Detailspalte hält die Tabelle schlank und das Anlegen im Maker einfach, während Firma/Zeitpunkt/Ergebnis als eigene Spalten filter- und sortierbar bleiben | 2026-10-07 |
| Ergebnis als Text-Spalte mit vier festen Werten statt Auswahl-Spalte (Choice) | Gleiches Muster wie das Prüfergebnis (`bmvcc_inspectionresult`, String); keine numerischen Choice-Codes, die im Maker vergeben und im Code nachgeführt werden müssten | 2026-10-07 |
| Eigene Spalte "Gestartet am" statt des Systemfelds "Erstellt am" | Der Eintrag wird erst nach dem Sync geschrieben; der fachlich relevante Zeitpunkt ist der Start | 2026-10-07 |
| Eigene Spalte "Dauer (Sekunden)" | Beantwortet nebenbei die offene PROJ-5-Frage nach der realen Laufzeit eines Firma-Syncs | 2026-10-07 |
| Der Eintrag wird in derselben Server Action geschrieben, die den Sync auslöst — direkt nach der Antwort des Kundenportals, in einem eigenen Fehlerpfad | Erfasst jeden Aufruf genau einmal, unabhängig davon, ob der Browser die Antwort noch empfängt (Edge Case Verbindungsabbruch); ein Fehler beim Schreiben darf das Sync-Ergebnis nicht verdecken | 2026-10-07 |
| "Mehr anzeigen" lädt die nächsten 20 Läufe, die älter sind als der zuletzt angezeigte (Startzeitpunkt) | Einfache, stabile Fortsetzung ohne Seitennummern; neue Läufe oben verschieben die Liste nicht | 2026-10-07 |
| Lesen des Verlaufs über die Seite (erste 20) und eine eigene Server Action ("Mehr anzeigen"), beide mit Freigeber-Prüfung | Gleiche Absicherung wie PROJ-5/PROJ-8 | 2026-10-07 |
| Darstellung der Details als gemeinsame Komponente mit dem Sync-Ergebnis aus PROJ-5 | Spec verlangt dieselbe Darstellung wie direkt nach dem Sync; eine Komponente statt zwei auseinanderlaufender Kopien | 2026-10-07 |
| shadcn `collapsible` für das Aufklappen der Einträge (neu zu installieren) | shadcn-first-Regel; leichtgewichtiger als ein Accordion | 2026-10-07 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### A) Component Structure
```
/sync-freigabe (bestehend, nur Freigeber)
+-- Kundenportal-Zugang (PROJ-8, unverändert)
+-- Ins Kundenportal übertragen (PROJ-5)
|   +-- nach dem Sync zusätzlich: Hinweis, falls der Lauf nicht im Verlauf gespeichert werden konnte
+-- NEU: Sync-Verlauf
    +-- Letzter Lauf (hervorgehoben): Zeitpunkt, Ergebnis-Badge, ausgelöst von
    +-- Liste der Läufe (neueste zuerst, 20 pro Ladevorgang)
    |   +-- Zeile: Datum/Uhrzeit · ausgelöst von · Ergebnis-Badge · Dauer
    |   +-- aufklappbar: Meldung + Problemliste + Zahlentabelle (gleiche Komponente wie in PROJ-5)
    +-- "Mehr anzeigen" (nur wenn ältere Läufe existieren)
    +-- Leer-Zustand: "Noch kein Sync für diese Firma"
    +-- Fehler-Zustand: "Der Verlauf konnte nicht geladen werden" (Rest der Seite bleibt bedienbar)

Nach einem Sync erscheint der neue Lauf sofort oben in der Liste (ohne Neuladen).
```

### B) Data Model — neue Dataverse-Tabelle (vom Nutzer anzulegen)

**Tabelle:** Anzeigename "Sync-Lauf" (Mehrzahl "Sync-Läufe"), im selben Herausgeber/Präfix wie die übrigen Tabellen (`bmvcc_`)

| Spalte (Anzeigename) | Typ | Inhalt |
|---|---|---|
| Name *(Primärspalte)* | Text, 200 | Lesbare Bezeichnung, z.B. "Cloudcab GmbH – 07.10.2026 14:32" |
| Firma | Lookup → Firma (`bmvcc_firma`) | Die synchronisierte Firma |
| Gestartet am | Datum und Uhrzeit | Zeitpunkt, an dem der Sync ausgelöst wurde |
| Dauer (Sekunden) | Ganze Zahl | Laufzeit bis zur Antwort des Kundenportals |
| Ausgelöst von | Text, 200 | Name des Freigebers zum Zeitpunkt des Syncs |
| Ergebnis | Text, 20 | genau einer von: `erfolg`, `teilweise`, `fehler`, `unbekannt` |
| Meldung | Text, 500 | Kurzmeldung wie in der Anzeige |
| Details | Mehrzeiliger Text, max. 100'000 Zeichen | Zahlen je Bereich + Problemliste in maschinenlesbarer Form; bei Überschreitung gekürzt mit Vermerk |

**Rechte für den App-Benutzer "# OBSI Hofer Admin"** (Organisation):
- Tabelle Sync-Lauf: **Erstellen, Lesen, Anfügen**
- Tabelle Firma (`bmvcc_firma`): zusätzlich **"Anfügen an"** — heute nur Lesen (verifiziert 2026-10-07); ohne dieses Recht scheitert das Setzen des Firma-Lookups (gleiche Ursache wie beim ersten Prüfbericht in PROJ-4)

Nicht nötig: Schreiben/Löschen auf Sync-Lauf (Einträge werden nie geändert oder gelöscht).

### C) Tech Decisions (für PM erklärt)
- **Speicherort Dataverse:** Keine eigene Datenbank (PRD); eine schlanke neue Tabelle, die der Nutzer selbst im Maker anlegt.
- **Wenige feste Spalten + eine Detailspalte:** Alles, wonach gefiltert oder sortiert wird (Firma, Zeitpunkt, Ergebnis), hat eine eigene Spalte; die variablen Zahlen und Probleme liegen gesammelt in "Details".
- **Protokolliert wird auf dem Server, direkt nach der Antwort des Kundenportals:** So wird jeder Lauf erfasst, auch wenn der Browser die Antwort nicht mehr empfängt. Scheitert das Speichern, sieht der Freigeber trotzdem das Sync-Ergebnis — mit einem Hinweis.
- **Dauer wird mitgespeichert:** Damit lässt sich die bisher offene Frage beantworten, wie lange ein Firma-Sync tatsächlich dauert.
- **Gleiche Ergebnis-Darstellung wie direkt nach dem Sync:** Eine gemeinsame Anzeige-Komponente für "gerade eben" und "im Verlauf".

### D) Dependencies
- Neue shadcn-Komponente: `collapsible` (Aufklappen der Einträge)
- Keine neuen npm-Pakete
- Dataverse: neue Tabelle + Rechte (siehe B), vom Nutzer einzurichten; die tatsächlichen technischen Spaltennamen werden nach dem Anlegen aus den Dataverse-Metadaten gelesen, bevor `/frontend` startet

## Implementation Notes (Frontend)

Umgesetzt in einem Durchlauf (UI + Server Actions + Datenzugriff), wie bei PROJ-3/4/5/8:

- `src/lib/dataverse/sync-laeufe.ts` — `erstelleSyncLauf()` (schreibt alle Spalten, Firma per `bmvcc_Firma@odata.bind`, Name "Firma – TT.MM.JJJJ, HH:MM" in Schweizer Zeit, Texte auf die Spaltengrenzen gekürzt) und `listSyncLaeufeForFirma(firmaId, { vor })` (neueste zuerst, 20 pro Seite, `hatMehr` über einen zusätzlich geladenen Eintrag, Fortsetzung über "älter als Startzeitpunkt"); `serialisiereDetails()` kürzt Probleme vom Ende her mit Vermerk, falls 100'000 Zeichen überschritten würden; unbekannte Ergebniswerte → "unbekannt", defekte Details → Hinweis statt Absturz
- `src/lib/auth/freigeber.ts` — neue `aktuellerFreigeberName()` (Prüfung + Name in einer Abfrage)
- `src/app/(protected)/sync-freigabe/actions.ts` — `syncFirmaAction` misst Start/Dauer und protokolliert nach jedem tatsächlichen Portal-Aufruf (eigener Fehlerpfad, Ergebnis bleibt erhalten, `lauf: null` bei Speicherfehler); neue `ladeSyncLaeufeAction` für "Mehr anzeigen" (Freigeber-Prüfung, GUID- und Zeitstempel-Validierung)
- `src/components/sync-ergebnis-anzeige.tsx` — gemeinsame Ergebnisdarstellung, aus `sync-ausloesen.tsx` herausgelöst und dort wie im Verlauf verwendet
- `src/components/sync-verlauf.tsx` — Verlaufskarte mit "Letzter Sync", aufklappbaren Einträgen (shadcn `collapsible`, neu installiert), Status-Badges, Dauer, Leer- und Fehlerzustand, "Mehr anzeigen"
- `src/components/sync-freigabe-bereich.tsx` — hält zusätzlich den Verlauf; neuer Lauf erscheint sofort oben
- `src/components/sync-ausloesen.tsx` — meldet neue Läufe an die Hülle, Hinweis falls der Lauf nicht gespeichert werden konnte
- `src/app/(protected)/sync-freigabe/page.tsx` — lädt die erste Verlaufsseite parallel zu den Kontakten, mit eigenem Fehlerpfad
- Tests: `sync-laeufe.test.ts` (11), `sync-verlauf.test.tsx` (5), `sync-freigabe/actions.test.ts` (+7), `sync-ausloesen.test.tsx` (+2) — `npm test` 259/259, Lint, TypeScript, Build grün

**Gegen echtes Dataverse verifiziert (rein lesend):** Firma-Filter, Sortierung `bmvcc_gestartedam desc,createdon desc` und der Zeitstempel-Vergleich für "Mehr anzeigen" werden akzeptiert (Tabelle noch leer). **Nicht verifiziert:** das Schreiben eines echten Eintrags — entsteht beim nächsten Sync über die Oberfläche.

**Bekannte Einschränkung:** Zwei Läufe derselben Firma mit exakt gleichem Startzeitpunkt (Sekundengenauigkeit von Dataverse) könnten beim "Mehr anzeigen"-Übergang einmal übersprungen werden — praktisch ausgeschlossen, da ein Sync Sekunden dauert und der Button währenddessen gesperrt ist.

## QA Test Results

**Tested:** 2026-10-07
**Tester:** QA Engineer (AI)
**Testmethode:** Nutzer hat nach dem Deploy einen Sync für "Cloudcab GmbH" ausgelöst und den Verlauf geprüft. QA hat den resultierenden Dataverse-Datensatz rein lesend verifiziert, den Code gegen alle Kriterien/Edge Cases geprüft und die Testsuiten ausgeführt. Keine eigenen Schreibzugriffe.

### Live-Nachweis (Tabelle `bmvcc_synclauf`)
| Feld | Wert |
|---|---|
| Name | "Cloudcab GmbH – 07.10.2026, 10:19" (Schweizer Zeit; Start 08:19:39 UTC → korrekt umgerechnet) |
| Firma | verknüpft (Lookup über `bmvcc_Firma@odata.bind` funktioniert) |
| Dauer | 8 s |
| Ausgelöst von | Robert Bienz |
| Ergebnis / Meldung | `erfolg` / "„Cloudcab GmbH“ wurde ins Kundenportal übertragen." |
| Details | 7 Bereiche, 0 Probleme (gültiges JSON) |
| Erstellt von | "# OBSI Hofer Admin" (serverseitig protokolliert) |

### Acceptance Criteria Status
- [x] Verlaufseintrag mit allen Feldern nach jedem Portal-Aufruf — **live verifiziert** (Erfolg); übrige Ergebnisse per Unit-Test ("also logs failed and unknown results")
- [x] Keine Einträge bei Ablehnungen vor dem Aufruf — Unit-Test
- [x] Letzter Lauf hervorgehoben + Verlauf neueste zuerst — Komponententest; vom Nutzer im Browser bestätigt
- [x] >20 Läufe: neueste 20, "Mehr anzeigen" lädt ältere — Unit-Test (Datenschicht, `hatMehr`) + Komponententest; Abfrage gegen echtes Dataverse akzeptiert
- [x] Aufklappen zeigt Zahlentabelle + Probleme wie direkt nach dem Sync — gemeinsame Komponente `SyncErgebnisAnzeige` + Komponententest
- [x] Ergebnisfarben grün/orange/rot/orange — Code-Review (Badge-Varianten success/warning/destructive/warning)
- [x] Neuer Lauf erscheint ohne Neuladen oben — Code-Review (Hülle) + Komponententest (`onNeuerLauf`); vom Nutzer bestätigt
- [x] Leer-Hinweis "Noch kein Sync für diese Firma" — Komponententest
- [x] Speichern schlägt fehl → Ergebnis trotzdem + Hinweis — Unit-Test (`lauf: null`) + Komponententest
- [x] Verlauf nicht ladbar → Rest der Seite bedienbar, Fehler nur im Verlaufsbereich — Code-Review (eigener Fehlerpfad in `page.tsx`) + Komponententest
- [x] Bearbeiter serverseitig abgewiesen — Seite (Freigeber-Prüfung vor dem Laden) + Unit-Test `ladeSyncLaeufeAction`

### Edge Cases Status
- [x] "Unbekannt" wird protokolliert, ohne Zahlen — Unit-Test
- [x] Abbruch des Action-Aufrufs im Browser → Server hat bereits protokolliert, erscheint nach Neuladen — Code-Review (Protokoll im Server-Pfad)
- [x] Parallele Läufe → zwei Einträge — keine Deduplizierung, by design
- [x] Ungewollter Gesamt-Sync → Eintrag mit "teilweise" + Problemhinweis — Unit-Test (Erkennung PROJ-5) + Protokollierung des Ergebnisses
- [x] Sehr viele Probleme → gekürzt mit Vermerk, Grenze 100'000 eingehalten — Unit-Test `serialisiereDetails`
- [x] Firmenwechsel → `key={firmaId}` — Code-Review
- [x] Name als Momentaufnahme — gespeicherter Text, kein Benutzer-Lookup

### Security Audit (Red Team)
- [x] Lesen (Seite + "Mehr anzeigen") nur für Freigeber
- [x] Firma-ID (GUID) und Zeitstempel werden vor dem Einsetzen in den OData-Filter validiert → keine Injection (Unit-Tests mit Injektionsversuchen)
- [x] Kein Schreibzugang von aussen: Einträge entstehen ausschliesslich innerhalb von `syncFirmaAction`
- [x] Gespeicherte Texte (Meldung, Probleme aus dem Kundenportal) werden von React escaped dargestellt — keine XSS-Fläche
- [x] Nur Erstellen/Lesen-Rechte auf der Tabelle — Einträge können über das Admin-Tool weder geändert noch gelöscht werden

### Bugs Found

#### BUG-1: Badge (`div`) innerhalb des Aufklapp-Buttons
- **Severity:** Low
- **Steps to Reproduce:** Verlauf mit mindestens einem Eintrag anzeigen; im DOM enthält der `<button>` des Eintrags ein `<div>` (shadcn `Badge`)
- **Erwartet:** Nur Inline-Elemente in einem `<button>` (HTML-Inhaltsmodell)
- **Tatsächlich:** `<div>` im `<button>` — Browser stellen es korrekt dar, React warnt nicht; reiner Standardverstoss, kann bei strengen Accessibility-Prüfungen auffallen
- **Priority:** Nice to have
- **Status:** ✅ Fixed (2026-10-07) — `StatusBadge` in `sync-verlauf.tsx` rendert ein `<span>` mit den shadcn-Badge-Styles (`badgeVariants`) statt der `<div>`-Komponente. Regressionstest `sync-verlauf.test.tsx` ("contains no div inside the expand buttons"). `npm test` 260/260, Lint, TypeScript, Build grün

### Automatisierte Tests
- `npm test`: 259/259 grün (PROJ-6: `sync-laeufe.test.ts` 11, `sync-verlauf.test.tsx` 5, `sync-freigabe/actions.test.ts` +7, `sync-ausloesen.test.tsx` +2)
- `npm run test:e2e`: 18/18 grün; Zugriffsschutz der Seite durch `tests/PROJ-8-…spec.ts` abgedeckt. Kein eigenes E2E für den Verlauf (setzt einen echten Sync bzw. Login voraus)
- Nicht durchgeführt: Cross-Browser-/Responsive-Test der eingeloggten Seite; Einträge umbrechen per `flex-wrap` auf schmalen Bildschirmen

### Summary
- **Acceptance Criteria:** 11/11 erfüllt (Schreibweg live verifiziert)
- **Edge Cases:** 7/7
- **Bugs Found:** 1 (0 critical, 0 high, 0 medium, 1 low) — behoben, keine offenen Bugs
- **Security:** keine Findings
- **Nebenbefund:** Die erste gemessene Dauer eines Firma-Syncs (8 s) beantwortet die offene Laufzeit-Frage aus PROJ-5
- **Production Ready:** **JA** — Status **Approved**

## Deployment
- **Production URL:** https://obsi-hofer-admin.vercel.app/sync-freigabe (Abschnitt "Sync-Verlauf", nur für Freigeber)
- **Deployed:** 2026-10-07 (automatisch via Vercel bei Push auf `main`, letzter Code-Commit `dc9be01`)
- **Tag:** `v1.7.0-PROJ-6`
- **Voraussetzungen (vom Nutzer erledigt, verifiziert):** Dataverse-Tabelle `bmvcc_synclauf` angelegt; App-Benutzer mit Erstellen, Lesen, Anfügen auf Sync-Lauf und "Anfügen an" auf Firma (Organisation). Keine neuen Umgebungsvariablen.
- **Verifiziert:**
  - Pre-Deployment: `npm run build`, `npm run lint`, `npx tsc --noEmit`, `npm test` (260/260), `npm run test:e2e` (18/18) grün; keine Secrets im Repo
  - Produktion: `/login` HTTP 200; `/sync-freigabe` ohne Session per 307 auf `/login`
  - Funktion live: Sync-Lauf für "Cloudcab GmbH" korrekt in Dataverse protokolliert und im Verlauf angezeigt (siehe QA)
  - Nicht separat live geprüft: der BUG-1-Fix (`<span>` statt `<div>`) — per Regressionstest abgedeckt, rein strukturell
