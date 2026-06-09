import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandler } from "@/lib/with-error-handler";
import { requireRoles, parseQuery } from "@/lib/api-auth";
import { ROLES } from "@/constants/roles";
import { Prisma } from "@/generated/prisma";
import prisma from "@/server/db";

const SUPPORT = [ROLES.SUPPORT, ROLES.ADMIN];

const STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
] as const;

const querySchema = z.object({
  search: z.string().trim().min(1).optional(),
  status: z.enum(STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// GET /api/support/orders — search by order number or customer email, optional
// status filter, paginated. Read-only listing.
export const GET = withErrorHandler(async (req: NextRequest) => {
  await requireRoles(SUPPORT);
  const { search, status, page, limit } = parseQuery(
    req.nextUrl.searchParams,
    querySchema
  );

  const where: Prisma.OrderWhereInput = {
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { orderNumber: { contains: search } },
            { user: { is: { email: { contains: search } } } },
          ],
        }
      : {}),
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        total: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
        _count: { select: { items: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  const data = orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    paymentStatus: o.paymentStatus,
    total: Number(o.total),
    createdAt: o.createdAt.toISOString(),
    customerName: o.user?.name ?? null,
    customerEmail: o.user?.email ?? null,
    itemCount: o._count.items,
  }));

  return NextResponse.json({
    success: true,
    message: "Orders fetched",
    data: { orders: data, total, page, totalPages: Math.ceil(total / limit) },
  });
});
