import type { Metadata } from "next";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  IndianRupee,
  ShoppingCart,
  Package,
  Users,
} from "lucide-react";
import { DashboardShell } from "@/components/admin/DashboardShell";
import { StatCard } from "@/components/admin/StatCard";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import {
  getAdminStats,
  getRevenueSeries,
} from "@/server/services/admin-stats.service";

export function generateMetadata(): Metadata {
  return { title: "Admin Dashboard" };
}

// ── Response shapes (subset we render) ───────────────────────────────────────
interface AdminStats {
  users: { total: number; newThisWeek: number };
  products: { total: number; lowStock: number };
  orders: {
    total: number;
    pending: number;
    processing: number;
    shipped: number;
    delivered: number;
    revenue: { thisMonth: string };
  };
  recentOrders: {
    id: string;
    orderNumber: string;
    total: string;
    status: string;
    createdAt: string;
    user: { id: string; name: string | null; email: string } | null;
  }[];
  topProducts: {
    product: { id: string; name: string; slug: string; price: string } | null;
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
  try {
    const [s, r] = await Promise.all([
      getAdminStats(),
      getRevenueSeries("90d"),
    ]);
    stats = s;
    revenue90 = r;
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

  return (
    <DashboardShell title="Dashboard" description="Store overview at a glance">
      <div className="space-y-6">
        {/* Section 1 — Stat cards */}
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
          />
          <StatCard
            title="Products"
            value={stats.products.total.toLocaleString("en-IN")}
            icon={Package}
            accent="violet"
            trendLabel={`${stats.products.lowStock} low stock`}
          />
          <StatCard
            title="Customers"
            value={stats.users.total.toLocaleString("en-IN")}
            icon={Users}
            accent="amber"
            trendLabel={`${stats.users.newThisWeek} new this week`}
          />
        </div>

        {/* Section 2 — Revenue chart */}
        <RevenueChart />

        {/* Section 3 — Recent orders + top products */}
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
                      return (
                        <li key={p.id} className="flex items-center gap-3">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular-nums text-muted-foreground">
                            {i + 1}
                          </span>
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

        {/* Section 4 — Order status breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <OrderStatusDonut data={statusData} />
        </div>
      </div>
    </DashboardShell>
  );
}
