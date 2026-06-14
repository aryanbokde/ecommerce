"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Tag, PartyPopper, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { notifyError } from "@/lib/notify";

const inr = (v: number) =>
  `₹${v.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

interface Props {
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  /** 0–100 fill toward the free-shipping threshold. */
  freeShipPct: number;
  /** ₹ still needed to unlock free shipping (0 once unlocked). */
  freeShipRemaining: number;
  hasUnavailable: boolean;
  onCheckout: () => void;
}

// Sticky, elevated order-summary card. Presentation only — totals are computed
// upstream (calculations untouched); the coupon field is UI-only.
export function CartSummary({
  subtotal,
  shipping,
  tax,
  total,
  freeShipPct,
  freeShipRemaining,
  hasUnavailable,
  onCheckout,
}: Props) {
  const [couponOpen, setCouponOpen] = useState(false);
  const [coupon, setCoupon] = useState("");
  const freeUnlocked = shipping === 0;

  return (
    <div className="sticky top-24 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <h2 className="font-heading text-lg font-semibold text-foreground">
        Order Summary
      </h2>

      {/* Free-shipping progress */}
      <div className="mt-4 rounded-xl bg-muted/60 p-3.5">
        <div className="flex items-center gap-1.5 text-xs">
          {freeUnlocked ? (
            <>
              <PartyPopper className="size-3.5 text-green-600" />
              <span className="font-medium text-green-600">
                You&apos;ve unlocked free shipping!
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">
              <span className="font-semibold text-foreground">
                {inr(freeShipRemaining)}
              </span>{" "}
              away from free shipping
            </span>
          )}
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-border">
          <motion.div
            className={cn(
              "h-full rounded-full",
              freeUnlocked
                ? "bg-green-600"
                : "bg-gradient-to-r from-[#219EBC] to-[#8ECAE6]"
            )}
            initial={{ width: 0 }}
            animate={{ width: `${freeShipPct}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Line items */}
      <dl className="mt-5 flex flex-col gap-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd className="font-medium text-foreground tabular-nums">
            {inr(subtotal)}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Shipping</dt>
          <dd className="font-medium tabular-nums">
            {shipping === 0 ? (
              <span className="text-green-600">Free</span>
            ) : (
              <span className="text-foreground">{inr(shipping)}</span>
            )}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Tax (18%)</dt>
          <dd className="font-medium text-foreground tabular-nums">
            {inr(tax)}
          </dd>
        </div>
      </dl>

      {/* Total */}
      <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
        <span className="text-base font-semibold text-foreground">Total</span>
        <span className="text-xl font-bold text-foreground tabular-nums">
          {inr(total)}
        </span>
      </div>

      {/* Checkout */}
      <Button
        size="lg"
        onClick={onCheckout}
        disabled={hasUnavailable}
        className="mt-5 w-full bg-gradient-to-r from-primary to-primary/80 font-semibold shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/25 disabled:translate-y-0 disabled:opacity-60 disabled:shadow-none"
      >
        Proceed to Checkout
      </Button>

      {hasUnavailable ? (
        <p className="mt-2 text-center text-xs font-medium text-rose-600 dark:text-rose-400">
          Remove unavailable items to continue.
        </p>
      ) : (
        <p className="mt-2.5 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="size-3" />
          Secure checkout
        </p>
      )}

      {/* Coupon — collapsible (UI only) */}
      <div className="mt-5 border-t border-border pt-4">
        <button
          type="button"
          onClick={() => setCouponOpen((v) => !v)}
          aria-expanded={couponOpen}
          className="flex w-full items-center justify-between text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <span className="flex items-center gap-1.5">
            <Tag className="size-3.5" />
            Have a coupon?
          </span>
          <ChevronDown
            className={cn(
              "size-4 transition-transform duration-300",
              couponOpen && "rotate-180"
            )}
          />
        </button>

        {couponOpen && (
          <motion.form
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              notifyError(
                "Coupons coming soon",
                "This code can't be applied yet."
              );
            }}
          >
            <Input
              placeholder="Enter code"
              aria-label="Coupon code"
              value={coupon}
              onChange={(e) => setCoupon(e.target.value)}
            />
            <Button type="submit" variant="outline" disabled={!coupon.trim()}>
              Apply
            </Button>
          </motion.form>
        )}
      </div>
    </div>
  );
}
