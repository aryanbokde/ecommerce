import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { after } from "next/server";
import {
  ShoppingBag,
  MapPin,
  CreditCard,
  User as UserIcon,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import prisma from "@/server/db";
import { getOrderById } from "@/server/services/order.service";
import { OrderStatusTimeline } from "@/components/orders/OrderStatusTimeline";
import {
  OrderStatusManager,
  PrintInvoiceButton,
} from "@/components/admin/OrderStatusManager";
import { CopyField } from "@/components/admin/CopyField";
import { RefundPanel } from "@/components/admin/RefundPanel";
import { ReturnPanel } from "@/components/admin/ReturnPanel";
import { CodPaymentPanel } from "@/components/admin/CodPaymentPanel";
import { OrderNotesPanel } from "@/components/admin/OrderNotesPanel";

// Dedupe the DB read between generateMetadata and the page (same request).
const loadOrder = cache(async (id: string) => {
  try {
    return await getOrderById(id, null); // null = staff access to any order
  } catch {
    return null;
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
  refunded: "bg-muted text-muted-foreground",
  failed: "bg-red-100 text-red-700",
};

// Human label for the payment status pill (snake_case → words).
const paymentLabelFor = (s: string) =>
  s === "refund_pending" ? "refund pending" : s;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const order = await loadOrder(id);
  return { title: order ? `Order ${order.orderNumber}` : "Order not found" };
}

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await loadOrder(id);
  if (!order) notFound();

  // Opening the order detail marks it "seen" — both the order and any return
  // request — so it clears from the sidebar's new-orders badge. Done after the
  // response so it never blocks the render.
  if (!order.seenByAdmin) {
    after(async () => {
      await prisma.order.update({
        where: { id: order.id },
        data: { seenByAdmin: true },
      });
    });
  }
  if (order.returnRequest && !order.returnRequest.seenByAdmin) {
    after(async () => {
      await prisma.return.update({
        where: { id: order.returnRequest!.id },
        data: { seenByAdmin: true },
      });
    });
  }

  // Extra customer context not included on the order record.
  const [phoneRecord, totalOrders] = order.user
    ? await Promise.all([
        prisma.user.findUnique({
          where: { id: order.user.id },
          select: { phone: true },
        }),
        prisma.order.count({ where: { userId: order.user.id } }),
      ])
    : [null, 0];

  // Internal staff notes (newest first) — staff-only, not shown to the customer.
  const supportNotes = await prisma.supportNote.findMany({
    where: { orderId: order.id },
    orderBy: { createdAt: "desc" },
    include: { author: { select: { id: true, name: true } } },
  });
  const notes = supportNotes.map((n) => ({
    id: n.id,
    note: n.note,
    createdAt: n.createdAt.toISOString(),
    author: n.author,
  }));

  const placedOn = new Date(order.createdAt).toLocaleString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const address = order.address;
  const paymentLabel =
    order.paymentMethod === "razorpay"
      ? "Razorpay"
      : order.paymentMethod === "cod"
        ? "Cash on Delivery"
        : (order.paymentMethod ?? "—");

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
            Order {order.orderNumber}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Placed {placedOn}
          </p>
        </div>
        <div className="no-print">
          <PrintInvoiceButton />
        </div>
      </div>

      <div className="print-area mt-6 flex flex-col gap-6">
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

        {/* Customer return request (delivered orders) */}
        {order.returnRequest && (
          <ReturnPanel
            orderId={order.id}
            orderPaid={order.paymentStatus === "paid"}
            data={{
              status: order.returnRequest.status,
              reason: order.returnRequest.reason,
              adminNote: order.returnRequest.adminNote,
              restocked: order.returnRequest.restocked,
            }}
          />
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: items + address */}
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
                        {formatPrice(item.price)} × {item.quantity}
                      </p>
                    </div>
                    <span className="text-sm font-medium tabular-nums text-foreground">
                      {formatPrice(item.total)}
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
          </div>

          {/* Right: status manager + customer + summary */}
          <aside className="flex flex-col gap-6 lg:col-span-1">
            <div className="no-print">
              <OrderStatusManager
                orderId={order.id}
                currentStatus={order.status}
              />
            </div>

            {/* Internal staff notes */}
            <div className="no-print">
              <OrderNotesPanel orderId={order.id} initialNotes={notes} />
            </div>

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
                <p className="text-muted-foreground">{order.user?.email}</p>
                {phoneRecord?.phone && (
                  <p className="text-muted-foreground">{phoneRecord.phone}</p>
                )}
                <p className="pt-1 text-xs text-muted-foreground">
                  {totalOrders} {totalOrders === 1 ? "order" : "orders"} total
                </p>
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
                    {formatPrice(order.subtotal)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Shipping</dt>
                  <dd className="tabular-nums text-foreground">
                    {Number(order.shipping) === 0 ? (
                      <span className="text-green-600">Free</span>
                    ) : (
                      formatPrice(order.shipping)
                    )}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Tax</dt>
                  <dd className="tabular-nums text-foreground">
                    {formatPrice(order.tax)}
                  </dd>
                </div>
                {Number(order.discount) > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Discount</dt>
                    <dd className="tabular-nums text-green-600">
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
                  {paymentLabelFor(order.paymentStatus)}
                </span>
              </div>

              {/* Gateway ids — for reconciliation on the Razorpay dashboard. */}
              {(order.paymentId || order.razorpayOrderId) && (
                <div className="mt-3 space-y-1.5 border-t border-border pt-3">
                  {order.paymentId && (
                    <CopyField label="Payment ID" value={order.paymentId} />
                  )}
                  {order.razorpayOrderId && (
                    <CopyField label="Order ID" value={order.razorpayOrderId} />
                  )}
                </div>
              )}

              {/* COD: record cash collected on delivery (unpaid → paid). */}
              <CodPaymentPanel
                orderId={order.id}
                paymentMethod={order.paymentMethod}
                paymentStatus={order.paymentStatus}
              />

              {/* Manual refund tracker (cancelled + paid → refund_pending). */}
              <RefundPanel
                orderId={order.id}
                paymentStatus={order.paymentStatus}
                refundId={order.refundId}
              />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
