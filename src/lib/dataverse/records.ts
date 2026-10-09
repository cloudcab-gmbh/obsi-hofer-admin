import { dataverseFetch } from "./client";
import { DataverseError } from "./errors";

const API_VERSION = "v9.2";

export interface ListOptions {
  /** Dataverse-Feldnamen, die zurückgegeben werden sollen (ohne Einschränkung: alle Felder). */
  select?: string[];
  /** Roher OData-$filter-Ausdruck, z.B. "_bmvcc_firma_value eq 'xxx'". Wird unverändert durchgereicht. */
  filter?: string;
  /** Roher OData-$orderby-Ausdruck, z.B. "bmvcc_geraetename asc". */
  orderBy?: string;
  /** Maximale Anzahl Datensätze pro Seite. */
  top?: number;
  /**
   * Fortsetzungsmarke aus einem vorherigen `listRecords`-Aufruf (`nextPageCursor`).
   * Wenn gesetzt, werden alle anderen Optionen ignoriert — die Marke enthält bereits
   * den vollständigen Abfrage-Zustand.
   */
  pageCursor?: string | null;
}

export interface ListResult<T = Record<string, unknown>> {
  records: T[];
  /** An `listRecords` übergeben, um die nächste Seite zu laden. `null` = keine weiteren Seiten. */
  nextPageCursor: string | null;
}

function entityPath(entitySet: string): string {
  return `/api/data/${API_VERSION}/${entitySet}`;
}

const GUID_PATTERN = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function requireNonEmpty(value: string, label: string): void {
  if (!value) throw new Error(`${label} darf nicht leer sein`);
}

function requireValidId(id: string): void {
  if (!GUID_PATTERN.test(id)) {
    throw new Error(`id muss eine gültige Dataverse-GUID sein, erhalten: "${id}"`);
  }
}

export async function getRecord<T = Record<string, unknown>>(
  entitySet: string,
  id: string,
  options: { select?: string[] } = {}
): Promise<T> {
  requireNonEmpty(entitySet, "entitySet");
  requireNonEmpty(id, "id");
  requireValidId(id);

  const params = new URLSearchParams();
  if (options.select?.length) params.set("$select", options.select.join(","));
  const query = params.toString();

  const res = await dataverseFetch(`${entityPath(entitySet)}(${id})${query ? `?${query}` : ""}`);
  return (await res.json()) as T;
}

export async function listRecords<T = Record<string, unknown>>(
  entitySet: string,
  options: ListOptions = {}
): Promise<ListResult<T>> {
  requireNonEmpty(entitySet, "entitySet");

  const url = options.pageCursor ?? buildListUrl(entitySet, options);
  const res = await dataverseFetch(url);
  const body = (await res.json()) as { value: T[]; "@odata.nextLink"?: string };

  return {
    records: body.value,
    nextPageCursor: body["@odata.nextLink"] ?? null,
  };
}

function buildListUrl(entitySet: string, options: ListOptions): string {
  const params = new URLSearchParams();
  if (options.select?.length) params.set("$select", options.select.join(","));
  if (options.filter) params.set("$filter", options.filter);
  if (options.orderBy) params.set("$orderby", options.orderBy);
  if (options.top) params.set("$top", String(options.top));

  const query = params.toString();
  return `${entityPath(entitySet)}${query ? `?${query}` : ""}`;
}

export async function createRecord(entitySet: string, data: Record<string, unknown>): Promise<{ id: string }> {
  requireNonEmpty(entitySet, "entitySet");

  const res = await dataverseFetch(entityPath(entitySet), {
    method: "POST",
    body: JSON.stringify(data),
  });

  const entityIdHeader = res.headers.get("OData-EntityId");
  const id = entityIdHeader ? extractIdFromEntityIdHeader(entityIdHeader) : null;
  if (!id) {
    throw new DataverseError(
      "unknown",
      "Datensatz wurde in Dataverse erstellt, aber die neue ID konnte nicht ermittelt werden."
    );
  }
  return { id };
}

export async function updateRecord(entitySet: string, id: string, data: Record<string, unknown>): Promise<void> {
  requireNonEmpty(entitySet, "entitySet");
  requireNonEmpty(id, "id");
  requireValidId(id);

  await dataverseFetch(`${entityPath(entitySet)}(${id})`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteRecord(entitySet: string, id: string): Promise<void> {
  requireNonEmpty(entitySet, "entitySet");
  requireNonEmpty(id, "id");
  requireValidId(id);

  await dataverseFetch(`${entityPath(entitySet)}(${id})`, { method: "DELETE" });
}

function extractIdFromEntityIdHeader(header: string): string | null {
  const match = header.match(/\(([0-9a-fA-F-]{36})\)/);
  return match ? match[1] : null;
}
