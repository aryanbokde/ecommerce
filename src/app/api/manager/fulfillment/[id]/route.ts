import { type NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { z } from "zod";
import { withErrorHandler } from "@/lib/with-error-handler";
import { sendEmail, orderShippedEmail } from "@/lib/email";
import { AppError, ErrorCode } from "@/lib/api-error";
import { requireRoles, parseJsonBody } from "@/lib/api-auth";
import { ROLES } from "@/constants/roles";
import { logAudit } from "@/server/services/audit-log.service";
import { resolveFulfillmentStep } from "@/server/services/fulfillment.service";
import prisma from "@/server/db";

type RouteCtx = { params: Promise<{ id: string }> };

const MANAGER = [ROLES.SHOP_MANAGER, ROLES.ADMIN];

const actionSchema = z.object({
  action: z.enum(["confirm", "start_packing", "mark_shipped"]),
  trackingNumber: z.string().trim().min(1).max(100).optional(),
});

// PATCH /api/manager/fulfillment/[id] — advance an order through fulfilment.
export const PATCH = withErrorHandler(
  async (req: NextRequest, { params }: RouteCtx) => {
    const session = await requireRoles(MANAGER);
    const { id } = await params;
    const { action, trackingNumber } = await parseJsonBody(req, actionSchema);

    const order = await prisma.order.findUnique({
      where: { id },
      select: { id: true, status: true, orderNumber: true },
    });
    if (!order) {
      throw new AppError("Order not found", ErrorCode.NOT_FOUND, 404);
    }

    // Validate the transition (throws 400 on a bad status / missing tracking).
    const step = resolveFulfillmentStep(action, order.status, trackingNumber);

    const updated = await prisma.order.update({
      where: { id },
      data: {
        status: step.to,
        ...(action === "mark_shipped" ? { trackingNumber } : {}),
      },
      include: {
        items: { include: { product: { select: { sku: true } } } },
        address: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });

    await logAudit({
      userId: session.user.id,
      action: "order_fulfilled",
      ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
      metadata: {
        orderId: id,
        orderNumber: order.orderNumber,
        fulfillmentAction: action,
        from: step.from,
        to: step.to,
        ...(trackingNumber ? { trackingNumber } : {}),
      },
    });

    // Notify the customer once the order ships (carries the tracking number).
    if (action === "mark_shipped" && updated.user?.email) {
      after(() =>
        sendEmail(
          orderShippedEmail(updated.user!.email, {
            orderNumber: updated.orderNumber,
            trackingNumber,
          })
        )
      );
    }

    return NextResponse.json({
      success: true,
      message: "Order updated",
      data: updated,
    });
  }
);
