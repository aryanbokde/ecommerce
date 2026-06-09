import "server-only";

import prisma from "@/server/db";
import { AppError, ErrorCode } from "@/lib/api-error";
import { logAudit } from "@/server/services/audit-log.service";
import { recordReturn } from "@/server/services/inventory.service";
import { getStoreConfig } from "@/server/services/settings.service";

// ── Returns / RMA service ─────────────────────────────────────────────────────
// A customer requests a return on a DELIVERED order (one per order). An admin
// approves (optionally restocking + flagging the order for refund) or rejects.

/** Customer creates a return request for their own delivered order. */
export async function requestReturn(
  orderId: string,
  userId: string,
  reason: string
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      userId: true,
      status: true,
      deliveredAt: true,
      returnRequest: { select: { id: true } },
    },
  });
  if (!order || order.userId !== userId) {
    throw new AppError("Order not found", ErrorCode.NOT_FOUND, 404);
  }

  const config = await getStoreConfig();
  if (!config.returnsEnabled) {
    throw new AppError(
      "Returns are currently disabled.",
      ErrorCode.VALIDATION_ERROR,
      400
    );
  }
  if (order.status !== "delivered") {
    throw new AppError(
      "Returns can only be requested for delivered orders.",
      ErrorCode.VALIDATION_ERROR,
      400
    );
  }
  // Return window: deliveredAt + N days. Orders delivered before deliveredAt was
  // tracked have no timestamp → allow (can't prove it's outside the window).
  if (order.deliveredAt) {
    const deadline =
      order.deliveredAt.getTime() + config.returnWindowDays * 86_400_000;
    if (Date.now() > deadline) {
      throw new AppError(
        `The ${config.returnWindowDays}-day return window for this order has passed.`,
        ErrorCode.VALIDATION_ERROR,
        400
      );
    }
  }
  if (order.returnRequest) {
    throw new AppError(
      "A return request already exists for this order.",
      ErrorCode.VALIDATION_ERROR,
      409
    );
  }

  const created = await prisma.return.create({
    data: { orderId, userId, reason },
  });

  await logAudit({
    userId,
    action: "return_requested",
    metadata: { orderId, returnId: created.id },
  });

  return created;
}

/** Admin approves or rejects a pending return. */
export async function resolveReturn(
  orderId: string,
  action: "approve" | "reject",
  opts: { adminNote?: string; restock?: boolean } = {},
  actor?: { userId?: string; ipAddress?: string; userAgent?: string }
) {
  const ret = await prisma.return.findUnique({
    where: { orderId },
    select: {
      id: true,
      status: true,
      order: { select: { id: true, paymentStatus: true, orderNumber: true } },
    },
  });
  if (!ret) {
    throw new AppError("Return request not found", ErrorCode.NOT_FOUND, 404);
  }
  if (ret.status !== "requested") {
    throw new AppError(
      `Return is already "${ret.status}".`,
      ErrorCode.VALIDATION_ERROR,
      400
    );
  }

  if (action === "reject") {
    const updated = await prisma.return.update({
      where: { id: ret.id },
      data: {
        status: "rejected",
        adminNote: opts.adminNote ?? null,
        resolvedAt: new Date(),
      },
    });
    await logAudit({
      userId: actor?.userId,
      action: "return_rejected",
      ipAddress: actor?.ipAddress,
      userAgent: actor?.userAgent,
      metadata: { orderId, returnId: ret.id },
    });
    return updated;
  }

  // approve — optionally restock + flag the (paid) order for refund.
  const willRefund = ret.order.paymentStatus === "paid";
  const updated = await prisma.$transaction(async (tx) => {
    if (opts.restock) {
      const items = await tx.orderItem.findMany({
        where: { orderId },
        select: { productId: true, quantity: true },
      });
      for (const it of items) {
        // Ledger-tracked restock (StockMovement type "return").
        await recordReturn(
          it.productId,
          it.quantity,
          ret.order.orderNumber,
          `Return for order ${ret.order.orderNumber}`,
          actor?.userId ?? null,
          tx
        );
      }
    }
    // Reflect the return on the order itself: status → "returned" (+ flag the
    // paid order for refund).
    await tx.order.update({
      where: { id: orderId },
      data: {
        status: "returned",
        ...(willRefund ? { paymentStatus: "refund_pending" } : {}),
      },
    });
    return tx.return.update({
      where: { id: ret.id },
      data: {
        status: "approved",
        adminNote: opts.adminNote ?? null,
        restocked: !!opts.restock,
        resolvedAt: new Date(),
      },
    });
  });

  await logAudit({
    userId: actor?.userId,
    action: "return_approved",
    ipAddress: actor?.ipAddress,
    userAgent: actor?.userAgent,
    metadata: { orderId, returnId: ret.id, restocked: !!opts.restock, refundFlagged: willRefund },
  });

  return updated;
}
