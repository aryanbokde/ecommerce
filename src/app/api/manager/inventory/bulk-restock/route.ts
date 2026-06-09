import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandler } from "@/lib/with-error-handler";
import { requireRoles, parseJsonBody } from "@/lib/api-auth";
import { ROLES } from "@/constants/roles";
import { bulkRestock } from "@/server/services/inventory.service";

const schema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().trim().min(1),
        quantity: z.number().int().positive(),
      })
    )
    .min(1, "Add at least one product"),
  reference: z.string().trim().max(100).optional(),
});

// POST /api/manager/inventory/bulk-restock — restock many products in one txn.
export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await requireRoles([ROLES.SHOP_MANAGER, ROLES.ADMIN]);
  const { items, reference } = await parseJsonBody(req, schema);

  const results = await bulkRestock(items, session.user.id, reference);

  return NextResponse.json({
    success: true,
    message: `Restocked ${results.length} product${results.length === 1 ? "" : "s"}`,
    data: { count: results.length },
  });
});
