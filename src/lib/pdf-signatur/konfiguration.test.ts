// @vitest-environment node
import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { baueSignaturVermerk, ermittleSignaturKonfiguration, SignaturFehler, type Umgebung } from "./konfiguration";
import { erzeugeTestZertifikat } from "./test-helfer";

let zertifikatPem: string;
let schluesselPem: string;

beforeAll(async () => {
  ({ zertifikatPem, schluesselPem } = await erzeugeTestZertifikat());
});

afterEach(() => {
  vi.restoreAllMocks();
});

function testEnv(extra: Umgebung = {}): Umgebung {
  return {
    PDF_SIGNATUR_MODUS: "test",
    PDF_SIGNATUR_TEST_ZERTIFIKAT: zertifikatPem,
    PDF_SIGNATUR_TEST_SCHLUESSEL: schluesselPem,
    ...extra,
  };
}

function erwarteFehler(env: Umgebung, kategorie: SignaturFehler["kategorie"]) {
  try {
    ermittleSignaturKonfiguration(env);
  } catch (error) {
    expect(error).toBeInstanceOf(SignaturFehler);
    expect((error as SignaturFehler).kategorie).toBe(kategorie);
    return;
  }
  throw new Error("SignaturFehler erwartet");
}

describe("ermittleSignaturKonfiguration", () => {
  it("is off when PDF_SIGNATUR_MODUS is missing, empty or 'aus'", () => {
    expect(ermittleSignaturKonfiguration({})).toEqual({ modus: "aus" });
    expect(ermittleSignaturKonfiguration({ PDF_SIGNATUR_MODUS: " " })).toEqual({ modus: "aus" });
    expect(ermittleSignaturKonfiguration({ PDF_SIGNATUR_MODUS: "AUS" })).toEqual({ modus: "aus" });
  });

  it("enables test mode locally (no VERCEL_ENV) and in Vercel previews", () => {
    for (const vercelEnv of [undefined, "preview", "development"]) {
      const konfiguration = ermittleSignaturKonfiguration(testEnv({ VERCEL_ENV: vercelEnv }));
      expect(konfiguration.modus).toBe("test");
    }
  });

  it("ignores test mode in Vercel production: unsigned like before, plus a warning in the log", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(ermittleSignaturKonfiguration(testEnv({ VERCEL_ENV: "production" }))).toEqual({ modus: "aus" });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Production ignoriert"));
  });

  it("ignores test mode in production even when no test key is configured there", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const env = { PDF_SIGNATUR_MODUS: "test", VERCEL_ENV: "production" };
    expect(ermittleSignaturKonfiguration(env)).toEqual({ modus: "aus" });
  });

  it("uses freetsa.org as default timestamp service, overridable via PDF_SIGNATUR_ZEITSTEMPEL_URL", () => {
    const standard = ermittleSignaturKonfiguration(testEnv());
    expect(standard.modus === "test" && standard.zeitstempelUrl).toBe("https://freetsa.org/tsr");
    const eigene = ermittleSignaturKonfiguration(testEnv({ PDF_SIGNATUR_ZEITSTEMPEL_URL: "https://tsa.example/tsr" }));
    expect(eigene.modus === "test" && eigene.zeitstempelUrl).toBe("https://tsa.example/tsr");
  });

  it("accepts PEMs with literal \\n (Vercel style) and base64-encoded PEMs", () => {
    const mitLiteralNewlines = testEnv({
      PDF_SIGNATUR_TEST_ZERTIFIKAT: zertifikatPem.replace(/\n/g, "\\n"),
      PDF_SIGNATUR_TEST_SCHLUESSEL: Buffer.from(schluesselPem).toString("base64"),
    });
    expect(ermittleSignaturKonfiguration(mitLiteralNewlines).modus).toBe("test");
  });

  it("is a configuration error when test mode lacks certificate or key", () => {
    erwarteFehler(testEnv({ PDF_SIGNATUR_TEST_ZERTIFIKAT: undefined }), "konfiguration");
    erwarteFehler(testEnv({ PDF_SIGNATUR_TEST_SCHLUESSEL: "" }), "konfiguration");
  });

  it("is a configuration error when certificate and key do not belong together", async () => {
    const anderes = await erzeugeTestZertifikat();
    erwarteFehler(testEnv({ PDF_SIGNATUR_TEST_SCHLUESSEL: anderes.schluesselPem }), "konfiguration");
  });

  it("is a configuration error when the test certificate has expired", async () => {
    const abgelaufen = await erzeugeTestZertifikat({ gueltigBis: new Date(Date.now() - 60 * 60 * 1000) });
    erwarteFehler(
      testEnv({ PDF_SIGNATUR_TEST_ZERTIFIKAT: abgelaufen.zertifikatPem, PDF_SIGNATUR_TEST_SCHLUESSEL: abgelaufen.schluesselPem }),
      "konfiguration"
    );
  });

  it("is a configuration error for unreadable PEM content", () => {
    erwarteFehler(testEnv({ PDF_SIGNATUR_TEST_ZERTIFIKAT: "kein zertifikat" }), "konfiguration");
  });

  it("is a configuration error for 'produktiv' (Phase 2 not available yet) and unknown values", () => {
    erwarteFehler({ PDF_SIGNATUR_MODUS: "produktiv" }, "konfiguration");
    erwarteFehler({ PDF_SIGNATUR_MODUS: "an" }, "konfiguration");
  });

  it("signs with the configured test key", async () => {
    const konfiguration = ermittleSignaturKonfiguration(testEnv());
    if (konfiguration.modus !== "test") throw new Error("Testmodus erwartet");
    const signatur = await konfiguration.schluessel.unterschreibe(Buffer.from("daten"));
    expect(signatur.length).toBe(256); // RSA-2048
  });
});

describe("baueSignaturVermerk", () => {
  it("marks test signatures as not valid, in Swiss time", () => {
    // 12:30 UTC = 14:30 Sommerzeit Zürich
    expect(baueSignaturVermerk("test", new Date("2026-10-07T12:30:00Z"))).toBe(
      "TEST-Signatur – nicht gültig – OBSI Hofer GmbH, 07.10.2026 14:30"
    );
  });

  it("uses the regular wording for the productive seal", () => {
    expect(baueSignaturVermerk("produktiv", new Date("2026-12-01T08:05:00Z"))).toBe(
      "Elektronisch signiert durch OBSI Hofer GmbH, 01.12.2026 09:05"
    );
  });
});
