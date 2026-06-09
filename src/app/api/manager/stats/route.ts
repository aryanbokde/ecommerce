import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/with-error-handler";
import { requireRoles } from "@/lib/api-auth";
import { ROLES } from "@/constants/roles";
import { getManagerStats } from "@/server/services/manager-stats.service";

// GET /api/manager/stats — shop-manager operations snapshot (sidebar badges +
// dashboard). Admins are allowed too so they can preview the manager view.
export const GET = withErrorHandler(async () => {
  await requireRoles([ROLES.SHOP_MANAGER, ROLES.ADMIN]);
  const data = await getManagerStats();

  return NextResponse.json({
    success: true,
    message: "Manager stats fetched",
    data,
  });
});
