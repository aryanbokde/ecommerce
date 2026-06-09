import { type NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/with-error-handler";
import { getBestSellers } from "@/server/services/product.service";

// GET /api/products/best-sellers — public. Top products by quantity sold.
// Query: ?limit (default 10, max 50). Each product carries a `soldCount`.
export const GET = withErrorHandler(async (req: NextRequest) => {
  const raw = parseInt(req.nextUrl.searchParams.get("limit") ?? "10", 10);
  const limit = Math.min(50, Math.max(1, Number.isNaN(raw) ? 10 : raw));

  const products = await getBestSellers(limit);

  return NextResponse.json({
    success: true,
    message: "Best sellers fetched",
    data: products,
  });
});
