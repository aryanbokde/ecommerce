"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { notifyError, notifySuccess } from "@/lib/notify";
import { CopyField } from "@/components/admin/CopyField";

/**
 * Manual-refund tracker on the order detail page. A cancelled PAID order lands
 * in `refund_pending`; an admin refunds it on the Razorpay dashboard, then
 * records it here (optionally with the rfnd_xxx id) → `refunded`.
 */
export function RefundPanel({
  orderId,
  paymentStatus,
  refundId,
}: {
  orderId: string;
  paymentStatus: string;
  refundId: string | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  if (paymentStatus === "refunded") {
    return (
      <div className="mt-3 space-y-1.5 border-t border-border pt-3">
        <p className="text-xs font-medium text-muted-foreground">Refund</p>
        {refundId ? (
          <CopyField label="Refund ID" value={refundId} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Marked refunded (no gateway id recorded).
          </p>
        )}
      </div>
    );
  }

  if (paymentStatus !== "refund_pending") return null;

  async function markRefunded() {
    setBusy(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(value.trim() ? { refundId: value.trim() } : {}),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        notifyError("Couldn't mark refunded", json?.error);
        return;
      }
      notifySuccess("Order marked as refunded");
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
        Refund pending — issue the refund on Razorpay, then record it here.
      </p>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Razorpay Refund ID (rfnd_…) — optional"
        className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 font-mono text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />
      <Button
        size="sm"
        variant="outline"
        className="w-full"
        disabled={busy}
        onClick={markRefunded}
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <RotateCcw className="size-4" />
        )}
        Mark as refunded
      </Button>
    </div>
  );
}
