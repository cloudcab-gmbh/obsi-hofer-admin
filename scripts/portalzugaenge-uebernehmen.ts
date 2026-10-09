/**
 * PROJ-11: Einmalige Übernahme der bisherigen Kundenportal-Freigaben (Häkchen
 * bmvcc_kundenportal am Kontakt, PROJ-8) in Portalzugänge pro Standort.
 *
 *   npx tsx scripts/portalzugaenge-uebernehmen.ts             # Probelauf: zeigt nur, was entstehen würde
 *   npx tsx scripts/portalzugaenge-uebernehmen.ts --echtlauf  # legt die Portalzugänge an
 *
 * Liest die Dataverse-Zugangsdaten aus .env.local. Wiederholbar: bereits
 * vorhandene Portalzugänge werden übersprungen. Ändert keine Kontakte (das
 * Häkchen bleibt gesetzt — es bedeutet ab jetzt "hat mindestens einen Zugang").
 */
import { readFileSync } from "node:fs";
import path from "node:path";

for (const zeile of readFileSync(path.join(process.cwd(), ".env.local"), "utf8").split(/\r?\n/)) {
  const treffer = zeile.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (treffer && !(treffer[1] in process.env)) process.env[treffer[1]] = treffer[2].replace(/^"(.*)"$/, "$1");
}

async function main() {
  const echtlauf = process.argv.includes("--echtlauf");
  const { listRecords } = await import("../src/lib/dataverse/records");
  const { erstellePortalzugang, listPortalzugaengeForKontakte } = await import("../src/lib/dataverse/portalzugaenge");
  const { planeUebernahme } = await import("../src/lib/portalzugang-uebernahme");

  const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

  const { records: kontakte } = await listRecords("bmvcc_kontakts", {
    select: ["bmvcc_kontaktid", "bmvcc_name_1", "bmvcc_name_2"],
    filter: "bmvcc_kundenportal eq true",
    top: 5000,
  });
  const freigegebeneKontakte = kontakte.map((k) => ({
    id: k.bmvcc_kontaktid as string,
    name: [text(k.bmvcc_name_2), text(k.bmvcc_name_1)].filter(Boolean).join(" ") || "Kontakt",
  }));
  const ids = new Set(freigegebeneKontakte.map((k) => k.id));

  const { records: relationen } = await listRecords("bmvcc_relations", {
    select: ["_bmvcc_person_value", "_bmvcc_firma_value"],
    filter: "statecode eq 0",
    top: 5000,
  });
  const { records: standorte } = await listRecords("bmvcc_organizationlocations", {
    select: ["bmvcc_organizationlocationid", "bmvcc_displayname", "_bmvcc_bexiofirma_value"],
    top: 5000,
  });
  const bestehende = await listPortalzugaengeForKontakte([...ids]);

  const plan = planeUebernahme({
    freigegebeneKontakte,
    relationen: relationen
      .filter((r) => ids.has(r._bmvcc_person_value as string) && typeof r._bmvcc_firma_value === "string")
      .map((r) => ({ kontaktId: r._bmvcc_person_value as string, firmaId: r._bmvcc_firma_value as string })),
    standorte: standorte
      .filter((s) => typeof s._bmvcc_bexiofirma_value === "string")
      .map((s) => ({
        id: s.bmvcc_organizationlocationid as string,
        name: text(s.bmvcc_displayname) ?? "(ohne Name)",
        firmaId: s._bmvcc_bexiofirma_value as string,
      })),
    bestehendeZugaenge: bestehende,
  });

  console.log(`Freigegebene Kontakte (bmvcc_kundenportal):  ${freigegebeneKontakte.length}`);
  console.log(`Anzulegende Portalzugänge:                  ${plan.anzulegen.length}`);
  console.log(`Bereits vorhanden (übersprungen):           ${plan.bereitsVorhanden}`);
  console.log(`Kontakte ohne Firmen-Zuordnung:             ${plan.kontakteOhneFirma.length} ${plan.kontakteOhneFirma.join(", ")}`);
  console.log(`Kontakte, deren Firmen keinen Standort haben: ${plan.kontakteOhneStandort.length} ${plan.kontakteOhneStandort.join(", ")}`);
  for (const z of plan.anzulegen.slice(0, 15)) console.log(`  + ${z.name}`);
  if (plan.anzulegen.length > 15) console.log(`  … und ${plan.anzulegen.length - 15} weitere`);

  if (!echtlauf) {
    console.log("\nProbelauf — nichts geändert. Zum Anlegen mit --echtlauf erneut ausführen.");
    return;
  }

  let angelegt = 0;
  for (const z of plan.anzulegen) {
    await erstellePortalzugang(z.kontaktId, z.standortId, z.name);
    angelegt++;
    if (angelegt % 25 === 0) console.log(`  … ${angelegt}/${plan.anzulegen.length}`);
  }
  console.log(`\nEchtlauf abgeschlossen: ${angelegt} Portalzugänge angelegt.`);
}

main().catch((error) => {
  console.error("Übernahme fehlgeschlagen:", error);
  process.exit(1);
});
