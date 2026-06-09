import type { Metadata } from "next";
import Link from "next/link";
import {
  ClipboardList,
  AlertTriangle,
  PackageX,
  Truck,
  ShoppingBag,
  PackageCheck,
} from "lucide-react";
import { DashboardShell } from "@/components/admin/DashboardShell";
import { StatCard } from "@/components/admin/StatCard";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { QuickRestock } from "@/components/manager/QuickRestock";
import prisma from "@/server/db";
import { getManagerStats } from "@/server/services/manager-stats.service";
import { getLowStockProducts } from "@/server/services/product.service";

export function generateMetadata(): Metadata {
  return { title: "Operations" };
}

function firstImage(images: unknown): string | null {
  return Array.isArray(images) && typeof images[0] === "string"
    ? images[0]
    : null;
}

const inr = (v: unknown) =>
  `₹${Number(v).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const DAY = 86_400_000;
function ageInDays(d: Date): number {
  return Math.floor((Date.now() - new Date(d).getTime()) / DAY);
}

export default async function ManagerDashboardPage() {
  const [stats, lowStock, unfulfilled] = await Promise.all([
    getManagerStats(),
    getLowStockProducts(),
    prisma.order.findMany({
      where: { status: { in: ["pending", "confirmed", "processing"] } },
      orderBy: { createdAt: "asc" },
      take: 5,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        total: true,
        createdAt: true,
        user: { select: { name: true } },
      },
    }),
  ]);

  const needsRestock = lowStock.slice(0, 8);

  return (
    <DashboardShell
      title="Operations"
      description="Inventory and fulfilment at a glance"
    >
      <div className="space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Orders to Fulfill"
            value={stats.ordersToFulfill.toLocaleString("en-IN")}
            icon={ClipboardList}
            accent="blue"
            trendLabel="pending · confirmed · processing"
          />
          <StatCard
            title="Low Stock"
            value={stats.lowStockCount.toLocaleString("en-IN")}
            icon={AlertTriangle}
            accent="amber"
            trendLabel="at or below threshold"
          />
          <StatCard
            title="Out of Stock"
            value={stats.outOfStockCount.toLocaleString("en-IN")}
            icon={PackageX}
            accent="rose"
            trendLabel="needs restock"
          />
          <StatCard
            title="Shipped Today"
            value={stats.shippedToday.toLocaleString("en-IN")}
            icon={Truck}
            accent="emerald"
            trendLabel={`${stats.unitsSoldToday} units sold today`}
          />
        </div>

        {/* Needs attention */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Low / out of stock + quick restock */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Needs restock</CardTitle>
              <Link
                href="/shop-manager/low-stock"
                className="text-sm font-medium text-primary hover:underline"
              >
                View all
              </Link>
            </CardHeader>
            <CardContent className="px-0">
              {needsRestock.length === 0 ? (
                <p className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                  <PackageCheck className="size-4 text-green-600" />
                  Everything is well stocked.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {needsRestock.map((p) => {
                    const src = firstImage(p.images);
                    const out = p.stock === 0;
                    return (
                      <li
                        key={p.id}
                        className="flex items-center gap-3 px-4 py-2.5"
                      >
                        <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                          {src ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={src}
                              alt=""
                              className="size-full object-cover"
                            />
                          ) : (
                            <ShoppingBag className="size-4 text-muted-foreground" />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {p.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {out ? (
                              <Badge variant="destructive" className="h-4 px-1.5">
                                Out of stock
                              </Badge>
                            ) : (
                              <span className="text-amber-600">
                                {p.stock} left · threshold {p.lowStockAt}
                              </span>
                            )}
                          </p>
                        </div>
                        <QuickRestock
                          productId={p.id}
                          name={p.name}
                          currentStock={p.stock}
                        />
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Oldest unfulfilled orders */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Oldest unfulfilled orders</CardTitle>
              <Link
                href="/shop-manager/orders"
                className="text-sm font-medium text-primary hover:underline"
              >
                View all
              </Link>
            </CardHeader>
            <CardContent className="px-0">
              {unfulfilled.length === 0 ? (
                <p className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                  <PackageCheck className="size-4 text-green-600" />
                  Nothing waiting to ship.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {unfulfilled.map((o) => {
                    const days = ageInDays(o.createdAt);
                    return (
                      <li
                        key={o.id}
                        className="flex items-center gap-3 px-4 py-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/shop-manager/orders/${o.id}`}
                            className="text-sm font-medium hover:underline"
                          >
                            #{o.orderNumber}
                          </Link>
                          <p className="truncate text-xs text-muted-foreground">
                            {o.user?.name ?? "—"} ·{" "}
                            {days === 0 ? "today" : `${days}d ago`}
                          </p>
                        </div>
                        <OrderStatusBadge status={o.status} />
                        <span className="shrink-0 text-sm font-medium tabular-nums">
                          {inr(o.total)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
