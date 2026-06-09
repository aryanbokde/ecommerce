import { type NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/with-error-handler";
import { requireRoles, parseQuery, parseJsonBody } from "@/lib/api-auth";
import { ROLES } from "@/constants/roles";
import { logAudit } from "@/server/services/audit-log.service";
import {
  getProducts,
  createProduct,
} from "@/server/services/product.service";
import {
  productQuerySchema,
  createProductSchema,
} from "@/server/validators/product.schema";

// GET /api/products — public, paginated/filtered/searchable list.
export const GET = withErrorHandler(async (req: NextRequest) => {
  const filters = parseQuery(req.nextUrl.searchParams, productQuerySchema);
  const result = await getProducts(filters);

  return NextResponse.json({
    success: true,
    message: "Products fetched",
    data: result,
  });
});

// POST /api/products — admin or shop_manager only.
export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await requireRoles([ROLES.ADMIN, ROLES.SHOP_MANAGER]);
  const data = await parseJsonBody(req, createProductSchema);

  const product = await createProduct(data);

  await logAudit({
    userId: session.user.id,
    action: "product_created",
    ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
    userAgent: req.headers.get("user-agent") ?? undefined,
    metadata: { productId: product.id, slug: product.slug, name: product.name },
  });

  return NextResponse.json(
    { success: true, message: "Product created", data: product },
    { status: 201 }
  );
});
