import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock the Prisma singleton + the inventory ledger + logger (Winston is Node-only
// and the restock path logs on skip).
const { prismaMock, adjustStock } = vi.hoisted(() => ({
  prismaMock: {
    order: { findUnique: vi.fn(), update: vi.fn() },
    supportNote: { create: vi.fn() },
    $transaction: vi.fn(),
  },
  adjustStock: vi.fn(),
}));

vi.mock("@/server/db", () => ({ default: prismaMock }));
vi.mock("@/server/services/inventory.service", () => ({ adjustStock }));
vi.mock("@/lib/logger", () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import {
  addSupportNote,
  cancelSupportOrder,
} from "@/server/services/support-order.service";

beforeEach(() => {
  vi.resetAllMocks();
  // Route the transaction callback against the same mock.
  prismaMock.$transaction.mockImplementation(
    async (cb: (tx: typeof prismaMock) => unknown) => cb(prismaMock)
  );
  prismaMock.supportNote.create.mockImplementation(
    async (args: { data: Record<string, unknown> }) => ({ id: "n1", ...args.data })
  );
  prismaMock.order.update.mockResolvedValue({ id: "o1" });
});

describe("support-order.service — addSupportNote", () => {
  it("creates a SupportNote linked to the order and author", async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      id: "o1",
      orderNumber: "ORD-1",
    });

    const { note } = await addSupportNote("o1", "support-user", "Called customer");

    expect(prismaMock.supportNote.create).toHaveBeenCalledWith({
      data: { orderId: "o1", userId: "support-user", note: "Called customer" },
    });
    expect(note.id).toBe("n1");
  });

  it("throws 404 when the order doesn't exist", async () => {
    prismaMock.order.findUnique.mockResolvedValue(null);
    await expect(addSupportNote("nope", "u1", "x")).rejects.toThrow(
      /Order not found/
    );
    expect(prismaMock.supportNote.create).not.toHaveBeenCalled();
  });
});

describe("support-order.service — cancelSupportOrder", () => {
  it.each(["pending", "confirmed", "processing"])(
    "allows cancellation from %s",
    async (status) => {
      prismaMock.order.findUnique.mockResolvedValue({
        id: "o1",
        orderNumber: "ORD-1",
        status,
        paymentStatus: "unpaid",
        items: [],
      });

      const res = await cancelSupportOrder("o1", "u1", "customer changed mind");

      const update = prismaMock.order.update.mock.calls[0][0];
      expect(update.data.status).toBe("cancelled");
      // Unpaid → no refund flag.
      expect(update.data.paymentStatus).toBeUndefined();
      expect(res.refundNeeded).toBe(false);
    }
  );

  it.each(["shipped", "delivered"])(
    "blocks cancellation from %s (throws, no mutation)",
    async (status) => {
      prismaMock.order.findUnique.mockResolvedValue({
        id: "o1",
        orderNumber: "ORD-1",
        status,
        paymentStatus: "paid",
        items: [{ productId: "p1", quantity: 1 }],
      });

      await expect(cancelSupportOrder("o1", "u1", "too late")).rejects.toThrow(
        /can't be cancelled/
      );
      expect(prismaMock.order.update).not.toHaveBeenCalled();
      expect(adjustStock).not.toHaveBeenCalled();
    }
  );

  it("flags a refund and restocks every line for a paid order", async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      id: "o1",
      orderNumber: "ORD-ABC",
      status: "confirmed",
      paymentStatus: "paid",
      items: [
        { productId: "p1", quantity: 2 },
        { productId: "p2", quantity: 1 },
      ],
    });

    const res = await cancelSupportOrder("o1", "support-user", "damaged in transit");

    const update = prismaMock.order.update.mock.calls[0][0];
    expect(update.data.status).toBe("cancelled");
    expect(update.data.paymentStatus).toBe("refund_pending"); // refund flag
    expect(res.refundNeeded).toBe(true);

    // Each line restocked via the ledger ("return" = +).
    expect(adjustStock).toHaveBeenCalledTimes(2);
    expect(adjustStock).toHaveBeenNthCalledWith(
      1,
      "p1",
      "return",
      2,
      "support-user",
      expect.stringContaining("ORD-ABC"),
      "ORD-ABC"
    );
    expect(adjustStock).toHaveBeenNthCalledWith(
      2,
      "p2",
      "return",
      1,
      "support-user",
      expect.stringContaining("ORD-ABC"),
      "ORD-ABC"
    );
  });

  it("throws 404 when the order doesn't exist", async () => {
    prismaMock.order.findUnique.mockResolvedValue(null);
    await expect(cancelSupportOrder("nope", "u1", "x")).rejects.toThrow(
      /Order not found/
    );
  });
});
