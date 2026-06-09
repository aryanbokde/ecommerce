import "server-only";

import prisma from "@/server/db";

// ── Shop-manager operations stats ─────────────────────────────────────────────
// Shared by /api/manager/stats (sidebar badges) and the operations dashboard
// server component. Called directly from the RSC — no server-to-self fetch.

// Orders that still need warehouse action (paid-or-not, not yet shipped/closed).
const FULFILL_STATUSES = ["pending", "confirmed", "processing"] as const;

export async function getManagerStats() {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const monthAgo = new Date(now.getTime() - 30 * 86_400_000);

  const [
    lowStockCount,
    outOfStockCount,
    ordersToFulfill,
    shippedToday,
    unitsAggToday,
    topGroups,
  ] = await Promise.all([
    // Active, in-stock, at or below the per-product low-stock threshold.
    prisma.product.count({
      where: {
        isActive: true,
        stock: { gt: 0, lte: prisma.product.fields.lowStockAt },
      },
    }),
    prisma.product.count({ where: { isActive: true, stock: 0 } }),
    prisma.order.count({ where: { status: { in: [...FULFILL_STATUSES] } } }),
    prisma.order.count({
      where: { status: "shipped", updatedAt: { gte: startOfToday } },
    }),
    prisma.orderItem.aggregate({
      _sum: { quantity: true },
      where: {
        order: {
          createdAt: { gte: startOfToday },
          status: { notIn: ["cancelled", "returned"] },
        },
      },
    }),
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: {
        order: {
          createdAt: { gte: monthAgo },
          status: { notIn: ["cancelled", "returned"] },
        },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
  ]);

  // Resolve names for the top movers (preserve rank order).
  const ids = topGroups.map((g) => g.productId);
  const records = ids.length
    ? await prisma.product.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true, slug: true, stock: true },
      })
    : [];
  const byId = new Map(records.map((p) => [p.id, p]));
  const topMovingProducts = topGroups.map((g) => {
    const p = byId.get(g.productId);
    return {
      id: g.productId,
      name: p?.name ?? "Unknown product",
      slug: p?.slug ?? null,
      stock: p?.stock ?? 0,
      unitsSold: g._sum.quantity ?? 0,
    };
  });

  return {
    lowStockCount,
    outOfStockCount,
    ordersToFulfill,
    shippedToday,
    unitsSoldToday: unitsAggToday._sum.quantity ?? 0,
    topMovingProducts,
  };
}
