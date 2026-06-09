import { describe, it, expect, beforeEach, vi } from "vitest";
import type { ProductQuery, CreateProductInput } from "@/server/validators/product.schema";

// Hoisted Prisma mock so it can be referenced both in the vi.mock factory and tests.
const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    product: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/server/db", () => ({ default: prismaMock }));

import {
  getProducts,
  getProductBySlug,
  createProduct,
  deleteProduct,
} from "@/server/services/product.service";

const baseQuery: ProductQuery = {
  page: 1,
  limit: 20,
  sortBy: "createdAt",
  sortOrder: "desc",
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe("product.service", () => {
  it("getProducts() returns a paginated result", async () => {
    prismaMock.product.findMany.mockResolvedValue([{ id: "p1" }, { id: "p2" }]);
    prismaMock.product.count.mockResolvedValue(2);

    const result = await getProducts(baseQuery);

    expect(result).toEqual({
      products: [{ id: "p1" }, { id: "p2" }],
      total: 2,
      page: 1,
      totalPages: 1,
    });
    // page 1, limit 20 → skip 0 / take 20
    const args = prismaMock.product.findMany.mock.calls[0][0];
    expect(args.skip).toBe(0);
    expect(args.take).toBe(20);
  });

  it("getProducts() filters by categoryId correctly", async () => {
    prismaMock.product.findMany.mockResolvedValue([]);
    prismaMock.product.count.mockResolvedValue(0);

    await getProducts({ ...baseQuery, categoryId: "cat-1" });

    const findArgs = prismaMock.product.findMany.mock.calls[0][0];
    const countArgs = prismaMock.product.count.mock.calls[0][0];
    expect(findArgs.where.categoryId).toBe("cat-1");
    expect(countArgs.where.categoryId).toBe("cat-1");
  });

  it("getProductBySlug() returns null for an unknown slug", async () => {
    prismaMock.product.findUnique.mockResolvedValue(null);

    const result = await getProductBySlug("does-not-exist");

    expect(result).toBeNull();
    expect(prismaMock.product.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { slug: "does-not-exist" } })
    );
  });

  it("createProduct() generates a slug from the name", async () => {
    // ensureUniqueSlug checks availability → return null (slug is free).
    prismaMock.product.findUnique.mockResolvedValue(null);
    prismaMock.product.create.mockImplementation(async (args) => ({
      id: "p1",
      ...args.data,
    }));

    const input: CreateProductInput = {
      name: "Cool Cotton Shirt",
      price: 19.99,
      stock: 10,
      lowStockAt: 5,
      isActive: true,
      isFeatured: false,
    };

    const product = await createProduct(input);

    const createArgs = prismaMock.product.create.mock.calls[0][0];
    expect(createArgs.data.slug).toBe("cool-cotton-shirt");
    expect(product.slug).toBe("cool-cotton-shirt");
  });

  it("deleteProduct() soft-deletes (isActive: false), not a hard delete", async () => {
    prismaMock.product.findUnique.mockResolvedValue({ id: "p1" }); // exists
    prismaMock.product.update.mockImplementation(async (args) => ({
      id: "p1",
      isActive: false,
      ...args.data,
    }));

    await deleteProduct("p1");

    expect(prismaMock.product.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { isActive: false },
    });
    // confirm we never hard-delete
    expect(
      (prismaMock.product as Record<string, unknown>).delete
    ).toBeUndefined();
  });
});
