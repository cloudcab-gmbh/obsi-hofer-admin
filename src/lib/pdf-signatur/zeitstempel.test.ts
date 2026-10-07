// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import * as pkijs from "pkijs";
import { describe, it, expect, vi, afterEach } from "vitest";
import { holeZeitstempel, pruefeZeitstempelAntwort } from "./zeitstempel";
import { SignaturFehler } from "./konfiguration";

// Echte Antwort von freetsa.org (aufgezeichnet 2026-10-07) auf eine Anfrage
// für die Daten "test\n" mit der Nonce 0x2A56E965409984C2.
const FIXTURE = readFileSync(path.join(__dirname, "__fixtures__", "freetsa-antwort-test.tsr"));
const FIXTURE_HASH = createHash("sha256").update("test\n").digest();
const FIXTURE_NONCE = Buffer.from("2A56E965409984C2", "hex");

afterEach(() => {
  vi.unstubAllGlobals();
});

async function erwarteDienstFehler(aufruf: () => unknown) {
  try {
    await aufruf();
  } catch (error) {
    expect(error).toBeInstanceOf(SignaturFehler);
    expect((error as SignaturFehler).kategorie).toBe("dienst");
    return;
  }
  throw new Error("SignaturFehler erwartet");
}

describe("pruefeZeitstempelAntwort", () => {
  it("returns the timestamp token for a granted response with matching hash and nonce", () => {
    const token = pruefeZeitstempelAntwort(FIXTURE, { hash: FIXTURE_HASH, nonce: FIXTURE_NONCE });
    expect(token.contentType).toBe("1.2.840.113549.1.7.2");
  });

  it("rejects a token for different data", async () => {
    const andererHash = createHash("sha256").update("anders").digest();
    await erwarteDienstFehler(() => pruefeZeitstempelAntwort(FIXTURE, { hash: andererHash }));
  });

  it("rejects a token with a different nonce", async () => {
    await erwarteDienstFehler(() =>
      pruefeZeitstempelAntwort(FIXTURE, { hash: FIXTURE_HASH, nonce: Buffer.from("01", "hex") })
    );
  });

  it("rejects a response the service refused", async () => {
    const abgelehnt = Buffer.from(
      new pkijs.TimeStampResp({ status: new pkijs.PKIStatusInfo({ status: 2 }) }).toSchema().toBER()
    );
    await erwarteDienstFehler(() => pruefeZeitstempelAntwort(abgelehnt, { hash: FIXTURE_HASH }));
  });

  it("rejects unreadable content", async () => {
    await erwarteDienstFehler(() => pruefeZeitstempelAntwort(Buffer.from("<html>Fehler</html>"), { hash: FIXTURE_HASH }));
  });
});

describe("holeZeitstempel", () => {
  it("sends an RFC 3161 request and fails as 'dienst' when the service is unreachable", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    vi.stubGlobal("fetch", fetchMock);

    await erwarteDienstFehler(() => holeZeitstempel(Buffer.from("signatur"), "https://tsa.example/tsr"));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://tsa.example/tsr");
    expect(init.method).toBe("POST");
    expect(init.headers["Content-Type"]).toBe("application/timestamp-query");
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("fails as 'dienst' on an HTTP error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("nope", { status: 503 })));
    await erwarteDienstFehler(() => holeZeitstempel(Buffer.from("signatur"), "https://tsa.example/tsr"));
  });

  it("fails as 'dienst' when the answer belongs to a different request", async () => {
    // Die aufgezeichnete Antwort passt weder zum Hash noch zur Nonce der neuen Anfrage.
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(new Uint8Array(FIXTURE), { status: 200 })));
    await erwarteDienstFehler(() => holeZeitstempel(Buffer.from("signatur"), "https://tsa.example/tsr"));
  });
});
