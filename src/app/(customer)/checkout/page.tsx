"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShoppingBag, CreditCard } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/layout/PageHeader";
import { CheckoutSteps } from "@/components/checkout/CheckoutSteps";
import { AddressStep } from "@/components/checkout/AddressStep";
import { PaymentStep } from "@/components/checkout/PaymentStep";
import { ReviewStep } from "@/components/checkout/ReviewStep";
import { useCheckout } from "@/hooks/useCheckout";
import { type CartItem } from "@/hooks/useCart";
import { previewTax } from "@/lib/tax-preview";
import { notifyWarning } from "@/lib/notify";

const FREE_SHIPPING_THRESHOLD = 999;
const SHIPPING_FEE = 99;

const CHECKOUT_CRUMB = [
  { label: "Home", href: "/" },
  { label: "Cart", href: "/cart" },
  { label: "Checkout" },
];

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
  const tax = previewTax(items); // per-line, matches the server order tax
  return { subtotal, shipping, tax, total: subtotal + shipping + tax };
}

export default function CheckoutPage() {
  const router = useRouter();
  const step = useCheckout((s) => s.step);
  const cart = useCheckout((s) => s.cart);
  const setCart = useCheckout((s) => s.setCart);

  // Load the cart on mount; bounce back to /cart if it's empty.
  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const res = await fetch("/api/cart", { credentials: "include" });
        const json = res.ok ? await res.json() : null;
        const items: CartItem[] = json?.data?.items ?? [];
        if (cancelled) return;
        if (items.length === 0) {
          notifyWarning("Your cart is empty", "Add items before checking out.");
          router.replace("/cart");
          return;
        }
        setCart(items);
      } catch {
        if (!cancelled) router.replace("/cart");
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [router, setCart]);

  if (!cart) {
    return (
      <>
        <PageHeader
          title="Checkout"
          breadcrumb={CHECKOUT_CRUMB}
          icon={CreditCard}
          subtitle="Securing your checkout…"
        />
        <div className="mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
            Preparing checkout…
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Checkout"
        breadcrumb={CHECKOUT_CRUMB}
        icon={CreditCard}
        subtitle="Complete your order in a few steps"
      />
      <div className="mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <CheckoutSteps currentStep={step} />
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-3">
          {/* Step content */}
          <div className="lg:col-span-2">
            {step === "address" && <AddressStep />}
            {step === "payment" && <PaymentStep />}
            {step === "review" && <ReviewStep />}
          </div>

          {/* Order summary */}
          <aside className="lg:col-span-1">
            <OrderSummary items={cart} />
          </aside>
        </div>
      </div>
    </>
  );
}

// ── Order summary (right column, sticky) ────────────────────────────────────────
function OrderSummary({ items }: { items: CartItem[] }) {
  const { subtotal, shipping, tax, total } = computeTotals(items);

  return (
    <div className="sticky top-24 rounded-xl border border-border bg-card p-5">
      <h2 className="font-heading text-base font-semibold text-foreground">
        Order Summary
      </h2>

      <ul className="mt-4 flex flex-col gap-3">
        {items.map((item) => {
          const img = firstImage(item.product.images);
          return (
            <li key={item.id} className="flex items-center gap-3">
              <span className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img} alt="" className="size-full object-cover" />
                ) : (
                  <ShoppingBag className="size-4 text-muted-foreground" />
                )}
                <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                  {item.quantity}
                </span>
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                {item.product.name}
              </span>
              <span className="text-sm tabular-nums text-foreground">
                {formatPrice(Number(item.product.price) * item.quantity)}
              </span>
            </li>
          );
        })}
      </ul>

      <Separator className="my-4" />

      <dl className="flex flex-col gap-2.5 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd className="text-foreground tabular-nums">{formatPrice(subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Shipping</dt>
          <dd className="text-foreground tabular-nums">
            {shipping === 0 ? (
              <span className="text-green-600">Free</span>
            ) : (
              formatPrice(shipping)
            )}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Tax</dt>
          <dd className="text-foreground tabular-nums">{formatPrice(tax)}</dd>
        </div>
      </dl>

      <Separator className="my-4" />

      <div className="flex items-center justify-between text-base font-semibold text-foreground">
        <span>Total</span>
        <span className="tabular-nums">{formatPrice(total)}</span>
      </div>
    </div>
  );
}
