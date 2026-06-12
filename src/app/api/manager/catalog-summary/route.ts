import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/with-error-handler";
import { requireRoles } from "@/lib/api-auth";
import { ROLES } from "@/constants/roles";
import { getCatalogSummary } from "@/server/services/product.service";

const MANAGER = [ROLES.SHOP_MANAGER, ROLES.ADMIN];

// GET /api/manager/catalog-summary — catalog rollup (total/active/inactive/low/out)
// for the manager products page header. Manager-scoped: it exposes the inactive
// count, which the public /api/products list never reveals.
export const GET = withErrorHandler(async () => {
  await requireRoles(MANAGER);
  const summary = await getCatalogSummary();
  return NextResponse.json({
    success: true,
    message: "Catalog summary fetched",
    data: summary,
  });
});
