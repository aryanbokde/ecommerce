"use client";

import { useState } from "react";
import { Loader2, Printer, MapPin, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { notifyError, notifySuccess } from "@/lib/notify";
import { PackingSlip, type FulfillmentOrder } from "@/components/manager/PackingSlip";

interface FulfillmentPanelProps {
  order: FulfillmentOrder;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}

// status → the single advancing action available at this stage.
const STAGE: Record<
  string,
  { action: string; label: string; needsTracking?: boolean; needsPicked?: boolean }
> = {
  pending: { action: "confirm", label: "Confirm order" },
  confirmed: { action: "start_packing", label: "Mark packed", needsPicked: true },
  processing: { action: "mark_shipped", label: "Mark shipped", needsTracking: true },
};

export function FulfillmentPanel({
  order,
  open,
  onOpenChange,
  onDone,
}: FulfillmentPanelProps) {
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [tracking, setTracking] = useState(order.trackingNumber ?? "");
  const [submitting, setSubmitting] = useState(false);

  const stage = STAGE[order.status];
  const allPicked = order.items.every((it) => picked.has(it.id));
  const canAct =
    !!stage &&
    !submitting &&
    (!stage.needsPicked || allPicked) &&
    (!stage.needsTracking || tracking.trim() !== "");

  function togglePick(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function act() {
    if (!stage || !canAct) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/manager/fulfillment/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: stage.action,
          ...(stage.needsTracking ? { trackingNumber: tracking.trim() } : {}),
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        notifyError("Couldn't update order", json?.error);
        return;
      }
      notifySuccess("Order updated", `${order.orderNumber} · ${stage.label}`);
      onDone();
      onOpenChange(false);
    } catch {
      notifyError("Something went wrong", "Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const addr = order.address;
  const pickedCount = order.items.filter((it) => picked.has(it.id)).length;

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Fulfil {order.orderNumber}</DialogTitle>
          <DialogDescription>
            {order.user?.name ?? "—"} · {order.items.length} line item
            {order.items.length === 1 ? "" : "s"}
          </DialogDescription>
        </DialogHeader>

        {/* Pick list */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">
              Pick list
            </h3>
            <span className="text-xs text-muted-foreground">
              {pickedCount}/{order.items.length} picked
            </span>
          </div>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {order.items.map((it) => {
              const isPicked = picked.has(it.id);
              return (
                <li
                  key={it.id}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2",
                    isPicked && "bg-muted/40"
                  )}
                >
                  <Checkbox
                    checked={isPicked}
                    onCheckedChange={() => togglePick(it.id)}
                    aria-label={`Picked ${it.name}`}
                  />
                  <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                    {it.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={it.image} alt="" className="size-full object-cover" />
                    ) : (
                      <ShoppingBag className="size-4 text-muted-foreground" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "truncate text-sm font-medium",
                        isPicked && "text-muted-foreground line-through"
                      )}
                    >
                      {it.name}
                    </p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {it.product?.sku ?? "—"}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    ×{it.quantity}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Address */}
        {addr && (
          <div className="rounded-lg border border-border p-3 text-sm">
            <p className="flex items-center gap-2 font-medium text-foreground">
              <MapPin className="size-4 text-muted-foreground" />
              Ship to
            </p>
            <div className="mt-1 text-muted-foreground">
              <p className="text-foreground">{addr.fullName}</p>
              <p>
                {[addr.line1, addr.line2, addr.city, addr.state, addr.postalCode, addr.country]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              <p>{addr.phone}</p>
            </div>
          </div>
        )}

        {/* Tracking (ship stage only) */}
        {stage?.needsTracking && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Tracking number <span className="text-destructive">*</span>
            </label>
            <Input
              value={tracking}
              placeholder="e.g. 1Z999AA10123456784"
              onChange={(e) => setTracking(e.target.value)}
            />
          </div>
        )}

        {stage?.needsPicked && !allPicked && (
          <p className="text-xs text-muted-foreground">
            Tick every item to confirm it&apos;s packed.
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between gap-2 border-t pt-4">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="size-4" />
            Print Packing Slip
          </Button>
          {stage && (
            <Button onClick={act} disabled={!canAct}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              {stage.label}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>

    {/* Print-only slip (hidden on screen). */}
    <PackingSlip order={order} />
    </>
  );
}
