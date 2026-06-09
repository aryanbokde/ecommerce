import "server-only";

import prisma from "@/server/db";

// ── Support dashboard stats ───────────────────────────────────────────────────
// Shared by /api/support/stats and the support dashboard server component, so
// the RSC can call it directly (no server-to-self fetch). Support is read-only:
// these are lookup/triage figures, not operational counters.

// Orders still moving through fulfilment (not yet shipped/delivered/cancelled).
const AWAITING_STATUSES = ["pending", "confirmed", "processing"] as const;

export interface SupportRecentOrder {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
  customerName: string | null;
  customerEmail: string | null;
}

export async function getSupportStats() {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const [ordersToday, awaitingFulfillment, shippedToday, recent] =
    await Promise.all([
      prisma.order.count({ where: { createdAt: { gte: startOfToday } } }),
      prisma.order.count({
        where: { status: { in: [...AWAITING_STATUSES] } },
      }),
      prisma.order.count({
        where: { status: "shipped", updatedAt: { gte: startOfToday } },
      }),
      prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          total: true,
          createdAt: true,
          user: { select: { name: true, email: true } },
        },
      }),
    ]);

  // Normalise for the RSC→client boundary: Decimal isn't serializable, and a
  // plain ISO date is easiest for the table to format.
  const recentOrders: SupportRecentOrder[] = recent.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    total: Number(o.total),
    createdAt: o.createdAt.toISOString(),
    customerName: o.user?.name ?? null,
    customerEmail: o.user?.email ?? null,
  }));

  return { ordersToday, awaitingFulfillment, shippedToday, recentOrders };
}
