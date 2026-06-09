import { describe, it, expect, beforeEach, vi } from "vitest";
import { Prisma } from "@/generated/prisma";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    user: { findMany: vi.fn(), count: vi.fn(), findFirst: vi.fn() },
    order: { count: vi.fn(), aggregate: vi.fn(), findMany: vi.fn() },
    review: { count: vi.fn() },
  },
}));

vi.mock("@/server/db", () => ({ default: prismaMock }));

import {
  searchCustomers,
  getCustomerDetail,
} from "@/server/services/support-customer.service";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("support-customer.service — searchCustomers", () => {
  it("scopes to customers, applies search, returns paginated list", async () => {
    prismaMock.user.findMany.mockResolvedValue([
      {
        id: "u1",
        name: "Asha",
        email: "asha@x.com",
        phone: "+91900",
        image: null,
        emailVerified: true,
        isActive: true,
        createdAt: new Date("2026-01-01T00:00:00Z"),
        _count: { orders: 3 },
      },
    ]);
    prismaMock.user.count.mockResolvedValue(1);

    const res = await searchCustomers({ search: "asha", page: 1, limit: 20 });

    const where = prismaMock.user.findMany.mock.calls[0][0].where;
    expect(where.role).toBe("customer");
    expect(where.OR).toHaveLength(3); // name/email/phone
    expect(res.customers[0].orderCount).toBe(3);
    expect(typeof res.customers[0].createdAt).toBe("string");
    expect(res.totalPages).toBe(1);
  });
});

describe("support-customer.service — getCustomerDetail", () => {
  it("returns a full read-only profile with stats", async () => {
    prismaMock.user.findFirst.mockResolvedValue({
      id: "u1",
      name: "Asha",
      email: "asha@x.com",
      phone: null,
      image: null,
      emailVerified: true,
      isActive: true,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      addresses: [{ id: "a1", isDefault: true }],
    });
    prismaMock.order.count.mockResolvedValue(5);
    prismaMock.order.aggregate.mockResolvedValue({
      _sum: { total: new Prisma.Decimal("2500") },
    });
    prismaMock.review.count.mockResolvedValue(2);
    prismaMock.order.findMany.mockResolvedValue([
      {
        id: "o1",
        orderNumber: "ORD-1",
        status: "delivered",
        total: new Prisma.Decimal("500"),
        createdAt: new Date("2026-02-01T00:00:00Z"),
        _count: { items: 3 },
      },
    ]);

    const detail = await getCustomerDetail("u1");

    expect(detail).not.toBeNull();
    expect(detail!.orderCount).toBe(5);
    expect(detail!.totalSpent).toBe(2500); // Decimal → number
    expect(detail!.reviewCount).toBe(2);
    expect(detail!.recentOrders[0].itemCount).toBe(3);
    expect(detail!.recentOrders[0].total).toBe(500);
  });

  it("returns null when the id isn't a customer", async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);
    const detail = await getCustomerDetail("staff-id");
    expect(detail).toBeNull();
    expect(prismaMock.order.count).not.toHaveBeenCalled();
  });
});
