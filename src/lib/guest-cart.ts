"use client";

// ── Guest cart (logged-out shoppers) ─────────────────────────────────────────
// Cart for users who are NOT signed in. Persisted in localStorage with a small
// product snapshot (name/price/image/stock) so the drawer + totals render
// without a server round-trip. On login, useCart.mergeGuestIntoServer() POSTs
// these into the real DB cart and clears this store. Checkout still requires a
// session (enforced in proxy.ts), so guest items always merge before purchase.

export interface GuestCartItem {
  productId: string;
  quantity: number;
  // Snapshot for display only — revalidated server-side on merge/checkout.
  name: string;
  slug: string;
  price: string;
  image: string | null;
  stock: number;
}

const KEY = "guest_cart_v1";
/** Same-tab change signal (storage event only fires cross-tab). */
export const GUEST_CART_EVENT = "guestcart:change";

function read(): GuestCartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(items: GuestCartItem[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(GUEST_CART_EVENT));
}

const clampQty = (qty: number, stock: number) =>
  Math.max(1, Math.min(qty, stock > 0 ? stock : qty));

export const guestCart = {
  items: read,

  add(snapshot: Omit<GuestCartItem, "quantity">, quantity: number): void {
    const items = read();
    const existing = items.find((i) => i.productId === snapshot.productId);
    if (existing) {
      existing.quantity = clampQty(existing.quantity + quantity, snapshot.stock);
      // Refresh the snapshot in case price/stock changed since last add.
      Object.assign(existing, snapshot, { quantity: existing.quantity });
    } else {
      items.push({ ...snapshot, quantity: clampQty(quantity, snapshot.stock) });
    }
    write(items);
  },

  setQuantity(productId: string, quantity: number): void {
    let items = read();
    if (quantity <= 0) {
      items = items.filter((i) => i.productId !== productId);
    } else {
      const it = items.find((i) => i.productId === productId);
      if (it) it.quantity = clampQty(quantity, it.stock);
    }
    write(items);
  },

  remove(productId: string): void {
    write(read().filter((i) => i.productId !== productId));
  },

  clear(): void {
    write([]);
  },
};
