"use client";

import { useEffect, useState } from "react";
import { Loader2, ArrowRight, PackageCheck, Clock } from "lucide-react";
import { DashboardShell } from "@/components/admin/DashboardShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FulfillmentPanel } from "@/components/manager/FulfillmentPanel";
import { type FulfillmentOrder } from "@/components/manager/PackingSlip";
import { notifyError, notifySuccess } from "@/lib/notify";
import { MANAGER_BADGES_REFRESH } from "@/components/manager/ManagerSidebar";
import { cn } from "@/lib/utils";

// Board columns map 1:1 to the three pre-shipment statuses.
const COLUMNS = [
  { status: "pending", title: "To Confirm", action: "confirm", label: "Confirm" },
  { status: "confirmed", title: "To Pack", action: "start_packing", label: "Mark Packed" },
  { status: "processing", title: "To Ship", action: "mark_shipped", label: "Mark Shipped" },
] as const;

const DAY = 86_400_000;
function ageDays(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / DAY);
}
function ageLabel(iso: string): string {
  const d = ageDays(iso);
  return d === 0 ? "today" : `${d}d old`;
}

// Aging cue: a queued order sitting > 2 days is overdue (red), 1–2 days is
// getting stale (amber). Drives both the card border and the ⏳ chip.
function ageTone(iso: string): "red" | "amber" | null {
  const d = ageDays(iso);
  return d >= 3 ? "red" : d >= 1 ? "amber" : null;
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

  // Queue health: total waiting, units to pack, overdue (>2d), oldest age.
  const totalUnits = orders.reduce((s, o) => s + itemCount(o), 0);
  const overdue = orders.filter((o) => ageDays(o.createdAt) >= 3).length;
  const oldestDays = orders.reduce(
    (m, o) => Math.max(m, ageDays(o.createdAt)),
    0
  );

  return (
    <DashboardShell
      title="Orders to Fulfill"
      description="Confirm, pack, and ship the fulfilment queue"
    >
      {/* Queue summary */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="In queue" value={isLoading ? "·" : orders.length} />
        <Tile
          label="Units to pack"
          value={isLoading ? "·" : totalUnits.toLocaleString("en-IN")}
        />
        <Tile
          label="Overdue"
          value={isLoading ? "·" : overdue}
          tone={overdue > 0 ? "red" : "default"}
          sub="waiting 3+ days"
        />
        <Tile
          label="Oldest"
          value={isLoading ? "·" : oldestDays === 0 ? "today" : `${oldestDays}d`}
          tone={oldestDays >= 3 ? "red" : oldestDays >= 1 ? "amber" : "default"}
        />
      </div>

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
                  colOrders.map((order) => {
                    const tone = ageTone(order.createdAt);
                    return (
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
                      className={cn(
                        "flex cursor-pointer flex-col gap-2 rounded-lg border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                        tone === "red"
                          ? "border-rose-300 dark:border-rose-500/40"
                          : tone === "amber"
                            ? "border-amber-300 dark:border-amber-500/40"
                            : "border-border"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-foreground">
                          {order.orderNumber}
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-xs",
                            tone === "red"
                              ? "font-medium text-rose-600 dark:text-rose-400"
                              : tone === "amber"
                                ? "font-medium text-amber-600 dark:text-amber-400"
                                : "text-muted-foreground"
                          )}
                        >
                          {tone && <Clock className="size-3" />}
                          {ageLabel(order.createdAt)}
                        </span>
                      </div>
                      <p className="truncate text-sm text-muted-foreground">
                        {order.user?.name ?? "—"} · {itemCount(order)} item
                        {itemCount(order) === 1 ? "" : "s"}
                      </p>
                      <ItemThumbs items={order.items} />
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
                    );
                  })
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

function Tile({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: number | string;
  sub?: string;
  tone?: "default" | "amber" | "red";
}) {
  const toneCls =
    tone === "amber"
      ? "text-amber-600 dark:text-amber-400"
      : tone === "red"
        ? "text-rose-600 dark:text-rose-400"
        : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-xl font-semibold tabular-nums", toneCls)}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

// Up to 4 product thumbnails per card, with a "+N" chip for the overflow — a
// quick visual of what's in the box before opening the panel.
function ItemThumbs({
  items,
}: {
  items: { id: string; name: string; image: string | null }[];
}) {
  if (items.length === 0) return null;
  const shown = items.slice(0, 4);
  const extra = items.length - shown.length;
  return (
    <div className="flex items-center gap-1.5">
      {shown.map((it) =>
        it.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={it.id}
            src={it.image}
            alt={it.name}
            title={it.name}
            loading="lazy"
            decoding="async"
            className="size-7 rounded-md object-cover ring-1 ring-border"
          />
        ) : (
          <span
            key={it.id}
            title={it.name}
            className="flex size-7 items-center justify-center rounded-md bg-muted text-[10px] font-medium text-muted-foreground ring-1 ring-border"
          >
            {it.name.charAt(0).toUpperCase()}
          </span>
        )
      )}
      {extra > 0 && (
        <span className="text-xs text-muted-foreground tabular-nums">
          +{extra}
        </span>
      )}
    </div>
  );
}
