"use client";

import { Check, X, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";

const STAGES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
] as const;

const LABELS: Record<(typeof STAGES)[number], string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
};

interface OrderStatusTimelineProps {
  status: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

function fmt(d: string | Date): string {
  return new Date(d).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function OrderStatusTimeline({
  status,
  updatedAt,
}: OrderStatusTimelineProps) {
  // Returned is a terminal off-pipeline state (delivered → returned).
  if (status === "returned") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-orange-200 bg-orange-50 p-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-orange-100">
          <Undo2 className="size-5 text-orange-600" />
        </span>
        <div>
          <p className="text-sm font-semibold text-orange-800">
            Order returned
          </p>
          <p className="text-xs text-orange-700">Updated {fmt(updatedAt)}</p>
        </div>
      </div>
    );
  }

  // Cancelled is a terminal off-pipeline state — show it on its own.
  if (status === "cancelled") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-red-100">
          <X className="size-5 text-red-600" />
        </span>
        <div>
          <p className="text-sm font-semibold text-red-800">Order cancelled</p>
          <p className="text-xs text-red-700">Updated {fmt(updatedAt)}</p>
        </div>
      </div>
    );
  }

  const currentIdx = STAGES.indexOf(status as (typeof STAGES)[number]);

  return (
    <ol className="flex flex-col sm:flex-row">
      {STAGES.map((stage, i) => {
        const completed = currentIdx > i;
        const current = currentIdx === i;
        const isLast = i === STAGES.length - 1;

        return (
          <li
            key={stage}
            className="flex flex-1 items-start gap-3 sm:flex-col sm:items-center sm:gap-0 sm:text-center"
          >
            {/* Circle + connector. Vertical on mobile, horizontal on sm+. */}
            <div className="flex flex-col items-center sm:w-full sm:flex-row">
              <span
                className={cn(
                  "relative flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors",
                  completed
                    ? "border-green-600 bg-green-600 text-white"
                    : current
                      ? "border-primary text-primary"
                      : "border-border bg-background text-muted-foreground"
                )}
              >
                {completed ? <Check className="size-4" /> : i + 1}
                {current && (
                  <span className="absolute inline-flex size-8 animate-ping rounded-full border-2 border-primary opacity-60" />
                )}
              </span>
              {!isLast && (
                <span
                  className={cn(
                    "h-8 w-0.5 sm:h-0.5 sm:w-full sm:flex-1",
                    completed ? "bg-green-600" : "bg-border"
                  )}
                />
              )}
            </div>

            <span
              className={cn(
                "pb-6 text-sm sm:pb-0 sm:pt-2 sm:text-xs",
                current
                  ? "font-semibold text-foreground"
                  : completed
                    ? "text-foreground"
                    : "text-muted-foreground"
              )}
            >
              {LABELS[stage]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
