"use client";

import { create } from "zustand";
import { guestCart, type GuestCartItem } from "@/lib/guest-cart";
import { notifyError } from "@/lib/notify";

// Shape returned by GET /api/cart → data. Decimal `price` is serialized as a
// string over the wire, so we coerce with Number() when summing.
export interface CartProduct {
  id: string;
  name: string;
  slug: string;
  price: string | number;
  images: unknown;
  stock: number;
  isActive: boolean;
}

export interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  product: CartProduct;
}

/** Minimal product info needed to add an item (works for guest + server). */
export interface AddToCartSnapshot {
  productId: string;
  name: string;
  slug: string;
  price: string | number;
  image: string | null;
  stock: number;
}

interface CartState {
  items: CartItem[];
  total: number; // subtotal from current prices
  count: number; // sum of quantities
  isLoading: boolean;
  isOpen: boolean;
  /** True when the cart is the local (logged-out) guest cart. */
  isGuest: boolean;
  openCart: () => void;
  closeCart: () => void;
  refreshCart: () => Promise<void>;
  addItem: (snapshot: AddToCartSnapshot, quantity: number) => Promise<boolean>;
  setQuantity: (item: CartItem, quantity: number) => Promise<void>;
  removeItem: (item: CartItem) => Promise<void>;
  clearCart: () => Promise<void>;
  /** After login: push guest items into the DB cart, then clear local. */
  mergeGuestIntoServer: () => Promise<void>;
}

function summarize(items: CartItem[]) {
  let total = 0;
  let count = 0;
  for (const item of items) {
    total += Number(item.product.price) * item.quantity;
    count += item.quantity;
  }
  return { total, count };
}

// Guest items use productId as the synthetic CartItem id so the drawer/cart UI
// (keyed by item.id) works identically for both carts.
function guestToCartItem(g: GuestCartItem): CartItem {
  return {
    id: g.productId,
    productId: g.productId,
    quantity: g.quantity,
    product: {
      id: g.productId,
      name: g.name,
      slug: g.slug,
      price: g.price,
      images: g.image ? [g.image] : [],
      stock: g.stock,
      isActive: true,
    },
  };
}

/**
 * Single source of truth for the cart, shared between the header badge and the
 * CartDrawer. Mutations branch on auth: logged-in → DB via /api/cart; logged-out
 * → localStorage guest cart. Every mutation ends with refreshCart() so the badge
 * and drawer stay in sync.
 */
export const useCart = create<CartState>((set, get) => ({
  items: [],
  total: 0,
  count: 0,
  isLoading: false,
  isOpen: false,
  isGuest: false,

  openCart: () => {
    set({ isOpen: true });
    void get().refreshCart();
  },

  closeCart: () => set({ isOpen: false }),

  refreshCart: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch("/api/cart", { credentials: "include" });
      if (res.status === 401) {
        // Logged out → render the local guest cart.
        const items = guestCart.items().map(guestToCartItem);
        set({ items, ...summarize(items), isGuest: true, isLoading: false });
        return;
      }
      if (!res.ok) {
        set({ items: [], total: 0, count: 0, isGuest: false, isLoading: false });
        return;
      }
      const json = await res.json();
      const items: CartItem[] = json?.data?.items ?? [];
      set({ items, ...summarize(items), isGuest: false, isLoading: false });
    } catch {
      // Network error → fall back to the guest cart so the UI still works.
      const items = guestCart.items().map(guestToCartItem);
      set({ items, ...summarize(items), isGuest: true, isLoading: false });
    }
  },

  addItem: async (snapshot, quantity) => {
    const res = await fetch("/api/cart/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ productId: snapshot.productId, quantity }),
    }).catch(() => null);

    // Logged out (401) or unreachable → add to the guest cart instead of
    // forcing a login. Login is only required at checkout.
    if (!res || res.status === 401) {
      guestCart.add(
        {
          productId: snapshot.productId,
          name: snapshot.name,
          slug: snapshot.slug,
          price: String(snapshot.price),
          image: snapshot.image,
          stock: snapshot.stock,
        },
        quantity
      );
      await get().refreshCart();
      return true;
    }
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      notifyError("Couldn't add to cart", json?.error);
      return false;
    }
    await get().refreshCart();
    return true;
  },

  setQuantity: async (item, quantity) => {
    if (get().isGuest) {
      guestCart.setQuantity(item.productId, quantity);
      await get().refreshCart();
      return;
    }
    if (quantity <= 0) {
      await fetch(`/api/cart/items/${item.id}`, {
        method: "DELETE",
        credentials: "include",
      });
    } else {
      await fetch(`/api/cart/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ quantity }),
      });
    }
    await get().refreshCart();
  },

  removeItem: async (item) => {
    if (get().isGuest) {
      guestCart.remove(item.productId);
      await get().refreshCart();
      return;
    }
    await fetch(`/api/cart/items/${item.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    await get().refreshCart();
  },

  clearCart: async () => {
    if (get().isGuest) {
      guestCart.clear();
      await get().refreshCart();
      return;
    }
    await fetch("/api/cart", { method: "DELETE", credentials: "include" });
    await get().refreshCart();
  },

  mergeGuestIntoServer: async () => {
    const items = guestCart.items();
    if (items.length === 0) return;
    // POST sequentially-safe in parallel; server upserts per product.
    await Promise.all(
      items.map((g) =>
        fetch("/api/cart/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ productId: g.productId, quantity: g.quantity }),
        }).catch(() => null)
      )
    );
    guestCart.clear();
    await get().refreshCart();
  },
}));
