import type { Metadata } from "next";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  IndianRupee,
  ShoppingCart,
  Users,
  Receipt,
  Star,
  ImageIcon,
  Repeat,
  RotateCcw,
  Timer,
  Boxes,
  Target,
  Clock,
  Warehouse,
} from "lucide-react";
import { DashboardShell } from "@/components/admin/DashboardShell";
import { StatCard } from "@/components/admin/StatCard";
import { AttentionPanel } from "@/components/admin/AttentionPanel";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Charts pull in recharts (heavy); code-split them so the dashboard shell +
// stat cards render without waiting on the charting bundle.
const RevenueChart = dynamic(
  () => import("@/components/admin/RevenueChart").then((m) => m.RevenueChart),
  { loading: () => <Skeleton className="h-[300px] w-full" /> }
);
const OrderStatusDonut = dynamic(
  () =>
    import("@/components/admin/OrderStatusDonut").then((m) => m.OrderStatusDonut),
  { loading: () => <Skeleton className="h-[300px] w-full" /> }
);
const SignupsChart = dynamic(
  () => import("@/components/admin/SignupsChart").then((m) => m.SignupsChart),
  { loading: () => <Skeleton className="h-[340px] w-full" /> }
);
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { cn } from "@/lib/utils";
import {
  getAdminStats,
  getRevenueSeries,
} from "@/server/services/admin-stats.service";
import {
  getDashboardAnalytics,
  type DashboardAnalytics,
} from "@/server/services/analytics.service";

export function generateMetadata(): Metadata {
  return { title: "Admin Dashboard" };
}

// ── Response shapes (subset we render) ───────────────────────────────────────
interface AdminStats {
  users: { total: number; newToday: number; newThisWeek: number };
  products: {
    total: number;
    active: number;
    lowStock: number;
    outOfStock: number;
  };
  orders: {
    total: number;
    pending: number;
    processing: number;
    shipped: number;
    delivered: number;
    unseen: number;
    returnsUnseen: number;
    cancelledToday: number;
    revenue: {
      today: string;
      thisWeek: string;
      thisMonth: string;
      total: string;
    };
  };
  reviews: {
    total: number;
    avgRating: number;
    pendingModeration: number;
    unseen: number;
  };
  errors: { unresolved: number };
  recentOrders: {
    id: string;
    orderNumber: string;
    total: string;
    status: string;
    paymentStatus: string;
    createdAt: string;
    user: { id: string; name: string | null; email: string } | null;
  }[];
  topProducts: {
    product: {
      id: string;
      name: string;
      slug: string;
      price: string;
      images: unknown;
    } | null;
    unitsSold: number;
  }[];
}

interface RevenuePoint {
  date: string;
  revenue: number;
  orders: number;
}

const inr = (v: string | number) =>
  `₹${Number(v).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const PAYMENT_LABEL: Record<string, string> = {
  razorpay: "Razorpay",
  cod: "Cash on Delivery",
  unknown: "Unknown",
};
const paymentLabel = (m: string) =>
  PAYMENT_LABEL[m] ?? m.charAt(0).toUpperCase() + m.slice(1);

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const DAY = 86_400_000;

// Month-over-month revenue trend (%) derived from the 90-day daily series.
// Kept out of the component body so the clock read (Date.now) isn't flagged as
// an impure call during render.
function revenueTrend(series: RevenuePoint[] | null): number | undefined {
  const now = Date.now();
  const sumBetween = (fromDaysAgo: number, toDaysAgo: number) =>
    (series ?? [])
      .filter((p) => {
        const t = new Date(p.date).getTime();
        return t >= now - fromDaysAgo * DAY && t < now - toDaysAgo * DAY;
      })
      .reduce((s, p) => s + p.revenue, 0);
  const thisMonth = sumBetween(30, -1); // last 30 days (incl. today)
  const prevMonth = sumBetween(60, 30); // the 30 days before that
  return prevMonth > 0 ? ((thisMonth - prevMonth) / prevMonth) * 100 : undefined;
}

export default async function AdminDashboardPage() {
  // Call the service directly (no server-to-self HTTP round-trip).
  let stats: AdminStats | null = null;
  let revenue90: RevenuePoint[] = [];
  let analytics: DashboardAnalytics | null = null;
  try {
    const [s, r, a] = await Promise.all([
      getAdminStats(),
      getRevenueSeries("90d"),
      getDashboardAnalytics().catch(() => null),
    ]);
    stats = s;
    revenue90 = r;
    analytics = a;
  } catch {
    stats = null;
  }

  if (!stats) {
    return (
      <DashboardShell
        title="Dashboard"
        description="Store overview at a glance"
      >
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Could not load dashboard stats. Please refresh.
          </CardContent>
        </Card>
      </DashboardShell>
    );
  }

  const revTrend = revenueTrend(revenue90);

  const statusData = [
    { status: "pending", count: stats.orders.pending },
    { status: "processing", count: stats.orders.processing },
    { status: "shipped", count: stats.orders.shipped },
    { status: "delivered", count: stats.orders.delivered },
  ];

  // Average order value across all real (non-cancelled) revenue.
  const aov =
    stats.orders.total > 0
      ? Number(stats.orders.revenue.total) / stats.orders.total
      : 0;

  // Unseen ORDERS only (the service's `unseen` also folds in return requests).
  const unseenOrders = Math.max(
    0,
    stats.orders.unseen - stats.orders.returnsUnseen
  );

  const revenueTiles = [
    { label: "Today", value: stats.orders.revenue.today },
    { label: "This week", value: stats.orders.revenue.thisWeek },
    { label: "This month", value: stats.orders.revenue.thisMonth },
    { label: "All time", value: stats.orders.revenue.total },
  ];

  const firstImage = (images: unknown): string | null =>
    Array.isArray(images) && typeof images[0] === "string" ? images[0] : null;

  // Bar-chart scaling for the analytics breakdowns.
  const payMax = analytics
    ? Math.max(1, ...analytics.payments.map((p) => p.revenue))
    : 1;
  const catMax = analytics
    ? Math.max(1, ...analytics.categories.map((c) => c.revenue))
    : 1;

  // Revenue-target gauge + hour heatmap + customer-type split scaling.
  const thisMonthRev = Number(stats.orders.revenue.thisMonth);
  const revTarget = analytics?.revenueTarget ?? 0;
  const targetPct =
    revTarget > 0 ? Math.min(100, (thisMonthRev / revTarget) * 100) : 0;
  const hourMax = analytics ? Math.max(1, ...analytics.ordersByHour) : 1;
  const split = analytics?.revenueSplit ?? { newRevenue: 0, repeatRevenue: 0 };
  const splitTotal = split.newRevenue + split.repeatRevenue;
  const newPct = splitTotal > 0 ? (split.newRevenue / splitTotal) * 100 : 0;

  return (
    <DashboardShell title="Dashboard" description="Store overview at a glance">
      <div className="space-y-6">
        {/* 1 — Headline KPIs */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Revenue (30 days)"
            value={inr(stats.orders.revenue.thisMonth)}
            icon={IndianRupee}
            accent="emerald"
            trend={revTrend}
            trendLabel="vs prev. 30 days"
          />
          <StatCard
            title="Total Orders"
            value={stats.orders.total.toLocaleString("en-IN")}
            icon={ShoppingCart}
            accent="blue"
            trendLabel={`${stats.orders.pending} pending`}
            href="/dashboard/orders"
          />
          <StatCard
            title="Avg. Order Value"
            value={inr(aov)}
            icon={Receipt}
            accent="primary"
            trendLabel="all-time"
          />
          <StatCard
            title="Customers"
            value={stats.users.total.toLocaleString("en-IN")}
            icon={Users}
            accent="amber"
            trendLabel={`${stats.users.newThisWeek} new this week`}
            href="/dashboard/users"
          />
        </div>

        {/* 2 — Revenue trend chart */}
        <RevenueChart />

        {/* 3 — Deep analytics (ratios, signups, payment, categories, target, hour, splits) */}
        {analytics && (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard
                title="Repeat customers"
                value={`${analytics.ratios.repeatCustomerRate}%`}
                icon={Repeat}
                accent="violet"
                trendLabel="ordered 2+ times"
              />
              <StatCard
                title="Return rate"
                value={`${analytics.ratios.returnRate}%`}
                icon={RotateCcw}
                accent="amber"
                trendLabel="of delivered orders"
              />
              <StatCard
                title="Avg fulfillment"
                value={
                  analytics.ratios.avgFulfillmentHours != null
                    ? `${analytics.ratios.avgFulfillmentHours}h`
                    : "—"
                }
                icon={Timer}
                accent="blue"
                trendLabel="order → delivered"
              />
              <StatCard
                title="Units / order"
                value={analytics.ratios.unitsPerOrder}
                icon={Boxes}
                accent="emerald"
                trendLabel="avg basket size"
              />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <SignupsChart data={analytics.signups} />

              {/* Payment methods */}
              <Card>
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle>Payment methods</CardTitle>
                  <span className="text-xs text-muted-foreground">by revenue</span>
                </CardHeader>
                <CardContent>
                  {analytics.payments.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      No paid orders yet.
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {analytics.payments.map((p) => (
                        <li key={p.method} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">
                              {paymentLabel(p.method)}
                            </span>
                            <span className="tabular-nums text-muted-foreground">
                              {inr(p.revenue)} · {p.orders}{" "}
                              {p.orders === 1 ? "order" : "orders"}
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${(p.revenue / payMax) * 100}%` }}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Top categories by revenue */}
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Top categories</CardTitle>
                <span className="text-xs text-muted-foreground">by revenue</span>
              </CardHeader>
              <CardContent>
                {analytics.categories.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No category sales yet.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {analytics.categories.map((c) => (
                      <li key={c.id} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="truncate font-medium">{c.name}</span>
                          <span className="shrink-0 tabular-nums text-muted-foreground">
                            {inr(c.revenue)} · {c.units} units
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-violet-500"
                            style={{ width: `${(c.revenue / catMax) * 100}%` }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* Revenue target gauge + orders-by-hour heatmap */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle>Monthly revenue target</CardTitle>
                  <Target className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-end justify-between">
                    <span className="font-[family-name:var(--font-heading)] text-2xl font-semibold tabular-nums">
                      {inr(thisMonthRev)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      of {inr(revTarget)}
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        targetPct >= 100
                          ? "bg-emerald-500"
                          : targetPct >= 60
                            ? "bg-primary"
                            : "bg-amber-500"
                      )}
                      style={{ width: `${targetPct}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {Math.round(targetPct)}% of target · last 30 days
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle>Orders by hour</CardTitle>
                  <Clock className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="flex h-28 items-end gap-0.5">
                    {analytics.ordersByHour.map((n, h) => (
                      <div
                        key={h}
                        title={`${h}:00 — ${n} ${n === 1 ? "order" : "orders"}`}
                        className="flex-1 rounded-sm bg-primary/70 transition-colors hover:bg-primary"
                        style={{ height: `${Math.max(4, (n / hourMax) * 100)}%` }}
                      />
                    ))}
                  </div>
                  <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
                    <span>0h</span>
                    <span>6h</span>
                    <span>12h</span>
                    <span>18h</span>
                    <span>23h</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Customer-type revenue + open carts + inventory value */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue by customer type</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex h-3 overflow-hidden rounded-full bg-muted">
                    <div className="bg-blue-500" style={{ width: `${newPct}%` }} />
                    <div
                      className="bg-violet-500"
                      style={{ width: `${100 - newPct}%` }}
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-blue-500" />
                      New{" "}
                      <span className="font-medium tabular-nums">
                        {inr(split.newRevenue)}
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-violet-500" />
                      Returning{" "}
                      <span className="font-medium tabular-nums">
                        {inr(split.repeatRevenue)}
                      </span>
                    </span>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-6">
                <Card>
                  <CardContent className="space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-muted-foreground">
                        Open carts
                      </p>
                      <ShoppingCart className="size-4 text-muted-foreground" />
                    </div>
                    <p className="text-2xl font-semibold tabular-nums">
                      {analytics.cart.openCarts}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {analytics.cart.items} items · {inr(analytics.cart.value)}{" "}
                      potential
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-muted-foreground">
                        Inventory value
                      </p>
                      <Warehouse className="size-4 text-muted-foreground" />
                    </div>
                    <p className="text-2xl font-semibold tabular-nums">
                      {inr(analytics.inventory.retail)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {analytics.inventory.units} units · cost{" "}
                      {inr(analytics.inventory.cost)}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}

        {/* 4 — Recent orders + top products */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Recent orders */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Recent orders</CardTitle>
              <Link
                href="/dashboard/orders"
                className="text-sm font-medium text-primary hover:underline"
              >
                View all
              </Link>
            </CardHeader>
            <CardContent className="px-0">
              {stats.recentOrders.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No orders yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.recentOrders.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/dashboard/orders/${o.id}`}
                            className="hover:underline"
                          >
                            #{o.orderNumber}
                          </Link>
                        </TableCell>
                        <TableCell className="max-w-[12rem] truncate text-muted-foreground">
                          {o.user?.name ?? o.user?.email ?? "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {inr(o.total)}
                        </TableCell>
                        <TableCell>
                          <OrderStatusBadge status={o.status} />
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatDate(o.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Top products */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Top products</CardTitle>
              <span className="text-xs text-muted-foreground">last 30 days</span>
            </CardHeader>
            <CardContent>
              {stats.topProducts.filter((t) => t.product).length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No sales yet.
                </p>
              ) : (
                <ol className="space-y-3">
                  {stats.topProducts
                    .filter((t) => t.product)
                    .map((t, i) => {
                      const p = t.product!;
                      // Approx. revenue: current price × units sold.
                      const revenue = Number(p.price) * t.unitsSold;
                      const img = firstImage(p.images);
                      return (
                        <li key={p.id} className="flex items-center gap-3">
                          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular-nums text-muted-foreground">
                            {i + 1}
                          </span>
                          {img ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={img}
                              alt={p.name}
                              loading="lazy"
                              decoding="async"
                              className="size-9 shrink-0 rounded-md object-cover ring-1 ring-border"
                            />
                          ) : (
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                              <ImageIcon className="size-4" />
                            </span>
                          )}
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/products/${p.slug}`}
                              className="block truncate text-sm font-medium text-foreground hover:underline"
                            >
                              {p.name}
                            </Link>
                            <p className="text-xs text-muted-foreground">
                              {t.unitsSold} sold
                            </p>
                          </div>
                          <span className="shrink-0 text-sm font-medium tabular-nums">
                            {inr(revenue)}
                          </span>
                        </li>
                      );
                    })}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 5 — Order status breakdown + reviews snapshot */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <OrderStatusDonut data={statusData} />

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Reviews</CardTitle>
              <Link
                href="/dashboard/reviews"
                className="text-sm font-medium text-primary hover:underline"
              >
                Moderate
              </Link>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end gap-3">
                <span className="font-[family-name:var(--font-heading)] text-4xl font-semibold tabular-nums">
                  {stats.reviews.avgRating.toFixed(1)}
                </span>
                <div className="mb-1 flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={
                        i < Math.round(stats.reviews.avgRating)
                          ? "size-4 fill-amber-400 text-amber-400"
                          : "size-4 text-muted-foreground/30"
                      }
                    />
                  ))}
                </div>
                <span className="mb-1 text-sm text-muted-foreground">
                  {stats.reviews.total} total
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground">Pending moderation</p>
                  <p className="text-lg font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                    {stats.reviews.pendingModeration}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground">New (unseen)</p>
                  <p className="text-lg font-semibold tabular-nums">
                    {stats.reviews.unseen}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 6 — Secondary stats: revenue breakdown + inventory snapshot */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Revenue</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {revenueTiles.map((t) => (
                <div key={t.label} className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t.label}
                  </p>
                  <p className="text-lg font-semibold tabular-nums">
                    {inr(t.value)}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Inventory</CardTitle>
              <Link
                href="/dashboard/products"
                className="text-sm font-medium text-primary hover:underline"
              >
                Manage
              </Link>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Active products</span>
                <span className="font-medium tabular-nums">
                  {stats.products.active}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Low stock</span>
                <span className="font-medium tabular-nums text-amber-600 dark:text-amber-400">
                  {stats.products.lowStock}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Out of stock</span>
                <span className="font-medium tabular-nums text-rose-600 dark:text-rose-400">
                  {stats.products.outOfStock}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 7 — Action center (needs attention) */}
        <AttentionPanel
          unseenOrders={unseenOrders}
          returnRequests={stats.orders.returnsUnseen}
          lowStock={stats.products.lowStock}
          outOfStock={stats.products.outOfStock}
          pendingReviews={stats.reviews.pendingModeration}
          unresolvedErrors={stats.errors.unresolved}
        />
      </div>
    </DashboardShell>
  );
}
