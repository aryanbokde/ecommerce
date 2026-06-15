import "server-only";

import { nanoid } from "nanoid";
import { Prisma } from "@/generated/prisma";
import prisma from "@/server/db";
import { AppError, ErrorCode } from "@/lib/api-error";
import { logAudit } from "@/server/services/audit-log.service";
import { recordSale, recordReturn } from "@/server/services/inventory.service";
import { loadTaxContext } from "@/server/services/tax.service";
import {
  computeLineTaxes,
  type TaxContext,
  type TaxLine,
} from "@/lib/tax";
import {
  sendEmail,
  orderDeliveredEmail,
  orderCancelledEmail,
} from "@/lib/email";
import type {
  CreateOrderInput,
  OrderQuery,
  OrderStatus,
} from "@/server/validators/order.schema";

// ── Order service ─────────────────────────────────────────────────────────────
// Checkout (createOrder) runs in a transaction: stock is decremented race-safely,
// the order + snapshotted items are created, and the cart is emptied — all or
// nothing. Prices/names are snapshotted onto OrderItem so later product edits
// never rewrite historical orders.

const SHIPPING_FEE = new Prisma.Decimal(99);
const FREE_SHIPPING_THRESHOLD = new Prisma.Decimal(999);

/**
 * Single source of truth for order money: per-line tax (product override →
 * category chain → default, or 0 when tax is off), shipping (free over ₹999 else
 * ₹99) and grand total. `perLine` carries each line's rate + amount so createOrder
 * can snapshot them onto OrderItem. Used by createOrder AND quoteCheckout so the
 * charged amount and persisted total can never diverge.
 */
function computeTotals(
  subtotal: Prisma.Decimal,
  lines: TaxLine[],
  ctx: TaxContext
) {
  const { tax, perLine } = computeLineTaxes(lines, ctx);
  const shipping = subtotal.gt(FREE_SHIPPING_THRESHOLD)
    ? new Prisma.Decimal(0)
    : SHIPPING_FEE;
  const discount = new Prisma.Decimal(0);
  const total = subtotal.add(tax).add(shipping).sub(discount);
  return { tax, shipping, discount, total, perLine };
}

const orderInclude = {
  items: true,
  address: true,
  user: { select: { id: true, name: true, email: true } },
  returnRequest: true,
} satisfies Prisma.OrderInclude;

// Allowed status transitions. Linear pipeline + cancel-from-anywhere (except a
// delivered/cancelled terminal state).
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
  returned: [], // terminal; set via the return-approval flow, not manually
};

function generateOrderNumber(): string {
  return `ORD-${nanoid(8).toUpperCase()}`;
}

function firstImage(images: Prisma.JsonValue | null): string | null {
  if (Array.isArray(images) && typeof images[0] === "string") return images[0];
  return null;
}

function isOrderNumberCollision(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    JSON.stringify(error.meta?.target ?? "").includes("orderNumber")
  );
}

export async function createOrder(
  userId: string,
  data: CreateOrderInput,
  // Payment outcome — defaults to an unpaid order (COD / pay-later). The
  // Razorpay verify route passes { paymentStatus: "paid", paymentId } once the
  // signature is validated.
  payment: {
    paymentStatus?: string;
    paymentId?: string;
    razorpayOrderId?: string;
    signature?: string;
  } = {}
) {
  // 1. Load the cart with product details.
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: { items: { include: { product: true } } },
  });
  if (!cart || cart.items.length === 0) {
    throw new AppError("Your cart is empty", ErrorCode.VALIDATION_ERROR, 400);
  }

  // 2. Verify the shipping address belongs to this user.
  const address = await prisma.address.findUnique({
    where: { id: data.addressId },
    select: { id: true, userId: true },
  });
  if (!address || address.userId !== userId) {
    throw new AppError("Address not found", ErrorCode.NOT_FOUND, 404);
  }

  // 3. Snapshot items + compute money (Decimal-safe). Lines feed the per-line
  //    tax engine; itemsToCreate stays index-aligned with them.
  const taxCtx = await loadTaxContext();
  let subtotal = new Prisma.Decimal(0);
  const itemsToCreate: Prisma.OrderItemCreateWithoutOrderInput[] = [];
  const lines: TaxLine[] = [];
  for (const item of cart.items) {
    const product = item.product;
    if (!product.isActive) {
      throw new AppError(
        `"${product.name}" is no longer available`,
        ErrorCode.VALIDATION_ERROR,
        400
      );
    }
    const lineTotal = product.price.mul(item.quantity);
    subtotal = subtotal.add(lineTotal);
    lines.push({
      lineTotal,
      productRate: product.taxRate,
      categoryId: product.categoryId,
    });
    itemsToCreate.push({
      product: { connect: { id: product.id } },
      name: product.name,
      price: product.price,
      quantity: item.quantity,
      total: lineTotal,
      image: firstImage(product.images),
    });
  }

  const { tax, shipping, discount, total, perLine } = computeTotals(
    subtotal,
    lines,
    taxCtx
  );
  // Snapshot each line's resolved rate + tax onto the OrderItem (GST breakup).
  perLine.forEach((pl, i) => {
    itemsToCreate[i].taxRate = pl.rate;
    itemsToCreate[i].taxAmount = pl.amount;
  });

  // 4. Transaction with order-number retry on the rare collision.
  let order:
    | Prisma.OrderGetPayload<{ include: typeof orderInclude }>
    | undefined;

  for (let attempt = 0; attempt < 5; attempt++) {
    const orderNumber = generateOrderNumber();
    try {
      order = await prisma.$transaction(async (tx) => {
        // Stock decrements go through the inventory ledger (recordSale), so
        // every sale leaves a StockMovement audit row. adjustStock uses the
        // same race-safe conditional decrement and throws if stock is short;
        // we rethrow with the product name for a clearer message.
        for (const item of cart.items) {
          try {
            await recordSale(item.productId, item.quantity, orderNumber, userId, tx);
          } catch (error) {
            if (error instanceof AppError && error.statusCode === 400) {
              throw new AppError(
                `Insufficient stock for "${item.product.name}"`,
                ErrorCode.VALIDATION_ERROR,
                400
              );
            }
            throw error;
          }
        }

        const created = await tx.order.create({
          data: {
            orderNumber,
            user: { connect: { id: userId } },
            address: { connect: { id: data.addressId } },
            status: "pending",
            paymentStatus: payment.paymentStatus ?? "unpaid",
            paymentMethod: data.paymentMethod,
            paymentId: payment.paymentId ?? null,
            razorpayOrderId: payment.razorpayOrderId ?? null,
            razorpaySignature: payment.signature ?? null,
            subtotal,
            tax,
            shipping,
            discount,
            total,
            notes: data.notes,
            items: { create: itemsToCreate },
          },
          include: orderInclude,
        });

        // Empty the cart now that the order owns these items.
        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

        return created;
      });
      break; // success
    } catch (error) {
      if (isOrderNumberCollision(error)) continue; // regenerate + retry
      throw error;
    }
  }

  if (!order) {
    throw new AppError(
      "Could not generate a unique order number, please retry",
      ErrorCode.SERVER_ERROR,
      500
    );
  }

  await logAudit({
    userId,
    action: "order_placed",
    metadata: {
      orderId: order.id,
      orderNumber: order.orderNumber,
      total: order.total.toFixed(2),
      itemCount: order.items.length,
    },
  });

  return order;
}

/**
 * Validate the user's cart for checkout (non-empty, every item active + in
 * stock) and return the computed money totals — WITHOUT creating an order.
 * Used to compute the Razorpay charge amount before payment. Uses the same
 * computeTotals() as createOrder, so the amount charged always matches the
 * total persisted on the order.
 */
export async function quoteCheckout(userId: string) {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: { items: { include: { product: true } } },
  });
  if (!cart || cart.items.length === 0) {
    throw new AppError("Your cart is empty", ErrorCode.VALIDATION_ERROR, 400);
  }

  const taxCtx = await loadTaxContext();
  let subtotal = new Prisma.Decimal(0);
  let itemCount = 0;
  const lines: TaxLine[] = [];
  for (const { product, quantity } of cart.items) {
    if (!product.isActive) {
      throw new AppError(
        `"${product.name}" is no longer available`,
        ErrorCode.VALIDATION_ERROR,
        400
      );
    }
    if (product.stock < quantity) {
      throw new AppError(
        `Insufficient stock for "${product.name}"`,
        ErrorCode.VALIDATION_ERROR,
        400
      );
    }
    const lineTotal = product.price.mul(quantity);
    subtotal = subtotal.add(lineTotal);
    lines.push({
      lineTotal,
      productRate: product.taxRate,
      categoryId: product.categoryId,
    });
    itemCount += quantity;
  }

  const { tax, shipping, discount, total } = computeTotals(
    subtotal,
    lines,
    taxCtx
  );
  return {
    subtotal: subtotal.toFixed(2),
    tax: tax.toFixed(2),
    shipping: shipping.toFixed(2),
    discount: discount.toFixed(2),
    total: total.toFixed(2),
    itemCount,
  };
}

/**
 * Webhook-driven payment status update, matched by the stored Razorpay
 * paymentId. Idempotent: "noop" if already in the target state, "not_found" if
 * no order matches (e.g. the webhook arrived before verify-payment persisted the
 * order — Razorpay will retry). Bypasses the status-transition rules on purpose.
 */
export async function setOrderPaymentStatusByPaymentId(
  paymentId: string,
  paymentStatus: string
): Promise<"updated" | "noop" | "not_found"> {
  const order = await prisma.order.findFirst({
    where: { paymentId },
    select: { id: true, paymentStatus: true },
  });
  if (!order) return "not_found";
  if (order.paymentStatus === paymentStatus) return "noop";
  await prisma.order.update({
    where: { id: order.id },
    data: { paymentStatus },
  });
  return "updated";
}

/** Advance a paid order to "confirmed" (only from pending). Idempotent. */
export async function confirmPaidOrderByPaymentId(
  paymentId: string
): Promise<"updated" | "noop" | "not_found"> {
  const order = await prisma.order.findFirst({
    where: { paymentId },
    select: { id: true, status: true },
  });
  if (!order) return "not_found";
  if (order.status !== "pending") return "noop";
  await prisma.order.update({
    where: { id: order.id },
    data: { status: "confirmed" },
  });
  return "updated";
}

/**
 * Fetch a single order. Pass `userId` to scope to that customer's own order;
 * pass `null` for privileged (admin/shop_manager) access to any order.
 */
export async function getOrderById(orderId: string, userId: string | null) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      address: true,
      user: { select: { id: true, name: true, email: true } },
      returnRequest: true,
    },
  });
  if (!order || (userId !== null && order.userId !== userId)) {
    throw new AppError("Order not found", ErrorCode.NOT_FOUND, 404);
  }
  return order;
}

export async function getUserOrders(
  userId: string,
  filters: OrderQuery & { statuses?: OrderStatus[] }
) {
  const { page, limit, status, statuses } = filters;
  const where: Prisma.OrderWhereInput = {
    userId,
    // `statuses` (a group, e.g. "active") takes precedence over a single status.
    ...(statuses && statuses.length
      ? { status: { in: statuses } }
      : status
        ? { status }
        : {}),
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: orderInclude,
    }),
    prisma.order.count({ where }),
  ]);

  return { orders, total, page, totalPages: Math.ceil(total / limit) };
}

export async function getAllOrders(filters: OrderQuery) {
  const { page, limit, status, paymentStatus, userId, from, to } = filters;
  const where: Prisma.OrderWhereInput = {
    ...(status ? { status } : {}),
    ...(paymentStatus ? { paymentStatus } : {}),
    ...(userId ? { userId } : {}),
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {}),
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        items: true,
        address: true,
        user: { select: { id: true, name: true, email: true } },
        returnRequest: { select: { status: true, seenByAdmin: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  return { orders, total, page, totalPages: Math.ceil(total / limit) };
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  actor?: { userId?: string; ipAddress?: string; userAgent?: string }
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, orderNumber: true, status: true, paymentStatus: true },
  });
  if (!order) {
    throw new AppError("Order not found", ErrorCode.NOT_FOUND, 404);
  }

  const current = order.status as OrderStatus;
  if (status === current) {
    throw new AppError(
      `Order is already "${status}"`,
      ErrorCode.VALIDATION_ERROR,
      400
    );
  }
  if (!TRANSITIONS[current]?.includes(status)) {
    throw new AppError(
      `Invalid status transition: "${current}" → "${status}"`,
      ErrorCode.VALIDATION_ERROR,
      400
    );
  }

  let updated;
  if (status === "cancelled") {
    // Cancelling a PAID order flags it for a refund (manual: an admin refunds on
    // the Razorpay dashboard, then marks it refunded via markOrderRefunded).
    const needsRefund = order.paymentStatus === "paid";
    // Return reserved stock to inventory when an order is cancelled.
    updated = await prisma.$transaction(async (tx) => {
      const items = await tx.orderItem.findMany({
        where: { orderId },
        select: { productId: true, quantity: true },
      });
      for (const item of items) {
        // Ledger-tracked restock so the StockMovement history records it.
        await recordReturn(
          item.productId,
          item.quantity,
          order.orderNumber,
          `Order ${order.orderNumber} cancelled`,
          actor?.userId ?? null,
          tx
        );
      }
      return tx.order.update({
        where: { id: orderId },
        data: {
          status,
          ...(needsRefund ? { paymentStatus: "refund_pending" } : {}),
        },
        include: orderInclude,
      });
    });
  } else {
    updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        status,
        // Stamp the delivery time — drives the customer return window.
        ...(status === "delivered" ? { deliveredAt: new Date() } : {}),
      },
      include: orderInclude,
    });
  }

  await logAudit({
    userId: actor?.userId,
    action: "order_status_changed",
    ipAddress: actor?.ipAddress,
    userAgent: actor?.userAgent,
    metadata: {
      orderId,
      orderNumber: updated.orderNumber,
      from: current,
      to: status,
    },
  });

  // Customer notification for the milestone statuses. Fire-and-forget:
  // sendEmail never throws, so a mail hiccup can't fail the status update.
  // (shipped is sent from the fulfilment route, which carries the tracking no.)
  const email = updated.user?.email;
  if (email) {
    if (status === "delivered") {
      void sendEmail(
        orderDeliveredEmail(email, { orderNumber: updated.orderNumber })
      );
    } else if (status === "cancelled") {
      void sendEmail(
        orderCancelledEmail(email, { orderNumber: updated.orderNumber })
      );
    }
  }

  return updated;
}

/**
 * Mark a refund-pending order as refunded. Manual workflow: an admin issues the
 * refund on the Razorpay dashboard, then records it here (optionally with the
 * gateway refund id, rfnd_xxx). Only valid from `refund_pending`.
 */
export async function markOrderRefunded(
  orderId: string,
  refundId?: string,
  actor?: { userId?: string; ipAddress?: string; userAgent?: string }
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, orderNumber: true, paymentStatus: true },
  });
  if (!order) {
    throw new AppError("Order not found", ErrorCode.NOT_FOUND, 404);
  }
  if (order.paymentStatus !== "refund_pending") {
    throw new AppError(
      `Order is not awaiting a refund (payment is "${order.paymentStatus}")`,
      ErrorCode.VALIDATION_ERROR,
      400
    );
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { paymentStatus: "refunded", refundId: refundId ?? null },
    include: orderInclude,
  });

  await logAudit({
    userId: actor?.userId,
    action: "order_refunded",
    ipAddress: actor?.ipAddress,
    userAgent: actor?.userAgent,
    metadata: { orderId, orderNumber: order.orderNumber, refundId: refundId ?? null },
  });

  return updated;
}

/**
 * Mark a Cash-on-Delivery order's payment as collected. COD orders are created
 * `unpaid` and stay that way (only the Razorpay verify route sets `paid`); this
 * is how staff record that cash was taken on delivery. Guards: COD only, only
 * from `unpaid`, and never on a cancelled/returned order (no money to collect).
 */
export async function markCodPaid(
  orderId: string,
  actor?: { userId?: string; ipAddress?: string; userAgent?: string }
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      paymentMethod: true,
      paymentStatus: true,
    },
  });
  if (!order) {
    throw new AppError("Order not found", ErrorCode.NOT_FOUND, 404);
  }
  if (order.paymentMethod !== "cod") {
    throw new AppError(
      "Only Cash-on-Delivery orders can be marked paid manually",
      ErrorCode.VALIDATION_ERROR,
      400
    );
  }
  if (order.paymentStatus !== "unpaid") {
    throw new AppError(
      `Order payment is already "${order.paymentStatus}"`,
      ErrorCode.VALIDATION_ERROR,
      400
    );
  }
  if (order.status === "cancelled" || order.status === "returned") {
    throw new AppError(
      `A ${order.status} order can't be marked paid`,
      ErrorCode.VALIDATION_ERROR,
      400
    );
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { paymentStatus: "paid" },
    include: orderInclude,
  });

  await logAudit({
    userId: actor?.userId,
    action: "order_payment_collected",
    ipAddress: actor?.ipAddress,
    userAgent: actor?.userAgent,
    metadata: { orderId, orderNumber: order.orderNumber, method: "cod" },
  });

  return updated;
}

export async function getOrderStats() {
  const grouped = await prisma.order.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  const counts: Record<OrderStatus, number> = {
    pending: 0,
    confirmed: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    returned: 0,
  };
  let total = 0;
  for (const row of grouped) {
    const n = row._count._all;
    total += n;
    if (row.status in counts) counts[row.status as OrderStatus] = n;
  }

  // Revenue from non-cancelled orders over rolling windows.
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const revenueSince = async (since: Date): Promise<string> => {
    const agg = await prisma.order.aggregate({
      _sum: { total: true },
      where: {
        status: { notIn: ["cancelled", "returned"] },
        paymentStatus: { not: "failed" },
        createdAt: { gte: since },
      },
    });
    return (agg._sum.total ?? new Prisma.Decimal(0)).toFixed(2);
  };

  const [today, week, month] = await Promise.all([
    revenueSince(startOfToday),
    revenueSince(weekAgo),
    revenueSince(monthAgo),
  ]);

  return {
    total,
    pending: counts.pending,
    confirmed: counts.confirmed,
    processing: counts.processing,
    shipped: counts.shipped,
    delivered: counts.delivered,
    cancelled: counts.cancelled,
    revenue: { today, week, month },
  };
}
