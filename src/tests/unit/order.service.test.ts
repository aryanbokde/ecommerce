import { describe, it, expect, beforeEach, vi } from "vitest";
import { Prisma } from "@/generated/prisma";
import type { CreateOrderInput } from "@/server/validators/order.schema";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    cart: { findUnique: vi.fn() },
    address: { findUnique: vi.fn() },
    order: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    orderItem: { findMany: vi.fn() },
    product: { findUnique: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
    category: { findMany: vi.fn() },
    stockMovement: { create: vi.fn() },
    cartItem: { deleteMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/server/db", () => ({ default: prismaMock }));
// Audit logging is fire-and-forget — stub it so it doesn't touch the DB mock.
vi.mock("@/server/services/audit-log.service", () => ({ logAudit: vi.fn() }));
// Tax context: enabled, default 18%. createOrder reads it via loadTaxContext.
vi.mock("@/server/services/settings.service", () => ({
  getStoreConfig: vi.fn().mockResolvedValue({ taxEnabled: true, defaultTaxRate: 18 }),
}));

import {
  createOrder,
  updateOrderStatus,
  getOrderById,
  getAllOrders,
} from "@/server/services/order.service";
import { getStoreConfig } from "@/server/services/settings.service";

const orderData: CreateOrderInput = {
  addressId: "a1",
  paymentMethod: "cod",
};

function seedCheckout() {
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
          taxRate: null,
          categoryId: null,
        },
      },
    ],
  });
  prismaMock.address.findUnique.mockResolvedValue({ id: "a1", userId: "u1" });
  // Inventory ledger (recordSale → adjustStock) runs inside the same tx:
  // existence check + post-decrement read both come from product.findUnique.
  prismaMock.product.findUnique.mockResolvedValue({ id: "p1", stock: 8 });
  prismaMock.product.updateMany.mockResolvedValue({ count: 1 });
  prismaMock.stockMovement.create.mockResolvedValue({ id: "m1" });
  prismaMock.cartItem.deleteMany.mockResolvedValue({ count: 1 });
  // Run the transaction callback against the same mock.
  prismaMock.$transaction.mockImplementation(
    async (cb: (tx: typeof prismaMock) => unknown) => cb(prismaMock)
  );
  // Echo back what was created (orderNumber/items come from the call args).
  prismaMock.order.create.mockImplementation(async (args) => ({
    id: "o1",
    orderNumber: args.data.orderNumber,
    total: args.data.total,
    items: args.data.items.create,
  }));
}

beforeEach(() => {
  vi.resetAllMocks();
  prismaMock.category.findMany.mockResolvedValue([]); // no category rates → default
  // resetAllMocks wipes the module-mock impl too — restore the tax context.
  vi.mocked(getStoreConfig).mockResolvedValue({
    taxEnabled: true,
    defaultTaxRate: 18,
  } as Awaited<ReturnType<typeof getStoreConfig>>);
});

describe("order.service — createOrder", () => {
  it('generates an orderNumber with the "ORD-" prefix', async () => {
    seedCheckout();

    const order = await createOrder("u1", orderData);

    const createArgs = prismaMock.order.create.mock.calls[0][0];
    expect(createArgs.data.orderNumber).toMatch(/^ORD-/);
    expect(order.orderNumber).toMatch(/^ORD-/);
  });

  it("snapshots the product price + name into the OrderItem", async () => {
    seedCheckout();

    await createOrder("u1", orderData);

    const item = prismaMock.order.create.mock.calls[0][0].data.items.create[0];
    expect(item.name).toBe("Shirt");
    expect(item.price.toString()).toBe("10");
    expect(item.quantity).toBe(2);
    expect(item.total.toString()).toBe("20"); // 10 × 2
  });

  it("clears the cart after the order is created", async () => {
    seedCheckout();

    await createOrder("u1", orderData);

    expect(prismaMock.cartItem.deleteMany).toHaveBeenCalledWith({
      where: { cartId: "cart-1" },
    });
  });

  it("records a sale movement in the stock ledger for each item", async () => {
    seedCheckout();

    await createOrder("u1", orderData);

    expect(prismaMock.stockMovement.create).toHaveBeenCalledTimes(1);
    const movement = prismaMock.stockMovement.create.mock.calls[0][0];
    expect(movement.data).toMatchObject({
      productId: "p1",
      type: "sale",
      quantity: -2, // signed delta for a 2-unit sale
    });
    expect(movement.data.reference).toMatch(/^ORD-/);
  });
});

describe("order.service — updateOrderStatus", () => {
  it("throws for an invalid status transition", async () => {
    // pending → delivered is not allowed (must go through the pipeline).
    prismaMock.order.findUnique.mockResolvedValue({
      id: "o1",
      status: "pending",
    });

    await expect(updateOrderStatus("o1", "delivered")).rejects.toThrow(
      /Invalid status transition/
    );
    expect(prismaMock.order.update).not.toHaveBeenCalled();
  });
});

describe("order.service — getOrderById", () => {
  it("throws (404) when the userId doesn't own the order", async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      id: "o1",
      userId: "u1",
      items: [],
      address: null,
      user: { id: "u1", name: "A", email: "a@b.c" },
    });

    await expect(getOrderById("o1", "someone-else")).rejects.toThrow(
      /Order not found/
    );
  });

  it("returns the order for staff (userId = null)", async () => {
    const order = {
      id: "o1",
      userId: "u1",
      items: [],
      address: null,
      user: { id: "u1", name: "A", email: "a@b.c" },
    };
    prismaMock.order.findUnique.mockResolvedValue(order);
    await expect(getOrderById("o1", null)).resolves.toBe(order);
  });
});

describe("order.service — updateOrderStatus", () => {
  it("advances a valid transition (pending → confirmed)", async () => {
    prismaMock.order.findUnique.mockResolvedValue({ id: "o1", status: "pending" });
    prismaMock.order.update.mockResolvedValue({ id: "o1", status: "confirmed" });

    const res = await updateOrderStatus("o1", "confirmed");
    expect(res.status).toBe("confirmed");
    expect(prismaMock.order.update).toHaveBeenCalled();
  });

  it("rejects a no-op transition to the same status", async () => {
    prismaMock.order.findUnique.mockResolvedValue({ id: "o1", status: "shipped" });
    await expect(updateOrderStatus("o1", "shipped")).rejects.toThrow(
      /already/i
    );
  });

  it("throws 404 for an unknown order", async () => {
    prismaMock.order.findUnique.mockResolvedValue(null);
    await expect(updateOrderStatus("nope", "confirmed")).rejects.toThrow(
      /not found/i
    );
  });
});

describe("order.service — getAllOrders", () => {
  it("applies filters and returns a paginated envelope", async () => {
    prismaMock.order.findMany.mockResolvedValue([{ id: "o1" }]);
    prismaMock.order.count.mockResolvedValue(1);

    const res = await getAllOrders({
      page: 1,
      limit: 20,
      status: "pending",
      paymentStatus: "paid",
      userId: "u1",
      from: new Date("2026-01-01"),
      to: new Date("2026-12-31"),
    } as never);

    const where = prismaMock.order.findMany.mock.calls[0][0].where;
    expect(where.status).toBe("pending");
    expect(where.paymentStatus).toBe("paid");
    expect(where.createdAt.gte).toBeInstanceOf(Date);
    expect(res).toMatchObject({ total: 1, page: 1, totalPages: 1 });
  });
});
