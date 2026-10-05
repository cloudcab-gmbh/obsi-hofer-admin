# Referenz: Bestehende Power App (Legacy)

Dieser Ordner enthält Auszüge aus der bestehenden Power-Apps-Canvas-App, mit der OBSI-Hofer-Mitarbeitende Geräte/Prüfberichte bisher **direkt in Dataverse/Dynamics** bearbeitet haben (siehe `docs/PRD.md`, Vision: "Ersatz für die bisherige direkte Bearbeitung in Dataverse/Dynamics").

Zweck: Referenzmaterial für `/write-spec PROJ-3` (Geräte-Verwaltung) und `/write-spec PROJ-4` (Prüfberichte-Verwaltung), damit bestehende Fachlogik (insb. Status-Berechnung) bewusst übernommen oder bewusst abgewandelt wird — nicht versehentlich anders implementiert.

## Dateien
- [`scrPruefen.yaml`](scrPruefen.yaml) — Haupt-Prüfungs-Screen. **Unvollständig:** Der Original-Paste wurde bei 50'000 Zeichen abgeschnitten; der Screen enthält voraussichtlich weitere Controls nach `txtTitel_11`. Bei Bedarf vom Nutzer erneut/vollständig einholen (z.B. in mehreren Teilen).

## Aus dem bisher eingefügten Auszug erkennbare Fachlogik (zur späteren Prüfung in /write-spec PROJ-3/PROJ-4)

**Relevante Dataverse-Felder (Geräte, Tabelle `bmvcc_equipmentrecord`):**
`bmvcc_equipmentrecordid`, `bmvcc_geraetename`, `bmvcc_barcode`, `bmvcc_serienummer`, `bmvcc_lagerort`, `bmvcc_bemerkungen`, `bmvcc_zubehoer`, `bmvcc_herstelljahr`, `bmvcc_erstgebrauch`, `bmvcc_letztepruefung`, `bmvcc_ablegereife`, `bmvcc_betriebsmittelstatus`, `bmvcc_pruefer`

**Relevante Felder (Prüfbericht, Collection `Pruefberichts`):**
`Geprueft` (Datum), `Bemerkungen`, `Ergebnis`, Referenz auf Gerät über `GeraeteID`

**Status-Werte (`bmvcc_betriebsmittelstatus` / `Ergebnis`):** `Freigabe`, `keine Freigabe`, `letzte Freigabe` (Anzeige: ✅ / ❌ / ⚠️)

**Beobachtete Filter-/Status-Logik im Screen (vier Tabs: Alle / Prüfen / Geprüft / Veraltet):**
- **"Prüfen"** (fällige Geräte): `bmvcc_letztepruefung` älter als 360 Tage, UND NICHT (`bmvcc_ablegereife` bereits in der Vergangenheit UND Status = "keine Freigabe")
  — d.h. ein als endgültig ausgemustertes Gerät ("keine Freigabe" + Ablegereife erreicht) taucht nicht mehr als "zu prüfen" auf
- **"Geprüft"**: `bmvcc_letztepruefung` innerhalb der letzten 3 Tage
- **"Veraltet"**: `bmvcc_ablegereife` bereits in der Vergangenheit (unabhängig vom Prüfdatum)
- Zusätzliche Hervorhebung in der Liste: Geräte mit `bmvcc_letztepruefung` innerhalb der letzten 120 Tage werden grün markiert

**Such-/Filterfunktionen:** Volltextsuche über Gerätename, Bemerkungen, Barcode, Seriennummer sowie mehrere Artikel-/Hersteller-Felder (vermutlich aus einer verknüpften Artikel-Stammdaten-Tabelle); zusätzlicher Dropdown-Filter nach Lagerort; Barcode-Scanner als alternativer "Filter" (sucht exakt nach `bmvcc_barcode`)

**Bearbeitungslogik (Prüfbericht-Popup):** Beim Speichern eines bearbeiteten Prüfberichts werden **drei Stellen gleichzeitig aktualisiert**: der Prüfbericht selbst (`Pruefberichts`), der zugehörige Geräte-Datensatz in Dataverse (`Geraetes`: `Letztepruefung`, `Betriebsmittelstatus`, `Pruefer`) und eine lokale Collection (`colGerate`) als Cache für die Galerie-Anzeige — **wichtiger Hinweis für PROJ-4:** ein neuer/geänderter Prüfbericht schreibt offenbar auch auf den Geräte-Datensatz zurück (letzte Prüfung, Status, Prüfer), nicht nur auf den Prüfbericht selbst. Das sollte in PROJ-4 explizit geklärt werden (automatische Ableitung oder eigene Eingabe?).

**Hinweis:** Diese Beobachtungen sind aus dem YAML-Auszug abgeleitet, nicht verifiziert mit dem tatsächlichen Dataverse-Schema oder weiteren Screens der App (z.B. Geräte-Neuanlage, Artikel-Verknüpfung). Vor PROJ-3/PROJ-4 gegenprüfen.
