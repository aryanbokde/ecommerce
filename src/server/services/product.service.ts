import "server-only";

import { nanoid } from "nanoid";
import { Prisma } from "@/generated/prisma";
import prisma from "@/server/db";
import { AppError, ErrorCode } from "@/lib/api-error";
import type {
  CreateProductInput,
  UpdateProductInput,
  ProductQuery,
} from "@/server/validators/product.schema";

// ── Product service ───────────────────────────────────────────────────────────
// Data-access layer for products. Pure DB logic — auth/audit live in the route
// handlers. Throws AppError(NOT_FOUND) for missing records so withErrorHandler
// turns them into clean 404s.

const categoryPreview = {
  select: { id: true, name: true, slug: true },
} as const;

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Produce a slug that is unique across products (optionally ignoring `excludeId`). */
async function ensureUniqueSlug(
  base: string,
  excludeId?: string
): Promise<string> {
  const root = base || "product";
  let candidate = root;

  for (let attempt = 0; attempt < 8; attempt++) {
    const existing = await prisma.product.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing || existing.id === excludeId) return candidate;
    candidate = `${root}-${nanoid(6).toLowerCase()}`;
  }
  // Extremely unlikely fall-through — guarantee uniqueness with a longer suffix.
  return `${root}-${nanoid(12).toLowerCase()}`;
}

async function findProductOrThrow(id: string) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    throw new AppError("Product not found", ErrorCode.NOT_FOUND, 404);
  }
  return product;
}

// `categoryIds` (storefront only) matches a category AND its descendants; it
// takes precedence over the single `categoryId` when present.
export async function getProducts(
  filters: ProductQuery & { categoryIds?: string[] }
) {
  const {
    page,
    limit,
    search,
    categoryId,
    categoryIds,
    minPrice,
    maxPrice,
    isFeatured,
    isActive,
    sortBy,
    sortOrder,
  } = filters;

  const where: Prisma.ProductWhereInput = {
    ...(isActive !== undefined ? { isActive } : {}),
    ...(isFeatured !== undefined ? { isFeatured } : {}),
    ...(categoryIds && categoryIds.length
      ? { categoryId: { in: categoryIds } }
      : categoryId
        ? { categoryId }
        : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search } },
            { description: { contains: search } },
            { sku: { contains: search } },
          ],
        }
      : {}),
    ...(minPrice !== undefined || maxPrice !== undefined
      ? {
          price: {
            ...(minPrice !== undefined ? { gte: minPrice } : {}),
            ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
          },
        }
      : {}),
  };

  // "reviews" sorts by related review count; everything else is a scalar field.
  // A trailing `id` tiebreaker keeps the order DETERMINISTIC + identical across
  // every caller (admin grid, storefront, related). Without it, rows that share
  // a sort value — e.g. the whole seed batch carries the same createdAt — come
  // back in arbitrary physical order that differs per query.
  const orderBy: Prisma.ProductOrderByWithRelationInput[] =
    sortBy === "reviews"
      ? [{ reviews: { _count: sortOrder } }, { id: "desc" }]
      : [{ [sortBy]: sortOrder }, { id: "desc" }];

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: { category: categoryPreview },
    }),
    prisma.product.count({ where }),
  ]);

  return {
    products,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

/** Single product by slug with category + visible reviews; `null` if unknown. */
export async function getProductBySlug(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
    include: {
      category: true,
      reviews: {
        where: { isVisible: true },
        orderBy: { createdAt: "desc" },
        include: { user: { select: { id: true, name: true, image: true } } },
      },
    },
  });
}

export async function getProductById(id: string) {
  return prisma.product.findUnique({
    where: { id },
    include: { category: true },
  });
}

export async function createProduct(data: CreateProductInput) {
  const { slug: providedSlug, name, ...rest } = data;
  const slug = await ensureUniqueSlug(slugify(providedSlug ?? name));

  return prisma.product.create({
    data: {
      name,
      slug,
      ...rest,
      images: rest.images ?? Prisma.JsonNull,
      tags: rest.tags ?? Prisma.JsonNull,
    },
  });
}

export async function updateProduct(id: string, data: UpdateProductInput) {
  await findProductOrThrow(id);

  // Only re-slug when a slug was explicitly supplied; keep it unique vs others.
  const slug =
    data.slug !== undefined
      ? await ensureUniqueSlug(slugify(data.slug), id)
      : undefined;

  return prisma.product.update({
    where: { id },
    data: {
      ...data,
      ...(slug !== undefined ? { slug } : {}),
      // Json columns: a provided array writes through; `null` clears them.
      ...(data.images !== undefined
        ? { images: data.images ?? Prisma.JsonNull }
        : {}),
      ...(data.tags !== undefined
        ? { tags: data.tags ?? Prisma.JsonNull }
        : {}),
    },
  });
}

export async function deleteProduct(id: string) {
  await findProductOrThrow(id);
  // Soft delete — preserve order history and reviews.
  return prisma.product.update({
    where: { id },
    data: { isActive: false },
  });
}

export async function getFeaturedProducts(limit = 8) {
  return prisma.product.findMany({
    where: { isActive: true, isFeatured: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit,
    include: { category: categoryPreview },
  });
}

/**
 * Top sellers by total quantity sold (OrderItem.quantity summed per product).
 * Returns active products ordered best-first, each with a `soldCount` field.
 */
export async function getBestSellers(limit = 10) {
  const grouped = await prisma.orderItem.groupBy({
    by: ["productId"],
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: limit * 2, // over-fetch so inactive/removed products can be filtered out
  });

  const ids = grouped.map((g) => g.productId);
  if (ids.length === 0) return [];

  const products = await prisma.product.findMany({
    where: { id: { in: ids }, isActive: true },
    include: { category: categoryPreview },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  // Preserve the sold-quantity order; attach soldCount; drop inactive/missing.
  return grouped
    .map((g) => {
      const product = byId.get(g.productId);
      return product
        ? { ...product, soldCount: g._sum.quantity ?? 0 }
        : null;
    })
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .slice(0, limit);
}

export async function getLowStockProducts() {
  return prisma.product.findMany({
    where: {
      isActive: true,
      // Field-to-field comparison: stock <= lowStockAt.
      stock: { lte: prisma.product.fields.lowStockAt },
    },
    orderBy: { stock: "asc" },
    include: { category: categoryPreview },
  });
}

export interface CatalogSummary {
  total: number;
  active: number;
  inactive: number;
  low: number; // active, 0 < stock <= lowStockAt
  out: number; // active, stock = 0
}

/**
 * Catalog rollup for the manager products page. Counts the WHOLE catalog
 * (active + inactive), unlike the inventory summary which is active-only.
 */
export async function getCatalogSummary(): Promise<CatalogSummary> {
  const [total, active, out, low] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { isActive: true } }),
    prisma.product.count({ where: { isActive: true, stock: 0 } }),
    prisma.product.count({
      where: {
        isActive: true,
        stock: { gt: 0, lte: prisma.product.fields.lowStockAt },
      },
    }),
  ]);
  return { total, active, inactive: total - active, low, out };
}
