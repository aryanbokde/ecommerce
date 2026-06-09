import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/with-error-handler";
import { requireRoles } from "@/lib/api-auth";
import { ROLES } from "@/constants/roles";
import prisma from "@/server/db";

const MANAGER = [ROLES.SHOP_MANAGER, ROLES.ADMIN];
const THIRTY_DAYS = 30 * 86_400_000;

function firstImage(images: unknown): string | null {
  return Array.isArray(images) && typeof images[0] === "string"
    ? images[0]
    : null;
}

const productSelect = {
  id: true,
  name: true,
  sku: true,
  stock: true,
  lowStockAt: true,
  images: true,
} as const;

// GET /api/manager/low-stock — out-of-stock (top) + low-stock products, each
// with units sold in the last 30 days (from the StockMovement "sale" ledger).
export const GET = withErrorHandler(async () => {
  await requireRoles(MANAGER);

  const [outOfStock, lowStock] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true, stock: 0 },
      orderBy: { updatedAt: "desc" },
      select: productSelect,
    }),
    prisma.product.findMany({
      where: {
        isActive: true,
        stock: { gt: 0, lte: prisma.product.fields.lowStockAt },
      },
      orderBy: { stock: "asc" },
      select: productSelect,
    }),
  ]);

  const ids = [...outOfStock, ...lowStock].map((p) => p.id);
  const since = new Date(Date.now() - THIRTY_DAYS);

  // Sales are stored as negative deltas, so sum and flip the sign.
  const sales = ids.length
    ? await prisma.stockMovement.groupBy({
        by: ["productId"],
        where: { productId: { in: ids }, type: "sale", createdAt: { gte: since } },
        _sum: { quantity: true },
      })
    : [];
  const soldByProduct = new Map(
    sales.map((s) => [s.productId, Math.abs(s._sum.quantity ?? 0)])
  );

  type Row = (typeof outOfStock)[number];
  const shape = (p: Row) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    stock: p.stock,
    lowStockAt: p.lowStockAt,
    image: firstImage(p.images),
    soldLast30d: soldByProduct.get(p.id) ?? 0,
  });

  return NextResponse.json({
    success: true,
    message: "Low stock fetched",
    data: {
      outOfStock: outOfStock.map(shape),
      lowStock: lowStock.map(shape),
    },
  });
});
