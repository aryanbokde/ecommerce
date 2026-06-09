import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandler } from "@/lib/with-error-handler";
import { requireRoles, parseQuery, parseJsonBody } from "@/lib/api-auth";
import { ROLES } from "@/constants/roles";
import { Prisma } from "@/generated/prisma";
import prisma from "@/server/db";
import {
  adjustStock,
  type StockMovementType,
} from "@/server/services/inventory.service";

const MANAGER = [ROLES.SHOP_MANAGER, ROLES.ADMIN];

const listQuerySchema = z.object({
  search: z.string().trim().min(1).optional(),
  stockStatus: z.enum(["all", "low", "out", "in"]).default("all"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// GET /api/manager/inventory — paginated products + current stock + last movement.
export const GET = withErrorHandler(async (req: NextRequest) => {
  await requireRoles(MANAGER);
  const { search, stockStatus, page, limit } = parseQuery(
    req.nextUrl.searchParams,
    listQuerySchema
  );

  // Field-to-field comparisons against the per-product lowStockAt threshold.
  const stockWhere: Prisma.ProductWhereInput =
    stockStatus === "out"
      ? { stock: 0 }
      : stockStatus === "low"
        ? { stock: { gt: 0, lte: prisma.product.fields.lowStockAt } }
        : stockStatus === "in"
          ? { stock: { gt: prisma.product.fields.lowStockAt } }
          : {};

  const where: Prisma.ProductWhereInput = {
    isActive: true,
    ...stockWhere,
    ...(search
      ? { OR: [{ name: { contains: search } }, { sku: { contains: search } }] }
      : {}),
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { stock: "asc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        name: true,
        sku: true,
        stock: true,
        lowStockAt: true,
        images: true,
        stockMovements: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { type: true, quantity: true, createdAt: true },
        },
      },
    }),
    prisma.product.count({ where }),
  ]);

  const data = products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    stock: p.stock,
    lowStockAt: p.lowStockAt,
    image:
      Array.isArray(p.images) && typeof p.images[0] === "string"
        ? p.images[0]
        : null,
    lastMovement: p.stockMovements[0] ?? null,
  }));

  return NextResponse.json({
    success: true,
    message: "Inventory fetched",
    data: { products: data, total, page, totalPages: Math.ceil(total / limit) },
  });
});

const adjustSchema = z
  .object({
    productId: z.string().trim().min(1),
    type: z.enum(["restock", "sale", "return", "damage", "correction"]),
    quantity: z.number().int(),
    reason: z.string().trim().max(2_000).optional(),
  })
  // For everything but a correction, the quantity is a positive magnitude.
  .refine((d) => (d.type === "correction" ? d.quantity !== 0 : d.quantity > 0), {
    message: "quantity must be positive (non-zero for a correction)",
    path: ["quantity"],
  });

// POST /api/manager/inventory — single stock adjustment → ledger entry.
export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await requireRoles(MANAGER);
  const { productId, type, quantity, reason } = await parseJsonBody(
    req,
    adjustSchema
  );

  const result = await adjustStock(
    productId,
    type as StockMovementType,
    quantity,
    session.user.id,
    reason
  );

  return NextResponse.json({
    success: true,
    message: "Stock adjusted",
    data: result,
  });
});
