import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock the Prisma singleton. `product.fields.lowStockAt` is referenced by
// getLowStockProducts for a field-to-field comparison, so it must exist.
const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    product: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      findMany: vi.fn(),
      fields: { lowStockAt: "lowStockAt" },
    },
    stockMovement: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/server/db", () => ({ default: prismaMock }));

import {
  adjustStock,
  recordSale,
  bulkRestock,
  getLowStockProducts,
} from "@/server/services/inventory.service";

beforeEach(() => {
  vi.resetAllMocks();
  // Every service call runs through a transaction; route the callback against
  // the same mock (covers both `(tx) => …` and `async (tx) => …` forms).
  prismaMock.product.fields = { lowStockAt: "lowStockAt" };
  prismaMock.$transaction.mockImplementation(
    async (cb: (tx: typeof prismaMock) => unknown) => cb(prismaMock)
  );
  prismaMock.stockMovement.create.mockImplementation(
    async (args: { data: Record<string, unknown> }) => ({ id: "m1", ...args.data })
  );
});

describe("inventory.service — adjustStock", () => {
  it("restock adds: computes stockAfter and snapshots before+after", async () => {
    prismaMock.product.findUnique.mockResolvedValue({ id: "p1", stock: 15 });
    prismaMock.product.update.mockResolvedValue({ stock: 15 }); // 10 + 5

    await adjustStock("p1", "restock", 5);

    const data = prismaMock.stockMovement.create.mock.calls[0][0].data;
    expect(data.type).toBe("restock");
    expect(data.quantity).toBe(5); // signed delta (+)
    expect(data.stockAfter).toBe(15);
    expect(data.stockBefore).toBe(10);
    // Positive deltas go through update(increment), never updateMany.
    expect(prismaMock.product.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.product.updateMany).not.toHaveBeenCalled();
  });

  it("sale subtracts: stores a negative delta via a conditional decrement", async () => {
    prismaMock.product.findUnique.mockResolvedValue({ id: "p1", stock: 8 });
    prismaMock.product.updateMany.mockResolvedValue({ count: 1 }); // 10 → 8

    await adjustStock("p1", "sale", 2);

    const data = prismaMock.stockMovement.create.mock.calls[0][0].data;
    expect(data.type).toBe("sale");
    expect(data.quantity).toBe(-2);
    expect(data.stockAfter).toBe(8);
    expect(data.stockBefore).toBe(10);
    // Decrements use the race-safe conditional updateMany, not update.
    expect(prismaMock.product.updateMany).toHaveBeenCalledWith({
      where: { id: "p1", stock: { gte: 2 } },
      data: { stock: { decrement: 2 } },
    });
  });

  it("blocks going negative: throws and writes no ledger row", async () => {
    prismaMock.product.findUnique.mockResolvedValue({ id: "p1" });
    prismaMock.product.updateMany.mockResolvedValue({ count: 0 }); // not enough on hand

    await expect(adjustStock("p1", "sale", 20)).rejects.toThrow(
      /Insufficient stock/
    );
    expect(prismaMock.stockMovement.create).not.toHaveBeenCalled();
  });
});

describe("inventory.service — recordSale", () => {
  it("writes a negative sale movement referencing the order", async () => {
    prismaMock.product.findUnique.mockResolvedValue({ id: "p1", stock: 7 });
    prismaMock.product.updateMany.mockResolvedValue({ count: 1 }); // 10 → 7

    await recordSale("p1", 3, "ORD-ABC123");

    const data = prismaMock.stockMovement.create.mock.calls[0][0].data;
    expect(data.type).toBe("sale");
    expect(data.quantity).toBe(-3);
    expect(data.reference).toBe("ORD-ABC123");
  });
});

describe("inventory.service — bulkRestock", () => {
  it("applies every item inside a single transaction", async () => {
    prismaMock.product.findUnique.mockResolvedValue({ id: "p", stock: 50 });
    prismaMock.product.update.mockResolvedValue({ stock: 50 });

    const results = await bulkRestock(
      [
        { productId: "p1", quantity: 5 },
        { productId: "p2", quantity: 3 },
      ],
      "u1",
      "PO-2026-0001"
    );

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1); // one tx for all
    expect(prismaMock.stockMovement.create).toHaveBeenCalledTimes(2);
    expect(results).toHaveLength(2);
    // The PO reference is threaded onto each ledger row.
    for (const call of prismaMock.stockMovement.create.mock.calls) {
      expect(call[0].data.type).toBe("restock");
      expect(call[0].data.reference).toBe("PO-2026-0001");
    }
  });
});

describe("inventory.service — getLowStockProducts", () => {
  it("queries the 0 < stock <= lowStockAt range for active products", async () => {
    prismaMock.product.findMany.mockResolvedValue([{ id: "p1" }]);

    await getLowStockProducts();

    const where = prismaMock.product.findMany.mock.calls[0][0].where;
    expect(where.isActive).toBe(true);
    // Field-to-field comparison against the per-product threshold.
    expect(where.stock).toEqual({ gt: 0, lte: "lowStockAt" });
  });
});
