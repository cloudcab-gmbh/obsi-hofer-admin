import { createHash } from "node:crypto";
import * as asn1js from "asn1js";
import * as pkijs from "pkijs";
import { PDFDocument } from "pdf-lib";
import signpdf from "@signpdf/signpdf";
import { pdflibAddPlaceholder } from "@signpdf/placeholder-pdf-lib";
import { Signer, SUBFILTER_ETSI_CADES_DETACHED } from "@signpdf/utils";
import { SignaturFehler, type SignaturSchluessel } from "./konfiguration";

const OID = {
  sha256: "2.16.840.1.101.3.4.2.1",
  rsaEncryption: "1.2.840.113549.1.1.1",
  data: "1.2.840.113549.1.7.1",
  signedData: "1.2.840.113549.1.7.2",
  contentType: "1.2.840.113549.1.9.3",
  messageDigest: "1.2.840.113549.1.9.4",
  signingCertificateV2: "1.2.840.113549.1.9.16.2.47",
  signatureTimeStampToken: "1.2.840.113549.1.9.16.2.14",
} as const;

// Platz für Signatur-Container im PDF (Bytes). Zertifikat (~1.5 KB) +
// Zeitstempel-Token inkl. Zertifikaten des Zeitstempeldienstes (~4.5 KB bei
// freetsa.org) — mit Reserve für die längeren Zertifikatsketten in Phase 2.
const SIGNATUR_PLATZ_BYTES = 16_384;

export type ZeitstempelQuelle = (signaturWert: Buffer) => Promise<pkijs.ContentInfo>;

function zuArrayBuffer(daten: Uint8Array): ArrayBuffer {
  return daten.buffer.slice(daten.byteOffset, daten.byteOffset + daten.byteLength) as ArrayBuffer;
}

function algorithmus(oid: string): pkijs.AlgorithmIdentifier {
  return new pkijs.AlgorithmIdentifier({ algorithmId: oid, algorithmParams: new asn1js.Null() });
}

/**
 * Baut den Signatur-Container nach PAdES Baseline B-T (CAdES detached):
 * signierte Attribute contentType, messageDigest und signingCertificateV2
 * (bewusst ohne signingTime — bei PAdES steht die Zeit im PDF-Signaturfeld),
 * dazu als unsigniertes Attribut der Zeitstempel über den Signaturwert.
 *
 * Unterschrieben wird über den austauschbaren Schlüssel-Baustein — Phase 1
 * lokal mit dem Test-Schlüssel, Phase 2 beim Signierdienst des Anbieters.
 */
export class CadesSigner extends Signer {
  constructor(
    private readonly schluessel: SignaturSchluessel,
    private readonly zeitstempel: ZeitstempelQuelle
  ) {
    super();
  }

  async sign(signierteBytes: Buffer): Promise<Buffer> {
    const zertifikat = pkijs.Certificate.fromBER(zuArrayBuffer(this.schluessel.zertifikatDer));
    const inhaltsHash = createHash("sha256").update(signierteBytes).digest();
    const zertifikatHash = createHash("sha256").update(this.schluessel.zertifikatDer).digest();

    const signierteAttribute = new pkijs.SignedAndUnsignedAttributes({
      type: 0,
      attributes: [
        new pkijs.Attribute({ type: OID.contentType, values: [new asn1js.ObjectIdentifier({ value: OID.data })] }),
        new pkijs.Attribute({
          type: OID.messageDigest,
          values: [new asn1js.OctetString({ valueHex: zuArrayBuffer(inhaltsHash) })],
        }),
        // SigningCertificateV2 ::= SEQUENCE { certs SEQUENCE OF ESSCertIDv2 }
        // ESSCertIDv2 ::= SEQUENCE { certHash OCTET STRING }  (hashAlgorithm Standard = SHA-256)
        new pkijs.Attribute({
          type: OID.signingCertificateV2,
          values: [
            new asn1js.Sequence({
              value: [
                new asn1js.Sequence({
                  value: [
                    new asn1js.Sequence({
                      value: [new asn1js.OctetString({ valueHex: zuArrayBuffer(zertifikatHash) })],
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    });

    // Unterschrieben wird die DER-Kodierung der Attribute als SET (Tag 0x31), nicht als [0].
    const zuUnterschreiben = Buffer.from(signierteAttribute.toSchema().toBER());
    zuUnterschreiben[0] = 0x31;
    const signaturWert = await this.schluessel.unterschreibe(zuUnterschreiben);

    const zeitstempelToken = await this.zeitstempel(signaturWert);

    const signerInfo = new pkijs.SignerInfo({
      version: 1,
      sid: new pkijs.IssuerAndSerialNumber({ issuer: zertifikat.issuer, serialNumber: zertifikat.serialNumber }),
      digestAlgorithm: algorithmus(OID.sha256),
      signedAttrs: signierteAttribute,
      signatureAlgorithm: algorithmus(OID.rsaEncryption),
      signature: new asn1js.OctetString({ valueHex: zuArrayBuffer(signaturWert) }),
      unsignedAttrs: new pkijs.SignedAndUnsignedAttributes({
        type: 1,
        attributes: [new pkijs.Attribute({ type: OID.signatureTimeStampToken, values: [zeitstempelToken.toSchema()] })],
      }),
    });

    const signedData = new pkijs.SignedData({
      version: 1,
      digestAlgorithms: [algorithmus(OID.sha256)],
      encapContentInfo: new pkijs.EncapsulatedContentInfo({ eContentType: OID.data }),
      certificates: [zertifikat],
      signerInfos: [signerInfo],
    });

    const contentInfo = new pkijs.ContentInfo({ contentType: OID.signedData, content: signedData.toSchema(true) });
    return Buffer.from(contentInfo.toSchema().toBER());
  }
}

export interface SignierOptionen {
  schluessel: SignaturSchluessel;
  zeitstempel: ZeitstempelQuelle;
  /** Grund im Signaturfeld, z.B. "Prüfbericht OBSI Hofer GmbH". */
  grund: string;
  signierZeit: Date;
}

/**
 * Signiert ein fertig erzeugtes PDF: unsichtbares Signaturfeld einfügen
 * (Layout bleibt unverändert, der sichtbare Teil ist die Fusszeile), dann den
 * Signatur-Container an der vorgesehenen Stelle einbetten.
 */
export async function signierePdf(pdfBuffer: Buffer, optionen: SignierOptionen): Promise<Buffer> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    pdflibAddPlaceholder({
      pdfDoc,
      reason: optionen.grund,
      contactInfo: "info@obsi-hofer.ch",
      name: "OBSI Hofer GmbH",
      location: "Brittnau",
      signingTime: optionen.signierZeit,
      signatureLength: SIGNATUR_PLATZ_BYTES,
      subFilter: SUBFILTER_ETSI_CADES_DETACHED,
      widgetRect: [0, 0, 0, 0],
      appName: "OBSI Hofer Admin",
    });
    // Ohne Objekt-Streams, damit der Platzhalter im PDF unkomprimiert auffindbar ist.
    const mitPlatzhalter = Buffer.from(await pdfDoc.save({ useObjectStreams: false }));
    return await signpdf.sign(mitPlatzhalter, new CadesSigner(optionen.schluessel, optionen.zeitstempel), optionen.signierZeit);
  } catch (error) {
    if (error instanceof SignaturFehler) throw error;
    throw new SignaturFehler(`PDF konnte nicht signiert werden: ${error instanceof Error ? error.message : String(error)}`, "dienst");
  }
}
