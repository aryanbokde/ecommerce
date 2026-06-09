import { type NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/with-error-handler";
import { requireUser, parseJsonBody } from "@/lib/api-auth";
import { addToCart } from "@/server/services/cart.service";
import { addToCartSchema } from "@/server/validators/cart.schema";

// POST /api/cart/items — add a product to the cart (or increment it).
export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await requireUser();
  const { productId, quantity } = await parseJsonBody(req, addToCartSchema);

  const cart = await addToCart(session.user.id, productId, quantity);

  return NextResponse.json(
    { success: true, message: "Item added to cart", data: cart },
    { status: 201 }
  );
});
