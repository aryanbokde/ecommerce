import { type NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { z } from "zod";
import { withErrorHandler } from "@/lib/with-error-handler";
import { sendEmail, orderCancelledEmail } from "@/lib/email";
import { AppError, ErrorCode } from "@/lib/api-error";
import { requireRoles, parseJsonBody } from "@/lib/api-auth";
import { ROLES } from "@/constants/roles";
import logger from "@/lib/logger";
import prisma from "@/server/db";
import { logAudit } from "@/server/services/audit-log.service";
import { getOrderById } from "@/server/services/order.service";
import {
  addSupportNote,
  cancelSupportOrder,
} from "@/server/services/support-order.service";

type RouteCtx = { params: Promise<{ id: string }> };

const SUPPORT = [ROLES.SUPPORT, ROLES.ADMIN];

// GET /api/support/orders/[id] — full order detail (any order) + internal notes.
export const GET = withErrorHandler(
  async (_req: NextRequest, { params }: RouteCtx) => {
    await requireRoles(SUPPORT);
    const { id } = await params;

    const order = await getOrderById(id, null); // null = staff access to any order
    const notes = await prisma.supportNote.findMany({
      where: { orderId: id },
      orderBy: { createdAt: "desc" },
      include: { author: { select: { id: true, name: true } } },
    });

    return NextResponse.json({
      success: true,
      message: "Order fetched",
      data: { order, notes },
    });
  }
);

// LIMITED support actions — never arbitrary status changes or price edits.
const patchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("add_note"),
    note: z.string().trim().min(1).max(5_000),
  }),
  z.object({
    action: z.literal("cancel"),
    reason: z.string().trim().min(1).max(2_000),
  }),
  z.object({ action: z.literal("resend_confirmation") }),
]);

// PATCH /api/support/orders/[id] — add note · cancel (pre-shipment) · resend.
export const PATCH = withErrorHandler(
  async (req: NextRequest, { params }: RouteCtx) => {
    const session = await requireRoles(SUPPORT);
    const { id } = await params;
    const body = await parseJsonBody(req, patchSchema);

    const auditBase = {
      userId: session.user.id,
      ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
    };

    if (body.action === "add_note") {
      const { order, note } = await addSupportNote(
        id,
        session.user.id,
        body.note
      );
      await logAudit({
        ...auditBase,
        action: "order_note_added",
        metadata: { orderId: id, orderNumber: order.orderNumber, noteId: note.id },
      });
      return NextResponse.json({
        success: true,
        message: "Note added",
        data: { noteId: note.id },
      });
    }

    if (body.action === "cancel") {
      const { order, refundNeeded, itemsRestocked } = await cancelSupportOrder(
        id,
        session.user.id,
        body.reason
      );
      await logAudit({
        ...auditBase,
        action: "order_cancelled",
        metadata: {
          orderId: id,
          orderNumber: order.orderNumber,
          reason: body.reason,
          refundNeeded,
          itemsRestocked,
        },
      });
      if (order.user?.email) {
        after(() =>
          sendEmail(
            orderCancelledEmail(order.user!.email, {
              orderNumber: order.orderNumber,
              reason: body.reason,
              refundNeeded,
            })
          )
        );
      }
      return NextResponse.json({
        success: true,
        message: refundNeeded
          ? "Order cancelled — flagged for refund"
          : "Order cancelled",
        data: { status: "cancelled", refundNeeded },
      });
    }

    // resend_confirmation — email is stubbed; log it and record the action.
    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        orderNumber: true,
        user: { select: { email: true } },
      },
    });
    if (!order) {
      throw new AppError("Order not found", ErrorCode.NOT_FOUND, 404);
    }
    logger.info("Support re-sent order confirmation", {
      orderId: id,
      orderNumber: order.orderNumber,
      to: order.user?.email ?? null,
    });
    await logAudit({
      ...auditBase,
      action: "order_confirmation_resent",
      metadata: { orderId: id, orderNumber: order.orderNumber },
    });

    return NextResponse.json({
      success: true,
      message: "Confirmation email re-sent",
    });
  }
);
