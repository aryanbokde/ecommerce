import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandler } from "@/lib/with-error-handler";
import { requireRoles, parseQuery } from "@/lib/api-auth";
import { ROLES } from "@/constants/roles";
import prisma from "@/server/db";

const MANAGER = [ROLES.SHOP_MANAGER, ROLES.ADMIN];

// Orders that still need warehouse action, in pipeline order.
const FULFILL_STATUSES = ["pending", "confirmed", "processing"] as const;

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

// GET /api/manager/fulfillment — fulfilment queue, oldest first, with the data
// the picking/packing screen needs (items + product SKU, address, customer).
export const GET = withErrorHandler(async (req: NextRequest) => {
  await requireRoles(MANAGER);
  const { page, limit } = parseQuery(req.nextUrl.searchParams, querySchema);

  const where = { status: { in: [...FULFILL_STATUSES] } };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "asc" }, // oldest waiting first
      skip: (page - 1) * limit,
      take: limit,
      include: {
        items: { include: { product: { select: { sku: true } } } },
        address: true,
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    message: "Fulfilment queue fetched",
    data: { orders, total, page, totalPages: Math.ceil(total / limit) },
  });
});
