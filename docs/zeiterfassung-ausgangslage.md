# Ausgangslage Zeiterfassung OBSI Hofer – Stand 2026-10-26

Grundlage für `/write-spec` (neues Feature im Admin-Tool). Zusammengestellt aus der bisherigen Excel-Lösung und dem Dataverse-Schema, rein lesend. Personendaten (Namen, Zeiten) sind bewusst nicht enthalten.

## Heute: Excel-Arbeitsmappe `zeiterfassung.xlsx`

| Blatt | Inhalt |
| --- | --- |
| `query`, `Tabelle_query` | Rohdaten, rund 1'425 Einträge, per Datenverbindung (`query.iqy`) aus Dataverse/SharePoint gezogen |
| `xxxx YY-26` | Monatsblatt pro Person: Check-in Vor- und Nachmittag, Pause, Feierabend, Ist, Soll, Differenz, Gleitzeit, Ferienbezug, Feriensaldo, Mittag, Bemerkung |
| `Berechnungen Ferien, GLZ, Solls` | Hilfsberechnungen für Ferien, Gleitzeit (GLZ) und Sollzeiten |
| `Tabelle1` | Hilfstabelle |

Spalten der Rohdaten: Titel, Aktivitätsdatum, Name, Arbeitsbeginn (AStart), Pausenbeginn (PStart), Pausenende (PEnde), Arbeitsende (AEnde), Arbeitszeit, AZNetto, Mittagessen, Bemerkung, Monat, Jahr, Kalenderwoche, Aktivitätstyp, ID.

Die Auswertung (Ist/Soll, Gleitzeit, Ferien) passiert heute in Excel-Formeln. Diese Regeln müssen im neuen Tool nachgebaut werden — die genauen Formeln sind in den Specs zu klären.

## Datenquelle: Dataverse-Tabelle `bmvcc_timetrackingentry`

Anzeigename "Time Tracking Entry", Entity-Set `bmvcc_timetrackingentries`, gleiche Dataverse-Umgebung wie das Admin-Tool (`obsi-hofer-admin`).

| Spalte | Typ | Bedeutung (Anzeigename) |
| --- | --- | --- |
| `bmvcc_useremail` | Text | Mitarbeiter (E-Mail) |
| `bmvcc_activitydate` | Datum/Zeit | Aktivitätsdatum |
| `bmvcc_activitytype` | Auswahl | Aktivitätstyp |
| `bmvcc_kommen` / `bmvcc_gehen` | Datum/Zeit | Kommen / Gehen |
| `bmvcc_activitystarttime` / `bmvcc_checkouttime` | Datum/Zeit | Arbeitsbeginn / Checkout |
| `bmvcc_pausestarttime` / `bmvcc_pauseendtime` | Datum/Zeit | Pausenbeginn / -ende |
| `bmvcc_networkinghours` | Dezimal | Arbeitszeit netto (aznetto) |
| `bmvcc_aznetto4` | Dezimal | aznetto4 |
| `bmvcc_tagestotal` / `bmvcc_monatstotal` | Ganzzahl | Tages- / Monatstotal |
| `bmvcc_mittagessen`, `bmvcc_essen`, `bmvcc_abendessen` | Ja/Nein | Mittagessen / Abendessen |
| `bmvcc_remarks` | Text | Bemerkung |
| `bmvcc_recordid`, `bmvcc_timerecordid`, `bmvcc_timetrackingid` | Zahl/Text | IDs aus dem Vorsystem (id, zeitrecid, zeiterfassungid) |
| `bmvcc_activitydatetimecode` | Text | aktivitaetsdatumzeit |
| `bmvcc_statecode`, `bmvcc_statuscode`, `bmvcc_versionnumber`, `bmvcc_importsequencenumber`, … | | offenbar aus einem Import übernommene Systemfelder |

Beobachtungen:
- Mehrere Felder wirken doppelt (z.B. Kommen/Gehen vs. Arbeitsbeginn/Checkout, drei Mittagessen-Felder, zwei AZ-netto-Felder) — welche massgeblich sind, ist offen.
- Die Werte des Aktivitätstyps (Auswahlliste) sind noch nicht ausgelesen.
- Der App-Benutzer des Admin-Tools hat **keinen** Lesezugriff auf die Daten (403, geprüft 2026-10-26). Für das Feature braucht der App-Benutzer "# OBSI Hofer Admin" zusätzliche Rechte auf diese Tabelle.

## Bezug zum Admin-Tool

- Gleiche Dataverse-Umgebung, gleicher Login (Entra ID mit App-Rollen), gleiche Dataverse-Anbindung (PROJ-2) — kann direkt genutzt werden.
- Neue Zielgruppe: Bisher nutzen nur Bearbeiter und Freigeber das Tool, die Zeiterfassung betrifft potenziell alle Mitarbeitenden (Rollen klären).
- Das GitHub-Repo ist öffentlich (Vercel Hobby): keine Personendaten, Exporte oder die Excel-Datei ins Repo.

## Offene Fragen für `/write-spec`

- Wer nutzt das Tool: nur Mitarbeitende für sich selbst, und/oder jemand für alle (Lohn/Administration)?
- Erfassen die Mitarbeitenden neu im Tool, oder nur Auswertung der bestehenden Einträge?
- Welche Regeln gelten für Soll, Gleitzeit und Ferien (Pensen, Feiertage, Übertrag)?
- Woher kommen die Einträge heute (welche App/welches Formular schreibt in `bmvcc_timetrackingentry`)?
