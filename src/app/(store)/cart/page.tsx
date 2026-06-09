"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  ArrowLeft,
  Loader2,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
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
import { useCart, type CartItem } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { notifyError } from "@/lib/notify";

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

export default function CartPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const {
    items,
    total,
    count,
    isLoading,
    refreshCart,
    setQuantity: storeSetQuantity,
    removeItem: storeRemoveItem,
    clearCart: storeClearCart,
  } = useCart();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [coupon, setCoupon] = useState("");

  // Load the cart once on mount (the store may already be populated by the
  // header's CartDrawer, but refreshing guarantees fresh quantities/prices).
  useEffect(() => {
    void refreshCart();
  }, [refreshCart]);

  async function setQuantity(item: CartItem, quantity: number) {
    const clamped = Math.max(1, Math.min(quantity, item.product.stock || 1));
    setBusyId(item.id);
    try {
      await storeSetQuantity(item, clamped);
    } finally {
      setBusyId(null);
    }
  }

  async function removeItem(item: CartItem) {
    setBusyId(item.id);
    try {
      await storeRemoveItem(item);
    } finally {
      setBusyId(null);
    }
  }

  async function clearCart() {
    setClearing(true);
    try {
      await storeClearCart();
    } finally {
      setClearing(false);
    }
  }

  function onCheckout() {
    router.push(isAuthenticated ? "/checkout" : "/login?redirect=/checkout");
  }

  const subtotal = total;
  const shipping = subtotal > FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const tax = subtotal * TAX_RATE;
  const grandTotal = subtotal + shipping + tax;

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading && items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Loading your cart…
          </span>
        </div>
      </div>
    );
  }

  // ── Empty ────────────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
          Shopping Cart
        </h1>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border py-20 text-center">
          <ShoppingBag className="size-12 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Your cart is empty
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Looks like you haven&apos;t added anything yet.
            </p>
          </div>
          <Button render={<Link href="/products" />} nativeButton={false}>
            Browse Products
          </Button>
        </div>
      </div>
    );
  }

  // ── Cart with items ────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
        Shopping Cart{" "}
        <span className="text-base font-normal text-muted-foreground">
          ({count} {count === 1 ? "item" : "items"})
        </span>
      </h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        {/* ── Items column ── */}
        <div className="lg:col-span-2">
          <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
            {items.map((item) => {
              const img = firstImage(item.product.images);
              const busy = busyId === item.id;
              const unitPrice = Number(item.product.price);
              const atStock = item.quantity >= item.product.stock;
              return (
                <li key={item.id} className="flex gap-4 p-4">
                  {/* Image */}
                  <Link
                    href={`/products/${item.product.slug}`}
                    className="flex size-[60px] shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted"
                  >
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={img}
                        alt={item.product.name}
                        className="size-full object-cover"
                      />
                    ) : (
                      <ShoppingBag className="size-5 text-muted-foreground" />
                    )}
                  </Link>

                  {/* Details */}
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/products/${item.product.slug}`}
                        className="text-sm font-medium text-foreground hover:underline"
                      >
                        {item.product.name}
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Remove item"
                        disabled={busy}
                        onClick={() => removeItem(item)}
                      >
                        {busy ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          <Trash2 />
                        )}
                      </Button>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {formatPrice(unitPrice)} each
                    </p>

                    <div className="mt-auto flex items-center justify-between gap-2">
                      {/* Quantity stepper */}
                      <div className="flex items-center rounded-md border border-border">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Decrease quantity"
                          disabled={busy || item.quantity <= 1}
                          onClick={() => setQuantity(item, item.quantity - 1)}
                        >
                          <Minus />
                        </Button>
                        <input
                          type="text"
                          inputMode="numeric"
                          aria-label="Quantity"
                          value={item.quantity}
                          disabled={busy}
                          onChange={(e) => {
                            const next = parseInt(e.target.value, 10);
                            if (!Number.isNaN(next)) setQuantity(item, next);
                          }}
                          className="w-10 bg-transparent text-center text-sm tabular-nums outline-none"
                        />
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Increase quantity"
                          disabled={busy || atStock}
                          onClick={() => setQuantity(item, item.quantity + 1)}
                        >
                          <Plus />
                        </Button>
                      </div>

                      {/* Line total */}
                      <span className="text-sm font-semibold text-foreground tabular-nums">
                        {formatPrice(unitPrice * item.quantity)}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Footer actions */}
          <div className="mt-4 flex items-center justify-between">
            <Button
              variant="ghost"
              render={<Link href="/products" />}
              nativeButton={false}
            >
              <ArrowLeft />
              Continue Shopping
            </Button>

            <Dialog>
              <DialogTrigger
                render={
                  <Button variant="ghost" className="text-muted-foreground" />
                }
              >
                <Trash2 />
                Clear Cart
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Clear your cart?</DialogTitle>
                  <DialogDescription>
                    This will remove all {count} {count === 1 ? "item" : "items"}{" "}
                    from your cart. This can&apos;t be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose render={<Button variant="outline" />}>
                    Cancel
                  </DialogClose>
                  <DialogClose
                    render={<Button variant="destructive" />}
                    onClick={clearCart}
                    disabled={clearing}
                  >
                    {clearing && <Loader2 className="animate-spin" />}
                    Clear Cart
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* ── Order summary column ── */}
        <aside className="lg:col-span-1">
          <div className="sticky top-24 rounded-xl border border-border bg-card p-5">
            <h2 className="font-heading text-base font-semibold text-foreground">
              Order Summary
            </h2>

            <dl className="mt-4 flex flex-col gap-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="text-foreground tabular-nums">
                  {formatPrice(subtotal)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Estimated shipping</dt>
                <dd className="text-foreground tabular-nums">
                  {shipping === 0 ? (
                    <span className="text-green-600">Free</span>
                  ) : (
                    formatPrice(shipping)
                  )}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Estimated tax (18%)</dt>
                <dd className="text-foreground tabular-nums">
                  {formatPrice(tax)}
                </dd>
              </div>
            </dl>

            {shipping > 0 && (
              <p className="mt-3 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                Add {formatPrice(FREE_SHIPPING_THRESHOLD - subtotal + 1)} more to
                qualify for free shipping.
              </p>
            )}

            <Separator className="my-4" />

            <div className="flex items-center justify-between text-base font-semibold text-foreground">
              <span>Total</span>
              <span className="tabular-nums">{formatPrice(grandTotal)}</span>
            </div>

            <Button size="lg" className="mt-5 w-full" onClick={onCheckout}>
              Proceed to Checkout
            </Button>

            {/* Coupon (UI only) */}
            <form
              className="mt-4"
              onSubmit={(e) => {
                e.preventDefault();
                notifyError("Coupons coming soon", "This code can't be applied yet.");
              }}
            >
              <label
                htmlFor="coupon"
                className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
              >
                <Tag className="size-3.5" />
                Have a coupon?
              </label>
              <div className="flex gap-2">
                <Input
                  id="coupon"
                  placeholder="Enter code"
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value)}
                />
                <Button type="submit" variant="outline" disabled={!coupon.trim()}>
                  Apply
                </Button>
              </div>
            </form>
          </div>
        </aside>
      </div>
    </div>
  );
}
