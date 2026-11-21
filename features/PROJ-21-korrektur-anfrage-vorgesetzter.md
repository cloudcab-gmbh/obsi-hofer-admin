# PROJ-21: Korrektur-Anfrage an den Vorgesetzten

## Status: In Review
**Created:** 2026-11-21
**Last Updated:** 2026-11-21

## Dependencies
- Requires: PROJ-20 (Eigener Zeitnachweis für Mitarbeitende): die Anfrage wird aus „Mein Zeitnachweis“ gestellt und ersetzt dort den Hinweis „Korrekturen bitte in der SharePoint-Zeiterfassung erfassen …“
- Requires: PROJ-13 (Zeitnachweis): Freigeber sehen die Anfragen im Zeitnachweis der Person
- Betrifft: PROJ-16 (PDF bleibt unverändert)
- **Extern (Nutzer):**
  - Neue Tabelle für Korrektur-Anfragen in Dataverse anlegen (Form in /architecture) und Rechte für den App-Benutzer erteilen
  - Power-Automate-Flow: bei neuer Anfrage den Manager aus Entra ID ermitteln und ihm eine Teams-Nachricht mit Karte schicken (Knopf „Erledigt“); ohne Manager an Freigeber und Bearbeiter (Entra-Gruppen); bei „Erledigt“ den Status setzen und den Mitarbeitenden in Teams benachrichtigen
  - Entra-Gruppen „Admin-Tool Freigeber“ und „Admin-Tool Bearbeiter“ anlegen und die App-Rollen den Gruppen zuweisen
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
- Automatisches Übernehmen der Korrektur in SharePoint oder Dataverse — korrigiert wird von Hand direkt in Dataverse, über den Zeitnachweis im Tool (PROJ-13, Nutzer-Entscheid 2026-11-21; vorher: in SharePoint)
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
- [ ] Angenommen eine Anfrage ist erledigt, dann zeigt „Mein Zeitnachweis“ die korrigierten Zeiten sofort („erledigt“ heisst korrigiert in Dataverse über den Zeitnachweis im Tool)

**Freigeber**
- [ ] Angenommen ein Freigeber öffnet den Zeitnachweis einer Person (PROJ-13), dann steht bei Tagen mit Anfragen in „Bemerkung / Hinweise“ jede Anfrage mit Datum der Anfrage, Status und Nachricht, z.B. „Korrektur angefragt 21.11. (offen): Gehen war 17:30 statt 16:30“
- [ ] Angenommen ein Freigeber sieht eine Anfrage, dann kann er im Tool weder den Status ändern noch die Anfrage löschen
- [ ] Angenommen ein Zeitnachweis wird als PDF erzeugt, dann enthält es keine Anfragen

**Flow (Nutzer, Abnahme im Zusammenspiel)**
- [ ] Angenommen eine Anfrage wird gespeichert, dann erhält der in Entra ID hinterlegte Manager der Person eine Teams-Nachricht mit Name, Datum, bisherigen Zeiten, Nachricht, einem Link auf den Zeitnachweis der Person (Monat der Anfrage) und dem Knopf „Erledigt“
- [ ] Angenommen für die Person ist kein Manager hinterlegt, dann geht die Teams-Nachricht an alle Mitglieder der Gruppen Freigeber und Bearbeiter
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
- [x] Wartet der Flow auf den Klick „Erledigt“? → Ja, „Adaptive Karte posten und auf Antwort warten“, höchstens 30 Tage; danach bleibt die Anfrage offen (Tech Design C)
- [x] Empfänger ohne Manager? → Mitglieder der Entra-Gruppen „Admin-Tool Freigeber“ und „Admin-Tool Bearbeiter“; App-Rollen werden diesen Gruppen zugewiesen (Nutzer-Entscheid 2026-11-21)
- [x] Entra-Gruppen anlegen und die App-Rollen Freigeber/Bearbeiter den Gruppen zuweisen → Gruppen angelegt 2026-11-21 (Nutzer)
- [x] Dataverse-Tabelle „Korrektur-Anfrage“ anlegen und dem App-Benutzer Erstellen + Lesen erteilen → angelegt und geprüft 2026-11-21 (Tech Design B)

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Empfänger = Manager aus Entra ID | Manager ist beim Benutzer bereits gepflegt; keine zusätzliche Pflege im Tool (Nutzer-Entscheid) | 2026-11-21 |
| Ohne Manager an Freigeber und Bearbeiter | Keine Anfrage darf verloren gehen; alle Personen mit Rolle im Tool (Nutzer-Entscheid) | 2026-11-21 |
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
| Dataverse-Tabelle als Schnittstelle zwischen Tool und Flow | Tool braucht keine Teams-/Graph-Rechte; Flow reagiert auf neue Zeilen; Anfragen bleiben nachvollziehbar | 2026-11-21 |
| Manager-Ermittlung und Fallback auf Freigeber im Flow (Office 365 Users) | Keine Entra-Berechtigung für die App; Empfängerregeln ohne Code-Änderung anpassbar | 2026-11-21 |
| Teams „Adaptive Karte posten und auf Antwort warten“, Status nur vom Flow gesetzt | „Erledigt“ direkt in Teams; Status an einer Stelle; App-Benutzer braucht kein Änderungsrecht | 2026-11-21 |
| App-Benutzer nur Erstellen + Lesen auf der neuen Tabelle | Minimalrechte; Mitarbeitende können Anfragen weder ändern noch löschen | 2026-11-21 |
| Bisherige Zeiten und Link werden auf dem Server berechnet und gespeichert | Nicht vom Browser manipulierbar; Teams-Karte enthält alles ohne Tool-Zugriff | 2026-11-21 |
| Datum als „Nur Datum“, zeitzonenunabhängig | Wie Feiertage (PROJ-18); keine Zeitzonenlogik | 2026-11-21 |
| Fristregel als reine Funktion mit Tests, gemeinsam für Anzeige und Prüfung | Knopf/Links und Server-Prüfung können nicht auseinanderlaufen | 2026-11-21 |
| Fehler beim Lesen der Anfragen blockiert den Zeitnachweis nicht | Anfragen sind Zusatzinformation; Zeitnachweis bleibt nutzbar | 2026-11-21 |
| Wartezeit des Flows max. 30 Tage, danach bleibt „offen“ | Grenze von Power Automate; passt zur Frist von zwei Monaten | 2026-11-21 |
| Fallback-Empfänger über Entra-Gruppen statt Rollen-Zuweisungen pro Person | Rollen-Zuweisungen sind im Flow nur über Graph (Premium-Connector) lesbar; Gruppen mit Standard-Connector, Pflege nur in Entra (Nutzer-Entscheid) | 2026-11-21 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Überblick
Das Tool **speichert** Anfragen und **zeigt** ihren Status. Das **Zustellen** in Teams und das **Erledigen** übernimmt ein Power-Automate-Flow des Nutzers. Verbindungsstück ist eine neue Dataverse-Tabelle „Korrektur-Anfrage“: Das Tool legt Zeilen an und liest sie, der Flow reagiert auf neue Zeilen und setzt den Status. Das Tool spricht weder mit Teams noch mit Entra ID (Manager) — keine neuen Berechtigungen für die App ausser auf die neue Tabelle.

```
Mitarbeitender ──(Dialog)──> Tool ──(neue Zeile, Status offen)──> Dataverse „Korrektur-Anfrage“
                                                                        │
                                       Flow des Nutzers: „Zeile hinzugefügt“
                                       ├─ Manager aus Entra ID holen (ohne Manager: Freigeber)
                                       ├─ Teams-Karte an Manager, wartet auf „Erledigt“
                                       └─ bei „Erledigt“: Status erledigt + Teams-Nachricht an Mitarbeitenden
Tool liest Status ◄─────────────────────────────────────────────────────┘ (Mein Zeitnachweis, Zeitnachweis Freigeber)
```

### A) Bausteine (Oberfläche)
```
Mein Zeitnachweis (PROJ-20, angepasst)
+-- Knopf „Korrektur anfragen“ (statt Hinweis auf SharePoint; nur aktueller/vorheriger Monat)
|   oder Hinweis „Für ältere Monate bitte direkt an deinen Vorgesetzten wenden.“
+-- Zeitnachweis-Ansicht (nur lesen)
|   +-- pro Tag (bis heute, aktueller/vorheriger Monat): Link „Korrektur anfragen“
|   +-- pro Tag mit Anfrage: „Korrektur angefragt (offen)“ / „Korrektur erledigt“ (neueste)
+-- Dialog „Korrektur anfragen“ (bestehende Dialog-Bausteine)
    +-- Datum (vorausgefüllt aus der Zeile; vom Knopf aus wählbar)
    +-- Bisherige Zeiten des Tages (zur Kontrolle, nur Anzeige)
    +-- Nachricht (Pflicht, max. 1'000 Zeichen, Zeichenzähler)
    +-- Senden (gesperrt während des Sendens) / Abbrechen
    +-- Fehlermeldung im Dialog, Nachricht bleibt erhalten

Zeitnachweis für Freigeber (PROJ-13, angepasst)
+-- Spalte „Bemerkung / Hinweise“: alle Anfragen des Tages mit Anfragedatum, Status und Nachricht (nur lesen)
```

### B) Datenmodell
Neue Dataverse-Tabelle **„Korrektur-Anfrage“**, **vom Nutzer anzulegen** (interne Namen in /backend abgleichen, wie bei PROJ-18):

| Spalte | Art | Inhalt / wer schreibt |
|---|---|---|
| Titel (Primärspalte) | Text | z.B. „Korrektur 05.11.2026 · Anna Muster“ — Tool |
| Mitarbeiter-E-Mail | Text (320) | Anmelde-E-Mail, klein — Tool; der Flow sucht damit den Manager |
| Mitarbeiter-Name | Text | Anzeigename für die Teams-Karte — Tool |
| Datum | Nur Datum (zeitzonenunabhängig) | betroffener Tag — Tool |
| Nachricht | Mehrzeiliger Text (1'000) | Text des Mitarbeitenden — Tool |
| Bisherige Zeiten | Text | z.B. „07:30–12:00, 12:30–17:00“ oder „keine Einträge“, dazu die Art des Tages wie „Ferien“ — Tool, **auf dem Server berechnet**, nicht vom Browser übernommen |
| Link | Text (URL) | Zeitnachweis der Person im Tool für den Monat der Anfrage (Freigeber-Ansicht) — Tool |
| Status | Auswahl: offen (0), erledigt (1); Standard offen | Tool setzt offen, **nur der Flow** setzt erledigt |
| Erledigt am | Datum/Uhrzeit | Flow |
| Erledigt von | Text | Name aus der Teams-Antwort — Flow |
| Erstellt am | Systemspalte | Zeitpunkt der Anfrage (Anzeige „angefragt 21.11.“) |

Rechte des App-Benutzers (Tool): **Erstellen und Lesen** auf der Tabelle — kein Ändern, kein Löschen. Der Flow läuft mit der Verbindung des Nutzers (Lesen und Ändern).

**Angelegt und geprüft (2026-11-21):** Tabelle `bmvcc_korrekturanfrage` (Entitätsmenge `bmvcc_korrekturanfrages`), Primärspalte `bmvcc_titel`; Spalten `bmvcc_mitarbeiteremail` (E-Mail, 100), `bmvcc_mitarbeitername` (100), `bmvcc_datum` (Nur Datum, zeitzonenunabhängig), `bmvcc_nachricht` (1'000), `bmvcc_bisherigezeiten` (200), `bmvcc_link` (URL, 500), `bmvcc_status` (0 offen / 1 erledigt, Standard offen), `bmvcc_erledigtam` (Datum und Uhrzeit), `bmvcc_erledigtvon` (100). App-Benutzer: Lesen + Erstellen (Organisation). Zusätzlich vorhanden: Verweis `bmvcc_zeitnachweis` auf „Zeiterfassung-Person“ — vom Tool nicht genutzt (bleibt leer; Füllen bräuchte Anfügen-Rechte).

### C) Flow des Nutzers (Vorschlag, wird nicht im Repo gebaut)
1. Trigger: Dataverse „Wenn eine Zeile hinzugefügt wird“ auf „Korrektur-Anfrage“
2. „Office 365 Users – Manager abrufen (V2)“ mit der Mitarbeiter-E-Mail
3. Schlägt das fehl (kein Manager): Empfänger = Mitglieder der Entra-Gruppen „Admin-Tool Freigeber“ und „Admin-Tool Bearbeiter“ („Microsoft Entra ID – Gruppenmitglieder abrufen“, ohne Doppelte); die App-Rollen werden diesen Gruppen zugewiesen statt einzelnen Personen
4. Teams „Adaptive Karte an Benutzer posten und auf Antwort warten“ (Flow-Bot, Chat) mit Name, Datum, bisherigen Zeiten, Nachricht, Link und Knopf „Erledigt“
5. Nach der Antwort: Zeile aktualisieren (Status erledigt, Erledigt am, Erledigt von) und Teams-Nachricht an den Mitarbeitenden (Flow-Bot)
- **Grenze:** Ein Flow wartet höchstens 30 Tage auf die Antwort. Danach bleibt die Anfrage „offen“ und muss bei Bedarf neu gestellt werden — passt zur Frist „aktueller und vorheriger Monat“
- Mehrere Empfänger (Fallback): „Erledigt“ gilt mit der ersten Antwort (Karte an jeden einzeln mit paralleler Verzweigung oder an einen Gruppenchat) — Detail im Flow
- Bearbeiter sehen keine Zeitnachweise im Tool: Die Karte enthält deshalb alle Angaben (Name, Datum, bisherige Zeiten, Nachricht), der Link ist nur für Freigeber nützlich

### D) Ablauf im Tool
- **Senden (Server-Aktion):** prüft Rolle Mitarbeiter, nimmt die Person aus der Anmeldung, prüft Datum (aktueller oder vorheriger Monat, bis heute, innerhalb der sichtbaren Monate aus PROJ-20) und Nachricht (1–1'000 Zeichen), berechnet die bisherigen Zeiten des Tages mit derselben Rechnung wie der Zeitnachweis und legt die Zeile an. Bestehende Anfragen werden nie geändert
- **Anzeigen:** Beim Laden des Zeitnachweises (Mitarbeiter und Freigeber) werden die Anfragen der Person für den Monat gelesen (Filter E-Mail + Datumsbereich) und pro Tag zugeordnet. Mitarbeitende sehen den Status der neuesten Anfrage, Freigeber alle Anfragen mit Text
- **Wenn das Lesen der Anfragen fehlschlägt:** Der Zeitnachweis erscheint trotzdem, mit dem Hinweis „Korrektur-Anfragen konnten nicht geladen werden“ — die Anfragen sind Zusatz, nicht Kern
- **Frist:** Die erlaubten Tage für Anfragen sind eine reine Regel (aktueller/vorheriger Monat, bis heute, Schnittmenge mit den sichtbaren Monaten) mit Unit-Tests; dieselbe Regel steuert Knopf, Links und die Prüfung beim Senden
- **Anzeige der Nachricht** immer als reiner Text (kein HTML); Zeilenumbrüche bleiben erhalten
- **PDF** (PROJ-16): unverändert, lädt keine Anfragen

### E) Abhängigkeiten
Keine neuen Pakete (Dialog, Textarea, Badge sind als shadcn-Bausteine vorhanden). Keine neuen Umgebungsvariablen.

## Implementation Notes (Frontend, 2026-11-21)
- **Regeln** (`src/lib/zeiterfassung/korrektur.ts`, 23 Unit-Tests): erlaubter Zeitraum (aktueller/vorheriger Monat bis heute, geschnitten mit den sichtbaren Monaten aus PROJ-20), Tag/Monat anfragbar, Text der bisherigen Zeiten (Paare in Schweizer Zeit, „offen“, Art des Tages, max. 200 Zeichen), Gruppierung pro Tag (neueste zuerst), Prüfung der Nachricht (1–1'000 Zeichen)
- **Dialog** `KorrekturAnfrage` (`src/components/korrektur-anfrage.tsx`): aus der Tageszeile mit festem Datum (Link unter den Zeiten, auf dem Handy in der stehenbleibenden Spalte), vom Knopf oben mit Datumsfeld (min/max = erlaubte Tage des gewählten Monats); zeigt die bisherigen Zeiten, Zeichenzähler, Senden gesperrt während des Sendens, Fehler im Dialog mit erhaltener Nachricht, danach „Anfrage gesendet — Dein Vorgesetzter erhält sie in Teams.“
- **Mein Zeitnachweis:** Knopf „Korrektur anfragen“ neben „PDF herunterladen“ ersetzt den Hinweis auf SharePoint; in älteren Monaten der Hinweis „Für ältere Monate bitte direkt an deinen Vorgesetzten wenden.“; pro Tag „Korrektur angefragt (offen)“ bzw. „Korrektur erledigt“ (neueste Anfrage)
- **Zeitnachweis für Freigeber:** alle Anfragen des Tages mit Anfragedatum (Schweizer Zeit), Status und Nachricht als reiner Text mit Zeilenumbrüchen, ohne Knöpfe
- **Laden:** `ladeAnfragenDesMonats` (`korrektur-laden.ts`) — ein Fehler zeigt nur „Korrektur-Anfragen konnten nicht geladen werden.“, der Zeitnachweis bleibt
- **Mitgebaut (Backend-Teil):** Dataverse-Zugriff `src/lib/dataverse/korrekturanfragen.ts` (Lesen pro Person/Zeitraum, Anlegen mit Status offen) und Server-Aktion `sendeKorrekturAnfrageAction(datum, nachricht)` — Person aus der Anmeldung, Frist und bisherige Zeiten auf dem Server, Link = `AUTH_URL` (sonst Vercel-Produktionsadresse) + Zeitnachweis der Person im Monat. Tests der Aktion folgen in /backend

## Implementation Notes (Backend, 2026-11-21)
- **Tests der Server-Aktion** `sendeKorrekturAnfrageAction`: gespeichert mit Person aus der Anmeldung, auf dem Server berechneten bisherigen Zeiten und Link; Vormonat erlaubt; älter als Vormonat, Zukunft und Monate ausserhalb der sichtbaren Monate abgelehnt; ohne Rolle/E-Mail abgelehnt ohne Laden; Nachricht leer/zu lang, ungültiges Datum und Datum mit Filter-Injektion abgelehnt; ohne Zeitnachweis abgelehnt; Speicherfehler ohne Details
- **Tests des Dataverse-Zugriffs:** Filter mit klein geschriebener, maskierter E-Mail und Datumsbereich; Status-Zuordnung (unbekannt → offen); Zeilen ohne Datum werden übersprungen; Anlegen mit allen Spalten, auf die Spaltenlängen gekürzt, Status offen
- **Gegen Dataverse geprüft (2026-11-21):** Lesen mit dem Filter funktioniert; eine echte Anfrage des Nutzers (Tag 08.11.) ist mit allen Spalten korrekt gespeichert (Titel, E-Mail, Name, Nachricht mit Zeilenumbrüchen, „06:03–19:45 · frei“, Link, Status offen)
- **Link:** lokal `http://localhost:3000/…` (aus `AUTH_URL`); auf Vercel `AUTH_URL`, sonst die Produktionsadresse (`VERCEL_PROJECT_PRODUCTION_URL`)
- 803 Unit-Tests grün; keine neuen Pakete oder Umgebungsvariablen

## QA Test Results

**Tested:** 2026-11-21
**App URL:** http://localhost:3000 (Branch `proj-20-mein-zeitnachweis`, noch nicht deployt)
**Tester:** QA Engineer (AI) — Code-Review, Unit-/E2E-Tests; Bedienung im Browser und Flow durch den Nutzer

**Automatisierte Tests:** 803 Unit-Tests grün (davon PROJ-21: Regeln `korrektur.test.ts`, Dataverse-Zugriff `korrekturanfragen.test.ts`, Server-Aktion `actions.test.ts`, Ansicht `zeitnachweis-ansicht.test.tsx`), Lint und Typprüfung ohne Fehler, 23 E2E-Tests grün (Chromium). Kein eigener E2E-Test für PROJ-21: Alle Wege brauchen eine Entra-Anmeldung; der Zugriffsschutz von `/mein-zeitnachweis` ist in den PROJ-20-E2E-Tests abgedeckt.

### Acceptance Criteria Status

**Anfrage stellen**
- [x] AC-1 Knopf oben statt SharePoint-Hinweis, Link pro Tag bis heute (Ansicht-Test + Nutzer lokal)
- [x] AC-2 ältere Monate: kein Knopf, keine Links, Hinweis „Für ältere Monate …“
- [x] AC-3 Dialog aus der Tageszeile mit festem Datum, bisherigen Zeiten, Feld „Nachricht“
- [x] AC-4 Knopf oben: Datumsfeld mit min/max = erlaubte Tage des Monats; Server prüft zusätzlich
- [x] AC-5 leer / über 1'000 Zeichen → Meldung, nichts gespeichert (Browser und Server)
- [x] AC-6 gespeichert mit Person aus der Anmeldung, Datum, Nachricht, bisherigen Zeiten vom Server, Status offen; Meldung „Anfrage gesendet – Dein Vorgesetzter erhält sie in Teams.“ (gegen Dataverse geprüft)
- [x] AC-7 Speicherfehler → Meldung ohne Details, Dialog bleibt offen, Nachricht bleibt
- [x] AC-8 ohne Rolle, Datum ausserhalb der Frist, ausserhalb der sichtbaren Monate oder mit Injektion → abgelehnt; die Aktion nimmt keine Person entgegen

**Status im Zeitnachweis**
- [x] AC-9 „Korrektur angefragt (offen)“ / „Korrektur erledigt“
- [x] AC-10 mehrere Anfragen: neueste zählt, weitere Anfrage jederzeit möglich
- [ ] AC-11 „erledigt“ = korrigiert in Dataverse über den Zeitnachweis im Tool → **BUG-1**: Im Tool lassen sich falsche Arbeitszeiten nicht korrigieren

**Freigeber**
- [x] AC-12 alle Anfragen mit Anfragedatum (Schweizer Zeit), Status, Nachricht als Text
- [x] AC-13 kein Ändern/Löschen im Tool (keine Knöpfe; App-Benutzer hat nur Lesen + Erstellen)
- [x] AC-14 PDF unverändert, lädt keine Anfragen

**Flow (Abnahme durch den Nutzer)**
- [ ] AC-15 bis AC-17 (Karte an Manager, Fallback an Gruppen, „Erledigt“ → Status + Nachricht): Flow im Aufbau; Manager-Ermittlung und Fallback-Verzweigung laufen, Karte und „Erledigt“ noch nicht vollständig abgenommen

### Edge Cases Status
- [x] Tag ohne Einträge → „keine Einträge“ (Test)
- [x] Heutiger Tag anfragbar, morgen nicht (Test)
- [x] Monatswechsel: Frist = Vormonat bis heute (Tests zu `anfrageZeitraum`)
- [x] Mehrere Anfragen pro Tag (Test)
- [x] Doppelklick: Senden-Knopf während des Sendens gesperrt, Dialog lässt sich dann nicht schliessen
- [x] Flow fällt aus: Anfrage bleibt offen gespeichert, Tool unabhängig
- [x] Zeilenumbrüche/Sonderzeichen/HTML: als reiner Text angezeigt (Test mit `<b>`)
- [x] Person mit Rolle Mitarbeiter und Freigeber: stellt Anfragen über „Mein Zeitnachweis“

### Security Audit Results
- [x] Authentifizierung: `/mein-zeitnachweis` ohne Sitzung → `/login` (E2E)
- [x] Autorisierung: Person nur aus der Anmeldung; Rolle Mitarbeiter in der Server-Aktion geprüft; fremde Personen nicht anfragbar
- [x] Frist serverseitig (dieselbe reine Regel wie die Anzeige), Monate ausserhalb des sichtbaren Bereichs abgelehnt
- [x] OData-Injektion: Datum streng geprüft, E-Mail im Filter maskiert (Test mit `'`)
- [x] XSS im Tool: Nachricht nur als React-Text, kein `dangerouslySetInnerHTML`
- [x] Bisherige Zeiten und Link auf dem Server berechnet, nicht aus dem Browser
- [x] Fehlermeldungen ohne Personendaten, kein Logging von Inhalten
- [x] Minimalrechte: App-Benutzer nur Lesen + Erstellen; Status setzt nur der Flow
- [ ] Rate-Limiting: keines → BUG-3 (Low)
- [ ] Teams-Karte: Nachricht wird als Markdown dargestellt → BUG-2 (Low)

### Bugs Found

#### BUG-1: Falsche Arbeitszeiten lassen sich im Tool nicht korrigieren
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Mitarbeiter fragt an: „Gehen war 17:30 statt 16:30“
  2. Manager öffnet in Teams „Zeitnachweis öffnen“ (Freigeber-Ansicht, PROJ-13)
  3. Expected: bestehende Arbeitszeit ändern oder löschen
  4. Actual: Das Tool kann nur Einträge **hinzufügen** („Tag erfassen“), bei offenen Paaren **„Gehen“ nachtragen** und **Abwesenheiten löschen**. Arbeitszeit-Einträge sind weder änderbar noch löschbar. Hinzufügen ergibt eine Überschneidung („Einträge überschneiden sich“). Der Dialog sagt aber seit heute „Er korrigiert die Zeiten direkt im Zeitnachweis; die Änderung erscheint hier sofort.“
- **Workaround:** Korrektur direkt in der Dataverse-Tabelle (Power Apps) oder in SharePoint
- **Zusätzlich:** Ändert die Person den SharePoint-Eintrag später, überschreibt der tägliche SharePoint-Flow eine Korrektur in Dataverse
- **Priority:** Vor dem Deploy entscheiden: (a) Text in Dialog/Karte auf den tatsächlichen Weg anpassen (klein) oder (b) Arbeitszeiten im Zeitnachweis für Freigeber änderbar/löschbar machen (eigenes Feature, erfordert Ändern/Löschen-Rechte auf `bmvcc_timetrackingentry`)

#### BUG-2: Nachricht wird in der Teams-Karte als Markdown dargestellt
- **Severity:** Low
- **Steps to Reproduce:** Nachricht `[hier klicken](https://example.com)` oder `**fett**` senden → in der Teams-Karte erscheint ein Link bzw. Fettschrift. Name und bisherige Zeiten werden im Flow ungeschützt ins Karten-JSON eingesetzt (ein `"` im Namen würde die Karte brechen; praktisch nicht zu erwarten)
- **Risiko:** gering — nur angemeldete interne Mitarbeitende, Absender in der Karte sichtbar
- **Priority:** Nice to have (Flow-seitig, nicht im Repo)

#### BUG-3: Kein Limit für Anfragen
- **Severity:** Low
- **Steps to Reproduce:** Viele Anfragen hintereinander senden → jede erzeugt eine Teams-Karte beim Manager
- **Risiko:** gering — nur angemeldete Mitarbeitende, jede Anfrage mit Person nachvollziehbar gespeichert
- **Priority:** Nice to have

### Summary
- **Acceptance Criteria:** 13/14 im Tool bestanden (AC-11 → BUG-1); Flow-Kriterien AC-15–17 durch den Nutzer abzunehmen
- **Bugs Found:** 3 total (0 critical, 0 high, 1 medium, 2 low)
- **Security:** Pass (zwei Low-Hinweise)
- **Production Ready:** NOCH NICHT — keine Critical/High, aber BUG-1 (Weg der Korrektur) entscheiden und Flow fertig abnehmen
- **Recommendation:** BUG-1 entscheiden, Flow end-to-end testen, danach PROJ-20 und PROJ-21 gemeinsam deployen

## Deployment
_To be added by /deploy_
