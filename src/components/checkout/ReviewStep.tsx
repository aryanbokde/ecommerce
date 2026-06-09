"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CreditCard, MapPin, Loader2, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { RazorpayCheckout, openRazorpay } from "./RazorpayCheckout";
import { useCheckout } from "@/hooks/useCheckout";
import { useCart, type CartItem } from "@/hooks/useCart";
import { notifySuccess, notifyError, notifyWarning } from "@/lib/notify";
import type { Address } from "@/types";

const FREE_SHIPPING_THRESHOLD = 999;
const SHIPPING_FEE = 99;
const TAX_RATE = 0.18;

function formatPrice(value: number): string {
  return `₹${value.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function firstImage(images: unknown): string | null {
  if (Array.isArray(images) && typeof images[0] === "string") return images[0];
  return null;
}

function computeTotals(items: CartItem[]) {
  const subtotal = items.reduce(
    (s, it) => s + Number(it.product.price) * it.quantity,
    0
  );
  const shipping = subtotal > FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const tax = subtotal * TAX_RATE;
  return { subtotal, shipping, tax, total: subtotal + shipping + tax };
}

export function ReviewStep() {
  const router = useRouter();
  const selectedAddressId = useCheckout((s) => s.selectedAddressId);
  const paymentMethod = useCheckout((s) => s.paymentMethod);
  const notes = useCheckout((s) => s.notes);
  const setNotes = useCheckout((s) => s.setNotes);
  const isProcessing = useCheckout((s) => s.isProcessing);
  const setProcessing = useCheckout((s) => s.setProcessing);
  const setStep = useCheckout((s) => s.setStep);
  const reset = useCheckout((s) => s.reset);
  const cart = useCheckout((s) => s.cart) ?? [];

  const [address, setAddress] = useState<Address | null>(null);

  // Resolve the selected address for display + Razorpay prefill.
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!selectedAddressId) {
        if (!cancelled) setAddress(null);
        return;
      }
      try {
        const res = await fetch("/api/addresses", { credentials: "include" });
        const json = res.ok ? await res.json() : null;
        if (cancelled) return;
        const list: Address[] = json?.data ?? [];
        setAddress(list.find((a) => a.id === selectedAddressId) ?? null);
      } catch {
        if (!cancelled) setAddress(null);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [selectedAddressId]);

  function finish(orderId: string, orderNumber: string) {
    notifySuccess("Order placed!", `Order ${orderNumber}`);
    void useCart.getState().refreshCart(); // cart emptied server-side
    reset();
    router.push(`/orders/${orderId}?success=true`);
  }

  async function placeOrder() {
    if (!selectedAddressId) {
      notifyError("No address selected", "Please choose a delivery address.");
      setStep("address");
      return;
    }
    setProcessing(true);
    try {
      const res = await fetch("/api/checkout/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          addressId: selectedAddressId,
          paymentMethod,
          notes: notes.trim() || undefined,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        notifyError("Couldn't start checkout", json?.error);
        setProcessing(false);
        return;
      }
      const data = json.data;

      // COD → order already created server-side.
      if (data.paymentMethod === "cod") {
        finish(data.orderId, data.orderNumber);
        return; // keep overlay up through the redirect
      }

      // Razorpay → launch the Checkout modal; callbacks handle the rest.
      await openRazorpay({
        keyId: data.keyId,
        amount: data.amount,
        razorpayOrderId: data.razorpayOrderId,
        addressId: selectedAddressId,
        notes: notes.trim() || undefined,
        prefill: { name: address?.fullName, contact: address?.phone },
        onSuccess: ({ orderId, orderNumber }) => finish(orderId, orderNumber),
        onError: (reason) => {
          if (reason === "cancelled") notifyWarning("Payment cancelled");
          else notifyError("Payment failed", reason);
          setProcessing(false);
        },
      });
    } catch {
      notifyError("Couldn't place order", "Please try again.");
      setProcessing(false);
    }
  }

  const totals = computeTotals(cart);
  const paymentLabel =
    paymentMethod === "razorpay" ? "Pay online (Razorpay)" : "Cash on Delivery";

  return (
    <div className="flex flex-col gap-5">
      {/* Preload the Razorpay script so the modal opens instantly. */}
      <RazorpayCheckout />

      {/* Full-screen processing overlay. */}
      {isProcessing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Processing your order…
            </p>
          </div>
        </div>
      )}

      <h2 className="text-lg font-semibold tracking-tight text-foreground">
        Review your order
      </h2>

      {/* Address */}
      <section className="rounded-lg border border-border p-4">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
            <MapPin className="size-4 text-muted-foreground" />
            Delivery address
          </h3>
          <Button variant="ghost" size="sm" onClick={() => setStep("address")}>
            Change
          </Button>
        </div>
        {address ? (
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
        ) : (
          <Skeleton className="mt-2 h-12 w-full" />
        )}
      </section>

      {/* Payment */}
      <section className="rounded-lg border border-border p-4">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
            <CreditCard className="size-4 text-muted-foreground" />
            Payment method
          </h3>
          <Button variant="ghost" size="sm" onClick={() => setStep("payment")}>
            Change
          </Button>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{paymentLabel}</p>
      </section>

      {/* Items */}
      <section className="rounded-lg border border-border p-4">
        <h3 className="text-sm font-medium text-foreground">
          Items ({cart.length})
        </h3>
        <ul className="mt-3 flex flex-col divide-y divide-border">
          {cart.map((item) => {
            const img = firstImage(item.product.images);
            return (
              <li key={item.id} className="flex items-center gap-3 py-3 first:pt-0">
                <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt="" className="size-full object-cover" />
                  ) : (
                    <ShoppingBag className="size-4 text-muted-foreground" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">
                    {item.product.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatPrice(Number(item.product.price))} × {item.quantity}
                  </p>
                </div>
                <span className="text-sm font-medium text-foreground tabular-nums">
                  {formatPrice(Number(item.product.price) * item.quantity)}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Order notes */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="review-notes"
          className="text-sm font-medium text-foreground"
        >
          Order notes (optional)
        </label>
        <textarea
          id="review-notes"
          rows={3}
          maxLength={2000}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Delivery instructions, landmark, etc."
          className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>

      {/* Totals */}
      <section className="rounded-lg border border-border p-4">
        <dl className="flex flex-col gap-2.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="text-foreground tabular-nums">
              {formatPrice(totals.subtotal)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Shipping</dt>
            <dd className="text-foreground tabular-nums">
              {totals.shipping === 0 ? (
                <span className="text-green-600">Free</span>
              ) : (
                formatPrice(totals.shipping)
              )}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Tax (18%)</dt>
            <dd className="text-foreground tabular-nums">
              {formatPrice(totals.tax)}
            </dd>
          </div>
        </dl>
        <Separator className="my-3" />
        <div className="flex items-center justify-between text-base font-semibold text-foreground">
          <span>Total</span>
          <span className="tabular-nums">{formatPrice(totals.total)}</span>
        </div>
      </section>

      {/* Actions */}
      <div className="flex justify-between border-t border-border pt-5">
        <Button
          variant="ghost"
          onClick={() => setStep("payment")}
          disabled={isProcessing}
        >
          <ArrowLeft />
          Back
        </Button>
        <Button size="lg" onClick={placeOrder} disabled={isProcessing}>
          {isProcessing && <Loader2 className="animate-spin" />}
          {paymentMethod === "razorpay" ? "Pay & Place Order" : "Place Order"}
        </Button>
      </div>
    </div>
  );
}
