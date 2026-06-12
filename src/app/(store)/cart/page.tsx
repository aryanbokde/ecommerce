"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import {
  ShoppingBag,
  ArrowLeft,
  Loader2,
  Trash2,
  Truck,
  ShieldCheck,
  RotateCcw,
  Headphones,
} from "lucide-react";
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
import { useCart, type CartItem } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { CartItemRow } from "@/components/store/CartItemRow";
import { CartSummary } from "@/components/store/CartSummary";
import { CartRecommendations } from "@/components/store/CartRecommendations";
import { RecentlyViewed } from "@/components/store/RecentlyViewed";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const FREE_SHIPPING_THRESHOLD = 999;
const SHIPPING_FEE = 99;
const TAX_RATE = 0.18;

function formatPrice(value: number): string {
  return `₹${value.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
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
  const freeShipPct = Math.min(
    100,
    Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100)
  );
  const freeShipRemaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal + 1);
  // Block checkout while the cart holds an item that's gone inactive / OOS.
  const hasUnavailable = items.some(
    (it) => !it.product.isActive || it.product.stock <= 0
  );

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading && items.length === 0) {
    return (
      <>
        <CartHero subtitle="Loading your cart…" />
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Loading your cart…
            </span>
          </div>
        </div>
      </>
    );
  }

  // ── Empty ────────────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <>
        <CartHero subtitle="Your cart is waiting" />
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center gap-5 rounded-2xl border border-dashed border-border bg-card/40 px-6 py-20 text-center">
            <span className="flex size-20 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ShoppingBag className="size-9" />
            </span>
            <div className="space-y-1.5">
              <h2 className="text-lg font-semibold text-foreground">
                Your cart is empty
              </h2>
              <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                Looks like you haven&apos;t added anything yet. Explore our
                products and find something you love.
              </p>
            </div>
            <Button
              size="lg"
              render={<Link href="/products" />}
              nativeButton={false}
              className="bg-gradient-to-r from-primary to-primary/80 font-semibold shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/25"
            >
              Start Shopping
            </Button>
          </div>
        </div>

        {/* Help them restart: popular picks + what they were just looking at */}
        <div className="border-t border-border bg-muted/20 pb-10">
          <CartRecommendations excludeIds={[]} title="Popular right now" />
          <RecentlyViewed />
        </div>
      </>
    );
  }

  // ── Cart with items ────────────────────────────────────────────────────────
  return (
    <>
      <CartHero
        pill={
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            {count} {count === 1 ? "item" : "items"}
          </span>
        }
      />
      <div className="mx-auto max-w-7xl px-4 pb-10 pt-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* ── Items column ── */}
          <div className="lg:col-span-2">
            <ul className="flex flex-col">
              <AnimatePresence initial={false}>
                {items.map((item) => (
                  <CartItemRow
                    key={item.id}
                    item={item}
                    busy={busyId === item.id}
                    onSetQuantity={setQuantity}
                    onRemove={removeItem}
                  />
                ))}
              </AnimatePresence>
            </ul>

            {/* Footer actions */}
            <div className="mt-2 flex items-center justify-between">
              <Button
                variant="ghost"
                render={<Link href="/products" />}
                nativeButton={false}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft />
                Continue Shopping
              </Button>

              <Dialog>
                <DialogTrigger
                  render={
                    <Button
                      variant="ghost"
                      className="text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400"
                    />
                  }
                >
                  <Trash2 />
                  Clear Cart
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Clear your cart?</DialogTitle>
                    <DialogDescription>
                      This will remove all {count}{" "}
                      {count === 1 ? "item" : "items"} from your cart. This
                      can&apos;t be undone.
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
            <CartSummary
              subtotal={subtotal}
              shipping={shipping}
              tax={tax}
              total={grandTotal}
              freeShipPct={freeShipPct}
              freeShipRemaining={freeShipRemaining}
              hasUnavailable={hasUnavailable}
              onCheckout={onCheckout}
            />
          </aside>
        </div>

        {/* Trust / benefits strip */}
        <div className="mt-20 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border lg:grid-cols-4">
          <Benefit
            icon={Truck}
            title="Free shipping"
            sub={`On orders over ${formatPrice(FREE_SHIPPING_THRESHOLD)}`}
          />
          <Benefit
            icon={ShieldCheck}
            title="Secure payments"
            sub="256-bit encrypted checkout"
          />
          <Benefit
            icon={RotateCcw}
            title="Easy returns"
            sub="7-day hassle-free returns"
          />
          <Benefit
            icon={Headphones}
            title="24/7 support"
            sub="We're here to help"
          />
        </div>
      </div>

      {/* Discovery band — bordered + tinted so it reads as a deliberate section
          rather than a gap before the footer. pb-10 + each child's py-10 keep an
          ~80px rhythm between every section and before the footer. */}
      <div className="border-t border-border bg-muted/20 pb-10">
        <CartRecommendations excludeIds={items.map((it) => it.product.id)} />
        <RecentlyViewed />
      </div>
    </>
  );
}

// Full-width hero band — sits flush under the site header (no gap) and carries
// the breadcrumb + page title, matching the product-detail breadcrumb pattern.
function CartHero({
  subtitle,
  pill,
}: {
  subtitle?: React.ReactNode;
  pill?: React.ReactNode;
}) {
  return (
    <div className="border-b border-border bg-gradient-to-b from-muted/50 to-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/" />}>Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Cart</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="mt-3 flex items-center gap-3.5">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ShoppingBag className="size-6" />
          </span>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                Shopping Cart
              </h1>
              {pill}
            </div>
            {subtitle && (
              <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Benefit({
  icon: Icon,
  title,
  sub,
}: {
  icon: typeof Truck;
  title: string;
  sub: string;
}) {
  return (
    <div className="flex items-center gap-3 bg-card p-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{sub}</p>
      </div>
    </div>
  );
}
