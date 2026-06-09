import { type NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/with-error-handler";
import { requireUser, parseJsonBody } from "@/lib/api-auth";
import {
  updateCartItem,
  removeFromCart,
} from "@/server/services/cart.service";
import { updateCartItemSchema } from "@/server/validators/cart.schema";

type RouteCtx = { params: Promise<{ itemId: string }> };

// PATCH /api/cart/items/[itemId] — set quantity (0 removes the item).
export const PATCH = withErrorHandler(
  async (req: NextRequest, { params }: RouteCtx) => {
    const session = await requireUser();
    const { itemId } = await params;
    const { quantity } = await parseJsonBody(req, updateCartItemSchema);

    const cart = await updateCartItem(session.user.id, itemId, quantity);

    return NextResponse.json({
      success: true,
      message: "Cart item updated",
      data: cart,
    });
  }
);

// DELETE /api/cart/items/[itemId] — remove a single item.
export const DELETE = withErrorHandler(
  async (_req: NextRequest, { params }: RouteCtx) => {
    const session = await requireUser();
    const { itemId } = await params;

    const cart = await removeFromCart(session.user.id, itemId);

    return NextResponse.json({
      success: true,
      message: "Item removed from cart",
      data: cart,
    });
  }
);
