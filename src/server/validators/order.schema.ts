import { z } from "zod";

// ── Order validators ──────────────────────────────────────────────────────────

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
] as const;

export const orderStatusEnum = z.enum(ORDER_STATUSES);

export const createOrderSchema = z.object({
  addressId: z.string().trim().min(1, "addressId is required"),
  paymentMethod: z.string().trim().min(1, "paymentMethod is required"),
  notes: z.string().max(2_000).optional(),
});

export const updateOrderStatusSchema = z.object({
  status: orderStatusEnum,
});

// Query params arrive as strings → coerce. `paymentStatus` and `userId` are only
// honoured for the admin (getAllOrders) path; customers are always scoped to self.
export const orderQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: orderStatusEnum.optional(),
  paymentStatus: z
    .enum(["unpaid", "paid", "refund_pending", "refunded", "failed"])
    .optional(),
  userId: z.string().trim().min(1).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type OrderQuery = z.infer<typeof orderQuerySchema>;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
