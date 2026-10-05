import { describe, it, expect, vi, beforeEach } from "vitest";

const graphFetchMock = vi.fn();
vi.mock("./client", () => ({ graphFetch: (...args: unknown[]) => graphFetchMock(...args) }));

import {
  listKundenOrdner,
  findeNeuesteExcelDatei,
  downloadKundenDatei,
  uploadKundenDatei,
  konvertiereZuPdf,
  loescheKundenDatei,
  resetKundenDriveCache,
} from "./kunden-drive";
import { SharePointError } from "./errors";

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });
}

function stubSiteAndDriveLookup() {
  graphFetchMock.mockResolvedValueOnce(jsonResponse({ id: "site-1" }));
  graphFetchMock.mockResolvedValueOnce(
    jsonResponse({ value: [{ id: "drive-other", name: "Services" }, { id: "drive-kunden", name: "Kunden" }] })
  );
}

beforeEach(() => {
  resetKundenDriveCache();
  graphFetchMock.mockReset();
});

describe("listKundenOrdner", () => {
  it("resolves the site and the 'Kunden' drive once, then lists folder children by path", async () => {
    stubSiteAndDriveLookup();
    graphFetchMock.mockResolvedValueOnce(
      jsonResponse({ value: [{ id: "f1", name: "a.xlsx", lastModifiedDateTime: "2026-01-01T00:00:00Z" }] })
    );

    const children = await listKundenOrdner("Rehaklinik Bellikon/Prüfberichte/2026");

    expect(children).toHaveLength(1);
    const listCall = graphFetchMock.mock.calls[2][0] as string;
    expect(listCall).toContain("/drives/drive-kunden/root:/");
    expect(listCall).toContain(":/children");
  });

  it("caches the resolved drive id across multiple calls", async () => {
    stubSiteAndDriveLookup();
    graphFetchMock.mockImplementation(async () => jsonResponse({ value: [] }));

    await listKundenOrdner("Firma A/Prüfberichte/2026");
    await listKundenOrdner("Firma B/Prüfberichte/2026");

    // 2 Aufrufe für Site+Drive-Auflösung, danach nur noch 1 pro listKundenOrdner-Aufruf.
    expect(graphFetchMock).toHaveBeenCalledTimes(4);
  });

  it("returns an empty list instead of throwing when the folder doesn't exist", async () => {
    stubSiteAndDriveLookup();
    graphFetchMock.mockRejectedValueOnce(new SharePointError("not_found", "nicht gefunden"));

    await expect(listKundenOrdner("Unbekannte Firma/Prüfberichte/2026")).resolves.toEqual([]);
  });
});

describe("findeNeuesteExcelDatei", () => {
  it("returns null when the folder contains no .xlsx file", async () => {
    stubSiteAndDriveLookup();
    graphFetchMock.mockResolvedValueOnce(
      jsonResponse({ value: [{ id: "f1", name: "bericht.pdf", lastModifiedDateTime: "2026-01-01T00:00:00Z" }] })
    );

    await expect(findeNeuesteExcelDatei("Firma/Prüfberichte/2026")).resolves.toBeNull();
  });

  it("picks the most recently modified .xlsx file when several exist", async () => {
    stubSiteAndDriveLookup();
    graphFetchMock.mockResolvedValueOnce(
      jsonResponse({
        value: [
          { id: "alt", name: "Pruefberichtraport.xlsx", lastModifiedDateTime: "2026-01-01T00:00:00Z" },
          { id: "neu", name: "Pruefberichtraport - Kopie.xlsx", lastModifiedDateTime: "2026-06-01T00:00:00Z" },
          { id: "ordner", name: "Fotos", lastModifiedDateTime: "2026-09-01T00:00:00Z", folder: {} },
        ],
      })
    );

    const result = await findeNeuesteExcelDatei("Firma/Prüfberichte/2026");

    expect(result?.id).toBe("neu");
  });
});

describe("Datei-Operationen", () => {
  it("downloadKundenDatei lädt den Inhalt per Pfad", async () => {
    stubSiteAndDriveLookup();
    graphFetchMock.mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3])));

    const buffer = await downloadKundenDatei("Firma/Prüfberichte/2026/Vorlage.xlsx");

    expect(new Uint8Array(buffer)).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("uploadKundenDatei legt die Datei per PUT ab und liefert die Item-ID", async () => {
    stubSiteAndDriveLookup();
    graphFetchMock.mockResolvedValueOnce(jsonResponse({ id: "neues-item" }));

    const id = await uploadKundenDatei("Firma/Prüfberichte/2026/neu.xlsx", new ArrayBuffer(0));

    expect(id).toBe("neues-item");
    expect(graphFetchMock.mock.calls[2][1]).toMatchObject({ method: "PUT" });
  });

  it("konvertiereZuPdf ruft die format=pdf-Konvertierung für die Item-ID auf", async () => {
    stubSiteAndDriveLookup();
    graphFetchMock.mockResolvedValueOnce(new Response(new Uint8Array([9, 9])));

    await konvertiereZuPdf("item-1");

    expect(graphFetchMock.mock.calls[2][0]).toBe("/drives/drive-kunden/items/item-1/content?format=pdf");
  });

  it("loescheKundenDatei ruft DELETE für die Item-ID auf", async () => {
    stubSiteAndDriveLookup();
    graphFetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await loescheKundenDatei("item-1");

    expect(graphFetchMock.mock.calls[2]).toEqual(["/drives/drive-kunden/items/item-1", { method: "DELETE" }]);
  });
});
