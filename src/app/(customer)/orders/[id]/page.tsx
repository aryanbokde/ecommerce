import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CheckCircle2,
  ArrowLeft,
  ShoppingBag,
  MapPin,
  CreditCard,
  Download,
  Truck,
  LifeBuoy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { getServerSession } from "@/lib/auth";
import { getOrderById } from "@/server/services/order.service";
import { OrderStatusTimeline } from "@/components/orders/OrderStatusTimeline";
import { CustomerReturn } from "@/components/orders/CustomerReturn";
import { getStoreConfig } from "@/server/services/settings.service";

// Outside the component so the time read isn't flagged as impure-in-render.
function withinReturnWindow(deliveredAt: Date | null, days: number): boolean {
  if (!deliveredAt) return true;
  return Date.now() <= deliveredAt.getTime() + days * 86_400_000;
}

// Dedupe the DB read between generateMetadata and the page (same request).
const loadOrder = cache(async (id: string, userId: string) => {
  try {
    return await getOrderById(id, userId);
  } catch {
    return null; // not found / not owned → 404 below
  }
});

function formatPrice(value: unknown): string {
  return `₹${Number(value).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

const PAYMENT_STYLES: Record<string, string> = {
  paid: "bg-green-100 text-green-700",
  unpaid: "bg-amber-100 text-amber-700",
  refund_pending: "bg-orange-100 text-orange-700",
  refunded: "bg-gray-100 text-gray-700",
  failed: "bg-red-100 text-red-700",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const session = await getServerSession();
  if (!session) return { title: "Order" };
  const order = await loadOrder(id, session.user.id);
  return { title: order ? `Order ${order.orderNumber}` : "Order not found" };
}

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string }>;
}) {
  const { id } = await params;
  const { success } = await searchParams;

  const session = await getServerSession();
  if (!session) notFound(); // layout already guards; keeps types honest
  const order = await loadOrder(id, session.user.id);
  if (!order) notFound();

  // Whether the customer may request a return: returns on, delivered, within the
  // window (no deliveredAt = legacy → allow), and none already requested.
  const config = await getStoreConfig();
  const canRequestReturn =
    config.returnsEnabled &&
    order.status === "delivered" &&
    withinReturnWindow(order.deliveredAt, config.returnWindowDays) &&
    !order.returnRequest;

  const justPlaced = success === "true";
  const placedOn = new Date(order.createdAt).toLocaleString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const paymentLabel =
    order.paymentMethod === "razorpay"
      ? "Paid online (Razorpay)"
      : order.paymentMethod === "cod"
        ? "Cash on Delivery"
        : (order.paymentMethod ?? "—");
  const address = order.address;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href="/orders"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        My Orders
      </Link>

      {/* Success banner (after a fresh checkout) */}
      {justPlaced && (
        <div className="mt-4 flex items-center gap-4 rounded-xl border border-green-200 bg-green-50 p-5 duration-500 animate-in fade-in slide-in-from-top-2">
          <span className="relative flex size-12 shrink-0 items-center justify-center">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-50" />
            <span className="relative inline-flex size-12 items-center justify-center rounded-full bg-green-100 duration-300 animate-in zoom-in-50">
              <CheckCircle2 className="size-7 text-green-600" />
            </span>
          </span>
          <div>
            <p className="text-base font-semibold text-green-800">
              Order placed successfully!
            </p>
            <p className="text-sm text-green-700">
              Your order number is{" "}
              <span className="font-semibold">{order.orderNumber}</span>.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mt-6">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
          Order {order.orderNumber}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Placed {placedOn}</p>
      </div>

      {/* Status timeline */}
      <section
        id="timeline"
        className="mt-6 scroll-mt-24 rounded-xl border border-border p-5"
      >
        <h2 className="mb-5 text-sm font-medium text-foreground">
          Order status
        </h2>
        <OrderStatusTimeline
          status={order.status}
          createdAt={order.createdAt}
          updatedAt={order.updatedAt}
        />
      </section>

      {/* Return request (delivered orders) */}
      <div className="mt-6">
        <CustomerReturn
          orderId={order.id}
          canRequest={canRequestReturn}
          existing={
            order.returnRequest
              ? {
                  status: order.returnRequest.status,
                  reason: order.returnRequest.reason,
                  adminNote: order.returnRequest.adminNote,
                }
              : null
          }
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Items */}
        <section className="lg:col-span-2">
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
                      {formatPrice(item.price)} × {item.quantity}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-foreground tabular-nums">
                    {formatPrice(item.total)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {order.notes && (
            <div className="mt-4 rounded-xl border border-border p-4">
              <h2 className="text-sm font-medium text-foreground">Order notes</h2>
              <p className="mt-1 text-sm text-muted-foreground">{order.notes}</p>
            </div>
          )}
        </section>

        {/* Summary / payment / address */}
        <aside className="flex flex-col gap-6 lg:col-span-1">
          {/* Price breakdown */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-heading text-base font-semibold text-foreground">
              Summary
            </h2>
            <dl className="mt-4 flex flex-col gap-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="text-foreground tabular-nums">
                  {formatPrice(order.subtotal)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Shipping</dt>
                <dd className="text-foreground tabular-nums">
                  {Number(order.shipping) === 0 ? (
                    <span className="text-green-600">Free</span>
                  ) : (
                    formatPrice(order.shipping)
                  )}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Tax</dt>
                <dd className="text-foreground tabular-nums">
                  {formatPrice(order.tax)}
                </dd>
              </div>
              {Number(order.discount) > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Discount</dt>
                  <dd className="text-green-600 tabular-nums">
                    −{formatPrice(order.discount)}
                  </dd>
                </div>
              )}
            </dl>
            <Separator className="my-4" />
            <div className="flex items-center justify-between text-base font-semibold text-foreground">
              <span>Total</span>
              <span className="tabular-nums">{formatPrice(order.total)}</span>
            </div>
          </div>

          {/* Payment */}
          <div className="rounded-xl border border-border p-5">
            <h2 className="flex items-center gap-2 text-sm font-medium text-foreground">
              <CreditCard className="size-4 text-muted-foreground" />
              Payment
            </h2>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{paymentLabel}</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize",
                  PAYMENT_STYLES[order.paymentStatus] ??
                    "bg-muted text-muted-foreground"
                )}
              >
                {order.paymentStatus.replace("_", " ")}
              </span>
            </div>
          </div>

          {/* Address */}
          {address && (
            <div className="rounded-xl border border-border p-5">
              <h2 className="flex items-center gap-2 text-sm font-medium text-foreground">
                <MapPin className="size-4 text-muted-foreground" />
                Delivery address
              </h2>
              <div className="mt-2 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">
                  {address.fullName}{" "}
                  <span className="text-muted-foreground">({address.label})</span>
                </p>
                <p className="mt-0.5">
                  {[address.line1, address.line2, address.city, address.state, address.postalCode, address.country]
                    .filter(Boolean)
                    .join(", ")}
                </p>
                <p className="mt-0.5">{address.phone}</p>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Actions */}
      <div className="mt-8 flex flex-wrap gap-3">
        {/* TODO: generate a PDF invoice (e.g. GET /api/orders/[id]/invoice). UI-only for now. */}
        <Button variant="outline">
          <Download />
          Download Invoice
        </Button>
        <Button
          variant="outline"
          render={<a href="#timeline" />}
          nativeButton={false}
        >
          <Truck />
          Track Order
        </Button>
        <Button
          variant="outline"
          render={<a href="mailto:support@myshop.com" />}
          nativeButton={false}
        >
          <LifeBuoy />
          Contact Support
        </Button>
      </div>
    </div>
  );
}
