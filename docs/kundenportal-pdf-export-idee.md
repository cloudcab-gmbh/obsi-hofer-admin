# Künftiges Feature: PDF-Export Prüfberichte im Kundenportal

**Von:** Repo `obsi-hofer-admin` (internes Admin-Tool)
**An:** Repo Kundenportal (`kundenportal-obsi-hofer`)
**Stand:** 2026-10-07 — **Idee / noch nicht eingeplant.** Grundlage für eine spätere Spec im Kundenportal-Repo (`/write-spec` dort).

## Idee

Kunden sollen im Kundenportal ihren Prüfbericht selbst als PDF herunterladen können — im gleichen Layout wie der PDF-Export des Admin-Tools (Admin PROJ-7), mit Daten aus Supabase. Ablauf analog zum bestehenden CSV-Export der Geräteübersicht: Button auf der Übersicht, aktuelle Filter (Status, Suche, "zu prüfen") werden übernommen, Export wird im Export-Protokoll erfasst.

## Was aus dem Admin-Tool übernommen werden kann

| Baustein (Admin-Tool) | Übertragbar | Hinweis |
|---|---|---|
| `src/lib/pruefbericht-export/pdf-generator.ts` | ✅ unverändert | PDF per `pdfmake`: Kopfbereich (Logo, Titel, Firma, OBSI-Hofer-Kontaktblock), Tabellen-Optik, Spaltenbreiten nach gemessener Textbreite, Umbruchregeln wie pdfmake (`linebreak`), Zeilen nie über Seitenumbruch geteilt. Kennt weder Dataverse noch SharePoint — Eingabe ist eine Liste von Zeilen (`ExportZeile`) |
| `src/lib/pruefbericht-export/feld-mapping.ts` | ✅ unverändert | Spaltenerkennung über Überschriften, Datumsformate (MM.YYYY / TT.MM.YYYY) |
| `src/lib/pruefbericht-export/vorlage-extraktion.ts` | ✅ nur bei Option B/C (siehe unten) | Liest Spalten + Prüfergebnis-Farben aus einer Excel-Vorlage |
| `public/fonts/Roboto/*`, `public/logo_small.png` | ✅ kopieren | Werden über `readFileSync(path.join(process.cwd(), "public", …))` geladen, damit der Vercel-Build-Tracer sie mitnimmt |
| `src/lib/pruefbericht-export/export.ts` | 🔄 neu schreiben | Datenquelle Supabase statt Dataverse; keine Archiv-Ablage |
| SharePoint-Zugriff (`src/lib/sharepoint/*`) | ❌ nicht übernehmen | Interner Tenant; siehe Vorlagen-Frage |
| Archiv-Upload nach SharePoint | ❌ entfällt | Kunden-Selbstexport braucht kein OBSI-Archiv |

**Pakete:** `pdfmake`, `pdfkit`, `linebreak` (als direkte Abhängigkeiten), bei Option B/C zusätzlich `exceljs`.

**Bekannte Stolpersteine aus dem Admin-Tool (bereits gelöst, beim Kopieren beachten):**
- pdfkit lädt ohne `font`-Option `Helvetica.afm`, die auf Vercel fehlt → Roboto-Buffer als Startschrift übergeben
- Fonts über pdfmakes `virtualfs` registrieren, nicht als Pfad
- Tests mit pdfkit brauchen `// @vitest-environment node`
- Spaltenbreiten nur mit pdfmakes eigener Umbruchlogik (`linebreak`) berechnen, sonst werden z.B. Seriennummern mit Bindestrich zerschnitten

## Datenlage in Supabase (geprüft 2026-10-07)

Vorhanden (`dv_geraete` + Artikel/Standort): Lagerort, Artikel (Bezeichnung, Typ, Dimension, Hersteller), Seriennummer, Scancode, Herstelljahr, Ablegereife, Zubehör, Kunden-ID, letzte Prüfung (= Geprüft), Prüfer, Status (= Prüfergebnis).

Fehlt:
- **Erstgebrauch** — wird vom Dataverse-Sync nicht übertragen (`bmvcc_erstgebrauch`); Sync und Tabelle müssten erweitert werden
- **Bemerkung des letzten Prüfberichts** — liegt in der Prüfbericht-Tabelle des Portals, müsste pro Gerät mitgeladen werden (wie `getAktuellstePruefberichteForGeraete` im Admin-Tool)

## Offene Entscheidung: Woher kommen Spalten und Farben?

Im Admin-Tool kommt beides aus einer Excel-Vorlage pro Firma im internen SharePoint (`Kunden/<Firma>/Prüfberichte/vorlage_pruefberichtraport.xlsx`, sonst Standard-Vorlage). Das Kundenportal hat darauf keinen Zugriff (Kunden-Tenant/CIAM).

- [ ] **Option A — Spalten aus den Portal-Firmeneinstellungen (Empfehlung):** Spaltenauswahl/Reihenfolge aus `portal_firma_einstellungen` (dort gibt es bereits Zusatzspalten für die Übersicht), Prüfergebnis-Farben aus einem festen Schema (grün/rot, wie Standard im Admin-Tool). Kein Excel, kein SharePoint. Nachteil: firmenspezifische Excel-Vorlagen gelten im Portal nicht.
- [ ] **Option B — Vorlage über den Sync ins Portal:** Der Sync legt die Vorlage jeder Firma zusätzlich im Supabase-Storage ab; Portal und Admin-Tool nutzen dieselbe Vorlage. Mehr Aufwand im Sync (Zugriff auf SharePoint dort nötig).
- [ ] **Option C — SharePoint-Zugriff fürs Portal:** Portal erhält Zugangsdaten für den internen Tenant. **Nicht empfohlen** (interne Zugangsdaten in einer Kunden-Anwendung).

## Weitere Fragen für die Spec

- [ ] Nur aktuell gefilterte Geräte oder immer alle der Firma? (CSV-Export übernimmt die Filter)
- [ ] Geräte ohne Prüfbericht ausschliessen (wie im Admin-Tool) oder mit leeren Prüffeldern zeigen?
- [ ] Dateiname: gleiche Konvention wie im Admin-Tool (`<Datum> Prüfbericht Absturzsicherungen - <Firma>.pdf`)?
- [ ] Code-Teilung: Module kopieren (pragmatisch) oder gemeinsames npm-Paket (lohnt sich erst bei häufigen gemeinsamen Änderungen)?
- [ ] Laufzeit bei grossen Firmen (Admin-Tool: PDF wird synchron erzeugt; bisher unkritisch)
