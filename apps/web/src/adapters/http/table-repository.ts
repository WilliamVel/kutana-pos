import type { Table } from "@kutana/shared/ordering/model/table.js";
import type { TableRepository } from "@kutana/shared/ordering/ports/table-repository.js";
import { encodePathSegment, HttpClient, type HttpClientOptions } from "./http-client.js";

export class HttpTableRepository implements TableRepository {
  private readonly http: HttpClient;

  constructor(options: HttpClientOptions = {}) {
    this.http = new HttpClient(options);
  }

  listAll(): Promise<Table[]> {
    return this.http.request<Table[]>("/ordering/tables");
  }

  findById(id: string): Promise<Table | null> {
    return this.http.request<Table | null>(`/ordering/tables/${encodePathSegment(id)}`);
  }

  save(table: Table, expectedVersion: number): Promise<Table> {
    return this.http.request<Table>(`/ordering/tables/${encodePathSegment(table.id)}`, {
      method: "PUT",
      body: { table, expectedVersion },
    });
  }
}
