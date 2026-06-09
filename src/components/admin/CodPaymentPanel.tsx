"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, BadgeIndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { notifyError, notifySuccess } from "@/lib/notify";

/**
 * Mark a Cash-on-Delivery order as paid once cash is collected on delivery.
 * Only renders for COD orders still `unpaid`; the server enforces the same
 * (COD-only, unpaid-only, not cancelled/returned).
 */
export function CodPaymentPanel({
  orderId,
  paymentMethod,
  paymentStatus,
}: {
  orderId: string;
  paymentMethod: string | null;
  paymentStatus: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (paymentMethod !== "cod" || paymentStatus !== "unpaid") return null;

  async function markPaid() {
    setBusy(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/mark-paid`, {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        notifyError("Couldn't mark paid", json?.error);
        return;
      }
      notifySuccess("Payment collected", "Order marked as paid.");
      router.refresh();
    } catch {
      notifyError("Something went wrong", "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 space-y-2 border-t border-border pt-3">
      <p className="text-xs font-medium text-muted-foreground">
        Cash on Delivery — record the payment once cash is collected.
      </p>
      <Button
        size="sm"
        variant="outline"
        className="w-full"
        disabled={busy}
        onClick={markPaid}
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <BadgeIndianRupee className="size-4" />
        )}
        Mark as paid (COD collected)
      </Button>
    </div>
  );
}
