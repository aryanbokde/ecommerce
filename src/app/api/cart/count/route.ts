import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/with-error-handler";
import { requireUser } from "@/lib/api-auth";
import { syncCartCount } from "@/server/services/cart.service";

// GET /api/cart/count — total item count for the header cart badge.
export const GET = withErrorHandler(async () => {
  const session = await requireUser();
  const result = await syncCartCount(session.user.id);
  return NextResponse.json({
    success: true,
    message: "Cart count fetched",
    data: result,
  });
});
