import type { StockItem } from "@kutana/shared/inventory/model/stock-item.js";
import type { StockMovement } from "@kutana/shared/inventory/model/stock-movement.js";
import type { StockRepository } from "@kutana/shared/inventory/ports/stock-repository.js";
import { encodePathSegment, HttpClient, type HttpClientOptions } from "./http-client.js";

export class HttpStockRepository implements StockRepository {
  private readonly http: HttpClient;

  constructor(options: HttpClientOptions = {}) {
    this.http = new HttpClient(options);
  }

  findById(id: string): Promise<StockItem | null> {
    return this.http.request<StockItem | null>(`/inventory/stock-items/${encodePathSegment(id)}`);
  }

  listLowStock(): Promise<StockItem[]> {
    return this.http.request<StockItem[]>("/inventory/stock-items/low-stock");
  }

  listMovements(stockItemId: string): Promise<StockMovement[]> {
    return this.http.request<StockMovement[]>(`/inventory/stock-items/${encodePathSegment(stockItemId)}/movements`);
  }

  recordMovement(stockItem: StockItem, movement: StockMovement, expectedVersion: number): Promise<StockItem> {
    return this.http.request<StockItem>("/inventory/stock-movements", {
      method: "POST",
      body: { stockItem, movement, expectedVersion },
    });
  }
}
