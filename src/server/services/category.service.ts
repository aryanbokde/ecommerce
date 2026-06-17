import "server-only";

import { nanoid } from "nanoid";
import { Prisma, type Category } from "@/generated/prisma";
import prisma from "@/server/db";
import { AppError, ErrorCode } from "@/lib/api-error";
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
} from "@/server/validators/category.schema";

// ── Category service ──────────────────────────────────────────────────────────
// Tree-aware data access for categories. Auth/audit live in the route handlers.

export type CategoryNode = Category & {
  children: CategoryNode[];
  /** Direct product count for this category (excludes descendants). */
  productCount: number;
};

const orderBy: Prisma.CategoryOrderByWithRelationInput[] = [
  { sortOrder: "asc" },
  { name: "asc" },
  { id: "desc" },
];

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function ensureUniqueSlug(
  base: string,
  excludeId?: string
): Promise<string> {
  const root = base || "category";
  let candidate = root;
  for (let attempt = 0; attempt < 8; attempt++) {
    const existing = await prisma.category.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing || existing.id === excludeId) return candidate;
    candidate = `${root}-${nanoid(6).toLowerCase()}`;
  }
  return `${root}-${nanoid(12).toLowerCase()}`;
}

async function findCategoryOrThrow(id: string): Promise<Category> {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) {
    throw new AppError("Category not found", ErrorCode.NOT_FOUND, 404);
  }
  return category;
}

// Translate DB constraint violations into clean client errors.
function mapWriteError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      throw new AppError(
        "A category with this name or slug already exists",
        ErrorCode.VALIDATION_ERROR,
        409
      );
    }
    if (error.code === "P2003") {
      throw new AppError(
        "parentId does not reference an existing category",
        ErrorCode.VALIDATION_ERROR,
        422
      );
    }
  }
  throw error;
}

/** Flat list of all active categories, ordered by sortOrder then name. */
export async function getCategories(): Promise<Category[]> {
  return prisma.category.findMany({ where: { isActive: true }, orderBy });
}

/**
 * Active categories with their product count, busiest first. Used by the
 * storefront "Shop by Category" section. Plain (RSC-serializable) objects.
 */
export async function getCategoriesWithCounts(): Promise<
  (Category & { productCount: number })[]
> {
  const rows = await prisma.category.findMany({
    where: { isActive: true },
    include: { _count: { select: { products: true } } },
  });
  return rows
    .map(({ _count, ...rest }) => ({ ...rest, productCount: _count.products }))
    .sort((a, b) => b.productCount - a.productCount || a.name.localeCompare(b.name));
}

/** Active categories assembled into a nested parent → children tree. */
export async function getCategoryTree(): Promise<CategoryNode[]> {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy,
    include: { _count: { select: { products: true } } },
  });

  const byId = new Map<string, CategoryNode>();
  for (const { _count, ...c } of categories)
    byId.set(c.id, { ...c, children: [], productCount: _count.products });

  const roots: CategoryNode[] = [];
  for (const node of byId.values()) {
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    // Children inherit the sorted findMany order; a node whose parent is
    // missing/inactive surfaces as a root so it never disappears.
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

/**
 * A category id plus every descendant id (children, grandchildren, …). Used by
 * the storefront so a PARENT category page shows products from its whole
 * subtree, not just the (usually empty) parent itself.
 */
export async function getCategoryAndDescendantIds(
  categoryId: string
): Promise<string[]> {
  const all = await prisma.category.findMany({
    select: { id: true, parentId: true },
  });
  const childrenByParent = new Map<string, string[]>();
  for (const c of all) {
    if (!c.parentId) continue;
    const list = childrenByParent.get(c.parentId) ?? [];
    list.push(c.id);
    childrenByParent.set(c.parentId, list);
  }

  const result: string[] = [];
  const seen = new Set<string>();
  const stack = [categoryId];
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue; // guards against accidental cycles
    seen.add(id);
    result.push(id);
    for (const child of childrenByParent.get(id) ?? []) stack.push(child);
  }
  return result;
}

/**
 * Active category tree pruned to branches that actually hold products: a node
 * survives if it has its own products OR a surviving descendant does. Drives the
 * grouped storefront filter sidebar (parent heading → child rows).
 */
export async function getNonEmptyCategoryTree(): Promise<CategoryNode[]> {
  const tree = await getCategoryTree();
  const prune = (nodes: CategoryNode[]): CategoryNode[] =>
    nodes
      .map((n) => ({ ...n, children: prune(n.children) }))
      .filter((n) => n.productCount > 0 || n.children.length > 0);
  return prune(tree);
}

/** Single category by slug, with attached product count. */
export async function getCategoryBySlug(slug: string) {
  const category = await prisma.category.findUnique({
    where: { slug },
    include: { _count: { select: { products: true } } },
  });
  if (!category) {
    throw new AppError("Category not found", ErrorCode.NOT_FOUND, 404);
  }
  const { _count, ...rest } = category;
  return { ...rest, productCount: _count.products };
}

export async function createCategory(data: CreateCategoryInput) {
  const { slug: providedSlug, name, ...rest } = data;
  const slug = await ensureUniqueSlug(slugify(providedSlug ?? name));

  try {
    return await prisma.category.create({ data: { name, slug, ...rest } });
  } catch (error) {
    mapWriteError(error);
  }
}

export async function updateCategory(id: string, data: UpdateCategoryInput) {
  await findCategoryOrThrow(id);

  // A category cannot be its own parent.
  if (data.parentId && data.parentId === id) {
    throw new AppError(
      "A category cannot be its own parent",
      ErrorCode.VALIDATION_ERROR,
      422
    );
  }

  const slug =
    data.slug !== undefined
      ? await ensureUniqueSlug(slugify(data.slug), id)
      : undefined;

  try {
    return await prisma.category.update({
      where: { id },
      data: { ...data, ...(slug !== undefined ? { slug } : {}) },
    });
  } catch (error) {
    mapWriteError(error);
  }
}

/** Hard delete — refused if any products are still attached. */
export async function deleteCategory(id: string) {
  await findCategoryOrThrow(id);

  const productCount = await prisma.product.count({
    where: { categoryId: id },
  });
  if (productCount > 0) {
    throw new AppError(
      `Cannot delete category: ${productCount} product(s) are still attached`,
      ErrorCode.VALIDATION_ERROR,
      400
    );
  }

  try {
    return await prisma.category.delete({ where: { id } });
  } catch (error) {
    mapWriteError(error);
  }
}
