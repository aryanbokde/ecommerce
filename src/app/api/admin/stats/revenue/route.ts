import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandler } from "@/lib/with-error-handler";
import { requireAdmin, parseQuery } from "@/lib/api-auth";
import { getRevenueSeries } from "@/server/services/admin-stats.service";

const querySchema = z.object({
  period: z.enum(["7d", "30d", "90d", "1y"]).default("30d"),
});

// GET /api/admin/stats/revenue?period=30d — daily revenue series for charts.
export const GET = withErrorHandler(async (req: NextRequest) => {
  await requireAdmin();

  const { period } = parseQuery(req.nextUrl.searchParams, querySchema);
  const data = await getRevenueSeries(period);

  return NextResponse.json({
    success: true,
    message: "Revenue series fetched",
    data,
  });
});
