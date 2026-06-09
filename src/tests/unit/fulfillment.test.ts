import { describe, it, expect } from "vitest";
import { resolveFulfillmentStep } from "@/server/services/fulfillment.service";

describe("fulfillment.service — resolveFulfillmentStep", () => {
  it("confirm advances pending → confirmed", () => {
    const step = resolveFulfillmentStep("confirm", "pending");
    expect(step.to).toBe("confirmed");
  });

  it("start_packing advances confirmed → processing", () => {
    const step = resolveFulfillmentStep("start_packing", "confirmed");
    expect(step.to).toBe("processing");
  });

  it("mark_shipped requires a tracking number (throws without one)", () => {
    expect(() => resolveFulfillmentStep("mark_shipped", "processing")).toThrow(
      /tracking number/i
    );
  });

  it("mark_shipped advances processing → shipped with a tracking number", () => {
    const step = resolveFulfillmentStep(
      "mark_shipped",
      "processing",
      "1Z999AA10123456784"
    );
    expect(step.to).toBe("shipped");
  });

  it("rejects an out-of-order transition", () => {
    // Can't confirm an already-shipped order.
    expect(() => resolveFulfillmentStep("confirm", "shipped")).toThrow(
      /must be "pending"/
    );
  });
});
