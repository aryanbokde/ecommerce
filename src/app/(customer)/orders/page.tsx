import type { Metadata } from "next";
import Link from "next/link";
import { Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/shared/Pagination";
import { OrderCard, type OrderCardData } from "@/components/orders/OrderCard";
import { cn } from "@/lib/utils";
import { getServerSession } from "@/lib/auth";
import { getUserOrders } from "@/server/services/order.service";
import { getStoreConfig } from "@/server/services/settings.service";
import type { OrderStatus } from "@/server/validators/order.schema";

export const metadata: Metadata = {
  title: "My Orders — MyShop",
  description: "View your past orders and their status.",
};

const PAGE_SIZE = 10;

const TABS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
  { key: "returned", label: "Returned" },
] as const;

const ACTIVE_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
];

function statusesForTab(tab: string): OrderStatus[] | undefined {
  switch (tab) {
    case "active":
      return ACTIVE_STATUSES;
    case "delivered":
      return ["delivered"];
    case "cancelled":
      return ["cancelled"];
    case "returned":
      return ["returned"];
    default:
      return undefined; // "all"
  }
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const tab = TABS.some((t) => t.key === sp.status) ? sp.status! : "all";
  const page = Math.max(1, Number(sp.page) || 1);

  const session = await getServerSession();
  if (!session) return null; // layout guard ensures this never happens

  const [{ orders, totalPages }, config] = await Promise.all([
    getUserOrders(session.user.id, {
      page,
      limit: PAGE_SIZE,
      statuses: statusesForTab(tab),
    }),
    getStoreConfig(),
  ]);

  // Serialize Prisma Decimals/Dates → plain values for the client OrderCard.
  const cards: OrderCardData[] = orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    paymentStatus: o.paymentStatus,
    total: o.total.toString(),
    createdAt: o.createdAt.toISOString(),
    items: o.items.map((it) => ({
      id: it.id,
      productId: it.productId,
      name: it.name,
      image: it.image,
      quantity: it.quantity,
      price: it.price.toString(),
    })),
  }));

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
        My Orders
      </h1>

      {/* Status filter tabs */}
      <div className="mt-6 flex gap-1 border-b border-border">
        {TABS.map((t) => {
          const active = t.key === tab;
          const href = t.key === "all" ? "/orders" : `/orders?status=${t.key}`;
          return (
            <Link
              key={t.key}
              href={href}
              className={cn(
                "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {cards.length === 0 ? (
        <div className="mt-8 flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border py-16 text-center">
          <Package className="size-10 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-foreground">
              {tab === "all" ? "No orders yet" : `No ${tab} orders`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {tab === "all"
                ? "When you place an order it'll show up here."
                : "Try a different filter."}
            </p>
          </div>
          {tab === "all" && (
            <Button render={<Link href="/products" />} nativeButton={false}>
              Start Shopping
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="mt-6 flex flex-col gap-3">
            {cards.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                cancelEnabled={config.cancellationsEnabled}
              />
            ))}
          </div>
          <div className="mt-8">
            <Pagination page={page} totalPages={totalPages} />
          </div>
        </>
      )}
    </div>
  );
}
