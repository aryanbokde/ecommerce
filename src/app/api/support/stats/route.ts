import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/with-error-handler";
import { requireRoles } from "@/lib/api-auth";
import { ROLES } from "@/constants/roles";
import { getSupportStats } from "@/server/services/support-stats.service";

const SUPPORT = [ROLES.SUPPORT, ROLES.ADMIN];

// GET /api/support/stats — triage figures for the support dashboard.
// Returns { ordersToday, openIssuesEstimate (orders awaiting fulfilment),
// recentOrders } — used for client-side refreshes; the page itself reads the
// service directly.
export const GET = withErrorHandler(async () => {
  await requireRoles(SUPPORT);

  const { ordersToday, awaitingFulfillment, shippedToday, recentOrders } =
    await getSupportStats();

  return NextResponse.json({
    success: true,
    message: "Support stats fetched",
    data: {
      ordersToday,
      openIssuesEstimate: awaitingFulfillment,
      shippedToday,
      recentOrders,
    },
  });
});
