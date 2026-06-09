"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCheckout, STEP_ORDER, type CheckoutStep } from "@/hooks/useCheckout";

const LABELS: Record<CheckoutStep, string> = {
  address: "Address",
  payment: "Payment",
  review: "Review",
};

export function CheckoutSteps({ currentStep }: { currentStep: CheckoutStep }) {
  const setStep = useCheckout((s) => s.setStep);
  const currentIdx = STEP_ORDER.indexOf(currentStep);

  return (
    <ol className="flex items-center">
      {STEP_ORDER.map((step, i) => {
        const completed = i < currentIdx;
        const active = i === currentIdx;
        // Only completed steps are navigable (you can go back, not forward).
        const clickable = completed;

        return (
          <li
            key={step}
            className={cn("flex items-center", i < STEP_ORDER.length - 1 && "flex-1")}
          >
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && setStep(step)}
              aria-current={active ? "step" : undefined}
              className={cn(
                "flex items-center gap-2",
                clickable ? "cursor-pointer" : "cursor-default"
              )}
            >
              <span
                className={cn(
                  "flex size-8 items-center justify-center rounded-full border text-sm font-semibold transition-colors",
                  completed
                    ? "border-primary bg-primary text-primary-foreground"
                    : active
                      ? "border-primary text-primary"
                      : "border-border text-muted-foreground"
                )}
              >
                {completed ? <Check className="size-4" /> : i + 1}
              </span>
              <span
                className={cn(
                  "text-sm font-medium",
                  active || completed ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {LABELS[step]}
              </span>
            </button>

            {i < STEP_ORDER.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  "mx-3 h-px flex-1",
                  i < currentIdx ? "bg-primary" : "bg-border"
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
