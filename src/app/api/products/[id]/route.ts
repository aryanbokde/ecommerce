import { type NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/with-error-handler";
import { AppError, ErrorCode } from "@/lib/api-error";
import { requireRoles, parseJsonBody } from "@/lib/api-auth";
import { ROLES } from "@/constants/roles";
import { logAudit } from "@/server/services/audit-log.service";
import {
  getProductById,
  updateProduct,
  deleteProduct,
} from "@/server/services/product.service";
import { updateProductSchema } from "@/server/validators/product.schema";

type RouteCtx = { params: Promise<{ id: string }> };

// GET /api/products/[id] — public.
export const GET = withErrorHandler(
  async (_req: NextRequest, { params }: RouteCtx) => {
    const { id } = await params;
    const product = await getProductById(id);
    if (!product) {
      throw new AppError("Product not found", ErrorCode.NOT_FOUND, 404);
    }
    return NextResponse.json({
      success: true,
      message: "Product fetched",
      data: product,
    });
  }
);

// PUT /api/products/[id] — admin or shop_manager.
export const PUT = withErrorHandler(
  async (req: NextRequest, { params }: RouteCtx) => {
    const { id } = await params;
    const session = await requireRoles([ROLES.ADMIN, ROLES.SHOP_MANAGER]);
    const data = await parseJsonBody(req, updateProductSchema);

    const product = await updateProduct(id, data);

    await logAudit({
      userId: session.user.id,
      action: "product_updated",
      ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
      metadata: { productId: product.id, fields: Object.keys(data) },
    });

    return NextResponse.json({
      success: true,
      message: "Product updated",
      data: product,
    });
  }
);

// DELETE /api/products/[id] — admin only (soft delete).
export const DELETE = withErrorHandler(
  async (req: NextRequest, { params }: RouteCtx) => {
    const { id } = await params;
    const session = await requireRoles([ROLES.ADMIN]);

    const product = await deleteProduct(id);

    await logAudit({
      userId: session.user.id,
      action: "product_deleted",
      ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
      metadata: { productId: product.id, slug: product.slug },
    });

    return NextResponse.json({
      success: true,
      message: "Product deleted",
      data: product,
    });
  }
);
