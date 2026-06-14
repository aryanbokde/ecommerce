import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ShoppingBag,
  MapPin,
  CreditCard,
  User as UserIcon,
  StickyNote,
  Lock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import prisma from "@/server/db";
import { getOrderById } from "@/server/services/order.service";
import { OrderStatusTimeline } from "@/components/orders/OrderStatusTimeline";
import { SupportOrderActions } from "@/components/support/SupportOrderActions";

// Dedupe the order read between generateMetadata and the page.
const loadOrder = cache(async (id: string) => {
  try {
    return await getOrderById(id, null); // null = staff access to any order
  } catch {
    return null;
  }
});

const inr = (v: unknown) =>
  `₹${Number(v).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const PAYMENT_STYLES: Record<string, string> = {
  paid: "bg-green-100 text-green-700",
  unpaid: "bg-amber-100 text-amber-700",
  refunded: "bg-muted text-muted-foreground",
  refund_pending: "bg-orange-100 text-orange-700",
  failed: "bg-red-100 text-red-700",
};

const fmtDateTime = (d: Date | string) =>
  new Date(d).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const order = await loadOrder(id);
  return { title: order ? `Order ${order.orderNumber}` : "Order not found" };
}

export default async function SupportOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await loadOrder(id);
  if (!order) notFound();

  const [notes, phoneRecord, totalOrders] = await Promise.all([
    prisma.supportNote.findMany({
      where: { orderId: id },
      orderBy: { createdAt: "desc" },
      include: { author: { select: { id: true, name: true } } },
    }),
    order.user
      ? prisma.user.findUnique({
          where: { id: order.user.id },
          select: { phone: true },
        })
      : Promise.resolve(null),
    order.user
      ? prisma.order.count({ where: { userId: order.user.id } })
      : Promise.resolve(0),
  ]);

  const placedOn = fmtDateTime(order.createdAt);
  const address = order.address;
  const paymentLabel =
    order.paymentMethod === "razorpay"
      ? "Razorpay"
      : order.paymentMethod === "cod"
        ? "Cash on Delivery"
        : (order.paymentMethod ?? "—");

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <Link
        href="/support/orders"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Order Lookup
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
              Order {order.orderNumber}
            </h1>
            <Badge className="gap-1 border-transparent bg-muted text-muted-foreground">
              <Lock className="size-3" />
              Limited actions
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Placed {placedOn}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-6">
        {/* Timeline */}
        <section className="rounded-xl border border-border p-5">
          <h2 className="mb-5 text-sm font-medium text-foreground">
            Order status
          </h2>
          <OrderStatusTimeline
            status={order.status}
            createdAt={order.createdAt}
            updatedAt={order.updatedAt}
          />
        </section>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: items + address + notes */}
          <div className="flex flex-col gap-6 lg:col-span-2">
            <div className="rounded-xl border border-border">
              <h2 className="border-b border-border px-4 py-3 text-sm font-medium text-foreground">
                Items ({order.items.length})
              </h2>
              <ul className="flex flex-col divide-y divide-border">
                {order.items.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 p-4">
                    <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                      {item.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.image}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : (
                        <ShoppingBag className="size-5 text-muted-foreground" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {item.name}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {inr(item.price)} × {item.quantity}
                      </p>
                    </div>
                    <span className="text-sm font-medium tabular-nums text-foreground">
                      {inr(item.total)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {address && (
              <div className="rounded-xl border border-border p-5">
                <h2 className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <MapPin className="size-4 text-muted-foreground" />
                  Shipping address
                </h2>
                <div className="mt-2 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">
                    {address.fullName}{" "}
                    <span className="text-muted-foreground">
                      ({address.label})
                    </span>
                  </p>
                  <p className="mt-0.5">
                    {[
                      address.line1,
                      address.line2,
                      address.city,
                      address.state,
                      address.postalCode,
                      address.country,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                  <p className="mt-0.5">{address.phone}</p>
                </div>
              </div>
            )}

            {order.notes && (
              <div className="rounded-xl border border-border p-5">
                <h2 className="text-sm font-medium text-foreground">
                  Customer note
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {order.notes}
                </p>
              </div>
            )}

            {/* Internal support notes thread */}
            <div className="rounded-xl border border-border">
              <h2 className="flex items-center gap-2 border-b border-border px-4 py-3 text-sm font-medium text-foreground">
                <StickyNote className="size-4 text-muted-foreground" />
                Internal notes
                <span className="text-xs font-normal text-muted-foreground">
                  · staff only
                </span>
              </h2>
              {notes.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No notes yet. Use “Add note” to record context for the team.
                </p>
              ) : (
                <ul className="flex flex-col divide-y divide-border">
                  {notes.map((n) => (
                    <li key={n.id} className="px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-foreground">
                          {n.author?.name ?? "Support"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {fmtDateTime(n.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                        {n.note}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Right: actions + customer + summary */}
          <aside className="flex flex-col gap-6 lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Support actions</CardTitle>
              </CardHeader>
              <CardContent>
                <SupportOrderActions
                  orderId={order.id}
                  orderNumber={order.orderNumber}
                  status={order.status}
                />
              </CardContent>
            </Card>

            {/* Customer */}
            <div className="rounded-xl border border-border p-5">
              <h2 className="flex items-center gap-2 text-sm font-medium text-foreground">
                <UserIcon className="size-4 text-muted-foreground" />
                Customer
              </h2>
              <div className="mt-2 space-y-0.5 text-sm">
                <p className="font-medium text-foreground">
                  {order.user?.name ?? "—"}
                </p>
                {order.user?.email && (
                  <p className="text-muted-foreground">{order.user.email}</p>
                )}
                {phoneRecord?.phone && (
                  <p className="text-muted-foreground">{phoneRecord.phone}</p>
                )}
                {order.user && (
                  <Link
                    href={`/support/customers/${order.user.id}`}
                    className="inline-block pt-1 text-xs font-medium text-primary hover:underline"
                  >
                    View customer ({totalOrders}{" "}
                    {totalOrders === 1 ? "order" : "orders"})
                  </Link>
                )}
              </div>
            </div>

            {/* Summary + payment */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="font-heading text-base font-semibold text-foreground">
                Summary
              </h2>
              <dl className="mt-4 flex flex-col gap-2.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd className="tabular-nums text-foreground">
                    {inr(order.subtotal)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Shipping</dt>
                  <dd className="tabular-nums text-foreground">
                    {Number(order.shipping) === 0 ? (
                      <span className="text-green-600">Free</span>
                    ) : (
                      inr(order.shipping)
                    )}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Tax</dt>
                  <dd className="tabular-nums text-foreground">{inr(order.tax)}</dd>
                </div>
                {Number(order.discount) > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Discount</dt>
                    <dd className="tabular-nums text-green-600">
                      −{inr(order.discount)}
                    </dd>
                  </div>
                )}
              </dl>
              <Separator className="my-4" />
              <div className="flex items-center justify-between text-base font-semibold text-foreground">
                <span>Total</span>
                <span className="tabular-nums">{inr(order.total)}</span>
              </div>

              <Separator className="my-4" />
              <h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
                <CreditCard className="size-4 text-muted-foreground" />
                Payment
              </h3>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{paymentLabel}</span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize",
                    PAYMENT_STYLES[order.paymentStatus] ??
                      "bg-muted text-muted-foreground"
                  )}
                >
                  {order.paymentStatus.replace(/_/g, " ")}
                </span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
