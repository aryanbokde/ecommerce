"use client";

import { useEffect, useState } from "react";
import { Loader2, ArrowRight, PackageCheck } from "lucide-react";
import { DashboardShell } from "@/components/admin/DashboardShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FulfillmentPanel } from "@/components/manager/FulfillmentPanel";
import { type FulfillmentOrder } from "@/components/manager/PackingSlip";
import { notifyError, notifySuccess } from "@/lib/notify";
import { MANAGER_BADGES_REFRESH } from "@/components/manager/ManagerSidebar";

// Board columns map 1:1 to the three pre-shipment statuses.
const COLUMNS = [
  { status: "pending", title: "To Confirm", action: "confirm", label: "Confirm" },
  { status: "confirmed", title: "To Pack", action: "start_packing", label: "Mark Packed" },
  { status: "processing", title: "To Ship", action: "mark_shipped", label: "Mark Shipped" },
] as const;

const DAY = 86_400_000;
function ageLabel(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / DAY);
  return d === 0 ? "today" : `${d}d old`;
}

function itemCount(order: FulfillmentOrder): number {
  return order.items.reduce((s, it) => s + it.quantity, 0);
}

export default function FulfillmentBoardPage() {
  const [result, setResult] = useState<{
    key: string;
    orders: FulfillmentOrder[];
  } | null>(null);
  const [tick, setTick] = useState(0);
  const [selected, setSelected] = useState<FulfillmentOrder | null>(null);
  const [advancing, setAdvancing] = useState<string | null>(null);

  const key = String(tick);
  const isLoading = result?.key !== key;

  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/manager/fulfillment?limit=100", {
      signal: ctrl.signal,
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("failed"))))
      .then((j) => setResult({ key, orders: j.data?.orders ?? [] }))
      .catch(() => {
        if (!ctrl.signal.aborted) setResult({ key, orders: [] });
      });
    return () => ctrl.abort();
  }, [tick, key]);

  const bump = () => setTick((t) => t + 1);
  // After a fulfilment action that can leave the queue (shipping), refresh the
  // board AND the sidebar badge.
  const onFulfilled = () => {
    window.dispatchEvent(new Event(MANAGER_BADGES_REFRESH));
    bump();
  };

  async function quickAdvance(order: FulfillmentOrder, action: string) {
    setAdvancing(order.id);
    try {
      const res = await fetch(`/api/manager/fulfillment/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        notifyError("Couldn't update order", json?.error);
        return;
      }
      notifySuccess("Order updated", order.orderNumber);
      // Shipping an order removes it from the fulfil queue → refresh the badge.
      window.dispatchEvent(new Event(MANAGER_BADGES_REFRESH));
      bump();
    } finally {
      setAdvancing(null);
    }
  }

  const orders = result?.orders ?? [];

  return (
    <DashboardShell
      title="Orders to Fulfill"
      description="Confirm, pack, and ship the fulfilment queue"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {COLUMNS.map((col) => {
          const colOrders = orders.filter((o) => o.status === col.status);
          return (
            <section key={col.status} className="flex flex-col gap-3">
              <div className="flex items-center justify-between border-b pb-2">
                <h2 className="text-sm font-semibold text-foreground">
                  {col.title}
                </h2>
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-semibold text-muted-foreground">
                  {isLoading ? "·" : colOrders.length}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {isLoading ? (
                  Array.from({ length: 2 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full rounded-lg" />
                  ))
                ) : colOrders.length === 0 ? (
                  <div className="flex flex-col items-center gap-1 rounded-lg border border-dashed py-8 text-muted-foreground">
                    <PackageCheck className="size-5" />
                    <p className="text-xs">Nothing here</p>
                  </div>
                ) : (
                  colOrders.map((order) => (
                    // Clickable card. A native <button> here would nest the
                    // advance <Button> below (invalid DOM), so use a div with
                    // button semantics + keyboard support instead.
                    <div
                      key={order.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelected(order)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelected(order);
                        }
                      }}
                      className="flex cursor-pointer flex-col gap-2 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-foreground">
                          {order.orderNumber}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {ageLabel(order.createdAt)}
                        </span>
                      </div>
                      <p className="truncate text-sm text-muted-foreground">
                        {order.user?.name ?? "—"} · {itemCount(order)} item
                        {itemCount(order) === 1 ? "" : "s"}
                      </p>
                      <Button
                        size="sm"
                        className="w-full"
                        disabled={advancing === order.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          // Shipping needs a tracking number → open the panel.
                          if (col.action === "mark_shipped") {
                            setSelected(order);
                          } else {
                            quickAdvance(order, col.action);
                          }
                        }}
                      >
                        {advancing === order.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <ArrowRight className="size-4" />
                        )}
                        {col.label}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>

      {selected && (
        <FulfillmentPanel
          order={selected}
          open
          onOpenChange={(o) => !o && setSelected(null)}
          onDone={onFulfilled}
        />
      )}
    </DashboardShell>
  );
}
