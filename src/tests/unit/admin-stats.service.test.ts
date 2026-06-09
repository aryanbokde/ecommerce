import { describe, it, expect, beforeEach, vi } from "vitest";
import { Prisma } from "@/generated/prisma";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    user: { count: vi.fn() },
    product: {
      count: vi.fn(),
      findMany: vi.fn(),
      fields: { lowStockAt: "lowStockAt" },
    },
    order: { count: vi.fn(), groupBy: vi.fn(), aggregate: vi.fn(), findMany: vi.fn() },
    review: { count: vi.fn(), aggregate: vi.fn() },
    orderItem: { groupBy: vi.fn() },
    return: { count: vi.fn() },
    errorLog: { count: vi.fn() },
    $queryRaw: vi.fn(),
  },
}));

vi.mock("@/server/db", () => ({ default: prismaMock }));

import {
  getAdminStats,
  getRevenueSeries,
} from "@/server/services/admin-stats.service";

const D = (v: string) => new Prisma.Decimal(v);

beforeEach(() => {
  vi.resetAllMocks();
  prismaMock.product.fields = { lowStockAt: "lowStockAt" };
});

describe("admin-stats.service — getRevenueSeries", () => {
  it("maps raw daily rows into typed points", async () => {
    prismaMock.$queryRaw.mockResolvedValue([
      { date: "2026-06-01", revenue: "1200.50", orders: BigInt(3) },
      { date: "2026-06-02", revenue: null, orders: BigInt(0) },
    ]);

    const series = await getRevenueSeries("30d");

    expect(series).toEqual([
      { date: "2026-06-01", revenue: 1200.5, orders: 3 },
      { date: "2026-06-02", revenue: 0, orders: 0 },
    ]);
  });
});

describe("admin-stats.service — getAdminStats", () => {
  it("assembles a serialisable dashboard snapshot", async () => {
    prismaMock.user.count.mockResolvedValue(50);
    prismaMock.product.count.mockResolvedValue(10);
    prismaMock.order.count.mockResolvedValue(40);
    prismaMock.return.count.mockResolvedValue(0);
    prismaMock.errorLog.count.mockResolvedValue(0);
    prismaMock.order.groupBy.mockResolvedValue([
      { status: "pending", _count: { _all: 5 } },
      { status: "delivered", _count: { _all: 12 } },
    ]);
    prismaMock.order.aggregate.mockResolvedValue({ _sum: { total: D("9999.99") } });
    prismaMock.order.findMany.mockResolvedValue([
      {
        id: "o1",
        orderNumber: "ORD-1",
        total: D("500"),
        status: "pending",
        paymentStatus: "unpaid",
        createdAt: new Date("2026-06-01T00:00:00Z"),
        user: { id: "u1", name: "Asha", email: "a@x.com" },
      },
    ]);
    prismaMock.review.count.mockResolvedValue(20);
    prismaMock.review.aggregate.mockResolvedValue({ _avg: { rating: 4.25 } });
    prismaMock.orderItem.groupBy.mockResolvedValue([
      { productId: "p1", _sum: { quantity: 15 }, _count: { _all: 6 } },
    ]);
    prismaMock.product.findMany.mockResolvedValue([
      { id: "p1", name: "Widget", slug: "widget", price: D("199"), images: [] },
    ]);

    const stats = await getAdminStats();

    expect(stats.users.total).toBe(50);
    expect(stats.orders.pending).toBe(5);
    expect(stats.orders.delivered).toBe(12);
    // Decimals serialised to fixed strings.
    expect(stats.orders.revenue.total).toBe("9999.99");
    expect(stats.reviews.avgRating).toBe(4.3); // rounded to 1 dp
    expect(stats.recentOrders[0].total).toBe("500.00");
    expect(stats.topProducts[0]).toMatchObject({ unitsSold: 15, orderItems: 6 });
    expect(stats.topProducts[0].product?.price).toBe("199.00");
  });

  it("tolerates a missing top-seller product record", async () => {
    prismaMock.user.count.mockResolvedValue(0);
    prismaMock.product.count.mockResolvedValue(0);
    prismaMock.order.count.mockResolvedValue(0);
    prismaMock.return.count.mockResolvedValue(0);
    prismaMock.errorLog.count.mockResolvedValue(0);
    prismaMock.order.groupBy.mockResolvedValue([]);
    prismaMock.order.aggregate.mockResolvedValue({ _sum: { total: null } });
    prismaMock.order.findMany.mockResolvedValue([]);
    prismaMock.review.count.mockResolvedValue(0);
    prismaMock.review.aggregate.mockResolvedValue({ _avg: { rating: null } });
    prismaMock.orderItem.groupBy.mockResolvedValue([
      { productId: "ghost", _sum: { quantity: 3 }, _count: { _all: 1 } },
    ]);
    prismaMock.product.findMany.mockResolvedValue([]); // product no longer exists

    const stats = await getAdminStats();

    expect(stats.reviews.avgRating).toBe(0);
    expect(stats.orders.revenue.total).toBe("0.00");
    expect(stats.topProducts[0].product).toBeNull();
    expect(stats.topProducts[0].unitsSold).toBe(3);
  });
});
