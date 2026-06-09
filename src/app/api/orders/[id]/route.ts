import { type NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/with-error-handler";
import { requireUser, parseJsonBody, STAFF_ROLES } from "@/lib/api-auth";
import { AppError, ErrorCode } from "@/lib/api-error";
import {
  getOrderById,
  updateOrderStatus,
} from "@/server/services/order.service";
import { updateOrderStatusSchema } from "@/server/validators/order.schema";
import { getStoreConfig } from "@/server/services/settings.service";

type RouteCtx = { params: Promise<{ id: string }> };

// GET /api/orders/[id] — customer sees own order, staff see any.
export const GET = withErrorHandler(
  async (_req: NextRequest, { params }: RouteCtx) => {
    const session = await requireUser();
    const { id } = await params;

    const isStaff = STAFF_ROLES.includes(session.user.role);
    const order = await getOrderById(id, isStaff ? null : session.user.id);

    return NextResponse.json({
      success: true,
      message: "Order fetched",
      data: order,
    });
  }
);

// PATCH /api/orders/[id] — staff change to any status; a customer may CANCEL
// their own order (only to "cancelled", and only from a cancellable state —
// the service's transition rules enforce the latter).
export const PATCH = withErrorHandler(
  async (req: NextRequest, { params }: RouteCtx) => {
    const session = await requireUser();
    const { id } = await params;
    const { status } = await parseJsonBody(req, updateOrderStatusSchema);

    if (!STAFF_ROLES.includes(session.user.role)) {
      if (status !== "cancelled") {
        throw new AppError(
          "You can only cancel your own orders",
          ErrorCode.FORBIDDEN,
          403
        );
      }
      // Admin can disable customer cancellations entirely.
      const config = await getStoreConfig();
      if (!config.cancellationsEnabled) {
        throw new AppError(
          "Order cancellations are currently disabled.",
          ErrorCode.VALIDATION_ERROR,
          400
        );
      }
      // Ownership check — throws 404 if the order isn't this customer's.
      const own = await getOrderById(id, session.user.id);
      // A customer can cancel only before it ships. After shipped/delivered the
      // item is in transit or received → a return request is required instead.
      const CUSTOMER_CANCELLABLE = ["pending", "confirmed", "processing"];
      if (!CUSTOMER_CANCELLABLE.includes(own.status)) {
        throw new AppError(
          "This order has already shipped and can no longer be cancelled. Please request a return instead.",
          ErrorCode.VALIDATION_ERROR,
          400
        );
      }
    }

    // The service logs the "order_status_changed" audit; pass the acting user
    // + request context so it's attributed correctly (single log entry).
    const order = await updateOrderStatus(id, status, {
      userId: session.user.id,
      ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
    });

    return NextResponse.json({
      success: true,
      message: "Order status updated",
      data: order,
    });
  }
);
