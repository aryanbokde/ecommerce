import { type NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/with-error-handler";
import {
  requireUser,
  parseQuery,
  parseJsonBody,
  STAFF_ROLES,
} from "@/lib/api-auth";
import {
  createOrder,
  getUserOrders,
  getAllOrders,
} from "@/server/services/order.service";
import {
  createOrderSchema,
  orderQuerySchema,
} from "@/server/validators/order.schema";

// GET /api/orders — staff get every order; customers get their own.
export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await requireUser();
  const filters = parseQuery(req.nextUrl.searchParams, orderQuerySchema);

  const result = STAFF_ROLES.includes(session.user.role)
    ? await getAllOrders(filters)
    : await getUserOrders(session.user.id, filters);

  return NextResponse.json({
    success: true,
    message: "Orders fetched",
    data: result,
  });
});

// POST /api/orders — any signed-in user can place an order (no role gate).
export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await requireUser();
  const data = await parseJsonBody(req, createOrderSchema);

  const order = await createOrder(session.user.id, data);

  return NextResponse.json(
    { success: true, message: "Order placed", data: order },
    { status: 201 }
  );
});
