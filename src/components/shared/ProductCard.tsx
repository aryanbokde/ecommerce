"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, Star, ShoppingCart, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { notifySuccess, notifyError } from "@/lib/notify";
import { useCart } from "@/hooks/useCart";
import type { Product } from "@/types";

const WISHLIST_KEY = "wishlist";
const NEW_WINDOW_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

export function formatPrice(value: string | number): string {
  return `₹${Number(value).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function readWishlist(): string[] {
  try {
    const raw = localStorage.getItem(WISHLIST_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export type ProductCardVariant = "default" | "compact" | "horizontal" | "featured";

interface ProductCardProps {
  product: Product;
  variant?: ProductCardVariant;
  /** Rank badge for the "compact" best-seller variant. */
  rank?: number;
  /** Eager-load the image (above-the-fold). Defaults to lazy. */
  priority?: boolean;
  className?: string;
}

// ── Shared presentational bits ────────────────────────────────────────────────

function Badges({
  onSale,
  isNew,
}: {
  onSale: boolean;
  isNew: boolean;
}) {
  if (!onSale && !isNew) return null;
  return (
    <div className="pointer-events-none absolute left-2 top-2 z-10 flex flex-col gap-1">
      {onSale && (
        <span className="rounded-md bg-highlight px-1.5 py-0.5 text-[10px] font-semibold text-brand-navy shadow-sm">
          Sale
        </span>
      )}
      {isNew && !onSale && (
        <span className="rounded-md bg-brand-blue px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm">
          New
        </span>
      )}
    </div>
  );
}

function WishlistButton({
  wished,
  onClick,
  className,
}: {
  wished: boolean;
  onClick: (e: React.MouseEvent) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
      aria-pressed={wished}
      className={cn(
        "absolute right-2 top-2 z-10 flex size-8 items-center justify-center rounded-full bg-background/80 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-background",
        className
      )}
    >
      <Heart className={cn("size-4", wished && "fill-red-500 text-red-500")} />
    </button>
  );
}

function Stars({
  rating,
  reviewCount,
}: {
  rating: number;
  reviewCount: number;
}) {
  if (reviewCount <= 0) return null;
  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={cn(
              "size-3.5",
              i < Math.round(rating)
                ? "fill-highlight text-highlight"
                : "text-muted-foreground/40"
            )}
          />
        ))}
      </div>
      <span className="text-xs text-muted-foreground">({reviewCount})</span>
    </div>
  );
}

function PriceRow({
  price,
  compare,
  onSale,
  savings,
  className,
  light,
}: {
  price: number;
  compare: number | null;
  onSale: boolean;
  savings: number;
  className?: string;
  light?: boolean;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span
        className={cn(
          "text-sm font-semibold",
          light ? "text-white" : "text-foreground"
        )}
      >
        {formatPrice(price)}
      </span>
      {onSale && compare != null && (
        <>
          <span
            className={cn(
              "text-xs line-through",
              light ? "text-white/70" : "text-muted-foreground"
            )}
          >
            {formatPrice(compare)}
          </span>
          <span
            className={cn(
              "text-xs font-semibold",
              light ? "text-[#ffd9a3]" : "text-primary"
            )}
          >
            {savings}% off
          </span>
        </>
      )}
    </div>
  );
}

function SoldOutOverlay() {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/40">
      <span className="rounded-md bg-background/90 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-foreground shadow-sm">
        Sold out
      </span>
    </div>
  );
}

function Thumb({
  src,
  alt,
  sizes,
  priority,
  outOfStock,
  className,
}: {
  src: string | null;
  alt: string;
  sizes: string;
  priority?: boolean;
  outOfStock: boolean;
  className?: string;
}) {
  if (!src) {
    return (
      <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
        No image
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      unoptimized
      priority={priority}
      sizes={sizes}
      className={cn(
        "object-cover transition-transform duration-300",
        outOfStock && "grayscale",
        className
      )}
    />
  );
}

// ── ProductCard ───────────────────────────────────────────────────────────────

export function ProductCard({
  product,
  variant = "default",
  rank,
  priority = false,
  className,
}: ProductCardProps) {
  const openCart = useCart((s) => s.openCart);
  const addItem = useCart((s) => s.addItem);

  const [wished, setWished] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [adding, setAdding] = useState(false);

  // Hydrate client-only derived state (wishlist + "new" age) in a microtask, so
  // it isn't a synchronous setState in the effect body and Date.now() never runs
  // during render (avoids SSR/CSR mismatch + the react-hooks/purity rule).
  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setWished(readWishlist().includes(product.id));
      setIsNew(
        !!product.createdAt &&
          Date.now() - new Date(product.createdAt).getTime() < NEW_WINDOW_MS
      );
    });
    return () => {
      cancelled = true;
    };
  }, [product.id, product.createdAt]);

  const image = product.images?.[0] ?? null;
  const price = Number(product.price);
  const compare = product.comparePrice != null ? Number(product.comparePrice) : null;
  const onSale = compare != null && compare > price;
  const savings = onSale ? Math.round((1 - price / compare) * 100) : 0;
  const rating = product.avgRating ?? 0;
  const reviewCount = product.reviewCount ?? 0;
  const outOfStock = (product.stock ?? 0) <= 0;
  const categoryName = product.category?.name ?? null;
  const href = `/products/${product.slug}`;

  function toggleWishlist(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setWished((prev) => {
      const next = !prev;
      const set = new Set(readWishlist());
      if (next) set.add(product.id);
      else set.delete(product.id);
      try {
        localStorage.setItem(WISHLIST_KEY, JSON.stringify([...set]));
      } catch {
        /* ignore quota/availability errors */
      }
      return next;
    });
  }

  async function addToCart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock) return;
    setAdding(true);
    try {
      // Works logged-in (DB cart) or logged-out (guest cart) — no login redirect.
      const ok = await addItem(
        {
          productId: product.id,
          name: product.name,
          slug: product.slug,
          price: product.price,
          image: Array.isArray(product.images)
            ? (product.images[0] ?? null)
            : null,
          stock: product.stock,
        },
        1
      );
      if (ok) {
        openCart();
        notifySuccess("Added to cart", product.name);
      }
    } catch {
      notifyError("Couldn't add to cart", "Please try again.");
    } finally {
      setAdding(false);
    }
  }

  const StretchedLink = (
    <Link href={href} aria-label={product.name} className="absolute inset-0" />
  );

  // ── COMPACT ────────────────────────────────────────────────────────────────
  if (variant === "compact") {
    return (
      <article
        className={cn(
          "group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-all duration-300 hover:shadow-md",
          className
        )}
      >
        <div className="relative aspect-square overflow-hidden bg-muted">
          <Thumb
            src={image}
            alt={product.name}
            sizes="(max-width: 640px) 33vw, 16vw"
            priority={priority}
            outOfStock={outOfStock}
            className="group-hover:scale-105"
          />
          {typeof rank === "number" && (
            <span className="absolute left-1.5 top-1.5 z-10 flex size-6 items-center justify-center rounded-full bg-foreground/85 text-[11px] font-bold text-background shadow-sm">
              {rank}
            </span>
          )}
          {!onSale && isNew && (
            <span className="absolute right-1.5 top-1.5 z-10 rounded bg-brand-blue px-1 py-0.5 text-[9px] font-semibold text-white">
              New
            </span>
          )}
          {outOfStock && <SoldOutOverlay />}
        </div>
        <div className="flex flex-1 flex-col gap-1 p-2.5">
          <h3 className="line-clamp-1 text-[0.8rem] font-medium text-foreground">
            {product.name}
          </h3>
          <PriceRow
            price={price}
            compare={compare}
            onSale={onSale}
            savings={savings}
            className="mt-auto"
          />
        </div>
        {StretchedLink}
      </article>
    );
  }

  // ── HORIZONTAL ───────────────────────────────────────────────────────────────
  if (variant === "horizontal") {
    return (
      <article
        className={cn(
          "group relative flex gap-3 rounded-xl border border-border bg-card p-2.5 shadow-sm transition-all duration-300 hover:shadow-md",
          className
        )}
      >
        <div className="relative size-24 shrink-0 overflow-hidden rounded-lg bg-muted">
          <Thumb
            src={image}
            alt={product.name}
            sizes="96px"
            priority={priority}
            outOfStock={outOfStock}
          />
          <Badges onSale={onSale} isNew={isNew} />
          {outOfStock && <SoldOutOverlay />}
        </div>

        <div className="flex min-w-0 flex-1 flex-col py-0.5">
          {categoryName && (
            <p className="mb-0.5 truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {categoryName}
            </p>
          )}
          <h3 className="line-clamp-2 text-sm font-medium text-foreground">
            {product.name}
          </h3>
          <PriceRow
            price={price}
            compare={compare}
            onSale={onSale}
            savings={savings}
            className="mt-1"
          />
          <div className="mt-auto flex items-center justify-between gap-2 pt-2">
            <Stars rating={rating} reviewCount={reviewCount} />
            <Button
              type="button"
              size="sm"
              variant={outOfStock ? "secondary" : "default"}
              className="relative z-10 ml-auto"
              disabled={adding || outOfStock}
              onClick={addToCart}
            >
              {adding ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Plus />
              )}
              {outOfStock ? "Sold out" : "Add"}
            </Button>
          </div>
        </div>
        {StretchedLink}
      </article>
    );
  }

  // ── FEATURED ─────────────────────────────────────────────────────────────────
  if (variant === "featured") {
    return (
      <article
        className={cn(
          "group relative overflow-hidden rounded-2xl shadow-sm transition-all duration-300 hover:shadow-md",
          className
        )}
      >
        <div className="relative aspect-[4/5] w-full overflow-hidden bg-muted sm:aspect-[3/4]">
          <Thumb
            src={image}
            alt={product.name}
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority={priority}
            outOfStock={outOfStock}
            className="group-hover:scale-[1.04]"
          />
          {/* bottom dark gradient for overlaid text */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          <span className="absolute left-3 top-3 z-10 rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground shadow-sm">
            Featured
          </span>
          <WishlistButton
            wished={wished}
            onClick={toggleWishlist}
            className="right-3 top-3"
          />
          {outOfStock && <SoldOutOverlay />}

          {/* overlaid text */}
          <div className="absolute inset-x-0 bottom-0 z-10 p-4 sm:p-5">
            {categoryName && (
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-white/75">
                {categoryName}
              </p>
            )}
            <h3 className="font-heading text-lg font-semibold leading-tight text-white sm:text-xl">
              {product.name}
            </h3>
            <PriceRow
              price={price}
              compare={compare}
              onSale={onSale}
              savings={savings}
              className="mt-1.5"
              light
            />
            <Button
              type="button"
              size="sm"
              className="relative z-10 mt-3"
              disabled={adding || outOfStock}
              onClick={addToCart}
            >
              {adding ? (
                <Loader2 className="animate-spin" />
              ) : outOfStock ? null : (
                <ShoppingCart />
              )}
              {outOfStock ? "Out of stock" : "Shop Now"}
            </Button>
          </div>
        </div>
        {StretchedLink}
      </article>
    );
  }

  // ── DEFAULT (vertical workhorse) ─────────────────────────────────────────────
  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all duration-300 hover:shadow-md",
        className
      )}
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        <Thumb
          src={image}
          alt={product.name}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          priority={priority}
          outOfStock={outOfStock}
          className="group-hover:scale-105"
        />
        <Badges onSale={onSale} isNew={isNew} />
        <WishlistButton wished={wished} onClick={toggleWishlist} />
        {outOfStock && <SoldOutOverlay />}

        {/* Quick add-to-cart bar — slides up on hover (in-stock only) */}
        {!outOfStock && (
          <div className="absolute inset-x-0 bottom-0 z-10 translate-y-full p-2 transition-transform duration-300 group-hover:translate-y-0">
            <Button
              type="button"
              size="sm"
              className="w-full shadow-md"
              disabled={adding}
              onClick={addToCart}
            >
              {adding ? <Loader2 className="animate-spin" /> : <ShoppingCart />}
              Add to Cart
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        {categoryName && (
          <p className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {categoryName}
          </p>
        )}
        <h3 className="line-clamp-2 text-sm font-medium text-foreground">
          {product.name}
        </h3>
        <Stars rating={rating} reviewCount={reviewCount} />
        <PriceRow
          price={price}
          compare={compare}
          onSale={onSale}
          savings={savings}
          className="mt-auto pt-1"
        />
      </div>
      {StretchedLink}
    </article>
  );
}
