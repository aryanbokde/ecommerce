import { describe, it, expect, beforeEach, vi } from "vitest";
import { Prisma } from "@/generated/prisma";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    order: { count: vi.fn(), findMany: vi.fn() },
  },
}));

vi.mock("@/server/db", () => ({ default: prismaMock }));

import { getSupportStats } from "@/server/services/support-stats.service";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("support-stats.service — getSupportStats", () => {
  it("returns counts and serialisable recent orders", async () => {
    // ordersToday, awaitingFulfillment, shippedToday (3 counts) then findMany.
    prismaMock.order.count
      .mockResolvedValueOnce(4) // ordersToday
      .mockResolvedValueOnce(9) // awaitingFulfillment
      .mockResolvedValueOnce(2); // shippedToday
    prismaMock.order.findMany.mockResolvedValue([
      {
        id: "o1",
        orderNumber: "ORD-1",
        status: "pending",
        total: new Prisma.Decimal("1499.50"),
        createdAt: new Date("2026-06-01T10:00:00Z"),
        user: { name: "Asha", email: "asha@x.com" },
      },
    ]);

    const stats = await getSupportStats();

    expect(stats.ordersToday).toBe(4);
    expect(stats.awaitingFulfillment).toBe(9);
    expect(stats.shippedToday).toBe(2);
    expect(stats.recentOrders).toHaveLength(1);
    const row = stats.recentOrders[0];
    expect(row.total).toBe(1499.5); // Decimal → number
    expect(typeof row.createdAt).toBe("string"); // Date → ISO
    expect(row.customerName).toBe("Asha");
  });

  it("handles a customer-less order row", async () => {
    prismaMock.order.count.mockResolvedValue(0);
    prismaMock.order.findMany.mockResolvedValue([
      {
        id: "o2",
        orderNumber: "ORD-2",
        status: "confirmed",
        total: new Prisma.Decimal("0"),
        createdAt: new Date(),
        user: null,
      },
    ]);

    const stats = await getSupportStats();
    expect(stats.recentOrders[0].customerName).toBeNull();
    expect(stats.recentOrders[0].customerEmail).toBeNull();
  });
});
