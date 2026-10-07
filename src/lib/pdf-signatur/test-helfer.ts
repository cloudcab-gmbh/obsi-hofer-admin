// Nur für Unit-Tests: erzeugt zur Laufzeit ein selbst signiertes RSA-Test-
// Zertifikat samt Schlüssel (als PEM). Bewusst kein Schlüssel im Repo — sonst
// würden Secret-Scanner anschlagen.
import { webcrypto } from "node:crypto";
import * as asn1js from "asn1js";
import * as pkijs from "pkijs";

function zuPem(der: ArrayBuffer, typ: string): string {
  const base64 = Buffer.from(der).toString("base64").replace(/(.{64})/g, "$1\n");
  return `-----BEGIN ${typ}-----\n${base64}\n-----END ${typ}-----\n`;
}

export async function erzeugeTestZertifikat(
  optionen: { gueltigBis?: Date; name?: string } = {}
): Promise<{ zertifikatPem: string; schluesselPem: string }> {
  pkijs.setEngine("unit-test", new pkijs.CryptoEngine({ name: "unit-test", crypto: webcrypto as unknown as Crypto }));

  const schluesselPaar = (await webcrypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["sign", "verify"]
  )) as CryptoKeyPair;

  const name = optionen.name ?? "OBSI Hofer GmbH (UNIT-TEST)";
  const zertifikat = new pkijs.Certificate();
  zertifikat.version = 2;
  zertifikat.serialNumber = new asn1js.Integer({ value: 1 });
  for (const ziel of [zertifikat.issuer, zertifikat.subject]) {
    ziel.typesAndValues.push(
      new pkijs.AttributeTypeAndValue({ type: "2.5.4.3", value: new asn1js.Utf8String({ value: name }) })
    );
  }
  zertifikat.notBefore.value = new Date(Date.now() - 24 * 60 * 60 * 1000);
  zertifikat.notAfter.value = optionen.gueltigBis ?? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  await zertifikat.subjectPublicKeyInfo.importKey(schluesselPaar.publicKey);
  await zertifikat.sign(schluesselPaar.privateKey, "SHA-256");

  return {
    zertifikatPem: zuPem(zertifikat.toSchema(true).toBER(), "CERTIFICATE"),
    schluesselPem: zuPem(await webcrypto.subtle.exportKey("pkcs8", schluesselPaar.privateKey), "PRIVATE KEY"),
  };
}
