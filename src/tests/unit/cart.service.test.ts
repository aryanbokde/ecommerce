import { describe, it, expect, beforeEach, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    product: { findUnique: vi.fn() },
    cart: { upsert: vi.fn() },
    cartItem: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock("@/server/db", () => ({ default: prismaMock }));

import {
  addToCart,
  updateCartItem,
  clearCart,
} from "@/server/services/cart.service";

beforeEach(() => {
  vi.resetAllMocks();
  // getOrCreateCartId() and getCart() both call cart.upsert — return a cart id
  // (getOrCreateCartId reads .id; getCart returns the whole object).
  prismaMock.cart.upsert.mockResolvedValue({ id: "cart-1", items: [] });
});

describe("cart.service", () => {
  it("addToCart() creates a new CartItem when it doesn't exist", async () => {
    prismaMock.product.findUnique.mockResolvedValue({
      id: "p1",
      isActive: true,
      stock: 10,
    });
    prismaMock.cartItem.findUnique.mockResolvedValue(null); // no existing item
    prismaMock.cartItem.create.mockResolvedValue({});

    await addToCart("u1", "p1", 2);

    expect(prismaMock.cartItem.create).toHaveBeenCalledWith({
      data: { cartId: "cart-1", productId: "p1", quantity: 2 },
    });
    expect(prismaMock.cartItem.update).not.toHaveBeenCalled();
  });

  it("addToCart() increments quantity when the item already exists", async () => {
    prismaMock.product.findUnique.mockResolvedValue({
      id: "p1",
      isActive: true,
      stock: 10,
    });
    prismaMock.cartItem.findUnique.mockResolvedValue({ id: "ci1", quantity: 3 });
    prismaMock.cartItem.update.mockResolvedValue({});

    await addToCart("u1", "p1", 2);

    expect(prismaMock.cartItem.update).toHaveBeenCalledWith({
      where: { id: "ci1" },
      data: { quantity: 5 }, // 3 existing + 2 added
    });
    expect(prismaMock.cartItem.create).not.toHaveBeenCalled();
  });

  it("addToCart() throws when stock is insufficient", async () => {
    prismaMock.product.findUnique.mockResolvedValue({
      id: "p1",
      isActive: true,
      stock: 1,
    });
    prismaMock.cartItem.findUnique.mockResolvedValue(null);

    await expect(addToCart("u1", "p1", 5)).rejects.toThrow(/Insufficient stock/);
    expect(prismaMock.cartItem.create).not.toHaveBeenCalled();
  });

  it("updateCartItem() with quantity 0 removes the item", async () => {
    prismaMock.cartItem.findUnique.mockResolvedValue({
      id: "ci1",
      cart: { userId: "u1" },
      product: { stock: 5, isActive: true },
    });
    prismaMock.cartItem.delete.mockResolvedValue({});

    await updateCartItem("u1", "ci1", 0);

    expect(prismaMock.cartItem.delete).toHaveBeenCalledWith({
      where: { id: "ci1" },
    });
    expect(prismaMock.cartItem.update).not.toHaveBeenCalled();
  });

  it("clearCart() removes all items for the cart", async () => {
    prismaMock.cartItem.deleteMany.mockResolvedValue({ count: 3 });

    await clearCart("u1");

    expect(prismaMock.cartItem.deleteMany).toHaveBeenCalledWith({
      where: { cartId: "cart-1" },
    });
  });
});
