import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/with-error-handler";
import { getFeaturedProducts } from "@/server/services/product.service";

// GET /api/products/featured — public, homepage featured items (max 8).
export const GET = withErrorHandler(async () => {
  const products = await getFeaturedProducts(8);
  return NextResponse.json({
    success: true,
    message: "Featured products fetched",
    data: products,
  });
});
