# PROJ-21: Korrektur-Anfrage an den Vorgesetzten

## Status: Planned
**Created:** 2026-11-21
**Last Updated:** 2026-11-21

## Dependencies
- Requires: PROJ-20 (Eigener Zeitnachweis für Mitarbeitende): die Anfrage wird aus „Mein Zeitnachweis“ gestellt und ersetzt dort den Hinweis „Korrekturen bitte in der SharePoint-Zeiterfassung erfassen …“
- Requires: PROJ-13 (Zeitnachweis): Freigeber sehen die Anfragen im Zeitnachweis der Person
- Betrifft: PROJ-16 (PDF bleibt unverändert)
- **Extern (Nutzer):**
  - Neue Tabelle für Korrektur-Anfragen in Dataverse anlegen (Form in /architecture) und Rechte für den App-Benutzer erteilen
  - Power-Automate-Flow: bei neuer Anfrage den Manager aus Entra ID ermitteln und ihm eine Teams-Nachricht mit Karte schicken (Knopf „Erledigt“); ohne Manager an die Freigeber; bei „Erledigt“ den Status setzen und den Mitarbeitenden in Teams benachrichtigen
- **Go-live:** PROJ-20 geht erst zusammen mit PROJ-21 live (Nutzer-Entscheid 2026-11-21)

## Ausgangslage
PROJ-20 zeigt Mitarbeitenden ihren Zeitnachweis nur zum Lesen, mit dem Hinweis, Korrekturen selbst in der SharePoint-Zeiterfassung zu erfassen. Stattdessen sollen Mitarbeitende eine Korrektur direkt aus dem Tool bei ihrem Vorgesetzten anfragen können. Vorgesetzte sind in Entra ID als Manager beim Benutzer hinterlegt.

## User Stories
- Als Mitarbeitender möchte ich zu einem Tag meines Zeitnachweises eine Korrektur anfragen, damit mein Vorgesetzter weiss, was falsch ist, ohne dass ich ihm separat schreiben muss.
- Als Mitarbeitender möchte ich auch für einen Tag ohne Einträge eine Korrektur anfragen können, damit ein ganz vergessener Tag nachgetragen wird.
- Als Mitarbeitender möchte ich im Zeitnachweis sehen, ob meine Anfrage offen oder erledigt ist, damit ich nicht nachfragen muss.
- Als Vorgesetzter möchte ich die Anfrage in Teams erhalten, mit Datum, den bisher erfassten Zeiten und dem Text, damit ich ohne das Tool zu öffnen korrigieren kann.
- Als Vorgesetzter möchte ich eine Anfrage in Teams als erledigt markieren, damit der Mitarbeitende Bescheid bekommt.
- Als Freigeber möchte ich offene und erledigte Anfragen im Zeitnachweis der Person sehen, damit ich beim Prüfen weiss, wo noch etwas korrigiert wird.

## Out of Scope
- Strukturierte Eingabe neuer Zeiten (Kommen/Gehen-Felder) — nur Freitext; korrigiert wird von Hand
- Automatisches Übernehmen der Korrektur in SharePoint oder Dataverse — korrigiert wird weiterhin in SharePoint, die Änderung kommt mit dem nächtlichen Flow
- Mehrere Tage in einer Anfrage — pro Tag eine Anfrage
- Anfragen für Tage älter als der vorherige Monat oder für künftige Tage
- Zurückziehen oder Bearbeiten einer gesendeten Anfrage durch den Mitarbeitenden
- Status ändern im Tool (auch nicht durch Freigeber) — nur über „Erledigt“ in Teams
- Eigene Liste „alle offenen Anfragen“ im Tool — spätere Erweiterung
- Anfragen im PDF (PROJ-16 unverändert)
- Erinnerungen bei lange offenen Anfragen
- Eigener Teams-Bot oder Teams-App — die Teams-Nachricht kommt vom Flow-Bot aus Power Automate
- Ermitteln des Managers im Tool — das macht der Flow
- Anfragen durch Freigeber im Namen anderer Personen

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

**Anfrage stellen**
- [ ] Angenommen eine Person mit Rolle Mitarbeiter sieht „Mein Zeitnachweis“ im aktuellen oder vorherigen Monat, dann steht oben ein Knopf „Korrektur anfragen“ anstelle des Hinweises „Korrekturen bitte in der SharePoint-Zeiterfassung erfassen …“, und jede Tageszeile bis und mit heute hat einen Link „Korrektur anfragen“
- [ ] Angenommen der gewählte Monat liegt vor dem vorherigen Monat, dann gibt es weder Knopf noch Links, sondern den Hinweis „Für ältere Monate bitte direkt an deinen Vorgesetzten wenden.“
- [ ] Angenommen die Person wählt „Korrektur anfragen“ in einer Tageszeile, dann öffnet sich ein Dialog mit diesem Datum vorausgefüllt, den bisherigen Zeiten des Tages zur Kontrolle und einem Feld „Nachricht“
- [ ] Angenommen die Person wählt den Knopf oben, dann kann sie im Dialog ein Datum im gewählten Monat wählen (nur Tage bis und mit heute und nur im aktuellen oder vorherigen Monat)
- [ ] Angenommen das Feld „Nachricht“ ist leer oder hat mehr als 1'000 Zeichen, wenn die Person sendet, dann erscheint eine Fehlermeldung und nichts wird gespeichert
- [ ] Angenommen Datum und Nachricht sind gültig, wenn die Person sendet, dann wird die Anfrage mit Person (Anmelde-E-Mail), Datum, Nachricht, den bisherigen Zeiten des Tages laut Zeitnachweis, Zeitpunkt und Status „offen“ gespeichert, und es erscheint „Anfrage gesendet. Dein Vorgesetzter erhält sie in Teams.“
- [ ] Angenommen das Speichern schlägt fehl (z.B. Dataverse nicht erreichbar), dann erscheint eine Fehlermeldung, der Dialog bleibt offen und die Nachricht bleibt erhalten
- [ ] Angenommen jemand ruft das Senden ohne Rolle Mitarbeiter, mit einem Datum ausserhalb des erlaubten Zeitraums oder für eine andere Person auf, dann wird die Anfrage abgelehnt; die Person ergibt sich immer aus der Anmeldung

**Status im Zeitnachweis**
- [ ] Angenommen zu einem Tag gibt es eine Anfrage, dann zeigt „Mein Zeitnachweis“ beim Tag „Korrektur angefragt (offen)“ bzw. „Korrektur erledigt“
- [ ] Angenommen zu einem Tag gibt es mehrere Anfragen, dann zeigt der Tag den Status der neuesten; eine weitere Anfrage zum selben Tag ist jederzeit möglich
- [ ] Angenommen eine Anfrage ist erledigt, dann bleiben die bisherigen Zeiten bis zum nächsten nächtlichen Flow unverändert sichtbar (kein Widerspruch: „erledigt“ heisst korrigiert in SharePoint)

**Freigeber**
- [ ] Angenommen ein Freigeber öffnet den Zeitnachweis einer Person (PROJ-13), dann steht bei Tagen mit Anfragen in „Bemerkung / Hinweise“ jede Anfrage mit Datum der Anfrage, Status und Nachricht, z.B. „Korrektur angefragt 21.11. (offen): Gehen war 17:30 statt 16:30“
- [ ] Angenommen ein Freigeber sieht eine Anfrage, dann kann er im Tool weder den Status ändern noch die Anfrage löschen
- [ ] Angenommen ein Zeitnachweis wird als PDF erzeugt, dann enthält es keine Anfragen

**Flow (Nutzer, Abnahme im Zusammenspiel)**
- [ ] Angenommen eine Anfrage wird gespeichert, dann erhält der in Entra ID hinterlegte Manager der Person eine Teams-Nachricht mit Name, Datum, bisherigen Zeiten, Nachricht, einem Link auf den Zeitnachweis der Person (Monat der Anfrage) und dem Knopf „Erledigt“
- [ ] Angenommen für die Person ist kein Manager hinterlegt, dann geht die Teams-Nachricht an die Freigeber
- [ ] Angenommen der Manager klickt „Erledigt“, dann wird der Status der Anfrage auf „erledigt“ gesetzt und der Mitarbeitende erhält eine Teams-Nachricht

## Edge Cases
- **Tag ohne Einträge** (vergessen): Anfrage möglich; „bisherige Zeiten“ = „keine Einträge“
- **Heutiger Tag:** Anfrage möglich (z.B. „Kommen fehlt“)
- **Monatswechsel:** am 1. Dezember sind Dezember und November anfragbar, Oktober nicht mehr
- **Mehrere Anfragen zum selben Tag:** alle gespeichert, der Tag zeigt die neueste; Freigeber sehen alle
- **Gleichzeitiges Senden** (Doppelklick): der Knopf ist während des Sendens gesperrt, es entsteht nur eine Anfrage
- **Flow läuft nicht oder schlägt fehl:** Anfrage bleibt „offen“ gespeichert und für Freigeber im Zeitnachweis sichtbar; das Tool merkt davon nichts
- **Manager hat die Person gewechselt / ist ausgetreten:** der Flow ermittelt den Manager zum Zeitpunkt der Anfrage
- **Nachricht mit Zeilenumbrüchen oder Sonderzeichen:** wird unverändert gespeichert und als reiner Text angezeigt (keine Formatierung, kein HTML)
- **Person hat zusätzlich die Rolle Freigeber:** stellt Anfragen wie alle anderen über „Mein Zeitnachweis“; die Anfrage geht an ihren eigenen Manager

## Technical Requirements (optional)
- Sicherheit: Person, Zeitraum und Rolle werden serverseitig geprüft; die Person kommt nie aus der Anfrage
- Datenschutz: Anfragen enthalten Arbeitszeiten (Personendaten); sichtbar nur für die Person selbst, Freigeber und den Empfänger in Teams
- Anzeige der Nachricht immer als Text (kein HTML)

## Open Questions
- [ ] Ist in Entra ID für alle Mitarbeitenden ein Manager hinterlegt? (Nutzer, vor dem Go-live prüfen)
- [ ] Reicht die bestehende Power-Automate-/Dataverse-Lizenz für den Flow mit Dataverse-Trigger, „Office 365 Users – Manager abrufen“ und Teams-Karte mit Antwort („Adaptive Karte posten und auf Antwort warten“)? (Nutzer)
- [ ] Wartet der Flow auf den Klick „Erledigt“ (Flow-Laufzeit bis 30 Tage) oder wird die Antwort anders verarbeitet? → in /architecture klären

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Empfänger = Manager aus Entra ID | Manager ist beim Benutzer bereits gepflegt; keine zusätzliche Pflege im Tool (Nutzer-Entscheid) | 2026-11-21 |
| Ohne Manager an die Freigeber | Keine Anfrage darf verloren gehen | 2026-11-21 |
| Zustellung per Teams über Power Automate (Flow-Bot), das Tool speichert nur die Anfrage in Dataverse | Wenig Aufwand, Manager braucht das Tool nicht, Empfänger/Text im Flow anpassbar, Anfragen nachvollziehbar (Nutzer-Entscheid „Weg A“ statt eigenem Teams-Bot oder Kanal-Webhook) | 2026-11-21 |
| Eine Anfrage pro Tag mit Freitext (Pflicht, max. 1'000 Zeichen), Link pro Tag plus Knopf oben | Deckt Zeiten, Abwesenheiten und fehlende Tage ab; korrigiert wird ohnehin von Hand (Nutzer-Entscheid) | 2026-11-21 |
| Bisherige Zeiten des Tages werden automatisch mitgeschickt | Manager sieht ohne Tool, was heute erfasst ist | 2026-11-21 |
| Status offen/erledigt im Zeitnachweis, „Erledigt“ nur über Teams, Teams-Rückmeldung an den Mitarbeitenden | Rückmeldung ohne Nachfragen, Status an einer Stelle gepflegt (Nutzer-Entscheid) | 2026-11-21 |
| Mehrere Anfragen pro Tag erlaubt, Tag zeigt die neueste | Erste Anfrage reicht manchmal nicht | 2026-11-21 |
| Freigeber sehen Anfragen im Zeitnachweis der Person (nur lesen), nicht im PDF, keine eigene Liste | Beim Prüfen sichtbar, ohne zweite Oberfläche (Nutzer-Entscheid) | 2026-11-21 |
| Anfragen nur für den aktuellen und den vorherigen Monat, bis und mit heute | Ältere Monate gelten nach der Lohnabrechnung als abgeschlossen (Nutzer-Entscheid) | 2026-11-21 |
| PROJ-20 geht erst zusammen mit PROJ-21 live | Mitarbeitende sollen von Anfang an Korrekturen anfragen können (Nutzer-Entscheid) | 2026-11-21 |

### Technical Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| _To be added by /architecture_ | | |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
