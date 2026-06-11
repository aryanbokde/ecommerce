import "server-only";

import { Prisma } from "@/generated/prisma";
import prisma from "@/server/db";
import { getSetting } from "@/server/services/settings.service";

// ── Admin analytics ───────────────────────────────────────────────────────────
// Deeper dashboard metrics beyond the headline stats: signup trend, payment-mix,
// top categories by revenue, and a handful of operational ratios. Called direct
// from the dashboard RSC (no server-to-self HTTP).

const DAY = 86_400_000;

// "Real" sales only — exclude cancelled/returned orders and failed payments.
const notCancelled: Prisma.OrderWhereInput = {
  status: { notIn: ["cancelled", "returned"] },
  paymentStatus: { not: "failed" },
};

export interface SignupPoint {
  date: string;
  count: number;
}

/** Daily new-customer signups over the window (for the signups area chart). */
export async function getSignupSeries(days = 30): Promise<SignupPoint[]> {
  const since = new Date(Date.now() - days * DAY);
  const rows = await prisma.$queryRaw<{ date: string; count: bigint }[]>(
    Prisma.sql`
      SELECT DATE_FORMAT(createdAt, '%Y-%m-%d') AS date, COUNT(*) AS count
      FROM users
      WHERE createdAt >= ${since}
      GROUP BY DATE_FORMAT(createdAt, '%Y-%m-%d')
      ORDER BY date ASC
    `
  );
  return rows.map((r) => ({ date: r.date, count: Number(r.count) }));
}

export interface PaymentSlice {
  method: string;
  orders: number;
  revenue: number;
}

/** Order + revenue split by payment method (razorpay / cod / …). */
export async function getPaymentBreakdown(): Promise<PaymentSlice[]> {
  const groups = await prisma.order.groupBy({
    by: ["paymentMethod"],
    where: notCancelled,
    _count: { _all: true },
    _sum: { total: true },
  });
  return groups
    .map((g) => ({
      method: g.paymentMethod ?? "unknown",
      orders: g._count._all,
      revenue: Number(g._sum.total ?? 0),
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

export interface CategorySlice {
  id: string;
  name: string;
  revenue: number;
  units: number;
}

/** Top categories by real revenue (joins order_items → products → categories). */
export async function getTopCategories(limit = 6): Promise<CategorySlice[]> {
  const rows = await prisma.$queryRaw<
    { id: string; name: string; revenue: string | null; units: bigint }[]
  >(Prisma.sql`
    SELECT c.id AS id, c.name AS name,
           CAST(SUM(oi.total) AS CHAR) AS revenue,
           SUM(oi.quantity) AS units
    FROM order_items oi
    JOIN products p   ON p.id = oi.productId
    JOIN categories c ON c.id = p.categoryId
    JOIN orders o     ON o.id = oi.orderId
    WHERE o.status NOT IN ('cancelled', 'returned')
      AND o.paymentStatus <> 'failed'
    GROUP BY c.id, c.name
    ORDER BY SUM(oi.total) DESC
    LIMIT ${limit}
  `);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    revenue: r.revenue ? Number(r.revenue) : 0,
    units: Number(r.units),
  }));
}

export interface KeyRatios {
  repeatCustomerRate: number; // % of buyers who ordered 2+ times
  returnRate: number; // % of delivered orders with a return request
  avgFulfillmentHours: number | null; // created → delivered, hours
  unitsPerOrder: number; // avg line-item quantity per order
}

export async function getKeyRatios(): Promise<KeyRatios> {
  const [repeatRows, fulfillRows, returns, delivered, unitsAgg, orderCount] =
    await Promise.all([
      prisma.$queryRaw<{ total: bigint; repeats: bigint }[]>(Prisma.sql`
        SELECT COUNT(*) AS total, COALESCE(SUM(c >= 2), 0) AS repeats
        FROM (SELECT userId, COUNT(*) AS c FROM orders GROUP BY userId) t
      `),
      prisma.$queryRaw<{ hrs: number | null }[]>(Prisma.sql`
        SELECT AVG(TIMESTAMPDIFF(HOUR, createdAt, deliveredAt)) AS hrs
        FROM orders WHERE deliveredAt IS NOT NULL
      `),
      prisma.return.count(),
      prisma.order.count({ where: { status: "delivered" } }),
      prisma.orderItem.aggregate({ _sum: { quantity: true } }),
      prisma.order.count(),
    ]);

  const total = Number(repeatRows[0]?.total ?? 0);
  const repeats = Number(repeatRows[0]?.repeats ?? 0);
  const hrs = fulfillRows[0]?.hrs;
  const units = unitsAgg._sum.quantity ?? 0;

  return {
    repeatCustomerRate: total > 0 ? Math.round((repeats / total) * 100) : 0,
    returnRate: delivered > 0 ? Math.round((returns / delivered) * 100) : 0,
    avgFulfillmentHours: hrs != null ? Math.round(Number(hrs)) : null,
    unitsPerOrder: orderCount > 0 ? Math.round((units / orderCount) * 10) / 10 : 0,
  };
}

/** Orders bucketed by hour-of-day (0–23), zero-filled — a demand heatmap. */
export async function getOrdersByHour(): Promise<number[]> {
  const rows = await prisma.$queryRaw<{ hour: number; orders: bigint }[]>(
    Prisma.sql`
      SELECT HOUR(createdAt) AS hour, COUNT(*) AS orders
      FROM orders
      WHERE status NOT IN ('cancelled', 'returned') AND paymentStatus <> 'failed'
      GROUP BY HOUR(createdAt)
    `
  );
  const out = Array<number>(24).fill(0);
  for (const r of rows) out[Number(r.hour)] = Number(r.orders);
  return out;
}

export interface CartStats {
  openCarts: number; // carts holding at least one item (not yet converted)
  items: number; // total units sitting in those carts
  value: number; // ₹ value of those units at current price
}

/** Open-cart snapshot — a proxy for abandonment + remarketing opportunity. */
export async function getCartStats(): Promise<CartStats> {
  const [openCarts, agg] = await Promise.all([
    prisma.cart.count({ where: { items: { some: {} } } }),
    prisma.$queryRaw<{ items: bigint | null; value: string | null }[]>(
      Prisma.sql`
        SELECT COALESCE(SUM(ci.quantity), 0) AS items,
               CAST(COALESCE(SUM(ci.quantity * p.price), 0) AS CHAR) AS value
        FROM cart_items ci
        JOIN products p ON p.id = ci.productId
      `
    ),
  ]);
  return {
    openCarts,
    items: Number(agg[0]?.items ?? 0),
    value: agg[0]?.value ? Number(agg[0].value) : 0,
  };
}

export interface RevenueSplit {
  newRevenue: number; // from one-time buyers
  repeatRevenue: number; // from buyers with 2+ orders
}

/** Lifetime revenue split: first-time vs repeat customers. */
export async function getCustomerRevenueSplit(): Promise<RevenueSplit> {
  const rows = await prisma.$queryRaw<
    { newRev: string | null; repeatRev: string | null }[]
  >(Prisma.sql`
    SELECT
      CAST(COALESCE(SUM(CASE WHEN c = 1 THEN spent ELSE 0 END), 0) AS CHAR) AS newRev,
      CAST(COALESCE(SUM(CASE WHEN c >= 2 THEN spent ELSE 0 END), 0) AS CHAR) AS repeatRev
    FROM (
      SELECT userId, COUNT(*) AS c, SUM(total) AS spent
      FROM orders
      WHERE status NOT IN ('cancelled', 'returned') AND paymentStatus <> 'failed'
      GROUP BY userId
    ) t
  `);
  return {
    newRevenue: rows[0]?.newRev ? Number(rows[0].newRev) : 0,
    repeatRevenue: rows[0]?.repeatRev ? Number(rows[0].repeatRev) : 0,
  };
}

export interface InventoryValue {
  retail: number; // Σ price × stock
  cost: number; // Σ costPrice × stock
  units: number; // Σ stock
}

/** On-hand inventory valuation for active products. */
export async function getInventoryValue(): Promise<InventoryValue> {
  const rows = await prisma.$queryRaw<
    { retail: string | null; cost: string | null; units: bigint | null }[]
  >(Prisma.sql`
    SELECT CAST(COALESCE(SUM(price * stock), 0) AS CHAR) AS retail,
           CAST(COALESCE(SUM(COALESCE(costPrice, 0) * stock), 0) AS CHAR) AS cost,
           COALESCE(SUM(stock), 0) AS units
    FROM products WHERE isActive = 1
  `);
  return {
    retail: rows[0]?.retail ? Number(rows[0].retail) : 0,
    cost: rows[0]?.cost ? Number(rows[0].cost) : 0,
    units: Number(rows[0]?.units ?? 0),
  };
}

/** Monthly revenue target: store setting if configured, else last-30d revenue. */
export async function getRevenueTarget(): Promise<number> {
  const setting = await getSetting("monthlyRevenueTarget").catch(() => null);
  if (setting && Number(setting) > 0) return Number(setting);
  const now = Date.now();
  const agg = await prisma.order.aggregate({
    _sum: { total: true },
    where: {
      ...notCancelled,
      createdAt: { gte: new Date(now - 60 * DAY), lt: new Date(now - 30 * DAY) },
    },
  });
  return Number(agg._sum.total ?? 0);
}

export interface DashboardAnalytics {
  signups: SignupPoint[];
  payments: PaymentSlice[];
  categories: CategorySlice[];
  ratios: KeyRatios;
  ordersByHour: number[];
  cart: CartStats;
  revenueSplit: RevenueSplit;
  inventory: InventoryValue;
  revenueTarget: number;
}

/** One call for the dashboard analytics section. */
export async function getDashboardAnalytics(): Promise<DashboardAnalytics> {
  const [
    signups,
    payments,
    categories,
    ratios,
    ordersByHour,
    cart,
    revenueSplit,
    inventory,
    revenueTarget,
  ] = await Promise.all([
    getSignupSeries(30),
    getPaymentBreakdown(),
    getTopCategories(6),
    getKeyRatios(),
    getOrdersByHour(),
    getCartStats(),
    getCustomerRevenueSplit(),
    getInventoryValue(),
    getRevenueTarget(),
  ]);
  return {
    signups,
    payments,
    categories,
    ratios,
    ordersByHour,
    cart,
    revenueSplit,
    inventory,
    revenueTarget,
  };
}
