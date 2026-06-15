// Client-side tax PREVIEW for the cart + checkout. Mirrors the server's per-line
// math (round2(lineTotal × rate/100), summed) using each item's effective
// `taxRate` from GET /api/cart. The server remains authoritative at order time;
// this only needs to match what the order will persist.

export const DEFAULT_TAX_RATE = 18; // guest-cart fallback (no server-resolved rate)

interface PreviewItem {
  quantity: number;
  product: { price: string | number; taxRate?: string | number | null };
}

/** Effective percent for a line: server-resolved value, else the guest default. */
function rateOf(product: PreviewItem["product"]): number {
  const r = product.taxRate;
  if (r === null || r === undefined || r === "") return DEFAULT_TAX_RATE;
  const n = Number(r);
  return Number.isFinite(n) ? n : DEFAULT_TAX_RATE;
}

/** Total preview tax = Σ round2(lineTotal × rate / 100). */
export function previewTax(items: PreviewItem[]): number {
  let tax = 0;
  for (const it of items) {
    const lineTotal = Number(it.product.price) * it.quantity;
    const rate = rateOf(it.product);
    tax += Math.round(lineTotal * rate) / 100; // round2 per line, like the server
  }
  return tax;
}
