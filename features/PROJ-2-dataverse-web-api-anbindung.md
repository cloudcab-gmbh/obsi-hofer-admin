# PROJ-2: Dataverse-Web-API-Anbindung

## Status: In Progress
**Created:** 2026-10-05
**Last Updated:** 2026-10-05

## Dependencies
- None (nutzt dieselbe Azure-App-Registrierung wie PROJ-1, technisch aber unabhängig davon)

## User Stories
- Als Backend-Entwickler (für PROJ-3/PROJ-4) möchte ich generische Funktionen zum Lesen, Auflisten, Erstellen und Aktualisieren von Dataverse-Datensätzen haben, damit ich nicht für jede Funktion eigene Authentifizierungs-/Fehlerbehandlungs-Logik schreiben muss.
- Als Bearbeiter/Freigeber (indirekt, über PROJ-3/PROJ-4) möchte ich, dass meine Eingaben bei einem Speicherfehler erhalten bleiben, damit ich nicht von vorne anfangen muss.
- Als Betreiber möchte ich, dass die Schreibrechte des Admin-Tools auf Dataverse klar von den Leserechten des bestehenden Sync-Service (Kundenportal-Projekt) getrennt sind, damit ein Fehler im einen System nicht automatisch Schreibzugriff im anderen bedeutet.

## Out of Scope
- Entity-spezifische Validierung/Business-Regeln (z.B. Pflichtfelder für einen Prüfbericht) — Sache von PROJ-3/PROJ-4
- Löschen von Datensätzen — generell nicht vorgesehen (siehe PRD: kein echtes Löschen, nur Stornieren als Statusänderung)
- Automatisches Retry bei Fehlern — bewusst nicht, siehe Product Decisions
- Separate Azure-App-Registrierung für Dataverse-Zugriff — bewusst dieselbe wie PROJ-1 (Login), siehe Product Decisions
- Direkte Firma/Standort-Verknüpfung am Prüfbericht — nur über das Gerät, siehe Product Decisions
- Caching/Zwischenspeicherung von Dataverse-Daten — bewusst live, siehe PRD Constraints ("live aus Dataverse lesen")
- Konfliktschutz bei gleichzeitiger Bearbeitung — siehe Open Questions

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

- [ ] Angenommen ein gültiger Tabellen-Name und eine ID werden übergeben, wenn ein einzelner Datensatz abgerufen wird, dann werden dessen Felder korrekt zurückgegeben
- [ ] Angenommen ein Filter (z.B. "alle Geräte einer Firma") wird übergeben, wenn Datensätze aufgelistet werden, dann werden nur die passenden Datensätze zurückgegeben
- [ ] Angenommen gültige Daten für ein neues Gerät/einen neuen Prüfbericht werden übergeben, wenn ein Datensatz erstellt wird, dann wird er in Dataverse angelegt und die neue ID zurückgegeben
- [ ] Angenommen gültige Änderungen an einem bestehenden Datensatz werden übergeben, wenn er aktualisiert wird, dann werden die Änderungen in Dataverse übernommen
- [ ] Angenommen Dataverse ist nicht erreichbar oder antwortet mit einem Fehler, wenn ein Lese- oder Schreibvorgang versucht wird, dann wird eine verständliche Fehlermeldung zurückgegeben, ohne dass bereits eingegebene Daten verloren gehen
- [ ] Angenommen der Applikationsbenutzer hat keine ausreichenden Rechte für eine Operation, wenn sie versucht wird, dann wird ein klarer Berechtigungsfehler zurückgegeben statt eines kryptischen Dataverse-Fehlercodes

## Edge Cases
- Zugriffstoken (Client-Credentials-Flow) läuft während eines Vorgangs ab → wird automatisch erneuert, für die aufrufende Stelle transparent
- Dataverse liefert mehr Datensätze zurück als eine einzelne Antwort fasst (Paging) → generische Listen-Funktion muss das handhaben (technisches Detail, siehe Open Questions/`/architecture`)
- Gleichzeitiges Bearbeiten desselben Datensatzes durch zwei Nutzer → kein spezieller Konfliktschutz in dieser Spec vorgesehen (siehe Open Questions)
- Ein referenziertes Gerät existiert nicht (mehr) in Dataverse (z.B. dort gelöscht) → verständliche Fehlermeldung beim Erstellen eines Prüfberichts, kein Absturz

## Technical Requirements (optional)
- Security: Zugangsdaten (Client-ID/Secret) ausschliesslich serverseitig, nie im Client-Bundle
- Security: Applikationsbenutzer-Rechte strikt auf die benötigten Tabellen (Geräte, Prüfberichte) beschränkt — bereits eingerichtet (eigene Security Role, Create/Read/Write auf Organisationsebene)

## Open Questions
- [ ] Soll ein Konfliktschutz für gleichzeitiges Bearbeiten desselben Datensatzes eingebaut werden (z.B. optimistic locking über Dataverse-eigene ETags)? Aktuell nicht vorgesehen, bei wenigen gleichzeitigen internen Nutzern unwahrscheinlich — bei Bedarf in `/refine PROJ-2` nachziehen

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Dieselbe Azure-App-Registrierung wie PROJ-1 (Login) wird auch als Dataverse-Applikationsbenutzer verwendet | Technisch möglich (Client-Credentials-Flow parallel zum interaktiven Login); spart eine zweite App-Registrierung/Secret-Verwaltung — der Sicherheitsgewinn einer Trennung wäre bei einem internen 1-Personen-Tool gering, da beide Secrets ohnehin in denselben Vercel-Umgebungsvariablen liegen | 2026-10-05 |
| Eigene, neue Security Role für den Applikationsbenutzer (bestehende Lese-Rolle des Sync-Service bleibt unangetastet) | Hält Schreibrechte des Admin-Tools von den Leserechten des bestehenden Kundenportal-Sync-Service getrennt | 2026-10-05 |
| Prüfberichte referenzieren nur das Gerät, nicht zusätzlich direkt Firma/Standort | Standort/Firma sind über das Gerät eindeutig bestimmt; eine zusätzliche direkte Auswahl wäre redundant und könnte zu Inkonsistenzen führen | 2026-10-05 |
| Fehler werden verständlich an die aufrufende Stelle weitergegeben, kein automatisches Retry | Weniger Komplexität bei einem internen Tool mit wenigen gleichzeitigen Nutzern; eingegebene Daten dürfen dabei nie verloren gehen | 2026-10-05 |
| Generische Listen-/Filter-Funktion ist Teil von PROJ-2, nicht erst PROJ-3/PROJ-4 | Wird von beiden Folge-Features gebraucht, gehört daher zur gemeinsamen Dataverse-Anbindung | 2026-10-05 |
| Keine Löschfunktion | Konsistent mit der projektweiten Entscheidung, Dataverse-Datensätze nie echt zu löschen (nur Stornieren als Statusänderung) | 2026-10-05 |

### Technical Decisions
<!-- Added by /architecture -->
| Decision | Rationale | Date |
|----------|-----------|------|
| Server-only Modul, Zugangsdaten/Token nie im Client-Bundle | Dieselbe App-Registrierung steuert auch den Login — ein Leck wäre besonders kritisch | 2026-10-05 |
| Token-Cache mit automatischer Erneuerung vor Ablauf statt Neuanmeldung pro Anfrage | Schneller, schont die Login-Infrastruktur, für Aufrufer transparent | 2026-10-05 |
| Direkter REST/OData-Zugriff auf die Dataverse Web API, keine zusätzliche SDK-Bibliothek | Standard-Schnittstelle; gleiches Vorgehen wie im bestehenden Sync-Service des Kundenportal-Repos | 2026-10-05 |
| Paging als "eine Seite pro Aufruf plus Fortsetzungsmarke" statt automatischem Nachladen aller Seiten | Vermeidet unvorhersehbare Wartezeit/Speicherlast bei grossen Ergebnismengen; Aufrufer (PROJ-3/PROJ-4) entscheidet selbst über Nachladen | 2026-10-05 |
| Rohe Dataverse-Feldnamen ohne Umbenennung in dieser Schicht | Hält die generischen Funktionen wirklich generisch; Umbenennung für die UI gehört zu PROJ-3/PROJ-4 | 2026-10-05 |
| Technische Fehler werden in eine kleine Zahl verständlicher Fehlerkategorien übersetzt | PROJ-3/PROJ-4 müssen keine Dataverse-spezifischen Fehlerformate kennen | 2026-10-05 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### A) Component Structure
Diese Funktion hat keine eigene Benutzeroberfläche — sie ist eine reine Backend-Infrastrukturschicht, die ausschliesslich von den Folge-Features genutzt wird:

```
Dataverse-Anbindung (Server-seitig, nie im Browser sichtbar)
+-- Token-Beschaffung & -Cache (Client-Credentials-Flow)
+-- Generische Funktionen
|   +-- Einzelnen Datensatz lesen
|   +-- Datensätze auflisten/filtern (seitenweise)
|   +-- Datensatz erstellen
|   +-- Datensatz aktualisieren
+-- Fehler-Übersetzung (Dataverse-Fehler -> verständliche Kategorien)

Genutzt von: PROJ-3 (Geräte-Verwaltung), PROJ-4 (Prüfberichte-Verwaltung), PROJ-5 (Sync-Freigabe, indirekt für Statusanzeige)
```

### B) Data Model (plain language)
Kein eigenes Datenmodell/keine eigene Datenbank — Dataverse bleibt alleinige Quelle. Diese Schicht beschreibt nur, **wie** auf zwei bestehende Dataverse-Tabellen zugegriffen wird:
- **Geräte-Tabelle** (`bmvcc_equipmentrecord`)
- **Prüfbericht-Tabelle** (`bmvcc_pruefbericht`), referenziert ein Gerät

Jede Leseanfrage ("Datensätze auflisten") kann angeben:
- welche Tabelle
- optionaler Filter (z.B. "nur Geräte einer bestimmten Firma")
- optionale Auswahl der benötigten Felder (um nicht immer alle Felder zu laden)
- optionale Sortierung
- eine Fortsetzungsmarke, um eine grosse Ergebnismenge seitenweise nachzuladen (siehe Tech-Entscheidung Paging unten)

Jede Schreibanfrage ("erstellen"/"aktualisieren") übergibt: Tabelle, (bei Aktualisierung) ID, sowie die zu setzenden Feldwerte als einfache Schlüssel-Wert-Liste — ohne eigene Umbenennung der Dataverse-Feldnamen (siehe Tech-Entscheidung "Rohe Feldnamen" unten).

### C) Tech Decisions
- **Server-only Modul, nie im Client-Bundle:** Die Anbindung läuft ausschliesslich auf dem Server (z.B. in Server Actions/Route Handlers). Zugangsdaten und Zugriffstoken verlassen den Server nie — notwendig, da dieselbe App-Registrierung auch den Login steuert und ein Leck hier besonders kritisch wäre.
- **Token-Cache statt Neuanmeldung pro Anfrage:** Das Zugriffstoken (Client-Credentials-Flow) wird nach Erhalt serverseitig zwischengespeichert und kurz vor Ablauf automatisch erneuert, statt bei jeder einzelnen Dataverse-Anfrage neu anzufordern. Das ist schneller und schont die Login-Infrastruktur, bleibt aber für alle Aufrufer unsichtbar (erfüllt den Edge Case "Token läuft während eines Vorgangs ab").
- **Direkter Zugriff auf die Dataverse Web API (REST/OData), keine zusätzliche SDK-Bibliothek:** Die Dataverse Web API ist eine Standard-REST-Schnittstelle; ein zusätzliches Paket dafür ist nicht nötig. Gleiches Vorgehen wie im bestehenden Dataverse-Sync-Service des Kundenportal-Repos — konsistent zwischen beiden Projekten.
- **Paging als "eine Seite pro Aufruf" statt automatischem Nachladen aller Seiten:** Die Listen-Funktion liefert pro Aufruf eine begrenzte Anzahl Datensätze plus eine Fortsetzungsmarke zurück. Die aufrufende Stelle (PROJ-3/PROJ-4) entscheidet, ob/wann weitere Seiten nachgeladen werden (z.B. "Mehr laden"-Button oder automatisches Scrollen). Vermeidet unvorhersehbar lange Wartezeiten oder Speicherlast bei sehr grossen, gefilterten Ergebnismengen. *(Löst die in der Spec offene Paging-Frage.)*
- **Rohe Dataverse-Feldnamen, keine Umbenennung in dieser Schicht:** Die generischen Funktionen geben/erwarten Felder exakt so, wie Dataverse sie kennt (z.B. `bmvcc_name`). Eine nutzerfreundlichere Umbenennung/Zuordnung für die Oberfläche erfolgt erst in PROJ-3/PROJ-4 — hält diese Schicht wirklich generisch und wiederverwendbar für beide Tabellen.
- **Fehler-Übersetzung in verständliche Kategorien:** Technische Dataverse-/HTTP-Fehler (z.B. nicht erreichbar, keine Berechtigung, Datensatz nicht gefunden, ungültige Eingabe, vorübergehend überlastet) werden in eine kleine Zahl klar benannter Fehlerarten übersetzt. PROJ-3/PROJ-4 müssen dadurch keine Dataverse-spezifischen Fehlerformate kennen, um dem Nutzer eine verständliche Meldung zu zeigen.
- **Kein automatisches Retry, kein Konfliktschutz in dieser Schicht:** Bewusst so übernommen aus den Product Decisions der Spec — hält die erste Version einfach; beides könnte bei Bedarf später zentral in genau dieser Schicht nachgerüstet werden, ohne PROJ-3/PROJ-4 anfassen zu müssen.

### D) Dependencies
- Keine neue Paketabhängigkeit nötig — die Anbindung nutzt die in Next.js eingebaute `fetch`-Funktion direkt gegen die Dataverse Web API.
- Hinweis (kein Teil dieser Spec, aber beim Lesen von `package.json` aufgefallen): `@supabase/ssr` und `@supabase/supabase-js` sind noch aus dem Kopiervorgang vom Kundenportal-Repo vorhanden, werden in diesem eigenständigen Datenbank-losen Projekt aber nirgends verwendet. Empfehlung: bei Gelegenheit als Aufräum-Chore entfernen (nicht Teil von PROJ-2).

## Implementation Notes (Backend)

Umgesetzt unter `src/lib/dataverse/`:
- `client.ts` — `getDataverseAccessToken()` (Client-Credentials-Flow gegen `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token`, In-Memory-Cache mit automatischer Erneuerung 60s vor Ablauf), `dataverseFetch()` als zentraler Zugriffspunkt für alle Anfragen (Standard-Header, löst sowohl relative Pfade als auch absolute URLs wie `@odata.nextLink` auf)
- `errors.ts` — `DataverseError` mit Kategorie (`not_found`/`permission_denied`/`validation_error`/`unavailable`/`unknown`) und verständlicher deutscher Meldung; HTTP-Status wird auf Kategorien gemappt (404→not_found, 401/403→permission_denied, 400→validation_error, 429/5xx→unavailable), Netzwerkfehler→unavailable
- `records.ts` — die vier generischen Funktionen aus der Spec: `getRecord`, `listRecords` (mit `select`/`filter`/`orderBy`/`top`/`pageCursor`, liefert `nextPageCursor` zurück statt automatisch alle Seiten zu laden), `createRecord` (liest die neue ID aus dem `OData-EntityId`-Response-Header), `updateRecord`

Keine neue Paketabhängigkeit — Zugriff direkt per `fetch`, wie in der Architektur festgelegt (bewusst kein `@azure/msal-node`, obwohl der bestehende Sync-Service im Kundenportal-Repo das nutzt — der Client-Credentials-Flow ist per REST trivial nachzubilden und spart die Abhängigkeit).

Keine eigenen API-Routen: Diese Schicht ist reine Server-seitige Bibliothek, die erst von PROJ-3/PROJ-4 über Server Actions/Route Handler aufgerufen wird — es gibt noch keinen eigenen HTTP-Endpoint, der getestet werden könnte.

**Tests:** `src/lib/dataverse/client.test.ts` (10 Tests: Token-Beschaffung, -Cache, -Erneuerung, Fehlerfälle) und `src/lib/dataverse/records.test.ts` (14 Tests: alle vier Funktionen inkl. Fehlerpfade) — alle grün (`npm test`, 34/34 insgesamt im Projekt). `npm run lint` und `npm run build` (inkl. TypeScript-Check) ebenfalls grün.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
