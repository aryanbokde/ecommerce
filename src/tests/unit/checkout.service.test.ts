import { describe, it, expect, beforeEach, vi } from "vitest";
import crypto from "crypto";

// Rich Razorpay mock: instances expose orders.create so createRazorpayOrder can
// be exercised (the global setup stub is just `default: vi.fn()`).
const { ordersCreate } = vi.hoisted(() => ({ ordersCreate: vi.fn() }));
vi.mock("razorpay", () => ({
  default: class MockRazorpay {
    orders = { create: ordersCreate };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(_opts: unknown) {}
  },
}));

// Prisma singleton mock — cart.findUnique + category.findMany (tax context).
const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    cart: { findUnique: vi.fn() },
    category: { findMany: vi.fn() },
  },
}));
vi.mock("@/server/db", () => ({ default: prismaMock }));

// Tax context: default 18%, enabled. quoteCheckout reads this via loadTaxContext.
vi.mock("@/server/services/settings.service", () => ({
  getStoreConfig: vi.fn().mockResolvedValue({ taxEnabled: true, defaultTaxRate: 18 }),
}));

import { createRazorpayOrder, verifyPaymentSignature } from "@/lib/razorpay";
import { quoteCheckout } from "@/server/services/order.service";
import { Prisma } from "@/generated/prisma";

const SECRET = process.env.RAZORPAY_KEY_SECRET as string; // set in setup.ts

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.category.findMany.mockResolvedValue([]); // no category rates → default
});

describe("createRazorpayOrder", () => {
  it("converts rupees to paise (× 100)", async () => {
    ordersCreate.mockResolvedValue({ id: "order_x", amount: 11800, currency: "INR" });

    await createRazorpayOrder(118, "rcpt_1");

    expect(ordersCreate).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 11800, currency: "INR", receipt: "rcpt_1" })
    );
  });

  it("rounds fractional rupees to whole paise", async () => {
    ordersCreate.mockResolvedValue({ id: "order_y", amount: 9999, currency: "INR" });

    await createRazorpayOrder(99.99, "rcpt_2");

    expect(ordersCreate).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 9999 }) // 99.99 × 100 → 9999
    );
  });

  it("returns { orderId, amount, currency }", async () => {
    ordersCreate.mockResolvedValue({ id: "order_z", amount: 50000, currency: "INR" });

    const res = await createRazorpayOrder(500, "rcpt_3");

    expect(res).toEqual({ orderId: "order_z", amount: 50000, currency: "INR" });
  });
});

describe("verifyPaymentSignature", () => {
  const orderId = "order_abc";
  const paymentId = "pay_abc";
  const validSignature = crypto
    .createHmac("sha256", SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  it("returns true for a valid signature", () => {
    expect(verifyPaymentSignature(orderId, paymentId, validSignature)).toBe(true);
  });

  it("returns false for a tampered signature", () => {
    const tampered = "0".repeat(validSignature.length); // same length, wrong value
    expect(verifyPaymentSignature(orderId, paymentId, tampered)).toBe(false);
  });

  it("returns false when the order/payment ids don't match the signature", () => {
    expect(verifyPaymentSignature("order_other", paymentId, validSignature)).toBe(false);
  });
});

describe("order total calculation (quoteCheckout)", () => {
  function mockCart(items: { price: number; quantity: number }[]) {
    prismaMock.cart.findUnique.mockResolvedValue({
      id: "cart_1",
      items: items.map((it) => ({
        quantity: it.quantity,
        product: {
          isActive: true,
          stock: 999,
          name: "Item",
          price: new Prisma.Decimal(it.price),
          taxRate: null, // inherit → default 18%
          categoryId: null,
        },
      })),
    });
  }

  it("adds 18% tax and free shipping over ₹999", async () => {
    mockCart([{ price: 500, quantity: 2 }]); // subtotal 1000

    const q = await quoteCheckout("u1");

    expect(q.subtotal).toBe("1000.00");
    expect(q.tax).toBe("180.00"); // 18%
    expect(q.shipping).toBe("0.00"); // free over ₹999
    expect(q.total).toBe("1180.00");
  });

  it("charges ₹99 shipping at or under ₹999", async () => {
    mockCart([{ price: 500, quantity: 1 }]); // subtotal 500

    const q = await quoteCheckout("u1");

    expect(q.subtotal).toBe("500.00");
    expect(q.tax).toBe("90.00");
    expect(q.shipping).toBe("99.00");
    expect(q.total).toBe("689.00"); // 500 + 90 + 99
  });
});
