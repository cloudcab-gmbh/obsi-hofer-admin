import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRecord, getRecord, listRecords, updateRecord } from "./records";
import { resetDataverseTokenCache } from "./client";

function jsonResponse(body: unknown, init: { status?: number; headers?: Record<string, string> } = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "Content-Type": "application/json", ...init.headers },
  });
}

function emptyResponse(init: { status?: number; headers?: Record<string, string> } = {}) {
  return new Response(null, { status: init.status ?? 204, headers: init.headers });
}

function stubFetchSequence(...responses: Response[]) {
  const fetchMock = vi.fn();
  for (const response of responses) fetchMock.mockResolvedValueOnce(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const TOKEN_RESPONSE = () => jsonResponse({ access_token: "token-1", expires_in: 3600 });

beforeEach(() => {
  resetDataverseTokenCache();
  vi.stubEnv("DATAVERSE_URL", "https://obsi-hofer.crm4.dynamics.com/");
  vi.stubEnv("AZURE_TENANT_ID", "tenant-id");
  vi.stubEnv("AZURE_CLIENT_ID", "client-id");
  vi.stubEnv("AZURE_CLIENT_SECRET", "client-secret");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("getRecord", () => {
  it("fetches a single record by id and returns its fields", async () => {
    stubFetchSequence(TOKEN_RESPONSE(), jsonResponse({ bmvcc_geraetename: "Seil 1" }));

    const record = await getRecord("bmvcc_equipmentrecords", "abc-123");

    expect(record).toEqual({ bmvcc_geraetename: "Seil 1" });
  });

  it("includes a $select query parameter when fields are requested", async () => {
    const fetchMock = stubFetchSequence(TOKEN_RESPONSE(), jsonResponse({}));

    await getRecord("bmvcc_equipmentrecords", "abc-123", { select: ["bmvcc_geraetename", "bmvcc_barcode"] });

    const url = fetchMock.mock.calls[1][0] as string;
    expect(url).toContain("$select=bmvcc_geraetename,bmvcc_barcode");
  });

  it("rejects an empty id without making a network call", async () => {
    const fetchMock = stubFetchSequence();
    await expect(getRecord("bmvcc_equipmentrecords", "")).rejects.toThrow(/id/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("surfaces a not_found DataverseError for a missing record", async () => {
    stubFetchSequence(TOKEN_RESPONSE(), jsonResponse({ error: { message: "not found" } }, { status: 404 }));

    await expect(getRecord("bmvcc_equipmentrecords", "missing")).rejects.toMatchObject({ category: "not_found" });
  });
});

describe("listRecords", () => {
  it("builds the OData query from filter/orderBy/top/select", async () => {
    const fetchMock = stubFetchSequence(TOKEN_RESPONSE(), jsonResponse({ value: [] }));

    await listRecords("bmvcc_equipmentrecords", {
      select: ["bmvcc_geraetename"],
      filter: "_bmvcc_firma_value eq 'firma-1'",
      orderBy: "bmvcc_geraetename asc",
      top: 50,
    });

    const url = decodeURIComponent((fetchMock.mock.calls[1][0] as string).replace(/\+/g, " "));
    expect(url).toContain("$select=bmvcc_geraetename");
    expect(url).toContain("$filter=_bmvcc_firma_value eq 'firma-1'");
    expect(url).toContain("$orderby=bmvcc_geraetename asc");
    expect(url).toContain("$top=50");
  });

  it("returns a nextPageCursor when Dataverse includes @odata.nextLink", async () => {
    const nextLink = "https://obsi-hofer.crm4.dynamics.com/api/data/v9.2/bmvcc_equipmentrecords?$skiptoken=abc";
    stubFetchSequence(TOKEN_RESPONSE(), jsonResponse({ value: [{ id: 1 }], "@odata.nextLink": nextLink }));

    const result = await listRecords("bmvcc_equipmentrecords");

    expect(result.records).toEqual([{ id: 1 }]);
    expect(result.nextPageCursor).toBe(nextLink);
  });

  it("returns null nextPageCursor on the last page", async () => {
    stubFetchSequence(TOKEN_RESPONSE(), jsonResponse({ value: [{ id: 1 }] }));

    const result = await listRecords("bmvcc_equipmentrecords");

    expect(result.nextPageCursor).toBeNull();
  });

  it("fetches the pageCursor URL directly, ignoring other options", async () => {
    const fetchMock = stubFetchSequence(TOKEN_RESPONSE(), jsonResponse({ value: [] }));
    const cursor = "https://obsi-hofer.crm4.dynamics.com/api/data/v9.2/bmvcc_equipmentrecords?$skiptoken=abc";

    await listRecords("bmvcc_equipmentrecords", { pageCursor: cursor, filter: "should be ignored" });

    expect(fetchMock.mock.calls[1][0]).toBe(cursor);
  });
});

describe("createRecord", () => {
  it("parses the new record's id from the OData-EntityId response header", async () => {
    const entityId =
      "https://obsi-hofer.crm4.dynamics.com/api/data/v9.2/bmvcc_equipmentrecords(11111111-1111-1111-1111-111111111111)";
    stubFetchSequence(
      TOKEN_RESPONSE(),
      emptyResponse({ status: 204, headers: { "OData-EntityId": entityId } })
    );

    const result = await createRecord("bmvcc_equipmentrecords", { bmvcc_geraetename: "Neues Gerät" });

    expect(result.id).toBe("11111111-1111-1111-1111-111111111111");
  });

  it("sends the record data as the JSON request body", async () => {
    const entityId =
      "https://obsi-hofer.crm4.dynamics.com/api/data/v9.2/bmvcc_equipmentrecords(11111111-1111-1111-1111-111111111111)";
    const fetchMock = stubFetchSequence(
      TOKEN_RESPONSE(),
      emptyResponse({ status: 204, headers: { "OData-EntityId": entityId } })
    );

    await createRecord("bmvcc_equipmentrecords", { bmvcc_geraetename: "Neues Gerät" });

    const init = fetchMock.mock.calls[1][1];
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ bmvcc_geraetename: "Neues Gerät" });
  });

  it("throws when Dataverse does not return an OData-EntityId header", async () => {
    stubFetchSequence(TOKEN_RESPONSE(), emptyResponse({ status: 204 }));

    await expect(createRecord("bmvcc_equipmentrecords", {})).rejects.toThrow(/ID/);
  });

  it("surfaces a validation_error DataverseError for a rejected payload", async () => {
    stubFetchSequence(
      TOKEN_RESPONSE(),
      jsonResponse({ error: { message: "Required field missing" } }, { status: 400 })
    );

    await expect(createRecord("bmvcc_equipmentrecords", {})).rejects.toMatchObject({
      category: "validation_error",
    });
  });
});

describe("updateRecord", () => {
  it("sends a PATCH request with the changed fields", async () => {
    const fetchMock = stubFetchSequence(TOKEN_RESPONSE(), emptyResponse());

    await updateRecord("bmvcc_equipmentrecords", "abc-123", { bmvcc_bemerkungen: "Aktualisiert" });

    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toContain("bmvcc_equipmentrecords(abc-123)");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body)).toEqual({ bmvcc_bemerkungen: "Aktualisiert" });
  });

  it("surfaces a permission_denied DataverseError on a 403 response", async () => {
    stubFetchSequence(TOKEN_RESPONSE(), jsonResponse({ error: { message: "Forbidden" } }, { status: 403 }));

    await expect(updateRecord("bmvcc_equipmentrecords", "abc-123", {})).rejects.toMatchObject({
      category: "permission_denied",
    });
  });
});
