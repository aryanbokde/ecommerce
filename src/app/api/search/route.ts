import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandler } from "@/lib/with-error-handler";
import { parseQuery } from "@/lib/api-auth";
import { Prisma } from "@/generated/prisma";
import prisma from "@/server/db";

const MIN_QUERY_LENGTH = 2;

const searchQuerySchema = z.object({
  q: z.string().trim().default(""),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  categoryId: z.string().trim().min(1).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
});

// GET /api/search — public full-text-ish product search.
export const GET = withErrorHandler(async (req: NextRequest) => {
  const { q, page, limit, categoryId, minPrice, maxPrice } = parseQuery(
    req.nextUrl.searchParams,
    searchQuerySchema
  );

  // Too short / empty → empty result set (no DB hit).
  if (q.length < MIN_QUERY_LENGTH) {
    return NextResponse.json({
      success: true,
      message: "Query too short",
      data: { products: [], total: 0, page, query: q },
    });
  }

  // Lightweight analytics hook — replace with a real sink later.
  console.log(`[search] q=${JSON.stringify(q)} page=${page} limit=${limit}`);

  // NOTE: Prisma's `mode: "insensitive"` is Postgres-only and isn't part of the
  // MySQL StringFilter type. MySQL's default collation (utf8mb4_*_ci) already
  // matches case-insensitively, so `contains` alone is what the spec intends.
  // `tags` is a JSON array → use `array_contains` (exact tag membership).
  const where: Prisma.ProductWhereInput = {
    isActive: true,
    ...(categoryId ? { categoryId } : {}),
    ...(minPrice !== undefined || maxPrice !== undefined
      ? {
          price: {
            ...(minPrice !== undefined ? { gte: minPrice } : {}),
            ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
          },
        }
      : {}),
    OR: [
      { name: { contains: q } },
      { description: { contains: q } },
      { sku: { contains: q } },
      { tags: { array_contains: q } },
    ],
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
      include: { category: { select: { id: true, name: true, slug: true } } },
    }),
    prisma.product.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    message: "Search results",
    data: { products, total, page, query: q },
  });
});
