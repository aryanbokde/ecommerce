"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Printer } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { notifyError, notifySuccess } from "@/lib/notify";
import { ADMIN_BADGES_REFRESH } from "@/components/admin/AdminSidebar";

// Mirrors the server's transition rules (order.service.ts). Keep in sync.
const TRANSITIONS: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: [],
  returned: [],
  cancelled: [],
};

/** Statuses an order in `status` may transition to (empty = terminal). */
export function validNextStatuses(status: string): string[] {
  return TRANSITIONS[status] ?? [];
}

interface OrderStatusManagerProps {
  orderId: string;
  currentStatus: string;
}

export function OrderStatusManager({
  orderId,
  currentStatus,
}: OrderStatusManagerProps) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus); // optimistic "current"
  // useState only seeds on mount. When the server prop changes after a
  // router.refresh() (e.g. a return approval elsewhere on the page flips the
  // order to "returned"), adopt the new value so the badge + transition list
  // update live — React's "adjust state during render" pattern (no effect).
  const [seenStatus, setSeenStatus] = useState(currentStatus);
  if (currentStatus !== seenStatus) {
    setSeenStatus(currentStatus);
    setStatus(currentStatus);
  }
  const [target, setTarget] = useState<string>("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const nextOptions = validNextStatuses(status);
  const terminal = nextOptions.length === 0;

  async function apply(next: string) {
    const prev = status;
    setSubmitting(true);
    setStatus(next); // optimistic
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: next }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setStatus(prev); // revert optimistic change
        notifyError("Couldn't update status", json?.error);
        return;
      }
      notifySuccess("Order status updated", `Now marked as “${next}”`);
      setTarget("");
      // Status moved out of (or into) "pending" → refresh the sidebar's
      // pending-orders badge immediately, without waiting for a navigation.
      window.dispatchEvent(new Event(ADMIN_BADGES_REFRESH));
      router.refresh();
    } catch {
      setStatus(prev);
      notifyError("Something went wrong", "Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleUpdate() {
    if (!target || submitting) return;
    if (target === "cancelled") {
      setConfirmCancel(true);
      return;
    }
    apply(target);
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
      <div>
        <h2 className="font-heading text-base font-semibold text-foreground">
          Status
        </h2>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Current:</span>
          <OrderStatusBadge status={status} />
        </div>
      </div>

      {terminal ? (
        <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          This order is {status}. No further status changes are possible.
        </p>
      ) : (
        <>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Change status to
            </label>
            <Select
              value={target || undefined}
              onValueChange={(v) => setTarget(v ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select next status…" />
              </SelectTrigger>
              <SelectContent>
                {nextOptions.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Internal notes
            </label>
            <Textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Notes for the team (not shown to the customer)…"
            />
            <p className="text-xs text-muted-foreground">
              Notes are staff-only and not yet persisted (no field on the order
              API).
            </p>
          </div>

          <Button onClick={handleUpdate} disabled={!target || submitting}>
            {submitting && <Loader2 className="size-4 animate-spin" />}
            Update Status
          </Button>
        </>
      )}

      {/* Cancel confirmation */}
      <Dialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel this order?</DialogTitle>
            <DialogDescription>
              Cancelling returns reserved stock to inventory and cannot be
              undone. The customer keeps their order record.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Keep order
            </DialogClose>
            <Button
              variant="destructive"
              disabled={submitting}
              onClick={() => {
                setConfirmCancel(false);
                apply("cancelled");
              }}
            >
              {submitting && <Loader2 className="size-4 animate-spin" />}
              Cancel order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Print island for the server-rendered invoice (window.print + print CSS).
export function PrintInvoiceButton() {
  return (
    <Button variant="outline" onClick={() => window.print()}>
      <Printer className="size-4" />
      Print invoice
    </Button>
  );
}
