import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { Prisma } from "@/generated/prisma";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    cart: { findUnique: vi.fn() },
    address: { findUnique: vi.fn() },
    order: { create: vi.fn() },
    product: { findUnique: vi.fn(), updateMany: vi.fn() },
    stockMovement: { create: vi.fn() },
    cartItem: { deleteMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));
vi.mock("@/server/db", () => ({ default: prismaMock }));
vi.mock("@/server/services/audit-log.service", () => ({ logAudit: vi.fn() }));

import { getServerSession } from "@/lib/auth";
import { POST } from "@/app/api/orders/route";

beforeEach(() => {
  vi.clearAllMocks();
  (getServerSession as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
    user: { id: "u1", role: "customer" },
  });

  prismaMock.cart.findUnique.mockResolvedValue({
    id: "cart-1",
    items: [
      {
        productId: "p1",
        quantity: 2,
        product: {
          id: "p1",
          name: "Shirt",
          price: new Prisma.Decimal("10"),
          isActive: true,
          images: ["shirt.jpg"],
        },
      },
    ],
  });
  prismaMock.address.findUnique.mockResolvedValue({ id: "a1", userId: "u1" });
  prismaMock.product.findUnique.mockResolvedValue({ id: "p1", stock: 8 });
  prismaMock.product.updateMany.mockResolvedValue({ count: 1 });
  prismaMock.stockMovement.create.mockResolvedValue({ id: "m1" });
  prismaMock.cartItem.deleteMany.mockResolvedValue({ count: 1 });
  prismaMock.$transaction.mockImplementation(
    async (cb: (tx: typeof prismaMock) => unknown) => cb(prismaMock)
  );
  prismaMock.order.create.mockImplementation(async (args) => ({
    id: "o1",
    orderNumber: args.data.orderNumber,
    total: args.data.total,
    items: args.data.items.create,
  }));
});

describe("POST /api/orders → stock decrements via ledger (integration)", () => {
  it("creates the order and writes a negative sale movement", async () => {
    const res = await POST(
      new NextRequest("http://localhost/api/orders", {
        method: "POST",
        body: JSON.stringify({ addressId: "a1", paymentMethod: "cod" }),
      })
    );
    const body = await res.json();

    expect([200, 201]).toContain(res.status);
    expect(body.data.orderNumber).toMatch(/^ORD-/);

    // Inventory ledger recorded the sale as a negative delta.
    expect(prismaMock.stockMovement.create).toHaveBeenCalledTimes(1);
    const movement = prismaMock.stockMovement.create.mock.calls[0][0].data;
    expect(movement).toMatchObject({ productId: "p1", type: "sale", quantity: -2 });
  });
});
