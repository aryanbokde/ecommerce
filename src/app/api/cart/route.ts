import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/with-error-handler";
import { requireUser } from "@/lib/api-auth";
import { getCart, clearCart } from "@/server/services/cart.service";

// GET /api/cart — current user's cart with items + product details.
export const GET = withErrorHandler(async () => {
  const session = await requireUser();
  const cart = await getCart(session.user.id);
  return NextResponse.json({
    success: true,
    message: "Cart fetched",
    data: cart,
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
