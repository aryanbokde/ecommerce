"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, ShoppingCart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/useCart";
import { notifySuccess } from "@/lib/notify";

interface ProductBuyBoxProps {
  productId: string;
  productName: string;
  productSlug: string;
  price: string | number;
  image: string | null;
  stock: number;
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

  // Works logged-in (DB cart) or logged-out (guest cart) — no login redirect.
  // Buy Now pushes to /checkout; proxy.ts redirects guests to login there.
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
        <div className="flex items-center rounded-md border border-border">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Decrease quantity"
            disabled={outOfStock || qty <= 1}
            onClick={() => setQty((q) => Math.max(1, q - 1))}
          >
            <Minus />
          </Button>
          <span className="w-10 text-center text-sm tabular-nums">{qty}</span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Increase quantity"
            disabled={outOfStock || qty >= maxQty}
            onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
          >
            <Plus />
          </Button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          size="lg"
          className="flex-1"
          disabled={outOfStock || pending !== null}
          onClick={onAdd}
        >
          {pending === "add" ? <Loader2 className="animate-spin" /> : <ShoppingCart />}
          Add to Cart
        </Button>
        <Button
          size="lg"
          variant="secondary"
          className="flex-1"
          disabled={outOfStock || pending !== null}
          onClick={onBuyNow}
        >
          {pending === "buy" ? <Loader2 className="animate-spin" /> : null}
          Buy Now
        </Button>
      </div>
    </div>
  );
}
