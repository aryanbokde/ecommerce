import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandler } from "@/lib/with-error-handler";
import { requireRoles, parseJsonBody } from "@/lib/api-auth";
import { ROLES } from "@/constants/roles";
import { markOrderRefunded } from "@/server/services/order.service";

type RouteCtx = { params: Promise<{ id: string }> };

const schema = z.object({
  refundId: z.string().trim().max(64).optional(),
});

// POST /api/orders/[id]/refund — admin records that a refund-pending order has
// been refunded (manually, on the Razorpay dashboard). Optional rfnd_xxx id.
export const POST = withErrorHandler(
  async (req: NextRequest, { params }: RouteCtx) => {
    const session = await requireRoles([ROLES.ADMIN]);
    const { id } = await params;
    const { refundId } = await parseJsonBody(req, schema);

    const order = await markOrderRefunded(id, refundId, {
      userId: session.user.id,
      ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
    });

    return NextResponse.json({
      success: true,
      message: "Order marked as refunded",
      data: order,
    });
  }
);
