"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Plus, Minus, Trash2, Loader2, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CartItem } from "@/hooks/useCart";

const inr = (v: number) =>
  `₹${v.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

function firstImage(images: unknown): string | null {
  if (Array.isArray(images) && typeof images[0] === "string") return images[0];
  return null;
}

interface Props {
  item: CartItem;
  /** True while a mutation for THIS row is in flight (disables controls). */
  busy: boolean;
  onSetQuantity: (item: CartItem, quantity: number) => void;
  onRemove: (item: CartItem) => void;
}

// A single cart line as a self-contained card. Animates its height + opacity on
// mount/removal via framer-motion (AnimatePresence lives in the parent list).
// Purely presentational — all mutations are delegated to the passed handlers.
export function CartItemRow({ item, busy, onSetQuantity, onRemove }: Props) {
  const img = firstImage(item.product.images);
  const unitPrice = Number(item.product.price);
  const stock = item.product.stock;
  const atStock = item.quantity >= stock;
  const unavailable = !item.product.isActive || stock <= 0;
  const lowStock = stock > 0 && stock <= 5;
  // Cart API may or may not include the category; read it defensively so the
  // eyebrow shows when present without requiring a backend change.
  const category =
    (item.product as { category?: { name?: string } | null }).category?.name ??
    null;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="overflow-hidden"
    >
      <div className="group mb-4 flex gap-4 rounded-xl border border-border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md sm:p-5">
        {/* Image */}
        <Link
          href={`/products/${item.product.slug}`}
          className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted transition-transform duration-300 group-hover:scale-[1.02] sm:size-24"
        >
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={img}
              alt={item.product.name}
              loading="lazy"
              decoding="async"
              className="size-full object-cover"
            />
          ) : (
            <ShoppingBag className="size-6 text-muted-foreground" />
          )}
        </Link>

        {/* Details */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              {category && (
                <p className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {category}
                </p>
              )}
              <Link
                href={`/products/${item.product.slug}`}
                className="line-clamp-2 text-sm font-semibold text-foreground transition-colors hover:text-primary sm:text-base"
              >
                {item.product.name}
              </Link>
            </div>

            {/* Remove — subtle, reddens on hover */}
            <button
              type="button"
              aria-label="Remove item"
              disabled={busy}
              onClick={() => onRemove(item)}
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-all duration-200 hover:bg-rose-500/10 hover:text-rose-600 disabled:pointer-events-none disabled:opacity-40 dark:hover:text-rose-400"
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
            </button>
          </div>

          {/* Stock cues */}
          {unavailable ? (
            <p className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
              No longer available — remove to checkout
            </p>
          ) : atStock ? (
            <p className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-400">
              Max available — only {stock} in stock
            </p>
          ) : lowStock ? (
            <p className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-400">
              Only {stock} left
            </p>
          ) : null}

          {/* Bottom row: stepper + line total */}
          <div className="mt-auto flex items-end justify-between gap-2 pt-3">
            {/* Quantity stepper — clean pill group */}
            <div className="flex items-center rounded-lg border border-border bg-background">
              <button
                type="button"
                aria-label="Decrease quantity"
                disabled={busy || item.quantity <= 1}
                onClick={() => onSetQuantity(item, item.quantity - 1)}
                className="flex size-8 items-center justify-center rounded-l-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
              >
                <Minus className="size-4" />
              </button>
              <input
                type="text"
                inputMode="numeric"
                aria-label="Quantity"
                value={item.quantity}
                disabled={busy}
                onChange={(e) => {
                  const next = parseInt(e.target.value, 10);
                  if (!Number.isNaN(next)) onSetQuantity(item, next);
                }}
                className="w-9 bg-transparent text-center text-sm font-medium tabular-nums outline-none disabled:opacity-50"
              />
              <button
                type="button"
                aria-label="Increase quantity"
                disabled={busy || atStock}
                onClick={() => onSetQuantity(item, item.quantity + 1)}
                className="flex size-8 items-center justify-center rounded-r-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
              >
                <Plus className="size-4" />
              </button>
            </div>

            {/* Line total + unit price */}
            <div className="text-right">
              <p className="text-[11px] text-muted-foreground">
                {inr(unitPrice)} each
              </p>
              <p
                className={cn(
                  "text-base font-semibold tabular-nums text-foreground",
                  unavailable && "opacity-50"
                )}
              >
                {inr(unitPrice * item.quantity)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.li>
  );
}
