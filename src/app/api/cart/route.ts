import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/with-error-handler";
import { requireUser } from "@/lib/api-auth";
import { getCart, clearCart } from "@/server/services/cart.service";
import { loadTaxContext, effectiveRateString } from "@/server/services/tax.service";

// GET /api/cart — current user's cart with items + product details. Each
// product's `taxRate` is replaced with the EFFECTIVE percent (override →
// category chain → default, or 0 when tax is off) so the cart/checkout preview
// matches the server-computed order tax exactly.
export const GET = withErrorHandler(async () => {
  const session = await requireUser();
  const cart = await getCart(session.user.id);
  const ctx = await loadTaxContext();

  const items = cart.items.map((it) => ({
    ...it,
    product: {
      ...it.product,
      taxRate: effectiveRateString(it.product.taxRate, it.product.categoryId, ctx),
    },
  }));

  return NextResponse.json({
    success: true,
    message: "Cart fetched",
    data: { ...cart, items },
  });
});

// DELETE /api/cart — empty the cart.
export const DELETE = withErrorHandler(async () => {
  const session = await requireUser();
  const cart = await clearCart(session.user.id);
  return NextResponse.json({
    success: true,
    message: "Cart cleared",
    data: cart,
  });
});
