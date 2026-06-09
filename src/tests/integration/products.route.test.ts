import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    product: { findMany: vi.fn(), count: vi.fn() },
  },
}));
vi.mock("@/server/db", () => ({ default: prismaMock }));

import { GET } from "@/app/api/products/route";

beforeEach(() => vi.resetAllMocks());

describe("GET /api/products (integration)", () => {
  it("returns the standard paginated product envelope", async () => {
    prismaMock.product.findMany.mockResolvedValue([
      { id: "p1", name: "Widget", price: "199.00", category: null },
    ]);
    prismaMock.product.count.mockResolvedValue(1);

    const res = await GET(
      new NextRequest("http://localhost/api/products?page=1&limit=20")
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.products).toHaveLength(1);
    expect(body.data).toMatchObject({ total: 1, page: 1, totalPages: 1 });
  });

  it("passes a search filter through to the query", async () => {
    prismaMock.product.findMany.mockResolvedValue([]);
    prismaMock.product.count.mockResolvedValue(0);

    await GET(
      new NextRequest("http://localhost/api/products?search=widget")
    );

    const where = prismaMock.product.findMany.mock.calls[0][0].where;
    expect(where.OR).toBeTruthy(); // name/description/sku OR clause
  });
});
