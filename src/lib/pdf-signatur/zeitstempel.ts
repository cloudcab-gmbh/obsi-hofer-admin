import { createHash, randomBytes } from "node:crypto";
import * as asn1js from "asn1js";
import * as pkijs from "pkijs";
import { SignaturFehler } from "./konfiguration";

const OID_SHA256 = "2.16.840.1.101.3.4.2.1";
// Begrenzte Wartezeit (Tech Design): "nie unsigniert", aber vorhersehbare Antwortzeit des Exports.
const ZEITSTEMPEL_TIMEOUT_MS = 15_000;

function zuArrayBuffer(daten: Uint8Array): ArrayBuffer {
  return daten.buffer.slice(daten.byteOffset, daten.byteOffset + daten.byteLength) as ArrayBuffer;
}

export function baueZeitstempelAnfrage(hash: Buffer, nonce: Buffer): Buffer {
  const anfrage = new pkijs.TimeStampReq({
    version: 1,
    messageImprint: new pkijs.MessageImprint({
      hashAlgorithm: new pkijs.AlgorithmIdentifier({ algorithmId: OID_SHA256 }),
      hashedMessage: new asn1js.OctetString({ valueHex: zuArrayBuffer(hash) }),
    }),
    nonce: new asn1js.Integer({ valueHex: zuArrayBuffer(nonce) }),
    // Zertifikat des Zeitstempeldienstes mitliefern lassen, damit der PDF-Viewer den Zeitstempel ohne Nachladen prüfen kann.
    certReq: true,
  });
  return Buffer.from(anfrage.toSchema().toBER());
}

/**
 * Prüft die Antwort des Zeitstempeldienstes und liefert das Zeitstempel-Token
 * (CMS ContentInfo), das als unsignierter Attributwert in die Signatur kommt.
 * Geprüft wird: Status "granted", das Token bezieht sich auf genau unseren
 * Hash und — falls angegeben — auf unsere Nonce. Die kryptografische Prüfung
 * des Tokens selbst übernimmt der PDF-Viewer beim Empfänger.
 */
export function pruefeZeitstempelAntwort(antwortDer: Buffer, erwartet: { hash: Buffer; nonce?: Buffer }): pkijs.ContentInfo {
  let antwort: pkijs.TimeStampResp;
  try {
    antwort = pkijs.TimeStampResp.fromBER(zuArrayBuffer(antwortDer));
  } catch {
    throw new SignaturFehler("Antwort des Zeitstempeldienstes ist nicht lesbar.", "dienst");
  }

  // 0 = granted, 1 = grantedWithMods
  if (antwort.status.status > 1 || !antwort.timeStampToken) {
    throw new SignaturFehler(`Zeitstempeldienst hat abgelehnt (Status ${antwort.status.status}).`, "dienst");
  }

  const signedData = new pkijs.SignedData({ schema: antwort.timeStampToken.content });
  const eContent = signedData.encapContentInfo.eContent;
  if (!eContent) throw new SignaturFehler("Zeitstempel-Token ohne Inhalt.", "dienst");
  const tstInfo = pkijs.TSTInfo.fromBER(eContent.getValue());

  const hashImToken = Buffer.from(tstInfo.messageImprint.hashedMessage.getValue());
  if (!hashImToken.equals(erwartet.hash)) {
    throw new SignaturFehler("Zeitstempel bezieht sich auf andere Daten als angefragt.", "dienst");
  }
  if (erwartet.nonce) {
    const nonceImToken = tstInfo.nonce ? Buffer.from(tstInfo.nonce.valueBlock.valueHexView) : null;
    if (!nonceImToken || !entferneFuehrendeNullen(nonceImToken).equals(entferneFuehrendeNullen(erwartet.nonce))) {
      throw new SignaturFehler("Zeitstempel-Antwort passt nicht zur Anfrage (Nonce).", "dienst");
    }
  }
  return antwort.timeStampToken;
}

function entferneFuehrendeNullen(wert: Buffer): Buffer {
  let i = 0;
  while (i < wert.length - 1 && wert[i] === 0) i++;
  return wert.subarray(i);
}

/** Holt beim Zeitstempeldienst einen Zeitstempel für den übergebenen Signaturwert. */
export async function holeZeitstempel(signaturWert: Buffer, url: string): Promise<pkijs.ContentInfo> {
  const hash = createHash("sha256").update(signaturWert).digest();
  // Positive Ganzzahl erzwingen (höchstes Bit 0), sonst würde sie als negativ kodiert.
  const nonce = randomBytes(8);
  nonce[0] &= 0x7f;

  let antwort: Response;
  try {
    antwort = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/timestamp-query" },
      body: new Uint8Array(baueZeitstempelAnfrage(hash, nonce)),
      signal: AbortSignal.timeout(ZEITSTEMPEL_TIMEOUT_MS),
    });
  } catch (error) {
    throw new SignaturFehler(
      `Zeitstempeldienst nicht erreichbar: ${error instanceof Error ? error.message : String(error)}`,
      "dienst"
    );
  }
  if (!antwort.ok) {
    throw new SignaturFehler(`Zeitstempeldienst antwortet mit HTTP ${antwort.status}.`, "dienst");
  }
  return pruefeZeitstempelAntwort(Buffer.from(await antwort.arrayBuffer()), { hash, nonce });
}
