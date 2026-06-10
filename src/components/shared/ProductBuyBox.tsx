"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, ShoppingCart, Loader2, Heart, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/useCart";
import { cn } from "@/lib/utils";
import { notifySuccess } from "@/lib/notify";

const WISHLIST_KEY = "wishlist";

interface ProductBuyBoxProps {
  productId: string;
  productName: string;
  productSlug: string;
  price: string | number;
  image: string | null;
  stock: number;
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

export function ProductBuyBox({
  productId,
  productName,
  productSlug,
  price,
  image,
  stock,
}: ProductBuyBoxProps) {
  const router = useRouter();
  const openCart = useCart((s) => s.openCart);
  const addItem = useCart((s) => s.addItem);

  const outOfStock = stock <= 0;
  const maxQty = Math.min(stock, 10);
  const [qty, setQty] = useState(1);
  const [pending, setPending] = useState<null | "add" | "buy">(null);
  const [wished, setWished] = useState(false);

  // Hydrate wishlist state in a microtask (avoids SSR/CSR mismatch).
  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) setWished(readWishlist().includes(productId));
    });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  function toggleWishlist() {
    setWished((prev) => {
      const next = !prev;
      const set = new Set(readWishlist());
      if (next) set.add(productId);
      else set.delete(productId);
      try {
        localStorage.setItem(WISHLIST_KEY, JSON.stringify([...set]));
      } catch {
        /* ignore quota errors */
      }
      return next;
    });
  }

  // Works logged-in (DB cart) or logged-out (guest cart) — no login redirect.
  function postAdd(quantity: number): Promise<boolean> {
    return addItem(
      { productId, name: productName, slug: productSlug, price, image, stock },
      quantity
    );
  }

  async function onAdd() {
    setPending("add");
    try {
      if (await postAdd(qty)) {
        openCart();
        notifySuccess("Added to cart", productName);
      }
    } finally {
      setPending(null);
    }
  }

  async function onBuyNow() {
    setPending("buy");
    try {
      if (await postAdd(qty)) router.push("/checkout");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Quantity */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-foreground">Quantity</span>
        <div className="inline-flex items-center rounded-lg border border-border bg-card">
          <button
            type="button"
            aria-label="Decrease quantity"
            disabled={outOfStock || qty <= 1}
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="flex size-10 items-center justify-center rounded-l-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
          >
            <Minus className="size-4" />
          </button>
          <span className="w-10 text-center text-sm font-semibold tabular-nums">
            {qty}
          </span>
          <button
            type="button"
            aria-label="Increase quantity"
            disabled={outOfStock || qty >= maxQty}
            onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
            className="flex size-10 items-center justify-center rounded-r-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
          >
            <Plus className="size-4" />
          </button>
        </div>
        {!outOfStock && maxQty < 10 && (
          <span className="text-xs text-muted-foreground">
            Max {maxQty} per order
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2.5">
        <Button
          size="lg"
          className="flex-1"
          disabled={outOfStock || pending !== null}
          onClick={onAdd}
        >
          {pending === "add" ? (
            <Loader2 className="animate-spin" />
          ) : (
            <ShoppingCart />
          )}
          {outOfStock ? "Out of stock" : "Add to Cart"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
          aria-pressed={wished}
          onClick={toggleWishlist}
        >
          <Heart className={cn("size-5", wished && "fill-red-500 text-red-500")} />
        </Button>
      </div>

      <Button
        size="lg"
        variant="secondary"
        className="w-full"
        disabled={outOfStock || pending !== null}
        onClick={onBuyNow}
      >
        {pending === "buy" ? <Loader2 className="animate-spin" /> : <Zap />}
        Buy Now
      </Button>
    </div>
  );
}
