"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, RotateCcw, Ban, Loader2, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { useCart } from "@/hooks/useCart";
import { cn } from "@/lib/utils";
import { notifySuccess, notifyError } from "@/lib/notify";

export interface OrderCardItem {
  id: string;
  productId: string;
  name: string;
  image: string | null;
  quantity: number;
  price: string | number;
}

export interface OrderCardData {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: string | number;
  createdAt: string;
  items: OrderCardItem[];
}

const PAYMENT_STYLES: Record<string, string> = {
  paid: "bg-green-100 text-green-700",
  unpaid: "bg-amber-100 text-amber-700",
  refund_pending: "bg-orange-100 text-orange-700",
  refunded: "bg-muted text-muted-foreground",
  failed: "bg-red-100 text-red-700",
};

// A customer may cancel only BEFORE the order ships. Once shipped/delivered the
// item is in transit or received → use a return request instead (not a cancel).
const CANCELLABLE = ["pending", "confirmed", "processing"];

function formatPrice(value: string | number): string {
  return `₹${Number(value).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function OrderCard({
  order,
  cancelEnabled = true,
}: {
  order: OrderCardData;
  cancelEnabled?: boolean;
}) {
  const router = useRouter();
  const openCart = useCart((s) => s.openCart);
  const [reordering, setReordering] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const canCancel = cancelEnabled && CANCELLABLE.includes(order.status);
  const shown = order.items.slice(0, 3);
  const extra = order.items.length - shown.length;
  const placedOn = new Date(order.createdAt).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  // Re-add every item from this order to the cart (best-effort: some products
  // may now be inactive / out of stock), then open the cart drawer.
  async function reorder() {
    setReordering(true);
    let added = 0;
    let failed = 0;
    for (const item of order.items) {
      try {
        const res = await fetch("/api/cart/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            productId: item.productId,
            quantity: item.quantity,
          }),
        });
        if (res.ok) added++;
        else failed++;
      } catch {
        failed++;
      }
    }
    setReordering(false);
    if (added > 0) {
      openCart(); // refreshes the cart + opens the drawer
      notifySuccess(
        "Added to cart",
        failed > 0
          ? `${added} item(s) added · ${failed} unavailable`
          : `${added} item(s) added`
      );
    } else {
      notifyError("Couldn't reorder", "These items are no longer available.");
    }
  }

  async function cancelOrder() {
    setCancelling(true);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "cancelled" }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        notifyError("Couldn't cancel order", json?.error);
        return;
      }
      notifySuccess("Order cancelled", order.orderNumber);
      setConfirmOpen(false);
      router.refresh(); // re-render the server list with the new status
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="rounded-xl border border-border p-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">
            {order.orderNumber}
          </p>
          <p className="text-xs text-muted-foreground">Placed {placedOn}</p>
        </div>
        <div className="flex items-center gap-2">
          <OrderStatusBadge status={order.status} />
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

      {/* Thumbnails + total */}
      <div className="mt-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {shown.map((item) => (
            <span
              key={item.id}
              className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted"
              title={item.name}
            >
              {item.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.image} alt="" className="size-full object-cover" />
              ) : (
                <ShoppingBag className="size-4 text-muted-foreground" />
              )}
            </span>
          ))}
          {extra > 0 && (
            <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-medium text-muted-foreground">
              +{extra}
            </span>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-sm font-semibold text-foreground tabular-nums">
            {formatPrice(order.total)}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
        <Button
          variant="outline"
          size="sm"
          render={<Link href={`/orders/${order.id}`} />}
          nativeButton={false}
        >
          <Eye />
          View Details
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={reorder}
          disabled={reordering}
        >
          {reordering ? <Loader2 className="animate-spin" /> : <RotateCcw />}
          Reorder
        </Button>

        {canCancel && (
          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogTrigger
              render={
                <Button variant="ghost" size="sm" className="text-destructive" />
              }
            >
              <Ban />
              Cancel Order
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cancel this order?</DialogTitle>
                <DialogDescription>
                  Order {order.orderNumber} will be cancelled. This can&apos;t be
                  undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>
                  Keep order
                </DialogClose>
                <Button
                  variant="destructive"
                  onClick={cancelOrder}
                  disabled={cancelling}
                >
                  {cancelling && <Loader2 className="animate-spin" />}
                  Cancel order
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
