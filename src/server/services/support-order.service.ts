import "server-only";

import prisma from "@/server/db";
import logger from "@/lib/logger";
import { AppError, ErrorCode } from "@/lib/api-error";
import { adjustStock } from "@/server/services/inventory.service";

// ── Support order actions (LIMITED) ───────────────────────────────────────────
// The only mutations support may perform on an order. Deliberately small — no
// arbitrary status changes, no price edits. Used by /api/support/orders/[id].

// Support may only cancel orders that haven't yet shipped.
export const CANCELLABLE_STATUSES = new Set([
  "pending",
  "confirmed",
  "processing",
]);

/** Append an internal note to an order (staff-only). */
export async function addSupportNote(
  orderId: string,
  userId: string,
  note: string
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, orderNumber: true },
  });
  if (!order) {
    throw new AppError("Order not found", ErrorCode.NOT_FOUND, 404);
  }

  const created = await prisma.supportNote.create({
    data: { orderId, userId, note },
  });

  return { order, note: created };
}

/**
 * Cancel an order on the customer's behalf — only before it ships. Flips the
 * status to cancelled, flags a refund if payment was captured, records the
 * reason as a note, and restocks every line via the inventory ledger.
 */
export async function cancelSupportOrder(
  orderId: string,
  userId: string,
  reason: string
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      paymentStatus: true,
      items: { select: { productId: true, quantity: true } },
      user: { select: { name: true, email: true } },
    },
  });
  if (!order) {
    throw new AppError("Order not found", ErrorCode.NOT_FOUND, 404);
  }
  if (!CANCELLABLE_STATUSES.has(order.status)) {
    throw new AppError(
      `A ${order.status} order can't be cancelled by support`,
      ErrorCode.VALIDATION_ERROR,
      400
    );
  }

  const refundNeeded = order.paymentStatus === "paid";

  // Flip status (+ flag refund) and record the reason in the notes thread.
  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: {
        status: "cancelled",
        ...(refundNeeded ? { paymentStatus: "refund_pending" } : {}),
      },
    });
    await tx.supportNote.create({
      data: {
        orderId,
        userId,
        note: `Order cancelled by support. Reason: ${reason}${
          refundNeeded ? " — refund required (payment was captured)." : ""
        }`,
      },
    });
  });

  // Restock each line via the ledger ("return" = stock +). Runs outside the
  // order tx since adjustStock manages its own transaction; a missing product
  // (hard-deleted) is skipped rather than failing the whole cancellation.
  for (const it of order.items) {
    try {
      await adjustStock(
        it.productId,
        "return",
        it.quantity,
        userId,
        `Cancellation of ${order.orderNumber}`,
        order.orderNumber
      );
    } catch (err) {
      logger.warn("Restock on cancel skipped", {
        orderNumber: order.orderNumber,
        productId: it.productId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { order, refundNeeded, itemsRestocked: order.items.length };
}
