import { describe, it, expect, beforeEach, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    product: {
      count: vi.fn(),
      findMany: vi.fn(),
      fields: { lowStockAt: "lowStockAt" },
    },
    order: { count: vi.fn() },
    orderItem: { aggregate: vi.fn(), groupBy: vi.fn() },
  },
}));

vi.mock("@/server/db", () => ({ default: prismaMock }));

import { getManagerStats } from "@/server/services/manager-stats.service";

beforeEach(() => {
  vi.resetAllMocks();
  prismaMock.product.fields = { lowStockAt: "lowStockAt" };
});

describe("manager-stats.service — getManagerStats", () => {
  it("aggregates inventory + fulfilment figures and resolves top movers", async () => {
    // lowStockCount, outOfStockCount (2 product.count) …
    prismaMock.product.count
      .mockResolvedValueOnce(6) // lowStock
      .mockResolvedValueOnce(2); // outOfStock
    // ordersToFulfill, shippedToday (2 order.count)
    prismaMock.order.count
      .mockResolvedValueOnce(11) // ordersToFulfill
      .mockResolvedValueOnce(4); // shippedToday
    prismaMock.orderItem.aggregate.mockResolvedValue({
      _sum: { quantity: 37 },
    });
    prismaMock.orderItem.groupBy.mockResolvedValue([
      { productId: "p1", _sum: { quantity: 20 } },
    ]);
    prismaMock.product.findMany.mockResolvedValue([
      { id: "p1", name: "Widget", slug: "widget", stock: 9 },
    ]);

    const stats = await getManagerStats();

    expect(stats.lowStockCount).toBe(6);
    expect(stats.outOfStockCount).toBe(2);
    expect(stats.ordersToFulfill).toBe(11);
    expect(stats.shippedToday).toBe(4);
    expect(stats.unitsSoldToday).toBe(37);
    expect(stats.topMovingProducts[0]).toMatchObject({
      id: "p1",
      name: "Widget",
      unitsSold: 20,
    });
  });

  it("handles an empty top-movers list (no product lookup)", async () => {
    prismaMock.product.count.mockResolvedValue(0);
    prismaMock.order.count.mockResolvedValue(0);
    prismaMock.orderItem.aggregate.mockResolvedValue({ _sum: { quantity: null } });
    prismaMock.orderItem.groupBy.mockResolvedValue([]);

    const stats = await getManagerStats();

    expect(stats.unitsSoldToday).toBe(0);
    expect(stats.topMovingProducts).toEqual([]);
    expect(prismaMock.product.findMany).not.toHaveBeenCalled();
  });
});
