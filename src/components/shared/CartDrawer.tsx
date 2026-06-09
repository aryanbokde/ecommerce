"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Minus, Trash2, ShoppingBag } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useCart, type CartItem } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";

function firstImage(images: unknown): string | null {
  if (Array.isArray(images) && typeof images[0] === "string") return images[0];
  return null;
}

function formatPrice(value: string | number): string {
  return `$${Number(value).toFixed(2)}`;
}

export function CartDrawer() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const {
    items,
    total,
    isLoading,
    isOpen,
    closeCart,
    refreshCart,
    setQuantity: storeSetQuantity,
    removeItem: storeRemoveItem,
  } = useCart();
  const [busyId, setBusyId] = useState<string | null>(null);

  // Populate the store once on mount so the header badge has a count even
  // before the drawer is opened. (openCart() also refreshes when opened.)
  useEffect(() => {
    void refreshCart();
  }, [refreshCart]);

  async function setQuantity(item: CartItem, quantity: number) {
    setBusyId(item.id);
    try {
      await storeSetQuantity(item, quantity);
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

  function onCheckout() {
    closeCart();
    router.push(
      isAuthenticated ? "/checkout" : "/login?redirect=/checkout"
    );
  }

  const isEmpty = !isLoading && items.length === 0;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && closeCart()}>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
        <SheetHeader className="border-b border-border">
          <SheetTitle>Your Cart</SheetTitle>
        </SheetHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex flex-col gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="size-16 rounded-md" />
                  <div className="flex-1 space-y-2 py-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/4" />
                    <Skeleton className="h-7 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : isEmpty ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 py-16 text-center">
              <ShoppingBag className="size-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Your cart is empty
              </p>
              <Button
                render={<Link href="/shop" />}
                nativeButton={false}
                onClick={closeCart}
              >
                Start Shopping
              </Button>
            </div>
          ) : (
            <ul className="flex flex-col gap-4">
              {items.map((item) => {
                const img = firstImage(item.product.images);
                const busy = busyId === item.id;
                const atStock = item.quantity >= item.product.stock;
                return (
                  <li key={item.id} className="flex gap-3">
                    <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img} alt="" className="size-full object-cover" />
                      ) : (
                        <ShoppingBag className="size-5 text-muted-foreground" />
                      )}
                    </span>

                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/products/${item.product.slug}`}
                        onClick={closeCart}
                        className="block truncate text-sm font-medium text-foreground hover:underline"
                      >
                        {item.product.name}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatPrice(item.product.price)}
                      </p>

                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex items-center rounded-md border border-border">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Decrease quantity"
                            disabled={busy}
                            onClick={() => setQuantity(item, item.quantity - 1)}
                          >
                            <Minus />
                          </Button>
                          <span className="w-8 text-center text-sm tabular-nums">
                            {item.quantity}
                          </span>
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

                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Remove item"
                          disabled={busy}
                          onClick={() => removeItem(item)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </div>

                    <span className="text-sm font-medium text-foreground tabular-nums">
                      {formatPrice(Number(item.product.price) * item.quantity)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer summary — only when there are items */}
        {!isEmpty && (
          <SheetFooter className="border-t border-border">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-semibold text-foreground tabular-nums">
                {formatPrice(total)}
              </span>
            </div>
            <Separator className="my-1" />
            <div className="flex flex-col gap-2">
              <Button
                render={<Link href="/cart" />}
                nativeButton={false}
                variant="outline"
                onClick={closeCart}
              >
                View Cart
              </Button>
              <Button onClick={onCheckout}>Checkout</Button>
            </div>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
