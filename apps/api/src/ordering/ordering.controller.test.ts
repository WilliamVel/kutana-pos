import "reflect-metadata";
import { Test } from "@nestjs/testing";
import { describe, expect, it, vi } from "vitest";
import type { Order } from "@kutana/shared/ordering/model/order.js";
import type { Table } from "@kutana/shared/ordering/model/table.js";
import { PostgresPool } from "../infrastructure/postgres/postgres-pool.js";
import { PostgresOrderRepository } from "./adapters/postgres/order-repository.js";
import { PostgresTableRepository } from "./adapters/postgres/table-repository.js";
import { OrderingController } from "./ordering.controller.js";
import { OrderEventsService } from "./order-events.service.js";
import { OrderingModule } from "./ordering.module.js";

const table: Table = {
  id: "table-original",
  label: "Mesa 1",
  status: "active",
  currentOrderId: "order-1",
  version: 2,
};

const order: Order = {
  id: "order-original",
  tableId: "table-1",
  status: "active",
  lineItems: [],
  openedAt: "2025-01-01T00:00:00.000Z",
  closedAt: null,
  customerId: null,
  version: 3,
};

describe("OrderingController", () => {
  function controllerWithMocks() {
    const orders = {
      findByTable: vi.fn(),
      listAll: vi.fn(),
      save: vi.fn(),
    };
    const tables = {
      listAll: vi.fn(),
      findById: vi.fn(),
      save: vi.fn(),
    };
    const orderEvents = {
      publish: vi.fn(),
      eventsStream: vi.fn(),
    };

    return {
      controller: new OrderingController(
        orders as unknown as PostgresOrderRepository,
        tables as unknown as PostgresTableRepository,
        orderEvents as unknown as OrderEventsService,
      ),
      orders,
      tables,
      orderEvents,
    };
  }

  it("delegates table listing to the table repository", async () => {
    const { controller, tables } = controllerWithMocks();
    tables.listAll.mockResolvedValue([table]);

    await expect(controller.listTables()).resolves.toEqual([table]);

    expect(tables.listAll).toHaveBeenCalledOnce();
  });

  it("saves a table with the route id and expected version", async () => {
    const { controller, tables } = controllerWithMocks();
    tables.save.mockResolvedValue({ ...table, id: "table-route" });

    await controller.saveTable("table-route", { table, expectedVersion: 4 });

    expect(tables.save).toHaveBeenCalledWith({ ...table, id: "table-route" }, 4);
  });

  it("lists all orders when no tableId query is present", async () => {
    const { controller, orders } = controllerWithMocks();
    orders.listAll.mockResolvedValue([order]);

    await expect(controller.listOrders()).resolves.toEqual([order]);

    expect(orders.listAll).toHaveBeenCalledOnce();
    expect(orders.findByTable).not.toHaveBeenCalled();
  });

  it("finds an order by table when tableId query is present", async () => {
    const { controller, orders } = controllerWithMocks();
    orders.findByTable.mockResolvedValue(order);

    await expect(controller.listOrders("table-1")).resolves.toEqual(order);

    expect(orders.findByTable).toHaveBeenCalledWith("table-1");
    expect(orders.listAll).not.toHaveBeenCalled();
  });

  it("saves an order with the route id and expected version", async () => {
    const { controller, orders } = controllerWithMocks();
    orders.save.mockResolvedValue({ ...order, id: "order-route" });

    await controller.saveOrder("order-route", { order, expectedVersion: 5 });

    expect(orders.save).toHaveBeenCalledWith({ ...order, id: "order-route" }, 5);
  });

  it("publishes the saved order snapshot only after the save resolves", async () => {
    const { controller, orders, orderEvents } = controllerWithMocks();
    const savedOrder = { ...order, id: "order-route", version: 6 };
    orders.save.mockResolvedValue(savedOrder);

    await expect(
      controller.saveOrder("order-route", { order, expectedVersion: 5 }),
    ).resolves.toEqual(savedOrder);

    expect(orderEvents.publish).toHaveBeenCalledOnce();
    expect(orderEvents.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "order.updated",
        orderId: "order-route",
        tableId: savedOrder.tableId,
        version: 6,
        payload: savedOrder,
      }),
    );
    expect(orders.save.mock.invocationCallOrder[0]!).toBeLessThan(
      orderEvents.publish.mock.invocationCallOrder[0]!,
    );
  });

  it("exposes one global SSE stream for order events", () => {
    const { controller, orderEvents } = controllerWithMocks();
    const stream = {};
    orderEvents.eventsStream.mockReturnValue(stream);

    expect(controller.orderEvents()).toBe(stream);
    expect(orderEvents.eventsStream).toHaveBeenCalledOnce();
  });

  it("compiles the ordering module with an overridden Postgres pool", async () => {
    const moduleRef = await Test.createTestingModule({ imports: [OrderingModule] })
      .overrideProvider(PostgresPool)
      .useValue({ query: vi.fn(), connect: vi.fn() })
      .compile();

    expect(moduleRef.get(OrderingController)).toBeInstanceOf(OrderingController);

    await moduleRef.close();
  });
});
