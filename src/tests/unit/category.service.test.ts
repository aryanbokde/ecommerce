import { describe, it, expect, beforeEach, vi } from "vitest";
import { Prisma } from "@/generated/prisma";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    category: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    product: { count: vi.fn() },
  },
}));

vi.mock("@/server/db", () => ({ default: prismaMock }));

import {
  getCategories,
  getCategoryTree,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/server/services/category.service";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("category.service — reads", () => {
  it("getCategories returns active categories ordered", async () => {
    prismaMock.category.findMany.mockResolvedValue([{ id: "c1" }]);
    const res = await getCategories();
    expect(res).toHaveLength(1);
    expect(prismaMock.category.findMany.mock.calls[0][0].where).toEqual({
      isActive: true,
    });
  });

  it("getCategoryTree nests children under their parent", async () => {
    prismaMock.category.findMany.mockResolvedValue([
      { id: "root", parentId: null },
      { id: "child", parentId: "root" },
    ]);
    const tree = await getCategoryTree();
    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe("root");
    expect(tree[0].children[0].id).toBe("child");
  });

  it("getCategoryBySlug attaches productCount", async () => {
    prismaMock.category.findUnique.mockResolvedValue({
      id: "c1",
      slug: "shoes",
      _count: { products: 7 },
    });
    const cat = await getCategoryBySlug("shoes");
    expect(cat.productCount).toBe(7);
    expect("_count" in cat).toBe(false);
  });

  it("getCategoryBySlug throws 404 when missing", async () => {
    prismaMock.category.findUnique.mockResolvedValue(null);
    await expect(getCategoryBySlug("nope")).rejects.toThrow(/not found/i);
  });
});

describe("category.service — writes", () => {
  it("createCategory generates a unique slug and creates", async () => {
    prismaMock.category.findUnique.mockResolvedValue(null); // slug free
    prismaMock.category.create.mockResolvedValue({ id: "c1", slug: "new-cat" });

    await createCategory({ name: "New Cat" } as never);

    const data = prismaMock.category.create.mock.calls[0][0].data;
    expect(data.slug).toBe("new-cat");
    expect(data.name).toBe("New Cat");
  });

  it("createCategory maps a P2002 unique violation to 409", async () => {
    prismaMock.category.findUnique.mockResolvedValue(null);
    prismaMock.category.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("dup", {
        code: "P2002",
        clientVersion: "6.19.3",
      })
    );

    await expect(createCategory({ name: "Dupe" } as never)).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it("updateCategory rejects a category being its own parent", async () => {
    prismaMock.category.findUnique.mockResolvedValue({ id: "c1" });
    await expect(
      updateCategory("c1", { parentId: "c1" } as never)
    ).rejects.toThrow(/own parent/i);
  });

  it("deleteCategory refuses when products are still attached", async () => {
    prismaMock.category.findUnique.mockResolvedValue({ id: "c1" });
    prismaMock.product.count.mockResolvedValue(4);
    await expect(deleteCategory("c1")).rejects.toThrow(/still attached/i);
    expect(prismaMock.category.delete).not.toHaveBeenCalled();
  });

  it("deleteCategory deletes when empty", async () => {
    prismaMock.category.findUnique.mockResolvedValue({ id: "c1" });
    prismaMock.product.count.mockResolvedValue(0);
    prismaMock.category.delete.mockResolvedValue({ id: "c1" });
    await deleteCategory("c1");
    expect(prismaMock.category.delete).toHaveBeenCalledWith({
      where: { id: "c1" },
    });
  });
});
