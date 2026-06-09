import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/with-error-handler";
import { requireAdmin } from "@/lib/api-auth";
import { getOrderStats } from "@/server/services/order.service";

// GET /api/orders/stats — admin only dashboard counts + revenue windows.
export const GET = withErrorHandler(async () => {
  await requireAdmin();
  const stats = await getOrderStats();
  return NextResponse.json({
    success: true,
    message: "Order stats fetched",
    data: stats,
  });
});
