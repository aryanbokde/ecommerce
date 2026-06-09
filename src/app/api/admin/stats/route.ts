import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/with-error-handler";
import { requireAdmin } from "@/lib/api-auth";
import { getAdminStats } from "@/server/services/admin-stats.service";

// GET /api/admin/stats — full admin dashboard snapshot.
export const GET = withErrorHandler(async () => {
  await requireAdmin();
  const data = await getAdminStats();

  return NextResponse.json({
    success: true,
    message: "Admin stats fetched",
    data,
  });
});
