# PROJ-15: Ferien erfassen und Feriensaldo

## Status: Approved
**Created:** 2026-10-26
**Last Updated:** 2026-10-27

## Dependencies
- Requires: PROJ-1 (Entra-ID-Login mit Rollen) — nur Freigeber
- Requires: PROJ-2 (Dataverse-Web-API-Anbindung) — Ferien sind Zeiteinträge in `bmvcc_timetrackingentry`
- Requires: PROJ-14 (Arbeitsmodell pro Person) — Pensum und Arbeitstage für den Anspruch und für die Frage, welche Tage Ferientage sind; Personendaten (Startsaldo-Stichtag)
- Requires: PROJ-13 (Zeitnachweis pro Monat) — Ferientage setzen dort das Soll auf 0 (Schnittstelle vorhanden), Erfassen-Dialog und Tageszeilen werden erweitert
- **Dataverse:** Aktivitätstyp um **3 = Ferien** und **4 = Frei** ergänzt (vom Nutzer, 2026-10-27). Für Ferienanspruch und Ferien-Startsaldo pro Person braucht es zusätzliche Angaben an der Person — Form in /architecture, vom Nutzer anzulegen. Rechte Erstellen/Schreiben/Löschen auf `bmvcc_timetrackingentry` für den App-Benutzer (Erstellen und Schreiben vorhanden, Löschen zu prüfen)

## Ausgangslage
In der Excel-Mappe wurden Ferienbezug und Feriensaldo pro Monat von Hand geführt. Die Erfassungs-App kennt bisher keinen Typ "Ferien". Der Zeitnachweis (PROJ-13) ist bereits vorbereitet: ein Ferientag setzt das Soll auf 0 und wird als "Ferien" angezeigt, Ferien + Arbeitszeit am selben Tag ergeben einen Hinweis.

Ferien werden wie Krankheit als **ganztägige Zeiteinträge** gespeichert (neuer Aktivitätstyp 3 = Ferien). Damit liegen alle Abwesenheiten an einem Ort, und auch die Erfassungs-App kann Ferien später selbst erfassen.

## User Stories
- Als Freigeber möchte ich Ferien einer Person für einen Zeitraum (von–bis) erfassen, damit ich nicht jeden Tag einzeln eintragen muss.
- Als Freigeber möchte ich auch künftige Ferien (geplant) erfassen und wieder löschen können, weil sich Ferienpläne ändern.
- Als Freigeber möchte ich einen halben Ferientag erfassen, damit halbe Freitage korrekt abgerechnet werden.
- Als Freigeber möchte ich pro Person sehen, wie viele Ferientage sie im Jahr zugut hat, bezogen und geplant hat und wie viele bleiben, damit ich die Excel-Ferienliste nicht mehr brauche.
- Als Freigeber möchte ich im Zeitnachweis sehen, wie viele Ferientage im Monat bezogen wurden und wie hoch der Feriensaldo ist.
- Als Freigeber möchte ich den Ferienanspruch pro Person festlegen (z.B. mehr Ferien ab einem bestimmten Alter), damit der Saldo stimmt.
- Als Freigeber möchte ich einen Tag als "Frei" kennzeichnen können, ohne dass er die Rechnung beeinflusst.

## Out of Scope
- Ferienanträge und Genehmigungs-Workflow durch Mitarbeitende — Erfassen nur durch Freigeber im Tool (bzw. später in der Erfassungs-App)
- Selbstansicht der Mitarbeitenden auf ihren Feriensaldo
- Verfall von Restferien, Auszahlung von Ferien, Ferienkürzung bei langer Krankheit — Restferien werden unbegrenzt übertragen
- Altersabhängiger Anspruch automatisch aus dem Geburtsdatum — der Anspruch wird pro Person von Hand gesetzt
- Ferien in Stunden — Ferien zählen in (Arbeits-)Tagen
- Bezahlte Absenzen mit Wirkung (Umzug, Hochzeit, Militär) — der Typ "Frei" ist nur eine Kennzeichnung ohne Rechenwirkung
- Ferienkalender/Teamübersicht im Kalenderformat (wer ist wann weg)
- PDF des Zeitnachweises inkl. Ferien — PROJ-16

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

**Zugriff**
- [ ] Angenommen ein Benutzer hat nur die Rolle "Bearbeiter", wenn er die Ferien-Seite oder eine Ferien-Aktion direkt aufruft, dann wird der Zugriff serverseitig verweigert

**Erfassen**
- [ ] Angenommen ein Freigeber erfasst Ferien für eine Person von–bis, wenn er speichert, dann wird für jeden Tag im Zeitraum, der laut Arbeitsmodell ein Soll hat und kein Feiertag ist, ein Ferien-Eintrag angelegt; Wochenenden, freie Tage und Feiertage werden übersprungen, und der Dialog zeigt vor dem Speichern, wie viele Ferientage das ergibt
- [ ] Angenommen der Zeitraum liegt ganz oder teilweise in der Zukunft, dann können die Ferien trotzdem erfasst werden (geplante Ferien)
- [ ] Angenommen ein Freigeber erfasst einen einzelnen Tag als "halber Ferientag", dann zählt er als 0.5 Ferientag, und das Soll dieses Tages wird halbiert (die andere Hälfte wird normal gestempelt)
- [ ] Angenommen an einem Tag im Zeitraum gibt es bereits Ferien, dann wird für diesen Tag kein zweiter Ferien-Eintrag angelegt; der Freigeber sieht, welche Tage übersprungen wurden
- [ ] Angenommen der Zeitraum ergibt keinen einzigen Ferientag (z.B. nur Wochenende), dann wird nichts gespeichert und eine verständliche Meldung angezeigt
- [ ] Angenommen eine Person hat für (Teile des) Zeitraums kein Arbeitsmodell, dann wird für diese Tage nichts angelegt und der Freigeber darauf hingewiesen
- [ ] Angenommen ein Freigeber klickt im Zeitnachweis auf einen Tag (auch in der Zukunft), dann kann er dort Ferien (ganzer oder halber Tag, optional bis-Datum) und "Frei" erfassen; Arbeitszeit, Krankheit und Komp. GLZ bleiben auf Tage bis heute beschränkt (PROJ-13)
- [ ] Angenommen ein Freigeber erfasst "Frei" für einen Tag, dann wird der Tag im Zeitnachweis als "Frei" gekennzeichnet, ohne Wirkung auf Soll, Ist, Gleitzeit und Ferien

**Löschen**
- [ ] Angenommen ein Ferien- oder Frei-Eintrag existiert, wenn der Freigeber ihn im Zeitnachweis (pro Tag) oder auf der Ferien-Seite (ganzer Zeitraum) löscht, dann wird er nach einer Bestätigung entfernt und Saldo und Zeitnachweis rechnen neu; Arbeitszeit, Krankheit und Komp. GLZ lassen sich im Tool nicht löschen

**Anspruch und Saldo**
- [ ] Angenommen für eine Person ist ein Ferienanspruch in Tagen pro Jahr bei 100 % erfasst (Vorgabe 25), dann ist ihr Anspruch eines Jahres = Anspruch × Pensum, anteilig nach den Tagen mit gültigem Arbeitsmodell (Eintritt, Austritt und Pensumswechsel mitten im Jahr), gerundet auf halbe Tage
- [ ] Angenommen für eine Person ist ein Ferien-Startsaldo in Tagen erfasst (am selben Stichtag wie der Gleitzeit-Startsaldo, PROJ-14), dann beginnt der Feriensaldo am Folgetag mit diesem Wert; danach kommt der Anspruch dazu (im Jahr des Stichtags nur anteilig ab dem Folgetag) und die Ferientage werden abgezogen
- [ ] Angenommen ein Jahr endet mit Restferien, dann werden sie ohne Verfall ins nächste Jahr übertragen
- [ ] Angenommen eine Person hat keinen Ferien-Startsaldo, dann beginnt der Feriensaldo mit 0 am Beginn ihrer Gleitzeit (PROJ-13: Tag nach dem Stichtag bzw. erste Arbeitsmodell-Version)
- [ ] Angenommen der Feriensaldo wird negativ, dann wird er angezeigt und deutlich als Warnung markiert (Erfassen bleibt erlaubt)

**Zeitnachweis (Erweiterung PROJ-13)**
- [ ] Angenommen ein Tag hat einen Ferien-Eintrag und laut Arbeitsmodell ein Soll, dann ist sein Soll 0 (halber Tag: halbes Soll), die Zeile zeigt "Ferien" bzw. "½ Ferien", und der Tag zählt als Ferienbezug
- [ ] Angenommen ein Monat wird angezeigt, dann zeigt die Übersicht zusätzlich "Ferien bezogen (Monat)" und "Feriensaldo" am Monatsende (laufender Monat: Stand heute, künftige Ferien des Monats als "geplant")

**Ferien-Seite**
- [ ] Angenommen ein Freigeber öffnet "Zeiterfassung · Ferien", dann sieht er für ein wählbares Jahr (Standard: aktuelles) alle Personen (ohne "nicht auswerten") mit Anspruch, Saldo Vorjahr, bezogen (bis heute), geplant (ab morgen) und Saldo Ende Jahr
- [ ] Angenommen ein Freigeber wählt auf der Ferien-Seite eine Person, dann sieht er ihre Ferien des Jahres als Zeiträume (von–bis, Anzahl Tage, bezogen/geplant) und kann neue erfassen oder bestehende löschen
- [ ] Angenommen ein Freigeber setzt auf der Personenseite (PROJ-14) Ferienanspruch und Ferien-Startsaldo, dann werden sie serverseitig geprüft (Anspruch 0–50 Tage, Startsaldo mit Stichtag, halbe Tage erlaubt) und wirken sofort auf Saldo und Übersicht

**Fehler**
- [ ] Angenommen das Speichern oder Löschen schlägt fehl, dann erscheint eine verständliche Meldung; bei einem Zeitraum wird gemeldet, wie viele Tage bereits gespeichert wurden

## Edge Cases
- **Ferien über Feiertage** (z.B. Weihnachten bis Neujahr): Feiertage werden nicht als Ferientage angelegt
- **Ferien an einem Tag ohne Soll** (z.B. Arbeitsmodell wird nachträglich geändert, der Tag ist danach frei): der Eintrag bleibt, zählt aber nicht als Ferientag; Zeile mit Hinweis "Ferien an einem Tag ohne Soll"
- **Krankheit während der Ferien** (beide Einträge am selben Tag): Krankheit überwiegt — der Tag zählt als Krankheit, kein Ferienbezug, Hinweis in der Zeile
- **Ferien und Arbeitszeit am selben Tag** (ganzer Ferientag): Ferien zählen, die Arbeitszeit erhöht die Gleitzeit, Hinweis (schon in PROJ-13)
- **Halber Ferientag und Arbeitszeit**: halbes Soll, Ist = Arbeitszeit — der Normalfall
- **Halber Ferientag an einem Tag ohne Soll**: wird nicht angelegt (wie ganze Tage)
- **Pensum ändert sich mitten im Jahr**: Anspruch anteilig je Version; ein Ferientag ist immer ein Arbeitstag der Person (bei 40 % an 2 Tagen ist eine Ferienwoche = 2 Tage)
- **Eintritt / Austritt mitten im Jahr**: Anspruch anteilig; nach dem Austritt keine Ferien mehr erfassbar (Tage ohne Arbeitsmodell)
- **Ferien vor dem Stichtag des Startsaldos** (Excel-Zeitraum): werden angezeigt, zählen aber nicht zum Saldo — der Startsaldo enthält sie bereits
- **Doppelte Erfassung** (zwei Freigeber gleichzeitig): pro Tag höchstens ein Ferien-Eintrag; Doppelungen werden beim Anlegen geprüft, verbleibende zählen nur einmal
- **Ferien in der Erfassungs-App** (später): Einträge vom Typ Ferien aus der App werden gleich behandelt
- **Anspruch wird nachträglich geändert**: wirkt auf alle Jahre ab dem Stichtag (Saldo wird live berechnet)

## Technical Requirements (optional)
- Security: nur Freigeber, serverseitig auf Seiten- und Aktionsebene; Ferien sind Personendaten — nicht in Logs oder im Repo
- Alle Daten in Schweizer Zeit; Ferien in Tagen mit einer Nachkommastelle (halbe Tage)
- Ganztägige Einträge brauchen ein "Kommen" (Tagesbeginn), sonst scheitert der Power-Automate-Flow (Befund PROJ-13, 2026-10-27)

## Open Questions
- [x] Wird der Jahresanspruch am 1. Januar ganz gutgeschrieben oder monatlich aufgebaut? → am Jahresbeginn ganz gutgeschrieben; im Jahr von Eintritt bzw. Stichtag anteilig ab diesem Tag (Nutzer, 2026-10-27)
- [x] Wie wird ein halber Ferientag gekennzeichnet? → eigene Ja/Nein-Spalte "Halber Tag" am Zeiteintrag (Tech Design)
- [x] Nutzer: Spalte "Halber Tag" (`bmvcc_halbertag`), Spalten "Ferienanspruch" und "Ferien-Startsaldo", Recht "Löschen" → angelegt und verifiziert 2026-10-27
- [ ] Soll die Erfassungs-App künftig selbst Ferien/Frei erfassen können? (betrifft die App, nicht dieses Tool)

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Ferien als neuer Aktivitätstyp (3 = Ferien) in den Zeiteinträgen statt eigener Ferien-Tabelle | Alle Abwesenheiten an einem Ort, gleiche Logik wie Krankheit, später auch in der Erfassungs-App erfassbar (Nutzer-Entscheidung) | 2026-10-27 |
| Erfassen von–bis, angelegt nur für Tage mit Soll (ohne Wochenenden, freie Tage, Feiertage); auch künftige Tage | Ein Ferientag ist ein Arbeitstag der Person; geplante Ferien gehören in den Saldo (Nutzer-Entscheidung) | 2026-10-27 |
| Halbe Ferientage (0.5, halbes Soll) für einzelne Tage | Halbe Freitage sind üblich (Nutzer-Entscheidung) | 2026-10-27 |
| Anspruch = Tage pro Jahr bei 100 % pro Person (Vorgabe 25) × Pensum, anteilig | Unterschiedliche Ansprüche (z.B. Alter) ohne Sonderlogik; Teilzeit korrekt in eigenen Arbeitstagen (Nutzer-Entscheidung) | 2026-10-27 |
| Ferien-Startsaldo am Stichtag der Gleitzeit, Restferien ohne Verfall übertragen | Übernahme aus Excel wie bei der Gleitzeit; keine Jahresabschlüsse nötig (Nutzer-Entscheidung) | 2026-10-27 |
| Anzeige im Zeitnachweis und auf einer eigenen Seite "Ferien" (Jahresübersicht aller Personen) | Monatsbezug beim Nachweis, Jahresstand für die Planung (Nutzer-Entscheidung) | 2026-10-27 |
| Ferien- und Frei-Einträge im Tool löschbar, andere Typen nicht | Geplante Ferien ändern sich; gestempelte Zeiten bleiben unverändert (Nutzer-Entscheidung) | 2026-10-27 |
| Krankheit während der Ferien überwiegt (kein Ferienbezug) | Übliche Regel: Krankheit verbraucht keine Ferien (Nutzer-Entscheidung) | 2026-10-27 |
| Typ "Frei" (4) nur Kennzeichnung ohne Rechenwirkung | Vom Nutzer so festgelegt; bezahlte Absenzen mit Wirkung sind nicht Teil dieses Features | 2026-10-27 |
| Ferien in Tagen statt Stunden | Wie bisher in Excel; unabhängig vom Soll pro Tag | 2026-10-27 |
| Jahresanspruch wird am 1. Januar ganz gutgeschrieben (Eintritts-/Stichtagsjahr anteilig) | Saldo zeigt sofort, was im Jahr noch geplant werden kann (Nutzer-Entscheidung) | 2026-10-27 |

### Technical Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Ferien und Frei als Zeiteinträge (Typ 3/4), ein Eintrag pro Ferientag; Zeiträume nur in der Anzeige zusammengefasst | Gleiche Tabelle und Abfrage wie die übrigen Einträge; einzeln löschbar; Muster auch für die Erfassungs-App | 2026-10-27 |
| Halber Ferientag über eigene Ja/Nein-Spalte am Zeiteintrag | Eindeutig; eine Gehen-Zeit würde der Flow als Arbeitszeit werten | 2026-10-27 |
| Ferienanspruch und Ferien-Startsaldo als Spalten an der Person, gemeinsamer Stichtag mit der Gleitzeit | Je ein Wert pro Person; eine Übernahme aus Excel | 2026-10-27 |
| Ganztägige Ferien/Frei-Einträge mit Kommen = Tagesbeginn, ohne Gehen | Der Flow braucht ein Kommen (Befund PROJ-13) | 2026-10-27 |
| Vorschau der Ferientage serverseitig mit denselben Regeln wie beim Speichern | Ergebnis hängt von Arbeitsmodell, Feiertagen und bestehenden Einträgen ab | 2026-10-27 |
| Löschen nur von Ferien/Frei, Typ vor dem Löschen neu gelesen | Das Dataverse-Recht gilt für alle Einträge; das Tool beschränkt es | 2026-10-27 |
| Anspruch anteilig nach Kalendertagen mit gültigem Arbeitsmodell × Pensum, gerundet auf halbe Tage | Eintritt, Austritt und Pensumswechsel ohne Sonderfälle | 2026-10-27 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Ausgangslage
- PROJ-13 und PROJ-14 sind gebaut (Branch `zeiterfassung`, Approved). Vorhanden sind:
  - Rechenregeln für Soll, Feiertage und Zeitnachweis; der Zeitnachweis nimmt bereits Ferientage entgegen (Soll 0, Grund "Ferien");
  - der Dialog "Eintrag erfassen" und das Anlegen von Zeiteinträgen mit den Feldern der Erfassungs-App;
  - die Personenseite mit Startsaldo und Stichtag.
- Dataverse: Aktivitätstyp 3 = Ferien und 4 = Frei vom Nutzer angelegt (2026-10-27). Der App-Benutzer darf Zeiteinträge lesen, erstellen und ändern, aber **nicht löschen** (geprüft 2026-10-27).
- Ganztägige Einträge brauchen ein "Kommen", sonst scheitert der Flow (Befund PROJ-13).

### A) Bausteine
```
Zeiterfassung (Unterseiten-Leiste): Zeitnachweis · Personen · Ferien (neu)

/zeiterfassung/ferien (nur Freigeber)
+-- Jahr wählen (Vor/Zurück, Standard: aktuelles Jahr)
+-- Jahresübersicht aller Personen (ohne "nicht auswerten")
|   +-- Spalten: Person · Anspruch · Saldo Vorjahr · bezogen (bis heute) · geplant (ab morgen) · Saldo Ende Jahr
|   +-- negativer Saldo rot markiert; Personen ohne Arbeitsmodell mit Hinweis
|   +-- Klick auf eine Person → Ferien dieser Person im Jahr
+-- Ferien einer Person (gleiche Seite, Person in der Adresse)
    +-- Zeiträume des Jahres: von–bis · Anzahl Tage (½ sichtbar) · bezogen/geplant · Löschen (mit Bestätigung)
    +-- "Ferien erfassen" → Dialog (siehe unten)

Dialog "Ferien erfassen" (auf der Ferien-Seite und im Zeitnachweis)
+-- von · bis (bei einem einzelnen Tag zusätzlich "halber Tag")
+-- Vorschau vor dem Speichern: "ergibt 8 Ferientage; übersprungen: 2 Feiertage, 1 bereits Ferien, 3 ohne Arbeitsmodell"
+-- Bemerkung (optional)

Zeitnachweis (Erweiterung PROJ-13)
+-- Dialog "Eintrag erfassen": neue Arten "Ferien" und "Frei"; auch an künftigen Tagen (dort nur diese beiden)
+-- Tageszeile: "Ferien" / "½ Ferien" / "Frei"; Ferien- und Frei-Einträge mit "löschen"
+-- Hinweise: "Ferien an einem Tag ohne Soll", "Krankheit während der Ferien"
+-- Übersicht: neue Kennzahlen "Ferien bezogen (Monat)" und "Feriensaldo" (laufender Monat: Stand heute, plus geplant)

Personenseite (Erweiterung PROJ-14)
+-- Ferienanspruch (Tage pro Jahr bei 100 %, Vorgabe 25) · Ferien-Startsaldo (Tage) am bestehenden Stichtag

Server (Freigeber-Prüfung, Prüfung der Eingaben)
+-- Ferien vorab berechnen (Vorschau) · Ferien anlegen · Ferien/Frei löschen
+-- Ferienanspruch und Ferien-Startsaldo speichern (bestehende Personen-Aktion)

Rechenregeln (rein, eigens getestet)
+-- Ferientage eines Zeitraums: Tage mit Soll laut Arbeitsmodell, ohne Feiertage, ohne bestehende Ferien
+-- Anspruch eines Jahres: Anspruch × Pensum, anteilig nach Tagen mit gültigem Arbeitsmodell (ab Beginn), gerundet auf halbe Tage
+-- Feriensaldo an einem Datum: Startsaldo + Ansprüche der Jahre − bezogene Ferientage (Krankheit überwiegt, Tage ohne Soll zählen nicht)
```

### B) Datenmodell (in Worten)
**Ferien und Frei** sind Zeiteinträge in der bestehenden Tabelle (`bmvcc_timetrackingentry`):
- Typ 3 = Ferien bzw. 4 = Frei, ein Eintrag pro Tag;
- E-Mail und Aktivitätsdatum wie bei den übrigen Einträgen;
- "Kommen" = Tagesbeginn (00:00 Schweizer Zeit), "Gehen" leer — wie die ganztägigen Einträge aus PROJ-13.

**Neu vom Nutzer anzulegen:**
1. **Zeiteintrag:** Ja/Nein-Spalte **"Halber Tag"** (Standard Nein). Kennzeichnet einen halben Ferientag. Eine eigene Spalte ist eindeutig, auch für die Erfassungs-App und Auswertungen in Dataverse.
2. **Zeiterfassung Person:**
   - **Ferienanspruch** (Dezimalzahl, 1 Nachkommastelle; Tage pro Jahr bei 100 %; leer = Vorgabe 25);
   - **Ferien-Startsaldo** (Dezimalzahl, 1 Nachkommastelle; Tage, auch negativ).
   - Der Stichtag ist der bestehende Startsaldo-Stichtag (gemeinsam für Gleitzeit und Ferien).
3. **Recht "Löschen"** auf `bmvcc_timetrackingentry` für den App-Benutzer "# OBSI Hofer Admin". Das Tool löscht damit ausschliesslich Einträge vom Typ Ferien und Frei.

**Berechnung (nichts gespeichert, wie PROJ-13):**
- **Beginn:** Der Feriensaldo beginnt am selben Tag wie die Gleitzeit: Tag nach dem Stichtag, sonst erste Arbeitsmodell-Version. Startwert ist der Ferien-Startsaldo, sonst 0.
- **Anspruch:** Am 1. Januar jedes Jahres wird der Jahresanspruch gutgeschrieben, im Jahr des Beginns ab dem Beginn. Er ist anteilig nach Kalendertagen mit gültigem Arbeitsmodell und dem jeweiligen Pensum und wird auf halbe Tage gerundet.
- **Ferientag:**
  - Ein Ferien-Eintrag an einem Tag mit Soll laut Arbeitsmodell zählt 1 Tag, mit "Halber Tag" 0.5.
  - Kein Ferientag ist ein Tag ohne Soll, ein Feiertag oder ein Tag mit Krankheits-Eintrag; diese Fälle bekommen einen Hinweis.
  - Ferien vor dem Beginn werden angezeigt, zählen aber nicht.
- **Zeitnachweis:** Ein ganzer Ferientag hat Soll 0, ein halber Ferientag das halbe Soll.
- **Bezogen / geplant:** Bezogen sind Ferientage bis und mit heute, geplant die Ferientage ab morgen. "Saldo Ende Jahr" zieht beide ab.

### C) Technische Entscheidungen (Begründung)
- **Ferien als Zeiteinträge (Typ 3) statt eigener Tabelle** (Product Decision): Ferien laden mit derselben Abfrage wie die übrigen Einträge, und der Flow läuft mit.
- **Ein Eintrag pro Ferientag statt einer von–bis-Zeile:** passt zur Tabelle, die pro Tag denkt. Einzelne Tage lassen sich löschen, und die Erfassungs-App kann später dasselbe Muster nutzen. Zeiträume entstehen erst in der Anzeige: aufeinanderfolgende Ferientage werden zusammengefasst, freie Tage dazwischen unterbrechen nicht.
- **Eigene Spalte "Halber Tag"** statt einer Uhrzeit-Konvention (z.B. Gehen = 12:00): eindeutig, und der Flow würde eine Gehen-Zeit als Arbeitszeit behandeln.
- **Anspruch und Ferien-Startsaldo an der Person, gemeinsamer Stichtag:** eine Übernahme aus Excel für beides. Keine eigene Tabelle, weil es pro Person je einen Wert gibt.
- **Vorschau vor dem Speichern (Server):** Welche Tage Ferientage werden, hängt von Arbeitsmodell, Feiertagen und bestehenden Einträgen ab. Der Server rechnet die Vorschau mit denselben Regeln wie beim Speichern.
- **Anlegen nacheinander mit Teil-Meldung:** wie beim Erfassen in PROJ-13. Bei einem Fehler mitten im Zeitraum wird gemeldet, wie viele Tage gespeichert sind; ein zweiter Versuch überspringt sie, weil bestehende Ferien nicht doppelt angelegt werden.
- **Löschen nur Ferien/Frei, serverseitig geprüft:** Das Löschrecht in Dataverse gilt für alle Einträge, das Tool beschränkt es. Vor dem Löschen wird der Typ jedes Eintrags neu gelesen.
- **Saldo live berechnet:** eine Abfrage der Ferien- und Krankheits-Einträge der Person ab Beginn; für die Jahresübersicht eine Abfrage für alle Personen (geringe Menge, rund 25 Einträge pro Person und Jahr).
- **Gemeinsame Rechenregeln:** Ferientag-Bestimmung, Anspruch und Saldo werden im Zeitnachweis, auf der Ferien-Seite und später im PDF (PROJ-16) gleich gerechnet.

### D) Abhängigkeiten (Pakete)
Keine neuen Pakete.

### E) Tests
- **Ferientage eines Zeitraums:** über Feiertage, Wochenenden, Teilzeit (2 Tage pro Woche), Modellwechsel, ohne Arbeitsmodell, bestehende Ferien, halber Tag.
- **Anspruch:**
  - 100 %, 40 %, Pensumswechsel, Eintritt und Austritt mitten im Jahr;
  - Stichtagsjahr anteilig; Rundung auf halbe Tage; Schaltjahr.
- **Saldo:** Startsaldo, Jahreswechsel mit Vortrag, negativer Saldo, Krankheit überwiegt, Ferien an Tag ohne Soll, Ferien vor dem Beginn, bezogen und geplant.
- **Zeitnachweis:** halber Ferientag mit Arbeitszeit, Kennzahlen.
- **Aktionen:**
  - Bearbeiter abgelehnt; Vorschau gleich Speichern; Zeitraum ohne Ferientag; Teil-Speicherung;
  - Löschen nur Ferien/Frei; Anspruch 0–50 Tage; Ferien-Startsaldo ohne Stichtag.
- **Komponenten:** Jahresübersicht, Zeiträume, Dialog mit Vorschau, Löschen mit Bestätigung.
- **Manuell lokal:** Ferien über Weihnachten erfassen und löschen, halber Tag, Saldo über den Jahreswechsel, Flow läuft.

### F) Vorgehen
1. Nutzer legt in Dataverse an:
   - Spalte "Halber Tag" am Zeiteintrag;
   - Spalten "Ferienanspruch" und "Ferien-Startsaldo" an der Person;
   - Recht "Löschen" auf `bmvcc_timetrackingentry`.
2. Schema lesen (nur lesend) und in den Implementation Notes festhalten.
3. Bauen auf dem Branch `zeiterfassung`, nur lokal testen — kein Push auf `main`, kein Deploy bis zur Freigabe.

## Implementation Notes

### Dataverse-Schema (gelesen 2026-10-27, nur lesend)
- Aktivitätstyp (`bmvcc_activitytype`): 3 = Ferien, 4 = Frei (vom Nutzer ergänzt)
- Zeiterfassung Person: `bmvcc_ferienanspruch` und `bmvcc_ferienstartsaldo` (Dezimal, 1 Nachkommastelle)
- Recht "Löschen" auf `bmvcc_timetrackingentry` (Global) erteilt
- Spalte "Halber Tag" (Ja/Nein): zuerst mit dem Namen `bmvcc_timetrackingentry` (gleich wie die Tabelle) angelegt, vom Nutzer gelöscht und als **`bmvcc_halbertag`** neu angelegt — verifiziert 2026-10-27, Abfragen des Tools laufen lesend fehlerfrei

### Umsetzung Frontend + Backend (2026-10-27, Branch `zeiterfassung`, nur lokal)
**Rechenregeln** `src/lib/zeiterfassung/ferien.ts` (rein, für Zeitnachweis, Ferien-Seite und PDF):
- `ferientagWert`: 1 / 0.5 / 0 — Krankheit überwiegt, Feiertage und Tage ohne Soll zählen nicht
- `ferienBeginn`: Tag nach dem Stichtag, sonst erste Arbeitsmodell-Version
- `anspruchImJahr`: Anspruch (Vorgabe 25) × Pensum, anteilig nach Kalendertagen mit gültigem Arbeitsmodell, ab Beginn bzw. 1. Januar, auf halbe Tage gerundet
- `feriensaldoAm`, `ferienJahr` (Saldo Vorjahr, Anspruch, bezogen bis heute, geplant ab morgen, Saldo Ende Jahr)
- `planeFerien` (Vorschau = Speichern): Tage mit Soll, übersprungen Feiertage / ohne Soll / ohne Arbeitsmodell / bereits Ferien
- `ferienZeitraeume`: aufeinanderfolgende Ferientage zusammengefasst, freie Tage und Feiertage dazwischen unterbrechen nicht

**Zeitnachweis (PROJ-13)**
- Tagesauswertung kennt Ferien (ganz/halb), Frei und die ganztägigen Einträge.
- Ganzer Ferientag: Soll 0. Halber Ferientag: halbes Soll.
- Neue Hinweise "Krankheit während der Ferien" und "Ferien an einem Tag ohne Soll".
- Neue Kennzahlen "Ferien im Monat" (bezogen + geplant) und "Feriensaldo Monatsende", negativ rot.
- Die Datumszelle ist auch an künftigen Tagen klickbar, dort nur Ferien/Frei. Ferien/Frei pro Tag mit "löschen".

**Aktionen** (`src/app/(protected)/zeiterfassung/actions.ts`)
- `planeFerienAction` und `erfasseFerienAction`:
  - Zeitraum höchstens 1 Jahr; halber Tag nur für einen Tag.
  - Ein Eintrag pro Ferientag, Kommen = Tagesbeginn.
  - Bestehende Ferientage werden übersprungen, damit ein zweiter Versuch nichts doppelt anlegt.
- `erfasseTagAction` erlaubt Typ "frei", auch in der Zukunft.
- `loescheAbwesenheitenAction` liest den Typ jedes Eintrags neu und löscht nur Ferien/Frei.

**Seiten / Komponenten**
- `/zeiterfassung/ferien?jahr=…&person=…`:
  - Jahresübersicht aller Personen (ohne "nicht auswerten") und Zeiträume der gewählten Person.
  - Geladen mit einer Abfrage für Ferien und Krankheit aller Personen ab dem frühesten Beginn.
- Neue Komponenten:
  - `ferien-felder.tsx`: von–bis, halber Tag, Vorschau vom Server;
  - `ferien-erfassen.tsx`: Dialog "Ferien erfassen";
  - `abwesenheit-loeschen.tsx`: Löschen mit Bestätigung;
  - `ferien-uebersicht.tsx`: Jahresübersicht und Zeiträume einer Person.
- Unterseiten-Leiste "Ferien".
- Personenseite mit Ferienanspruch und Ferien-Startsaldo. Der Stichtag ist gemeinsam; er ist Pflicht, sobald einer der beiden Startsaldi erfasst ist.

**Tests:** 40 neue Tests; gesamt 615 grün, `tsc` und ESLint sauber. Ein Test fand dabei einen Fehler (Saldo Vorjahr leer, wenn der Saldo am 1. Januar beginnt) — behoben.

## QA Test Results

**Tested:** 2026-10-27
**App URL:** http://localhost:3000 (Branch `zeiterfassung`, nur lokal)
**Tester:** QA Engineer (AI) + Browser-Test durch den Nutzer (Testanleitung Punkte 1–6)

### Acceptance Criteria Status

#### Zugriff
- [x] Bearbeiter: Ferien-Seite zeigt nur den Hinweis; Vorschau, Erfassen und Löschen lehnen serverseitig ab (`actions.test.ts`); ohne Login → `/login` (E2E)

#### Erfassen
- [x] Von–bis legt nur Tage mit Soll an, ohne Wochenenden, freie Tage und Feiertage. Die Vorschau zeigt vor dem Speichern die Anzahl Ferientage und was übersprungen wird (`planeFerien`, Nutzer-Test über Weihnachten).
- [x] Künftige Ferien möglich.
- [x] Halber Ferientag nur für einen Tag: 0.5 Tage, halbes Soll.
- [x] Bestehende Ferien werden nicht doppelt angelegt; die Vorschau zeigt "bereits Ferien".
- [x] Zeitraum ohne Ferientag wird abgelehnt; die Meldung nennt seit dem Nutzer-Test den Grund.
- [x] Tage ohne Arbeitsmodell werden übersprungen und gemeldet.
- [x] Zeitnachweis: Klick auf einen künftigen Tag bietet nur Ferien und Frei an.
- [x] Frei: nur Kennzeichnung, ohne Rechenwirkung.

#### Löschen
- [x] Ferien und Frei lassen sich mit Bestätigung löschen, im Zeitnachweis pro Tag und auf der Ferien-Seite pro Zeitraum. Andere Typen nie, der Typ wird vor dem Löschen neu gelesen.

#### Anspruch und Saldo
- [x] Anspruch (Vorgabe 25) × Pensum, anteilig bei Eintritt, Austritt und Pensumswechsel, auf halbe Tage gerundet.
- [x] Startsaldo am Tag nach dem Stichtag; Gutschrift am 1. Januar; Restferien ohne Verfall übertragen.
- [x] Ohne Ferien-Startsaldo Beginn mit 0 (Stichtag bzw. erste Version).
- [x] Negativer Saldo rot, Erfassen bleibt erlaubt.

#### Zeitnachweis
- [x] Ferientag: Soll 0, "Ferien"; halber Tag: halbes Soll, "½ Ferien".
- [x] Kennzahlen "Ferien im Monat" (bezogen + geplant) und "Feriensaldo Monatsende".

#### Ferien-Seite
- [x] Jahresübersicht mit Saldo Vorjahr, Anspruch, bezogen, geplant und Saldo Ende Jahr.
- [x] Zeiträume der gewählten Person mit Erfassen und Löschen.
- [x] Personenseite: Ferienanspruch 0–50, Ferien-Startsaldo nur mit Stichtag.

#### Fehler
- [x] Meldung bei Fehlern; Teil-Speicherung wird gemeldet, ein zweiter Versuch ergänzt nur die fehlenden Tage.

### Edge Cases Status
- [x] Ferien über Feiertage (Weihnachten, Neujahr)
- [x] Ferien an Tag ohne Soll: zählen nicht, Hinweis
- [x] Krankheit während der Ferien: Krankheit überwiegt, Hinweis
- [x] Ferien + Arbeitszeit, halber Tag + Arbeitszeit
- [x] Pensumswechsel, Eintritt, Austritt (Anspruch anteilig); Teilzeit: Ferientage sind eigene Arbeitstage
- [x] Ferien vor dem Stichtag: angezeigt, zählen nicht
- [x] Doppelte Erfassung: ein Tag zählt höchstens einmal (siehe BUG-3)
- [x] Anspruch nachträglich geändert: wirkt sofort (live gerechnet)
- [x] Saldo beginnt am 1. Januar: "Saldo Vorjahr" = Startsaldo (Fehler beim Bauen gefunden und behoben)

### Daten-Check (lesend, 2026-10-27, nur Zählungen)
Testeinträge in Dataverse:
- 18 Ferien, 1 Frei, 1 halber Tag;
- alle mit Kommen = Tagesbeginn, ohne Gehen, Code `JJJJMMTT0000`;
- der Flow ist bei allen gelaufen (Tagestotal gesetzt).

### Security Audit Results
- [x] Authentifizierung: `/zeiterfassung/ferien` hinter dem Login (E2E)
- [x] Autorisierung: Freigeber-Prüfung auf Seite und allen Aktionen
- [x] Löschrecht in Dataverse gilt für alle Einträge; das Tool löscht nur Ferien/Frei (Typ vor dem Löschen neu gelesen, Test "never deletes other types")
- [x] Eingaben: IDs per Zod-GUID, Daten und Zeitraum (max. 1 Jahr) geprüft, Person muss in der Zeiterfassung vorkommen; E-Mail in OData-Filtern escaped
- [x] Keine Personendaten in Logs oder Fehlermeldungen
- [x] Gefundener Laufzeitfehler (Server-Seite rief Funktion aus Client-Datei auf) behoben; Regel als Merkpunkt gespeichert

### Automatisierte Tests
- [x] `npm test`: 51 Dateien, 615 Tests grün
- [x] `npm run test:e2e`: 34/34 grün (neu: `tests/PROJ-15-ferien-erfassen-und-feriensaldo.spec.ts`)

### Bugs Found

#### BUG-1: Ganzer Ferientag lässt sich nicht direkt in einen halben ändern
- **Severity:** Low
- **Steps to Reproduce:** 1. Tag als Ferien erfassen 2. Im Zeitnachweis denselben Tag als halben Ferientag erfassen 3. Expected: Umstellung auf ½ 4. Actual: "Kein Ferientag zu erfassen — übersprungen: 1 bereits Ferien" (vom Nutzer gefunden); Umweg: Tag löschen, neu als halben Tag erfassen
- **Priority:** Nice to have
- **Status:** ✅ Behoben (2026-10-27) — bestehende Ferientage werden beim Erfassen auf ganz bzw. halb umgestellt (Spalte "Halber Tag" geändert); die Vorschau zeigt "1 bestehender Ferientag wird umgestellt". Gleicher Typ wird weiterhin als "bereits Ferien" übersprungen

#### BUG-2: Ferien über den Jahreswechsel werden auf der Ferien-Seite pro Jahr getrennt
- **Severity:** Low
- **Steps to Reproduce:** 1. Ferien 21.12.2026–08.01.2027 erfassen 2. Ferien-Seite 2026 öffnen 3. Expected: ein Zeitraum 4. Actual: Zeitraum endet am 31.12.; "löschen" entfernt nur den Teil von 2026, der Rest steht unter 2027
- **Priority:** Nice to have
- **Status:** ✅ Behoben (2026-10-27) — die Ferien-Seite lädt Vor- und Folgejahr mit und zeigt jeden Zeitraum, der das Jahr berührt, ganz (`ferienZeitraeumeImJahr`); "löschen" entfernt den ganzen Zeitraum. Die Zahlen der Jahresübersicht zählen weiterhin nur Tage des gewählten Jahres

#### BUG-3: Gleichzeitiges Erfassen durch zwei Freigeber kann doppelte Ferien-Einträge erzeugen
- **Severity:** Low
- **Steps to Reproduce:** zwei Freigeber speichern gleichzeitig Ferien für denselben Tag
- **Actual:** zwei Einträge; der Tag zählt trotzdem nur einmal und beide werden zusammen gelöscht — nur kosmetisch
- **Priority:** Nice to have
- **Status:** ✅ Behoben (2026-10-27) — nach dem Speichern werden Doppelungen im Zeitraum bereinigt; behalten wird pro Tag der Eintrag mit der kleinsten ID (feste Regel, damit zwei gleichzeitige Bereinigungen nicht beide löschen)

### Summary
- **Acceptance Criteria:** alle erfüllt
- **Bugs Found:** 3 total (0 critical, 0 high, 0 medium, 3 low) — alle behoben 2026-10-27 (620 Tests grün)
- **Security:** Pass
- **Production Ready:** YES (fachlich) — Deploy erst nach Nutzer-Freigabe der Zeiterfassung
- **Recommendation:** Low-Bugs nach Wunsch; weiter mit PROJ-16 (Zeitnachweis als PDF)

## Deployment
_To be added by /deploy_
