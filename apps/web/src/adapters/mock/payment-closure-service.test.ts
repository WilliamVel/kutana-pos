import { describe, expect, it } from "vitest";
import { buildMockPorts } from "../../composition/mock.js";

describe("MockPaymentClosureService", () => {
  it("closes the order and frees its table like the backend operation", async () => {
    const ports = buildMockPorts();
    const order = await ports.orders.findByTable("table-1");

    const sale = await ports.paymentClosure.closeOrder(order!.id);

    expect(sale.orderId).toBe(order!.id);
    await expect(ports.orders.findByTable("table-1")).resolves.toMatchObject({ status: "paid" });
    await expect(ports.tables.findById("table-1")).resolves.toMatchObject({ status: "free" });
  });
});
