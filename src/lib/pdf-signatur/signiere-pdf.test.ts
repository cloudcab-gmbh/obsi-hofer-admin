// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { createHash, verify, X509Certificate } from "node:crypto";
import * as pkijs from "pkijs";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { describe, it, expect, beforeAll } from "vitest";
import { fuerPdfSignaturText, signierePdf } from "./signiere-pdf";
import { ermittleSignaturKonfiguration, SignaturFehler, type SignaturSchluessel } from "./konfiguration";
import { pruefeZeitstempelAntwort } from "./zeitstempel";
import { erzeugeTestZertifikat } from "./test-helfer";

const OID_MESSAGE_DIGEST = "1.2.840.113549.1.9.4";
const OID_SIGNATURE_TIMESTAMP = "1.2.840.113549.1.9.16.2.14";

// Aufgezeichnetes, echtes freetsa.org-Token (siehe zeitstempel.test.ts) als
// Ersatz für den Netzwerkaufruf — der Test prüft das Einbetten, nicht den Dienst.
const zeitstempelToken = pruefeZeitstempelAntwort(
  readFileSync(path.join(__dirname, "__fixtures__", "freetsa-antwort-test.tsr")),
  { hash: createHash("sha256").update("test\n").digest() }
);
const zeitstempelStub = async () => zeitstempelToken;

let schluessel: SignaturSchluessel;
let zertifikatPem: string;

beforeAll(async () => {
  const test = await erzeugeTestZertifikat();
  zertifikatPem = test.zertifikatPem;
  const konfiguration = ermittleSignaturKonfiguration({
    PDF_SIGNATUR_MODUS: "test",
    PDF_SIGNATUR_TEST_ZERTIFIKAT: test.zertifikatPem,
    PDF_SIGNATUR_TEST_SCHLUESSEL: test.schluesselPem,
  });
  if (konfiguration.modus !== "test") throw new Error("Testmodus erwartet");
  schluessel = konfiguration.schluessel;
});

async function beispielPdf(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= 3; i++) doc.addPage().drawText(`Pruefbericht Seite ${i}`, { x: 50, y: 700, font });
  return Buffer.from(await doc.save());
}

/** Prüft die eingebettete Signatur so, wie ein PDF-Viewer es tut (ohne Vertrauensprüfung des Zertifikats). */
function pruefeSignatur(pdf: Buffer) {
  const text = pdf.toString("latin1");
  const byteRange = text.match(/\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/);
  if (!byteRange) throw new Error("keine ByteRange gefunden");
  const [a, b, c, d] = byteRange.slice(1).map(Number);
  const signierteBytes = Buffer.concat([pdf.subarray(a, a + b), pdf.subarray(c, c + d)]);
  const contentsHex = text.slice(a + b + 1, c - 1).replace(/0+$/, "");
  const der = Buffer.from(contentsHex.length % 2 ? contentsHex + "0" : contentsHex, "hex");

  const contentInfo = pkijs.ContentInfo.fromBER(new Uint8Array(der).buffer);
  const signedData = new pkijs.SignedData({ schema: contentInfo.content });
  const signerInfo = signedData.signerInfos[0];
  const messageDigest = signerInfo.signedAttrs!.attributes.find((attr) => attr.type === OID_MESSAGE_DIGEST)!;
  const digestImContainer = Buffer.from(messageDigest.values[0].valueBlock.valueHexView);
  const zertifikat = signedData.certificates![0] as pkijs.Certificate;
  const zertifikatDer = Buffer.from(zertifikat.toSchema(true).toBER());

  return {
    text,
    inhaltUnveraendert: digestImContainer.equals(createHash("sha256").update(signierteBytes).digest()),
    signaturGueltig: verify(
      "sha256",
      Buffer.from(signerInfo.signedAttrs!.encodedValue),
      new X509Certificate(zertifikatDer).publicKey,
      Buffer.from(signerInfo.signature.valueBlock.valueHexView)
    ),
    hatZeitstempel: !!signerInfo.unsignedAttrs?.attributes.some((attr) => attr.type === OID_SIGNATURE_TIMESTAMP),
    zertifikatDer,
    byteRange: [a, b, c, d],
  };
}

describe("signierePdf", () => {
  it("embeds a valid PAdES signature with certificate and timestamp", async () => {
    const signiert = await signierePdf(await beispielPdf(), {
      schluessel,
      zeitstempel: zeitstempelStub,
      grund: "TEST-Signatur – nicht gültig",
      signierZeit: new Date("2026-10-07T12:30:00Z"),
    });

    const ergebnis = pruefeSignatur(signiert);
    expect(ergebnis.inhaltUnveraendert).toBe(true);
    expect(ergebnis.signaturGueltig).toBe(true);
    expect(ergebnis.hatZeitstempel).toBe(true);
    expect(ergebnis.zertifikatDer.equals(new X509Certificate(zertifikatPem).raw)).toBe(true);
    expect(ergebnis.text).toContain("/SubFilter /ETSI.CAdES.detached");
    // Unverändertes Layout: alle drei Seiten bleiben erhalten.
    expect((await PDFDocument.load(signiert)).getPageCount()).toBe(3);
  });

  it("detects a change to the PDF after signing", async () => {
    const signiert = await signierePdf(await beispielPdf(), {
      schluessel,
      zeitstempel: zeitstempelStub,
      grund: "Test",
      signierZeit: new Date(),
    });
    const [a] = pruefeSignatur(signiert).byteRange;
    const verfaelscht = Buffer.from(signiert);
    verfaelscht[a + 20] = verfaelscht[a + 20] ^ 0x01;

    expect(pruefeSignatur(verfaelscht).inhaltUnveraendert).toBe(false);
  });

  it("passes the signature value to the timestamp source and aborts if it fails", async () => {
    const fehlschlag = async () => {
      throw new SignaturFehler("Zeitstempeldienst nicht erreichbar", "dienst");
    };
    await expect(
      signierePdf(await beispielPdf(), { schluessel, zeitstempel: fehlschlag, grund: "Test", signierZeit: new Date() })
    ).rejects.toMatchObject({ name: "SignaturFehler", kategorie: "dienst" });
  });

  it("wraps unexpected errors (e.g. an unreadable PDF) as SignaturFehler", async () => {
    await expect(
      signierePdf(Buffer.from("kein pdf"), { schluessel, zeitstempel: zeitstempelStub, grund: "Test", signierZeit: new Date() })
    ).rejects.toMatchObject({ name: "SignaturFehler", kategorie: "dienst" });
  });
});

// QA BUG-2: Texte im Signaturfeld werden ohne Unicode-Kodierung geschrieben.
describe("fuerPdfSignaturText", () => {
  it("replaces typographic dashes and quotes, keeps umlauts", () => {
    expect(fuerPdfSignaturText("TEST-Signatur – nicht gültig")).toBe("TEST-Signatur - nicht gültig");
    expect(fuerPdfSignaturText("Prüfbericht — „OBSI“ ‚Hofer‘")).toBe(`Prüfbericht - "OBSI" 'Hofer'`);
    expect(fuerPdfSignaturText("Äpfel Öl Übung ß é")).toBe("Äpfel Öl Übung ß é");
  });

  it("replaces control characters and characters outside Latin-1 with '?'", () => {
    expect(fuerPdfSignaturText("a\u0013b\u0085c\u20ACd\u{1F600}")).toBe("a?b?c?d?");
  });
});

describe("signierePdf — Signatur-Grund (QA BUG-2)", () => {
  it("writes the reason without control characters into the signature field", async () => {
    const signiert = await signierePdf(await beispielPdf(), {
      schluessel,
      zeitstempel: zeitstempelStub,
      grund: "TEST-Signatur – nicht gültig",
      signierZeit: new Date(),
    });
    const text = signiert.toString("latin1");
    const start = text.indexOf("/Reason (");
    const grund = text.slice(start + "/Reason (".length, text.indexOf(")", start));
    expect(grund).toBe("TEST-Signatur - nicht gültig");
  });
});
