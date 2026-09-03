import { Body, Controller, Get, Param, Put, Query } from "@nestjs/common";
import type { Order } from "@kutana/shared/ordering/model/order.js";
import type { Table } from "@kutana/shared/ordering/model/table.js";
import { PostgresOrderRepository } from "./adapters/postgres/order-repository.js";
import { PostgresTableRepository } from "./adapters/postgres/table-repository.js";

interface SaveTableDto {
  readonly table: Table;
  readonly expectedVersion: number;
}

interface SaveOrderDto {
  readonly order: Order;
  readonly expectedVersion: number;
}

@Controller("ordering")
export class OrderingController {
  constructor(
    private readonly orders: PostgresOrderRepository,
    private readonly tables: PostgresTableRepository,
  ) {}

  @Get("tables")
  listTables(): Promise<Table[]> {
    return this.tables.listAll();
  }

  @Get("tables/:id")
  findTableById(@Param("id") id: string): Promise<Table | null> {
    return this.tables.findById(id);
  }

  @Put("tables/:id")
  saveTable(@Param("id") id: string, @Body() body: SaveTableDto): Promise<Table> {
    return this.tables.save({ ...body.table, id }, body.expectedVersion);
  }

  @Get("orders")
  listOrders(@Query("tableId") tableId?: string): Promise<Order[] | Order | null> {
    if (tableId) {
      return this.orders.findByTable(tableId);
    }
    return this.orders.listAll();
  }

  @Put("orders/:id")
  saveOrder(@Param("id") id: string, @Body() body: SaveOrderDto): Promise<Order> {
    return this.orders.save({ ...body.order, id }, body.expectedVersion);
  }
}
