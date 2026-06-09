import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandler } from "@/lib/with-error-handler";
import { requireRoles, parseQuery } from "@/lib/api-auth";
import { ROLES } from "@/constants/roles";
import {
  getStockHistory,
  type StockMovementType,
} from "@/server/services/inventory.service";

type RouteCtx = { params: Promise<{ productId: string }> };

const querySchema = z.object({
  type: z.enum(["restock", "sale", "return", "damage", "correction"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// GET /api/manager/inventory/[productId]/history — paginated movement ledger.
export const GET = withErrorHandler(
  async (req: NextRequest, { params }: RouteCtx) => {
    await requireRoles([ROLES.SHOP_MANAGER, ROLES.ADMIN]);
    const { productId } = await params;
    const { type, page, limit } = parseQuery(
      req.nextUrl.searchParams,
      querySchema
    );

    const data = await getStockHistory(productId, {
      type: type as StockMovementType | undefined,
      page,
      limit,
    });

    return NextResponse.json({
      success: true,
      message: "Stock history fetched",
      data,
    });
  }
);
