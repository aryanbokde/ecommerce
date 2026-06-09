import { z } from "zod";

// ── Cart validators ───────────────────────────────────────────────────────────

export const addToCartSchema = z.object({
  productId: z.string().trim().min(1, "productId is required"),
  quantity: z.number().int().min(1).max(99),
});

// quantity 0 is allowed here — the service treats it as "remove this item".
export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(0).max(99),
});

export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
