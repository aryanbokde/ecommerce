import { type NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/with-error-handler";
import { requireAdmin, parseJsonBody } from "@/lib/api-auth";
import { logAudit } from "@/server/services/audit-log.service";
import {
  getCategoryBySlug,
  updateCategory,
  deleteCategory,
} from "@/server/services/category.service";
import { updateCategorySchema } from "@/server/validators/category.schema";

// NOTE: the dynamic segment is `[id]`, but per spec GET resolves it as a SLUG
// (getCategoryBySlug) while PUT/DELETE resolve it as an id. Kept as specified.
type RouteCtx = { params: Promise<{ id: string }> };

// GET /api/categories/[id] — public. Resolves the segment as a slug.
export const GET = withErrorHandler(
  async (_req: NextRequest, { params }: RouteCtx) => {
    const { id: slug } = await params;
    const category = await getCategoryBySlug(slug);
    return NextResponse.json({
      success: true,
      message: "Category fetched",
      data: category,
    });
  }
);

// PUT /api/categories/[id] — admin only.
export const PUT = withErrorHandler(
  async (req: NextRequest, { params }: RouteCtx) => {
    const { id } = await params;
    const session = await requireAdmin();
    const data = await parseJsonBody(req, updateCategorySchema);

    const category = await updateCategory(id, data);

    await logAudit({
      userId: session.user.id,
      action: "category_updated",
      ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
      metadata: { categoryId: id, fields: Object.keys(data) },
    });

    return NextResponse.json({
      success: true,
      message: "Category updated",
      data: category,
    });
  }
);

// DELETE /api/categories/[id] — admin only. Returns 400 if products attached.
export const DELETE = withErrorHandler(
  async (req: NextRequest, { params }: RouteCtx) => {
    const { id } = await params;
    const session = await requireAdmin();

    const category = await deleteCategory(id);

    await logAudit({
      userId: session.user.id,
      action: "category_deleted",
      ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
      metadata: { categoryId: id },
    });

    return NextResponse.json({
      success: true,
      message: "Category deleted",
      data: category,
    });
  }
);
