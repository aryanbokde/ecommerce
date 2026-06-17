import "server-only";

import { Prisma } from "@/generated/prisma";
import prisma from "@/server/db";
import { getErrorStats } from "@/server/services/error-log.service";

// ── Admin dashboard stats ─────────────────────────────────────────────────────
// Shared by the /api/admin/stats route AND the dashboard overview server
// component. Calling this directly from the RSC avoids a server-to-self HTTP
// round-trip (which can deadlock the dev server).

const money = (d: Prisma.Decimal | null) =>
  (d ?? new Prisma.Decimal(0)).toFixed(2);

const PERIOD_DAYS = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 } as const;
export type RevenuePeriod = keyof typeof PERIOD_DAYS;

export interface RevenuePoint {
  date: string;
  revenue: number;
  orders: number;
}

/** Daily revenue series (real sales: not cancelled/returned/failed) over the window. */
export async function getRevenueSeries(
  period: RevenuePeriod
): Promise<RevenuePoint[]> {
  const days = PERIOD_DAYS[period];
  const since = new Date(Date.now() - days * 86_400_000);

  // Prisma groupBy can't truncate a DateTime to a day, so bucket via raw SQL.
  const rows = await prisma.$queryRaw<
    { date: string; revenue: string | null; orders: bigint }[]
  >(Prisma.sql`
    SELECT
      DATE_FORMAT(createdAt, '%Y-%m-%d') AS date,
      CAST(SUM(total) AS CHAR)          AS revenue,
      COUNT(*)                          AS orders
    FROM orders
    WHERE createdAt >= ${since}
      AND status NOT IN ('cancelled', 'returned')
      AND paymentStatus <> 'failed'
    GROUP BY DATE_FORMAT(createdAt, '%Y-%m-%d')
    ORDER BY date ASC
  `);

  return rows.map((r) => ({
    date: r.date,
    revenue: r.revenue ? Number(r.revenue) : 0,
    orders: Number(r.orders),
  }));
}

/** Full dashboard snapshot. Values are plain/serializable (Decimals → strings). */
export async function getAdminStats() {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000);
  const monthAgo = new Date(now.getTime() - 30 * 86_400_000);

  // Revenue counts real sales only: not cancelled/returned, and the payment
  // didn't fail.
  const notCancelled: Prisma.OrderWhereInput = {
    status: { notIn: ["cancelled", "returned"] },
    paymentStatus: { not: "failed" },
  };
  const revenueSince = (since?: Date) =>
    prisma.order.aggregate({
      _sum: { total: true },
      where: { ...notCancelled, ...(since ? { createdAt: { gte: since } } : {}) },
    });

  const [
    userTotal,
    userNewToday,
    userNewThisWeek,
    productTotal,
    productActive,
    productLowStock,
    productOutOfStock,
    orderTotal,
    orderStatusGroups,
    cancelledToday,
    revToday,
    revWeek,
    revMonth,
    revTotal,
    reviewTotal,
    reviewAgg,
    reviewPending,
    reviewNewLast7d,
    reviewUnseen,
    orderUnseen,
    returnsUnseen,
    errorUnseen,
    recentOrders,
    topProductGroups,
    errorStats,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: startOfToday } } }),
    prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.product.count(),
    prisma.product.count({ where: { isActive: true } }),
    prisma.product.count({
      where: {
        isActive: true,
        stock: { gt: 0, lte: prisma.product.fields.lowStockAt },
      },
    }),
    prisma.product.count({ where: { isActive: true, stock: 0 } }),
    prisma.order.count(),
    prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.order.count({
      where: { status: "cancelled", updatedAt: { gte: startOfToday } },
    }),
    revenueSince(startOfToday),
    revenueSince(weekAgo),
    revenueSince(monthAgo),
    revenueSince(),
    prisma.review.count(),
    prisma.review.aggregate({ _avg: { rating: true } }),
    prisma.review.count({ where: { isVisible: false } }),
    prisma.review.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.review.count({ where: { seenByAdmin: false } }),
    prisma.order.count({ where: { seenByAdmin: false } }),
    // New return requests awaiting review (count toward the Orders badge).
    prisma.return.count({ where: { status: "requested", seenByAdmin: false } }),
    prisma.errorLog.count({ where: { seenByAdmin: false } }),
    prisma.order.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 5,
      select: {
        id: true,
        orderNumber: true,
        total: true,
        status: true,
        paymentStatus: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: { order: { createdAt: { gte: monthAgo }, ...notCancelled } },
      _sum: { quantity: true },
      _count: { _all: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
    getErrorStats().catch(() => ({ unresolved: 0 })),
  ]);

  // Resolve product details for the top sellers (preserving rank order).
  const topProductIds = topProductGroups.map((g) => g.productId);
  const topProductRecords = topProductIds.length
    ? await prisma.product.findMany({
        where: { id: { in: topProductIds } },
        select: { id: true, name: true, slug: true, price: true, images: true },
      })
    : [];
  const productById = new Map(topProductRecords.map((p) => [p.id, p]));
  const topProducts = topProductGroups.map((g) => {
    const p = productById.get(g.productId);
    return {
      product: p
        ? {
            id: p.id,
            name: p.name,
            slug: p.slug,
            price: p.price.toFixed(2),
            images: p.images,
          }
        : null,
      unitsSold: g._sum.quantity ?? 0,
      orderItems: g._count._all,
    };
  });

  const statusCount = (status: string) =>
    orderStatusGroups.find((g) => g.status === status)?._count._all ?? 0;

  return {
    users: {
      total: userTotal,
      newToday: userNewToday,
      newThisWeek: userNewThisWeek,
    },
    products: {
      total: productTotal,
      active: productActive,
      lowStock: productLowStock,
      outOfStock: productOutOfStock,
    },
    orders: {
      total: orderTotal,
      pending: statusCount("pending"),
      processing: statusCount("processing"),
      shipped: statusCount("shipped"),
      delivered: statusCount("delivered"),
      // Orders badge = new (unseen) orders + new (unseen) return requests.
      unseen: orderUnseen + returnsUnseen,
      returnsUnseen,
      cancelledToday,
      revenue: {
        today: money(revToday._sum.total),
        thisWeek: money(revWeek._sum.total),
        thisMonth: money(revMonth._sum.total),
        total: money(revTotal._sum.total),
      },
    },
    reviews: {
      total: reviewTotal,
      avgRating:
        reviewAgg._avg.rating != null
          ? Math.round(reviewAgg._avg.rating * 10) / 10
          : 0,
      pendingModeration: reviewPending,
      newLast7d: reviewNewLast7d,
      unseen: reviewUnseen,
    },
    errors: { unresolved: errorStats.unresolved, unseen: errorUnseen },
    recentOrders: recentOrders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      total: o.total.toFixed(2),
      status: o.status,
      paymentStatus: o.paymentStatus,
      createdAt: o.createdAt.toISOString(),
      user: o.user,
    })),
    topProducts,
  };
}
