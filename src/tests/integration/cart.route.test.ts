import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    product: { findUnique: vi.fn() },
    cart: { upsert: vi.fn() },
    cartItem: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  },
}));
vi.mock("@/server/db", () => ({ default: prismaMock }));

import { getServerSession } from "@/lib/auth";
import { POST as addItem } from "@/app/api/cart/items/route";
import { GET as getCart } from "@/app/api/cart/route";

// Shared in-memory cart so an add is reflected by a subsequent get.
const PRODUCT = {
  id: "p1",
  name: "Widget",
  slug: "widget",
  price: "100",
  images: [],
  stock: 10,
  isActive: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  (getServerSession as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
    user: { id: "u1", role: "customer" },
  });

  const items: { id: string; productId: string; quantity: number; product: typeof PRODUCT }[] =
    [];

  prismaMock.product.findUnique.mockResolvedValue({
    id: "p1",
    isActive: true,
    stock: 10,
  });
  // getOrCreateCartId uses select:{id}; getCart uses include → return items.
  prismaMock.cart.upsert.mockImplementation(async (args: { include?: unknown }) =>
    args.include ? { id: "cart1", userId: "u1", items } : { id: "cart1" }
  );
  prismaMock.cartItem.findUnique.mockResolvedValue(null); // nothing yet
  prismaMock.cartItem.create.mockImplementation(
    async (args: { data: { productId: string; quantity: number } }) => {
      const item = {
        id: "ci1",
        productId: args.data.productId,
        quantity: args.data.quantity,
        product: PRODUCT,
      };
      items.push(item);
      return item;
    }
  );
});

describe("cart add → get reflects (integration)", () => {
  it("adds an item and a subsequent GET shows it", async () => {
    const addRes = await addItem(
      new NextRequest("http://localhost/api/cart/items", {
        method: "POST",
        body: JSON.stringify({ productId: "p1", quantity: 2 }),
      })
    );
    expect(addRes.status).toBe(201);
    expect(prismaMock.cartItem.create).toHaveBeenCalled();

    const getRes = await getCart(
      new NextRequest("http://localhost/api/cart")
    );
    const body = await getRes.json();
    expect(getRes.status).toBe(200);
    expect(body.data.items).toHaveLength(1);
    expect(body.data.items[0].productId).toBe("p1");
    expect(body.data.items[0].quantity).toBe(2);
  });
});
