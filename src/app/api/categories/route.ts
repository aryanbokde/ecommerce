import { type NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/with-error-handler";
import { requireAdmin, parseJsonBody } from "@/lib/api-auth";
import { logAudit } from "@/server/services/audit-log.service";
import {
  getCategoryTree,
  createCategory,
} from "@/server/services/category.service";
import { createCategorySchema } from "@/server/validators/category.schema";

// GET /api/categories — public, nested category tree.
export const GET = withErrorHandler(async () => {
  const tree = await getCategoryTree();
  return NextResponse.json({
    success: true,
    message: "Categories fetched",
    data: tree,
  });
});

// POST /api/categories — admin only.
export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await requireAdmin();
  const data = await parseJsonBody(req, createCategorySchema);

  const category = await createCategory(data);

  await logAudit({
    userId: session.user.id,
    action: "category_created",
    ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
    userAgent: req.headers.get("user-agent") ?? undefined,
    metadata: { categoryId: category.id, slug: category.slug, name: category.name },
  });

  return NextResponse.json(
    { success: true, message: "Category created", data: category },
    { status: 201 }
  );
});
