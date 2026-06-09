import "server-only";

import { AppError, ErrorCode } from "@/lib/api-error";

// ── Fulfilment workflow rules ───────────────────────────────────────────────
// Pure transition logic for the picking → packing → shipping pipeline, kept out
// of the route handler so it can be unit-tested directly. Each action advances
// an order exactly one step; the route applies the resulting status to the DB.

export type FulfillmentAction = "confirm" | "start_packing" | "mark_shipped";

export const FULFILLMENT_STEPS: Record<
  FulfillmentAction,
  { from: string; to: string; label: string }
> = {
  confirm: { from: "pending", to: "confirmed", label: "confirm" },
  start_packing: { from: "confirmed", to: "processing", label: "start packing" },
  mark_shipped: { from: "processing", to: "shipped", label: "mark shipped" },
};

/**
 * Validate a fulfilment transition and return the matching step.
 *
 * Throws `AppError(400)` when a tracking number is missing for `mark_shipped`,
 * or when the order isn't currently in the step's required `from` status.
 */
export function resolveFulfillmentStep(
  action: FulfillmentAction,
  currentStatus: string,
  trackingNumber?: string | null
): { from: string; to: string; label: string } {
  const step = FULFILLMENT_STEPS[action];

  if (action === "mark_shipped" && !trackingNumber) {
    throw new AppError(
      "A tracking number is required to mark an order shipped",
      ErrorCode.VALIDATION_ERROR,
      400
    );
  }

  if (currentStatus !== step.from) {
    throw new AppError(
      `Order must be "${step.from}" to ${step.label} (it is "${currentStatus}")`,
      ErrorCode.VALIDATION_ERROR,
      400
    );
  }

  return step;
}
