import "server-only";

import { Prisma } from "@/generated/prisma";
import prisma from "@/server/db";
import { AppError, ErrorCode } from "@/lib/api-error";

// ── Inventory service ─────────────────────────────────────────────────────────
// Every stock change flows through `adjustStock`, which updates the product and
// writes an append-only StockMovement row in the SAME transaction — so the
// ledger can never drift from the on-hand quantity.
//
// `quantity` is a positive magnitude for the fixed-direction types; the `type`
// supplies the sign. For "correction" the quantity is the signed delta (±).
// The stored `StockMovement.quantity` is always the signed delta.

export type StockMovementType =
  | "restock"
  | "sale"
  | "return"
  | "damage"
  | "correction";

const SIGN: Record<Exclude<StockMovementType, "correction">, 1 | -1> = {
  restock: 1,
  return: 1,
  sale: -1,
  damage: -1,
};

interface AdjustInput {
  productId: string;
  type: StockMovementType;
  quantity: number;
  userId?: string | null;
  reason?: string;
  reference?: string;
}

// Core routine — runs against a provided transaction client.
async function adjustStockTx(tx: Prisma.TransactionClient, input: AdjustInput) {
  const { productId, type, quantity, userId, reason, reference } = input;

  const delta =
    type === "correction"
      ? Math.trunc(quantity)
      : SIGN[type] * Math.abs(Math.trunc(quantity));
  if (delta === 0) {
    throw new AppError(
      "Stock change must be a non-zero quantity",
      ErrorCode.VALIDATION_ERROR,
      400
    );
  }

  // Existence check first, so "not found" isn't masked as "insufficient stock".
  const exists = await tx.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });
  if (!exists) {
    throw new AppError("Product not found", ErrorCode.NOT_FOUND, 404);
  }

  let stockAfter: number;
  if (delta < 0) {
    // Race-safe conditional decrement — only succeeds with enough on hand,
    // which blocks negative stock for sale/damage (and negative corrections).
    const need = -delta;
    const res = await tx.product.updateMany({
      where: { id: productId, stock: { gte: need } },
      data: { stock: { decrement: need } },
    });
    if (res.count !== 1) {
      throw new AppError(
        "Insufficient stock for this adjustment",
        ErrorCode.VALIDATION_ERROR,
        400
      );
    }
    const after = await tx.product.findUnique({
      where: { id: productId },
      select: { stock: true },
    });
    stockAfter = after!.stock;
  } else {
    const updated = await tx.product.update({
      where: { id: productId },
      data: { stock: { increment: delta } },
      select: { stock: true },
    });
    stockAfter = updated.stock;
  }

  const stockBefore = stockAfter - delta;

  const movement = await tx.stockMovement.create({
    data: {
      productId,
      userId: userId ?? null,
      type,
      quantity: delta,
      stockBefore,
      stockAfter,
      reason: reason ?? null,
      reference: reference ?? null,
    },
  });

  const product = await tx.product.findUnique({ where: { id: productId } });
  return { product, movement };
}

/** Apply a stock change + ledger entry atomically. */
export function adjustStock(
  productId: string,
  type: StockMovementType,
  quantity: number,
  userId?: string | null,
  reason?: string,
  reference?: string
) {
  return prisma.$transaction((tx) =>
    adjustStockTx(tx, { productId, type, quantity, userId, reason, reference })
  );
}

/**
 * Record a sale (stock −). Pass `tx` to run inside an existing transaction
 * (e.g. order creation), so the decrement and the order commit together.
 */
export function recordSale(
  productId: string,
  quantity: number,
  orderNumber: string,
  userId?: string | null,
  tx?: Prisma.TransactionClient
) {
  const input: AdjustInput = {
    productId,
    type: "sale",
    quantity,
    userId,
    reference: orderNumber,
    reason: `Order ${orderNumber}`,
  };
  return tx ? adjustStockTx(tx, input) : prisma.$transaction((t) => adjustStockTx(t, input));
}

/** Return stock to inventory (order cancelled or returned) — writes a ledger row. */
export function recordReturn(
  productId: string,
  quantity: number,
  orderNumber: string,
  reason: string,
  userId?: string | null,
  tx?: Prisma.TransactionClient
) {
  const input: AdjustInput = {
    productId,
    type: "return",
    quantity,
    userId,
    reference: orderNumber,
    reason,
  };
  return tx ? adjustStockTx(tx, input) : prisma.$transaction((t) => adjustStockTx(t, input));
}

interface StockHistoryFilters {
  type?: StockMovementType;
  page?: number;
  limit?: number;
}

/** Paginated movement history for one product, newest first. */
export async function getStockHistory(
  productId: string,
  filters: StockHistoryFilters = {}
) {
  const { type, page = 1, limit = 20 } = filters;
  const where: Prisma.StockMovementWhereInput = {
    productId,
    ...(type ? { type } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
      include: { user: { select: { id: true, name: true } } },
    }),
    prisma.stockMovement.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

/** Active products that are low but not out: 0 < stock <= lowStockAt. */
export async function getLowStockProducts() {
  return prisma.product.findMany({
    where: {
      isActive: true,
      stock: { gt: 0, lte: prisma.product.fields.lowStockAt },
    },
    orderBy: [{ stock: "asc" }, { id: "desc" }],
    include: { category: { select: { id: true, name: true, slug: true } } },
  });
}

/** Active products with zero stock. */
export async function getOutOfStockProducts() {
  return prisma.product.findMany({
    where: { isActive: true, stock: 0 },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    include: { category: { select: { id: true, name: true, slug: true } } },
  });
}

export interface InventorySummary {
  total: number;
  out: number;
  low: number;
  inStock: number;
  units: number; // total on-hand stock across active products
  value: number; // ₹ retail value (Σ price × stock)
}

/** Inventory health snapshot for active products (drives the summary strip). */
export async function getInventorySummary(): Promise<InventorySummary> {
  const [total, out, low, agg] = await Promise.all([
    prisma.product.count({ where: { isActive: true } }),
    prisma.product.count({ where: { isActive: true, stock: 0 } }),
    prisma.product.count({
      where: {
        isActive: true,
        stock: { gt: 0, lte: prisma.product.fields.lowStockAt },
      },
    }),
    prisma.$queryRaw<{ units: bigint | null; value: string | null }[]>(
      Prisma.sql`
        SELECT COALESCE(SUM(stock), 0) AS units,
               CAST(COALESCE(SUM(price * stock), 0) AS CHAR) AS value
        FROM products WHERE isActive = 1
      `
    ),
  ]);
  return {
    total,
    out,
    low,
    inStock: total - out - low,
    units: Number(agg[0]?.units ?? 0),
    value: agg[0]?.value ? Number(agg[0].value) : 0,
  };
}

/** Restock many products in a single transaction (all-or-nothing). */
export async function bulkRestock(
  items: { productId: string; quantity: number }[],
  userId?: string | null,
  reference?: string
) {
  return prisma.$transaction(async (tx) => {
    const results = [];
    for (const item of items) {
      results.push(
        await adjustStockTx(tx, {
          productId: item.productId,
          type: "restock",
          quantity: item.quantity,
          userId,
          reference,
        })
      );
    }
    return results;
  });
}
