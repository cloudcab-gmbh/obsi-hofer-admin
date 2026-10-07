import { createPrivateKey, sign, X509Certificate, type KeyObject } from "node:crypto";

/**
 * PROJ-9: Fehler beim Signieren des Prüfbericht-PDFs. `kategorie` steuert die
 * Meldung für den Bearbeiter — Details (z.B. welche Umgebungsvariable fehlt)
 * landen nur im Server-Log, nie in der Oberfläche.
 */
export class SignaturFehler extends Error {
  constructor(
    message: string,
    readonly kategorie: "konfiguration" | "dienst"
  ) {
    super(message);
    this.name = "SignaturFehler";
  }
}

export const SIGNATUR_FEHLERMELDUNG_DIENST = "Der Prüfbericht konnte nicht signiert werden. Bitte später erneut versuchen.";
export const SIGNATUR_FEHLERMELDUNG_KONFIGURATION =
  "Der Prüfbericht konnte nicht signiert werden: Die Signatur-Einrichtung muss geprüft werden.";

/** Gratis-Zeitstempeldienst für die Testphase (Phase 1). */
export const STANDARD_ZEITSTEMPEL_URL = "https://freetsa.org/tsr";

export interface SignaturSchluessel {
  /** Zertifikat des Unterzeichners (DER). */
  zertifikatDer: Buffer;
  /** Unterschreibt die übergebenen Bytes mit RSA-SHA256 (PKCS#1 v1.5). Phase 2: Signierdienst des Anbieters. */
  unterschreibe(daten: Buffer): Promise<Buffer>;
}

/** Ausschnitt der Umgebungsvariablen (process.env oder in Tests ein einfaches Objekt). */
export type Umgebung = Record<string, string | undefined>;

export type SignaturKonfiguration =
  | { modus: "aus" }
  | { modus: "test"; schluessel: SignaturSchluessel; zeitstempelUrl: string };

/**
 * PEM aus einer Umgebungsvariablen lesen: entweder direkt (auch mit "\n" als
 * Zeichenfolge statt echter Zeilenumbrüche, wie es in Vercel-Variablen oft
 * vorkommt) oder base64-kodiert als Ganzes.
 */
function lesePem(wert: string): string {
  const roh = wert.trim();
  if (roh.includes("-----BEGIN")) return roh.replace(/\\n/g, "\n");
  return Buffer.from(roh, "base64").toString("utf8");
}

function erstelleTestSchluessel(env: Umgebung): SignaturSchluessel {
  const zertifikatWert = env.PDF_SIGNATUR_TEST_ZERTIFIKAT;
  const schluesselWert = env.PDF_SIGNATUR_TEST_SCHLUESSEL;
  if (!zertifikatWert || !schluesselWert) {
    throw new SignaturFehler(
      "PDF_SIGNATUR_MODUS=test, aber PDF_SIGNATUR_TEST_ZERTIFIKAT oder PDF_SIGNATUR_TEST_SCHLUESSEL fehlt.",
      "konfiguration"
    );
  }

  let zertifikat: X509Certificate;
  let privaterSchluessel: KeyObject;
  try {
    zertifikat = new X509Certificate(lesePem(zertifikatWert));
    privaterSchluessel = createPrivateKey(lesePem(schluesselWert));
  } catch (error) {
    throw new SignaturFehler(
      `Test-Zertifikat oder -Schlüssel nicht lesbar: ${error instanceof Error ? error.message : String(error)}`,
      "konfiguration"
    );
  }
  if (privaterSchluessel.asymmetricKeyType !== "rsa") {
    throw new SignaturFehler("Der Test-Schlüssel muss ein RSA-Schlüssel sein.", "konfiguration");
  }
  if (!zertifikat.checkPrivateKey(privaterSchluessel)) {
    throw new SignaturFehler("Test-Zertifikat und Test-Schlüssel gehören nicht zusammen.", "konfiguration");
  }
  // Edge Case aus der Spec: abgelaufenes Zertifikat → Export abbrechen mit Hinweis auf die Einrichtung.
  if (new Date(zertifikat.validTo) < new Date()) {
    throw new SignaturFehler(`Das Test-Zertifikat ist am ${zertifikat.validTo} abgelaufen.`, "konfiguration");
  }

  return {
    zertifikatDer: zertifikat.raw,
    unterschreibe: async (daten) => sign("sha256", daten, privaterSchluessel),
  };
}

/**
 * Modus-Regel aus dem Tech Design (PROJ-9):
 * - nicht gesetzt / "aus" → unsigniert wie bisher
 * - "test" → Test-Signatur, aber NUR lokal und in Vercel-Previews; in
 *   Production wird der Wert ignoriert (unsigniert + Warnung im Log), damit
 *   eine Fehlkonfiguration nie Test-PDFs an Kunden ausliefert
 * - "produktiv" → echtes Siegel, erst in Phase 2 verfügbar
 * - alles andere → Konfigurationsfehler, Export wird abgebrochen
 *
 * Production wird an Vercels automatisch gesetztem VERCEL_ENV erkannt, nicht
 * an einer selbst gepflegten Variable.
 */
export function ermittleSignaturKonfiguration(env: Umgebung = process.env): SignaturKonfiguration {
  const modus = (env.PDF_SIGNATUR_MODUS ?? "").trim().toLowerCase();

  if (modus === "" || modus === "aus") return { modus: "aus" };

  if (modus === "test") {
    if (env.VERCEL_ENV === "production") {
      console.warn(
        "PDF_SIGNATUR_MODUS=test wird in Production ignoriert — PDF wird unsigniert exportiert. Variable in der Production-Umgebung entfernen."
      );
      return { modus: "aus" };
    }
    return {
      modus: "test",
      schluessel: erstelleTestSchluessel(env),
      zeitstempelUrl: env.PDF_SIGNATUR_ZEITSTEMPEL_URL?.trim() || STANDARD_ZEITSTEMPEL_URL,
    };
  }

  if (modus === "produktiv") {
    throw new SignaturFehler(
      "PDF_SIGNATUR_MODUS=produktiv ist noch nicht verfügbar (PROJ-9 Phase 2: Anbieter noch nicht angebunden).",
      "konfiguration"
    );
  }

  throw new SignaturFehler(`Unbekannter Wert für PDF_SIGNATUR_MODUS: "${modus}" (erlaubt: aus, test).`, "konfiguration");
}

const vermerkZeitFormat = new Intl.DateTimeFormat("de-CH", {
  timeZone: "Europe/Zurich",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Sichtbarer Vermerk in der Fusszeile jeder Seite (Schweizer Zeit). */
export function baueSignaturVermerk(modus: "test" | "produktiv", zeitpunkt: Date): string {
  const zeit = vermerkZeitFormat.format(zeitpunkt).replace(",", "");
  if (modus === "test") return `TEST-Signatur – nicht gültig – OBSI Hofer GmbH, ${zeit}`;
  return `Elektronisch signiert durch OBSI Hofer GmbH, ${zeit}`;
}
